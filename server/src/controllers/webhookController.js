import { verifyMercadoPagoSignature } from '../services/mercadoPagoSignature.js';

function getStripePaymentId(session) {
  if (typeof session.payment_intent === 'string') return session.payment_intent;
  return session.payment_intent?.id || session.id;
}

export function createWebhookController({
  store,
  fulfillOrder,
  stripeClient,
  stripeWebhookSecret,
  mercadoPagoClient,
  mercadoPagoWebhookSecret,
}) {
  async function stripeWebhook(req, res) {
    const signature = req.get('stripe-signature');
    let event;
    try {
      if (!stripeClient || !stripeWebhookSecret) {
        return res.status(503).json({ message: 'El webhook de Stripe no está configurado.' });
      }
      event = stripeClient.webhooks.constructEvent(req.body, signature, stripeWebhookSecret);
    } catch (error) {
      console.error('Stripe rechazó la firma del webhook', error.message);
      return res.status(400).json({ message: 'La firma del webhook de Stripe no es válida.' });
    }

    if (event.type !== 'checkout.session.completed') {
      return res.json({ received: true });
    }

    const session = event.data?.object;
    if (session?.payment_status !== 'paid') {
      return res.json({ received: true });
    }
    const orderId = session.client_reference_id || session.metadata?.order_id;
    const order = orderId ? store.getOrder(orderId) : null;
    const amountPaid = Number(session.amount_total);
    if (!order
      || (session.metadata?.order_id && session.metadata.order_id !== orderId)
      || order.currency !== 'USD'
      || session.currency?.toUpperCase() !== 'USD'
      || amountPaid !== order.totalAmount) {
      console.error('La sesión pagada de Stripe no coincide con la orden local', {
        orderId,
        amountPaid,
        orderAmount: order?.totalAmount,
        currency: session.currency,
      });
      return res.status(400).json({ message: 'El pago no coincide con la orden.' });
    }

    try {
      fulfillOrder(orderId, 'stripe', getStripePaymentId(session), event.id);
      return res.json({ received: true });
    } catch (error) {
      console.error('No se pudo completar la orden del evento de Stripe', error);
      return res.status(error.status || 500).json({ message: 'No se pudo completar la orden.' });
    }
  }

  async function mercadoPagoWebhook(req, res) {
    if (!mercadoPagoClient || !mercadoPagoWebhookSecret) {
      return res.status(503).json({ message: 'El webhook de Mercado Pago no está configurado.' });
    }

    const paymentId = req.query['data.id'] || req.body?.data?.id;
    const signature = req.get('x-signature');
    const requestId = req.get('x-request-id');
    if (!verifyMercadoPagoSignature({
      signature,
      requestId,
      paymentId: paymentId ? String(paymentId) : '',
      secret: mercadoPagoWebhookSecret,
    })) {
      return res.status(401).json({ message: 'La firma del webhook de Mercado Pago no es válida.' });
    }

    if (req.query.type && req.query.type !== 'payment'
      || req.body?.type && req.body.type !== 'payment') {
      return res.json({ received: true });
    }

    try {
      const payment = await mercadoPagoClient.payment.get({ id: paymentId });
      if (payment.status !== 'approved') {
        return res.json({ received: true });
      }

      const orderId = payment.external_reference;
      const order = orderId ? store.getOrder(orderId) : null;
      const amountPaid = Math.round(Number(payment.transaction_amount) * 100);
      if (!order
        || order.currency !== 'ARS'
        || payment.currency_id !== 'ARS'
        || amountPaid !== order.totalAmount) {
        console.error('El pago de Mercado Pago no coincide con la orden local', {
          orderId,
          amountPaid,
          orderAmount: order?.totalAmount,
          currency: payment.currency_id,
        });
        return res.status(400).json({ message: 'El pago no coincide con la orden.' });
      }

      fulfillOrder(orderId, 'mercadopago', String(payment.id), `payment:${payment.id}`);
      return res.json({ received: true });
    } catch (error) {
      console.error('No se pudo verificar el pago de Mercado Pago', error);
      return res.status(error.status || 502).json({ message: 'No se pudo verificar el pago.' });
    }
  }

  return { mercadoPagoWebhook, stripeWebhook };
}
