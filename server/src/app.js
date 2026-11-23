import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import Stripe from 'stripe';
import { config } from './config/env.js';
import { createOrderController } from './controllers/orderController.js';
import { createPaymentController } from './controllers/paymentController.js';
import { createWebhookController } from './controllers/webhookController.js';
import { createFirebaseAuthMiddleware } from './middleware/firebaseAuth.js';
import { createApiRoutes } from './routes/apiRoutes.js';
import { createOrderFulfillment } from './services/fulfillOrder.js';
import { createOrderStore } from './services/orderStore.js';

function createMercadoPagoClient(accessToken) {
  if (!accessToken) return null;
  const client = new MercadoPagoConfig({ accessToken });
  return {
    preference: new Preference(client),
    payment: new Payment(client),
  };
}

export function createApp(options = {}) {
  const runtimeConfig = { ...config, ...options.config };
  const store = options.store || createOrderStore(runtimeConfig.databasePath);
  const authMiddleware = options.authMiddleware || createFirebaseAuthMiddleware({
    projectId: runtimeConfig.firebaseProjectId,
    clientEmail: runtimeConfig.firebaseClientEmail,
    privateKey: runtimeConfig.firebasePrivateKey,
    verifyToken: options.verifyToken,
  });
  const mercadoPagoClient = options.mercadoPagoClient
    || createMercadoPagoClient(runtimeConfig.mpAccessToken);
  const stripeClient = options.stripeClient
    || (runtimeConfig.stripeSecretKey ? new Stripe(runtimeConfig.stripeSecretKey) : null);
  const orderController = createOrderController({
    store,
    authMiddleware,
    arsPerUsd: runtimeConfig.arsPerUsd,
  });
  const paymentController = createPaymentController({
    store,
    authMiddleware,
    mercadoPagoClient,
    stripeClient,
    clientUrl: runtimeConfig.clientUrl,
    serverPublicUrl: runtimeConfig.serverPublicUrl,
    arsPerUsd: runtimeConfig.arsPerUsd,
  });
  const webhooks = createWebhookController({
    store,
    fulfillOrder: createOrderFulfillment(store),
    stripeClient,
    stripeWebhookSecret: runtimeConfig.stripeWebhookSecret,
    mercadoPagoClient,
    mercadoPagoWebhookSecret: runtimeConfig.mpWebhookSecret,
  });

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({
    origin: runtimeConfig.clientUrl,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'Stripe-Signature', 'X-Signature', 'X-Request-Id'],
  }));
  const checkoutLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    limit: 50,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: 'Demasiadas solicitudes de checkout. Intenta nuevamente más tarde.' },
  });
  app.use('/api/orders', checkoutLimiter);
  app.use('/api/payments', checkoutLimiter);
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json', limit: '1mb' }),
    webhooks.stripeWebhook,
  );

  app.use(express.json({ limit: '32kb' }));
  app.post('/api/webhooks/mercadopago', webhooks.mercadoPagoWebhook);
  app.use('/api', createApiRoutes({ orderController, paymentController }));

  app.use((_req, res) => res.status(404).json({ message: 'Ruta no encontrada.' }));
  app.use((error, _req, res, _next) => {
    const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
    if (status >= 500) console.error('Error no controlado en API', error);
    return res.status(status).json({
      message: status === 500 ? 'Ocurrió un error interno.' : error.message,
    });
  });

  app.locals.orderStore = store;
  return app;
}
