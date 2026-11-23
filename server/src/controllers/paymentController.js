function createOrderUrls(clientUrl, orderId) {
  const successUrl = new URL('/checkout/success', `${clientUrl}/`);
  successUrl.searchParams.set('orderId', orderId);
  const cancelUrl = new URL('/cart', `${clientUrl}/`);
  cancelUrl.searchParams.set('payment', 'cancelled');
  return { successUrl, cancelUrl };
}

function requireProvider(client, name) {
  if (!client) {
    const error = new Error(`El servicio de ${name} no está configurado.`);
    error.status = 503;
    throw error;
  }
}

export function createPaymentController({
  store,
  authMiddleware,
  mercadoPagoClient,
  stripeClient,
  clientUrl,
  serverPublicUrl,
}) {
  function getOwnedPendingOrder(req, res, currency) {
    const { orderId } = req.body || {};
    if (typeof orderId !== 'string' || !orderId) {
      res.status(400).json({ message: 'Falta el identificador de la orden.' });
      return null;
    }
    const order = store.getOrder(orderId);
    if (!order || order.userId !== req.user.uid) {
      res.status(404).json({ message: 'No encontramos esa orden.' });
      return null;
    }
    if (order.status !== 'pending') {
      res.status(409).json({ message: 'La orden ya no está pendiente de pago.' });
      return null;
    }
    if (order.currency !== currency) {
      res.status(409).json({ message: `Esta orden debe pagarse en ${order.currency}.` });
      return null;
    }
    const alreadyOwnedIds = store.getPaidCourseIds(req.user.uid)
      .filter((courseId) => order.courseIds.includes(courseId));
    if (alreadyOwnedIds.length > 0) {
      res.status(409).json({
        message: 'Ya tienes acceso a uno o más cursos de esta orden. No se puede iniciar un pago duplicado.',
        code: 'COURSE_ALREADY_OWNED',
        ownedCourseIds: alreadyOwnedIds,
      });
      return null;
    }
    return order;
  }

  function requireMercadoPagoConfigured(_req, res, next) {
    if (!mercadoPagoClient) {
      return res.status(503).json({
        message: 'Mercado Pago está en modo configuración. Completa las credenciales sandbox del servidor.',
      });
    }
    return next();
  }

  function requireStripeConfigured(_req, res, next) {
    if (!stripeClient) {
      return res.status(503).json({
        message: 'Stripe está en modo configuración. Completa las credenciales sandbox del servidor.',
      });
    }
    return next();
  }

  async function createMercadoPagoCheckout(req, res, next) {
    try {
      requireProvider(mercadoPagoClient, 'Mercado Pago');
      const order = getOwnedPendingOrder(req, res, 'ARS');
      if (!order) return;

      const items = order.items.map((item) => {
        return {
          id: item.id,
          title: item.name,
          quantity: 1,
          currency_id: 'ARS',
          unit_price: item.price,
        };
      });
      const { successUrl, cancelUrl } = createOrderUrls(clientUrl, order.orderId);
      const preference = await mercadoPagoClient.preference.create({
        body: {
          items,
          external_reference: order.orderId,
          back_urls: {
            success: successUrl.toString(),
            failure: cancelUrl.toString(),
            pending: successUrl.toString(),
          },
          auto_return: 'approved',
          notification_url: `${serverPublicUrl}/api/webhooks/mercadopago`,
          metadata: { order_id: order.orderId },
        },
        requestOptions: {
          idempotencyKey: req.get('Idempotency-Key') || `mercadopago:${order.orderId}`,
        },
      });
      if (!preference.init_point) {
        throw new Error('Mercado Pago no devolvió una URL de pago.');
      }
      return res.json({ init_point: preference.init_point });
    } catch (error) {
      return next(error);
    }
  }

  async function createStripeCheckout(req, res, next) {
    try {
      requireProvider(stripeClient, 'Stripe');
      const order = getOwnedPendingOrder(req, res, 'USD');
      if (!order) return;

      const { successUrl, cancelUrl } = createOrderUrls(clientUrl, order.orderId);
      const stripeSuccessUrl = `${successUrl.toString()}&session_id={CHECKOUT_SESSION_ID}`;
      const session = await stripeClient.checkout.sessions.create({
        mode: 'payment',
        client_reference_id: order.orderId,
        metadata: { order_id: order.orderId },
        line_items: order.items.map((item) => ({
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(item.price * 100),
            product_data: { name: item.name },
          },
        })),
        success_url: stripeSuccessUrl,
        cancel_url: cancelUrl.toString(),
      }, {
        idempotencyKey: req.get('Idempotency-Key') || `stripe:${order.orderId}`,
      });
      if (!session.url) {
        throw new Error('Stripe no devolvió una URL de checkout.');
      }
      return res.json({ url: session.url });
    } catch (error) {
      return next(error);
    }
  }

  async function resolveStripeSession(req, res, next) {
    try {
      requireProvider(stripeClient, 'Stripe');
      const session = await stripeClient.checkout.sessions.retrieve(req.params.sessionId);
      const orderId = session.client_reference_id || session.metadata?.order_id;
      const order = orderId ? store.getOrder(orderId) : null;
      if (!order || order.userId !== req.user.uid) {
        return res.status(404).json({ message: 'No encontramos una orden para esa sesión.' });
      }
      return res.json({ orderId });
    } catch (error) {
      return next(error);
    }
  }

  return {
    authMiddleware,
    requireMercadoPagoConfigured,
    requireStripeConfigured,
    createMercadoPagoCheckout,
    createStripeCheckout,
    resolveStripeSession,
  };
}
