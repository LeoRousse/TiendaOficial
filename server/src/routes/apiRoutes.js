import { Router } from 'express';

export function createApiRoutes({ orderController, paymentController }) {
  const router = Router();

  router.get('/catalog', orderController.getCatalog);
  router.post('/orders', orderController.authMiddleware, orderController.createOrder);
  router.get('/orders/:orderId/status', orderController.authMiddleware, orderController.getOrderStatus);

  router.post(
    ['/payments/mercadopago', '/payments/mercadopago/checkout'],
    paymentController.requireMercadoPagoConfigured,
    paymentController.authMiddleware,
    paymentController.createMercadoPagoCheckout,
  );
  router.post(
    ['/payments/stripe', '/payments/stripe/checkout'],
    paymentController.requireStripeConfigured,
    paymentController.authMiddleware,
    paymentController.createStripeCheckout,
  );
  router.get(
    '/payments/stripe/sessions/:sessionId/order',
    paymentController.requireStripeConfigured,
    paymentController.authMiddleware,
    paymentController.resolveStripeSession,
  );

  return router;
}
