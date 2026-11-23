import { createHmac, randomUUID } from 'node:crypto';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { createOrderStore } from './services/orderStore.js';
import { catalog } from './data/catalog.js';
import { runSmokeTest } from '../scripts/smokeTest.js';

describe('backend API', () => {
  let app;
  let store;
  let stripeClient;
  let stripeEvent;
  let mercadoPagoClient;

  beforeEach(() => {
    store = createOrderStore(':memory:');
    stripeEvent = null;
    stripeClient = {
      webhooks: {
        constructEvent: vi.fn((body, signature, secret) => {
          if (signature !== 'valid-signature' || secret !== 'stripe-test-secret'
            || !Buffer.isBuffer(body)) {
            throw new Error('Invalid signature');
          }
          return stripeEvent;
        }),
      },
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ url: 'https://checkout.stripe.test/session' }),
          retrieve: vi.fn().mockResolvedValue({
            client_reference_id: 'known-order',
            metadata: {},
          }),
        },
      },
    };
    mercadoPagoClient = {
      payment: { get: vi.fn() },
      preference: {
        create: vi.fn().mockResolvedValue({
          init_point: 'https://checkout.mercadopago.test/preference',
        }),
      },
    };
    app = createApp({
      store,
      verifyToken: async (token) => {
        if (token === 'valid-firebase-token') return { uid: 'user-test' };
        if (token === 'other-firebase-token') return { uid: 'other-user' };
        throw new Error('Invalid token');
      },
      stripeClient,
      mercadoPagoClient,
      config: {
        clientUrl: 'http://localhost:3000',
        serverPublicUrl: 'https://api.example.test',
        stripeWebhookSecret: 'stripe-test-secret',
        mpWebhookSecret: 'mp-test-secret',
        arsPerUsd: 1000,
        geminiApiKey: '',
      },
    });
  });

  afterEach(() => {
    store.close();
  });

  async function createPendingOrder(key = 'order-request-0001') {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', key)
      .send({
        courseIds: [catalog[0].id],
        userId: 'user-test',
        currency: 'USD',
        totalAmount: 0.01,
      });
    expect(response.status).toBe(201);
    return response.body;
  }

  async function createPaidOrder({ key, courseIds, userId = 'user-test', token = 'valid-firebase-token' }) {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .set('Idempotency-Key', key)
      .send({ courseIds, userId, currency: 'USD' });
    expect(response.status).toBe(201);
    store.fulfillOrder({
      orderId: response.body.orderId,
      provider: 'test',
      providerPaymentId: `payment-${response.body.orderId}`,
    });
    return response.body;
  }

  it('creates an order from server prices and reuses the idempotency key', async () => {
    const first = await createPendingOrder();
    const repeated = await createPendingOrder();

    expect(repeated.orderId).toBe(first.orderId);
    expect(first.status).toBe('pending');
    expect(first.totalAmount).toBeGreaterThan(0);
    expect(first.items).toEqual([{
      id: catalog[0].id,
      name: catalog[0].name,
      price: first.totalAmount,
    }]);
  });

  it('rejects creating a second order for courses already unlocked by a paid order', async () => {
    await createPaidOrder({ key: 'paid-course-ownership-0001', courseIds: [catalog[0].id] });
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', 'duplicate-paid-course-0001')
      .send({ courseIds: [catalog[0].id, catalog[1].id], userId: 'user-test', currency: 'USD' });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('COURSE_ALREADY_OWNED');
    expect(response.body.ownedCourseIds).toEqual([catalog[0].id]);
  });

  it('prevents a pending duplicate order from opening a checkout session after course access is granted', async () => {
    const paidOrder = await createPendingOrder('pending-course-race-0001');
    const duplicatePendingOrder = await createPendingOrder('pending-course-race-0002');
    store.fulfillOrder({
      orderId: paidOrder.orderId,
      provider: 'stripe',
      providerPaymentId: 'original-payment',
    });

    const response = await request(app)
      .post('/api/payments/stripe/checkout')
      .set('Authorization', 'Bearer valid-firebase-token')
      .send({ orderId: duplicatePendingOrder.orderId });

    expect(response.status).toBe(409);
    expect(response.body.code).toBe('COURSE_ALREADY_OWNED');
    expect(stripeClient.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('expires pending orders after 24 hours', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
      const order = store.createOrGetOrder({
        userId: 'user-test',
        idempotencyKey: 'old-pending-order-0001',
        courseIds: [catalog[0].id],
        items: [],
        currency: 'USD',
        totalAmount: 100,
      });

      vi.setSystemTime(new Date('2026-01-02T01:00:00.000Z'));
      expect(store.getOrder(order.orderId).status).toBe('expired');
      expect(store.getPaidCourseIds('user-test')).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
  });

  it('adds subtotal and discount columns while preserving existing orders', () => {
    const databasePath = join(process.cwd(), 'data', `legacy-orders-${randomUUID()}.sqlite`);
    mkdirSync(join(process.cwd(), 'data'), { recursive: true });
    const legacyDatabase = new Database(databasePath);
    legacyDatabase.exec(`
      CREATE TABLE orders (
        order_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        course_ids TEXT NOT NULL,
        items TEXT NOT NULL,
        currency TEXT NOT NULL,
        total_amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        provider TEXT,
        provider_payment_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      INSERT INTO orders (
        order_id, user_id, idempotency_key, request_hash, course_ids,
        items, currency, total_amount, status, created_at, updated_at
      ) VALUES (
        'legacy-order', 'legacy-user', 'legacy-key', 'legacy-hash', '[]',
        '[]', 'USD', 14999, 'pending', '2026-01-01T00:00:00.000Z',
        '2026-01-01T00:00:00.000Z'
      );
    `);
    legacyDatabase.close();

    let migratedStore;
    try {
      migratedStore = createOrderStore(databasePath);
      expect(migratedStore.getOrder('legacy-order')).toMatchObject({
        subtotalAmount: 14999,
        discountAmount: 0,
        totalAmount: 14999,
      });
    } finally {
      migratedStore?.close();
      ['-wal', '-shm', ''].forEach((suffix) => rmSync(`${databasePath}${suffix}`, { force: true }));
    }
  });

  it('returns a clear 503 when a payment provider is not configured', async () => {
    app = createApp({
      store,
      verifyToken: async () => ({ uid: 'user-test' }),
      stripeClient: null,
      mercadoPagoClient: null,
      config: {
        clientUrl: 'http://localhost:3000',
        stripeSecretKey: '',
        mpAccessToken: '',
      },
    });

    const response = await request(app)
      .post('/api/payments/stripe/checkout')
      .send({ orderId: 'not-required-before-configuration-check' });

    expect(response.status).toBe(503);
    expect(response.body.message).toContain('modo configuración');
  });

  it('exposes all nine server-priced courses and the configured ARS conversion', async () => {
    const response = await request(app).get('/api/catalog');

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(9);
    expect(response.body.currencyExchangeRate).toBe(1000);
    expect(response.body.items[0]).toMatchObject({
      id: catalog[0].id,
      name: catalog[0].name,
      priceUsd: catalog[0].priceUsd,
      priceArs: 149990,
      durationHours: catalog[0].durationHours,
      modulesCount: catalog[0].modulesCount,
      rating: catalog[0].rating,
      highlights: catalog[0].highlights,
    });
    expect(response.body.items.every((course) => course.priceUsd > 0 && course.priceArs > 0)).toBe(true);
    expect(response.body.items.every((course) => course.durationHours > 0
      && course.modulesCount > 0 && course.rating > 0 && course.highlights.length > 0)).toBe(true);
  });

  it('applies the exact 15% bundle discount in USD and ARS and allocates it to saved items', async () => {
    const usdResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', 'usd-bundle-discount-0001')
      .send({
        courseIds: [catalog[0].id, catalog[1].id],
        userId: 'user-test',
        currency: 'USD',
      });
    expect(usdResponse.status).toBe(201);
    expect(usdResponse.body).toMatchObject({
      subtotalAmount: 239.98,
      discountAmount: 36,
      totalAmount: 203.98,
    });
    expect(usdResponse.body.items.map(({ price }) => price)).toEqual([127.49, 76.49]);

    const arsResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', 'ars-bundle-discount-0001')
      .send({
        courseIds: [catalog[0].id, catalog[1].id],
        userId: 'user-test',
        currency: 'ARS',
      });
    expect(arsResponse.status).toBe(201);
    expect(arsResponse.body).toMatchObject({
      subtotalAmount: 239980,
      discountAmount: 35997,
      totalAmount: 203983,
    });
    expect(arsResponse.body.items.map(({ price }) => price)).toEqual([127491.5, 76491.5]);
    expect(arsResponse.body.items.reduce((total, item) => total + item.price, 0))
      .toBe(arsResponse.body.totalAmount);
  });

  it('passes the HTTP smoke test against a running API instance', async () => {
    const server = app.listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    try {
      const { port } = server.address();
      const checks = await runSmokeTest({ baseUrl: `http://127.0.0.1:${port}` });
      expect(checks).toHaveLength(3);
    } finally {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('rejects reusing an idempotency key for a different cart', async () => {
    const first = await createPendingOrder();
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', 'order-request-0001')
      .send({
        courseIds: [catalog[1].id],
        userId: 'user-test',
        currency: 'USD',
      });

    expect(first.status).toBe('pending');
    expect(response.status).toBe(409);
  });

  it('creates provider sessions using server prices and allowlisted return URLs', async () => {
    const usdOrder = await createPendingOrder('stripe-order-request-01');
    const stripeResponse = await request(app)
      .post('/api/payments/stripe/checkout')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', `stripe:${usdOrder.orderId}`)
      .send({
        orderId: usdOrder.orderId,
        successUrl: 'https://attacker.example/steal-session',
        cancelUrl: 'https://attacker.example/cancel',
      });

    expect(stripeResponse.status).toBe(200);
    expect(stripeResponse.body.url).toBe('https://checkout.stripe.test/session');
    const [stripePayload, stripeOptions] = stripeClient.checkout.sessions.create.mock.calls[0];
    expect(stripePayload.line_items[0].price_data.unit_amount).toBe(14999);
    expect(stripePayload.success_url).toBe(
      `http://localhost:3000/checkout/success?orderId=${usdOrder.orderId}&session_id={CHECKOUT_SESSION_ID}`,
    );
    expect(stripeOptions.idempotencyKey).toBe(`stripe:${usdOrder.orderId}`);

    const arsOrderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', 'mercadopago-order-request')
      .send({
        courseIds: [catalog[0].id],
        userId: 'user-test',
        currency: 'ARS',
      });
    const mercadoPagoResponse = await request(app)
      .post('/api/payments/mercadopago')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', `mercadopago:${arsOrderResponse.body.orderId}`)
      .send({ orderId: arsOrderResponse.body.orderId });

    expect(mercadoPagoResponse.status).toBe(200);
    expect(mercadoPagoResponse.body.init_point).toBe(
      'https://checkout.mercadopago.test/preference',
    );
    expect(arsOrderResponse.body.totalAmount).toBe(149990);

    const usdBundle = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', 'discounted-stripe-checkout-001')
      .send({ courseIds: [catalog[0].id, catalog[1].id], userId: 'user-test', currency: 'USD' });
    await request(app)
      .post('/api/payments/stripe/checkout')
      .set('Authorization', 'Bearer valid-firebase-token')
      .send({ orderId: usdBundle.body.orderId });
    const [discountedStripePayload] = stripeClient.checkout.sessions.create.mock.calls[1];
    expect(discountedStripePayload.line_items.map(({ price_data }) => price_data.unit_amount))
      .toEqual([12749, 7649]);

    const arsBundle = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', 'discounted-mp-checkout-001')
      .send({ courseIds: [catalog[0].id, catalog[1].id], userId: 'user-test', currency: 'ARS' });
    await request(app)
      .post('/api/payments/mercadopago')
      .set('Authorization', 'Bearer valid-firebase-token')
      .send({ orderId: arsBundle.body.orderId });
    const [discountedMercadoPagoPayload] = mercadoPagoClient.preference.create.mock.calls[1];
    expect(discountedMercadoPagoPayload.body.items.map(({ unit_price }) => unit_price))
      .toEqual([127491.5, 76491.5]);
  });

  it('rejects invalid provider signatures without unlocking courses', async () => {
    const order = await createPendingOrder();
    const invalidStripe = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', 'invalid-signature')
      .send({ type: 'checkout.session.completed' });
    const invalidMercadoPago = await request(app)
      .post('/api/webhooks/mercadopago?type=payment&data.id=12345')
      .set('X-Signature', 'ts=1,v1=0000000000000000000000000000000000000000000000000000000000000000')
      .set('X-Request-Id', 'request-1')
      .send({ type: 'payment', data: { id: '12345' } });
    const status = await request(app)
      .get(`/api/orders/${order.orderId}/status`)
      .set('Authorization', 'Bearer valid-firebase-token');

    expect(invalidStripe.status).toBe(400);
    expect(invalidMercadoPago.status).toBe(401);
    expect(status.body.status).toBe('pending');
    expect(status.body.unlockedCourseIds).toEqual([]);
  });

  it('marks a verified payment paid and returns unlocked courses to polling', async () => {
    const order = await createPendingOrder();
    stripeEvent = {
      id: 'evt_test_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_123',
          client_reference_id: order.orderId,
          payment_status: 'paid',
          currency: 'usd',
          amount_total: Math.round(order.totalAmount * 100),
          payment_intent: 'pi_test_123',
        },
      },
    };

    const webhook = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', 'valid-signature')
      .send({ event: 'signed raw payload' });
    const status = await request(app)
      .get(`/api/orders/${order.orderId}/status`)
      .set('Authorization', 'Bearer valid-firebase-token');

    expect(webhook.status).toBe(200);
    expect(status.body.status).toBe('paid');
    expect(status.body.unlockedCourseIds).toEqual([catalog[0].id]);
    expect(status.body.updatedAt).toBeTruthy();
    expect(status.body).toMatchObject({
      orderId: order.orderId,
      provider: 'stripe',
      currency: 'USD',
      createdAt: expect.any(String),
      totalAmount: expect.any(Number),
      items: [{ id: catalog[0].id, name: catalog[0].name }],
    });
  });

  it('compares Stripe webhook payments against the saved discounted order total', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', 'discounted-stripe-webhook-001')
      .send({ courseIds: [catalog[0].id, catalog[1].id], userId: 'user-test', currency: 'USD' });
    const order = response.body;
    stripeEvent = {
      id: 'evt_discounted_wrong_amount',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_discounted',
          client_reference_id: order.orderId,
          payment_status: 'paid',
          currency: 'usd',
          amount_total: Math.round(order.subtotalAmount * 100),
          payment_intent: 'pi_discounted',
        },
      },
    };

    const incorrectPayment = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', 'valid-signature')
      .send({ event: 'signed raw payload' });
    expect(incorrectPayment.status).toBe(400);
    expect(store.getOrder(order.orderId).status).toBe('pending');

    stripeEvent = {
      ...stripeEvent,
      id: 'evt_discounted_correct_amount',
      data: {
        object: {
          ...stripeEvent.data.object,
          amount_total: Math.round(order.totalAmount * 100),
        },
      },
    };
    const correctPayment = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', 'valid-signature')
      .send({ event: 'signed raw payload' });
    const status = await request(app)
      .get(`/api/orders/${order.orderId}/status`)
      .set('Authorization', 'Bearer valid-firebase-token');
    expect(correctPayment.status).toBe(200);
    expect(store.getOrder(order.orderId).status).toBe('paid');
    expect(status.body).toMatchObject({
      subtotalAmount: 239.98,
      discountAmount: 36,
      totalAmount: 203.98,
    });
  });

  it('verifies Mercado Pago signatures and payment state before unlocking courses', async () => {
    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', 'mercadopago-order-request-2')
      .send({
        courseIds: [catalog[0].id, catalog[1].id],
        userId: 'user-test',
        currency: 'ARS',
      });
    const paymentId = 'mp-payment-123';
    const requestId = 'mp-request-456';
    const timestamp = String(Math.floor(Date.now() / 1000));
    const manifest = `id:${paymentId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
    const signature = createHmac('sha256', 'mp-test-secret')
      .update(manifest)
      .digest('hex');
    mercadoPagoClient.payment.get.mockResolvedValue({
      id: paymentId,
      status: 'approved',
      external_reference: orderResponse.body.orderId,
      transaction_amount: orderResponse.body.totalAmount,
      currency_id: 'ARS',
    });

    const webhook = await request(app)
      .post(`/api/webhooks/mercadopago?type=payment&data.id=${paymentId}`)
      .set('X-Signature', `ts=${timestamp},v1=${signature}`)
      .set('X-Request-Id', requestId)
      .send({ type: 'payment', data: { id: paymentId } });
    const status = await request(app)
      .get(`/api/orders/${orderResponse.body.orderId}/status`)
      .set('Authorization', 'Bearer valid-firebase-token');

    expect(webhook.status).toBe(200);
    expect(mercadoPagoClient.payment.get).toHaveBeenCalledWith({ id: paymentId });
    expect(status.body.status).toBe('paid');
    expect(status.body.unlockedCourseIds).toEqual([catalog[0].id, catalog[1].id]);
  });

  it('returns paid courses and persists progress with strict Firebase uid ownership', async () => {
    await createPaidOrder({
      key: 'paid-order-for-user-001',
      courseIds: [catalog[0].id, catalog[1].id],
    });
    await createPaidOrder({
      key: 'paid-order-for-user-002',
      courseIds: [catalog[3].id],
    });
    await createPaidOrder({
      key: 'paid-order-for-other-001',
      courseIds: [catalog[2].id],
      userId: 'other-user',
      token: 'other-firebase-token',
    });
    const mine = await request(app)
      .get('/api/me/courses')
      .set('Authorization', 'Bearer valid-firebase-token');
    const others = await request(app)
      .get('/api/me/courses')
      .set('Authorization', 'Bearer other-firebase-token');
    expect(mine.status).toBe(200);
    expect(mine.body.courses.map(({ id }) => id)).toEqual([
      catalog[0].id,
      catalog[1].id,
      catalog[3].id,
    ]);
    expect(mine.body.courses[0]).toMatchObject({
      id: catalog[0].id,
      name: catalog[0].name,
      description: expect.any(String),
      priceUsd: catalog[0].priceUsd,
      priceArs: 149990,
      completedLessonIds: [],
      progressPercent: 0,
    });
    expect(mine.body.courses[0].lessons[0]).toEqual({
      id: 'javascript-fundamentals',
      title: 'Fundamentos de JavaScript',
      content: 'Variables, tipos de datos, operadores y control de flujo.',
    });
    expect(others.body.courses.map(({ id }) => id)).toEqual([catalog[2].id]);

    const progress = await request(app)
      .patch(`/api/me/courses/${catalog[0].id}/progress`)
      .set('Authorization', 'Bearer valid-firebase-token')
      .send({ lessonId: 'javascript-fundamentals', completed: true });
    const reloaded = await request(app)
      .get('/api/me/courses')
      .set('Authorization', 'Bearer valid-firebase-token');
    const isolated = await request(app)
      .get('/api/me/courses')
      .set('Authorization', 'Bearer other-firebase-token');
    const forbiddenUpdate = await request(app)
      .patch(`/api/me/courses/${catalog[0].id}/progress`)
      .set('Authorization', 'Bearer other-firebase-token')
      .send({ lessonId: 'javascript-fundamentals', completed: true });
    const reset = await request(app)
      .patch(`/api/me/courses/${catalog[0].id}/progress`)
      .set('Authorization', 'Bearer valid-firebase-token')
      .send({ lessonId: 'javascript-fundamentals', completed: false });

    expect(progress.status).toBe(200);
    expect(progress.body).toEqual({
      completedLessonIds: ['javascript-fundamentals'],
      progressPercent: 33,
    });
    expect(reloaded.body.courses[0].completedLessonIds).toEqual(['javascript-fundamentals']);
    expect(isolated.body.courses).toHaveLength(1);
    expect(forbiddenUpdate.status).toBe(404);
    expect(reset.body).toEqual({ completedLessonIds: [], progressPercent: 0 });
  });

  it('requires authentication and validates course lesson progress', async () => {
    const unauthenticated = await request(app).get('/api/me/courses');
    await createPaidOrder({ key: 'paid-order-progress-valid', courseIds: [catalog[0].id] });
    const invalidLesson = await request(app)
      .patch(`/api/me/courses/${catalog[0].id}/progress`)
      .set('Authorization', 'Bearer valid-firebase-token')
      .send({ lessonId: 'not-in-course', completed: true });

    expect(unauthenticated.status).toBe(401);
    expect(invalidLesson.status).toBe(400);
  });

  it('returns explicit 503 when Gemini is not configured', async () => {
    const response = await request(app)
      .post('/api/assistant/recommend')
      .send({ message: '¿Qué curso me recomiendas?' });

    expect(response.status).toBe(503);
    expect(response.body.message).toContain('GEMINI_API_KEY');
  });

  it('bounds assistant input and validates recommendations against the server catalog', async () => {
    const generateAssistantContent = vi.fn(async (prompt) => {
      expect(prompt).toContain('Ruta Full Stack');
      expect(prompt).toContain('Fundamentos de JavaScript');
      return JSON.stringify({
        answer: 'Empieza por JavaScript y luego continúa con React.',
        recommendedCourseIds: [catalog[0].id, 'unknown-course', catalog[0].id, catalog[1].id],
      });
    });
    app = createApp({
      store,
      verifyToken: async (token) => ({ uid: token }),
      config: {
        clientUrl: 'http://localhost:3000',
        arsPerUsd: 1000,
        geminiApiKey: 'test-gemini-key',
      },
      generateAssistantContent,
    });
    const response = await request(app)
      .post('/api/assistant/recommend')
      .send({
        message: 'Quiero aprender frontend',
        history: [{ role: 'user', text: 'Estoy empezando' }],
      });
    const oversized = await request(app)
      .post('/api/assistant/recommend')
      .send({ message: 'x'.repeat(1201) });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      answer: 'Empieza por JavaScript y luego continúa con React.',
      recommendedCourseIds: [catalog[0].id, catalog[1].id],
    });
    expect(generateAssistantContent).toHaveBeenCalledTimes(1);
    expect(oversized.status).toBe(400);
  });
});
