export function createOrderFulfillment(store) {
  return function fulfillOrder(orderId, provider, providerPaymentId, eventId) {
    if (!orderId || !provider || !providerPaymentId) {
      const error = new Error('Faltan datos verificados de la transacción.');
      error.status = 400;
      throw error;
    }
    return store.fulfillOrder({ orderId, provider, providerPaymentId, eventId });
  };
}
