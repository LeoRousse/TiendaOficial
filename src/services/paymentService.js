import { auth } from '../firebase/firebaseConfig.js';

const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api'
).replace(/\/+$/, '');

export const USD_TO_ARS_ESTIMATE_RATE = (() => {
  const configuredRate = Number(process.env.REACT_APP_USD_ARS_ESTIMATE_RATE);
  return Number.isFinite(configuredRate) && configuredRate > 0
    ? configuredRate
    : 1000;
})();

async function getAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Inicia sesión para continuar con el pago.');
  }

  const idToken = await user.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
    'Content-Type': 'application/json',
  };
}

async function requestApi(path, options = {}) {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  });

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    console.error('La API de pagos devolvió una respuesta no JSON', error);
    throw new Error('El servicio de pagos devolvió una respuesta inválida.');
  }

  if (!response.ok) {
    const apiError = new Error(
      payload?.message || `No se pudo completar la solicitud (${response.status}).`,
    );
    apiError.status = response.status;
    apiError.code = payload?.code;
    throw apiError;
  }

  return payload;
}

export async function createPendingOrder(cartItems, userId, currency, idempotencyKey) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw new Error('Agrega al menos un curso antes de crear la orden.');
  }
  if (!userId || auth.currentUser?.uid !== userId) {
    throw new Error('La sesión no coincide con la cuenta que intenta comprar.');
  }
  if (!['USD', 'ARS'].includes(currency)) {
    throw new Error('La moneda de la orden no es válida.');
  }

  const courseIds = Array.from(new Set(cartItems.map((item) => item?.id).filter(Boolean)));
  if (courseIds.length !== cartItems.length) {
    throw new Error('El carrito contiene cursos duplicados o inválidos. Actualízalo e intenta otra vez.');
  }

  const order = await requestApi('/orders', {
    method: 'POST',
    body: JSON.stringify({ courseIds, userId, currency }),
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  });

  if (!order.orderId || order.status !== 'pending') {
    throw new Error('El servicio no confirmó una orden pendiente válida.');
  }

  return order;
}

async function initiateCheckout(orderId, provider) {
  if (!orderId) throw new Error('No encontramos una orden pendiente para pagar.');

  const successUrl = new URL('/checkout/success', window.location.origin);
  successUrl.searchParams.set('orderId', orderId);
  const cancelUrl = new URL('/cart', window.location.origin);
  cancelUrl.searchParams.set('payment', 'cancelled');

  const response = await requestApi(`/payments/${provider}/checkout`, {
    method: 'POST',
    body: JSON.stringify({
      orderId,
      successUrl: successUrl.toString(),
      cancelUrl: cancelUrl.toString(),
    }),
    headers: { 'Idempotency-Key': `${provider}:${orderId}` },
  });
  const checkoutUrl = provider === 'mercadopago'
    ? (response.init_point || response.url)
    : response.url;

  if (!checkoutUrl) {
    throw new Error(`El servicio de ${provider} no devolvió una URL de checkout.`);
  }

  window.location.assign(checkoutUrl);
  return response;
}

export function initiateMercadoPago(orderId) {
  return initiateCheckout(orderId, 'mercadopago');
}

export function initiateStripe(orderId) {
  return initiateCheckout(orderId, 'stripe');
}

export async function getOrderStatus(orderId, options = {}) {
  if (!orderId) throw new Error('Falta el identificador de la orden.');
  return requestApi(`/orders/${encodeURIComponent(orderId)}/status`, options);
}

export async function resolveOrderIdFromSession(sessionId) {
  if (!sessionId) throw new Error('Falta el identificador de la sesión de pago.');

  const response = await requestApi(
    `/payments/stripe/sessions/${encodeURIComponent(sessionId)}/order`,
  );
  if (!response.orderId) {
    throw new Error('No pudimos asociar la sesión de pago a una orden.');
  }
  return response.orderId;
}

export function getEstimatedArsAmount(amountUsd) {
  return Number(amountUsd) * USD_TO_ARS_ESTIMATE_RATE;
}
