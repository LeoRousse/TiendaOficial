import { Router } from 'express';

export function createApiRoutes({ orderController, paymentController }) {
  const router = Router();

  router.post('/orders', orderController.authMiddleware, orderController.createOrder);
  router.get('/orders/:orderId/status', orderController.authMiddleware, orderController.getOrderStatus);

  router.post(
    ['/payments/mercadopago', '/payments/mercadopago/checkout'],
    paymentController.authMiddleware,
    paymentController.createMercadoPagoCheckout,
  );
  router.post(
    ['/payments/stripe', '/payments/stripe/checkout'],
    paymentController.authMiddleware,
    paymentController.createStripeCheckout,
  );
  router.get(
    '/payments/stripe/sessions/:sessionId/order',
    paymentController.authMiddleware,
    paymentController.resolveStripeSession,
  );

  return router;
}
