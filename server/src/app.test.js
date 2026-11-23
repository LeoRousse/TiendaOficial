import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { createOrderStore } from './services/orderStore.js';
import { catalog } from './data/catalog.js';

describe('payment API', () => {
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
        if (token !== 'valid-firebase-token') throw new Error('Invalid token');
        return { uid: 'user-test' };
      },
      stripeClient,
      mercadoPagoClient,
      config: {
        clientUrl: 'http://localhost:3000',
        serverPublicUrl: 'https://api.example.test',
        stripeWebhookSecret: 'stripe-test-secret',
        mpWebhookSecret: 'mp-test-secret',
        arsPerUsd: 1000,
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
  });

  it('verifies Mercado Pago signatures and payment state before unlocking courses', async () => {
    const orderResponse = await request(app)
      .post('/api/orders')
      .set('Authorization', 'Bearer valid-firebase-token')
      .set('Idempotency-Key', 'mercadopago-order-request-2')
      .send({
        courseIds: [catalog[0].id],
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
    expect(status.body.unlockedCourseIds).toEqual([catalog[0].id]);
  });
});
