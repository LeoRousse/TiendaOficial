import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineCreditCard, AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useAuth } from './AuthContext.jsx';
import { useCart } from '../hooks/useCart.js';
import {
  createPendingOrder,
  getEstimatedArsAmount,
  initiateMercadoPago,
  initiateStripe,
} from '../services/paymentService.js';

function CheckoutButtons({ compact = false }) {
  const { user } = useAuth();
  const { cart, subtotalUsd, totalQuantity } = useCart();
  const [loadingProvider, setLoadingProvider] = useState('');
  const [error, setError] = useState('');
  const isSubmittingRef = useRef(false);
  const pendingOrdersRef = useRef({});
  const cartKey = cart.map((item) => item.id).sort().join('|');

  const startCheckout = async (provider, currency) => {
    if (isSubmittingRef.current || totalQuantity === 0 || !user) return;

    isSubmittingRef.current = true;
    setLoadingProvider(provider);
    setError('');

    try {
      const cachedOrder = pendingOrdersRef.current[currency];
      let orderId = cachedOrder?.cartKey === cartKey ? cachedOrder.orderId : '';
      if (!orderId) {
        const idempotencyKey = cachedOrder?.cartKey === cartKey
          ? cachedOrder.idempotencyKey
          : window.crypto.randomUUID();
        pendingOrdersRef.current[currency] = { cartKey, idempotencyKey };
        const order = await createPendingOrder(cart, user.uid, currency, idempotencyKey);
        orderId = order.orderId;
        pendingOrdersRef.current[currency] = { cartKey, orderId, idempotencyKey };
      }

      if (provider === 'mercadopago') {
        await initiateMercadoPago(orderId);
      } else {
        await initiateStripe(orderId);
      }
    } catch (requestError) {
      console.error(`No se pudo iniciar el checkout con ${provider}`, requestError);
      setError(requestError.message || 'No pudimos iniciar el pago. Intenta nuevamente.');
    } finally {
      isSubmittingRef.current = false;
      setLoadingProvider('');
    }
  };

  if (!user) {
    return (
      <div className={`checkout-auth-prompt${compact ? ' is-compact' : ''}`}>
        <p>Inicia sesión para crear una orden segura y pagar.</p>
        <Link to="/login" className="checkout-login-link">Iniciar sesión</Link>
      </div>
    );
  }

  return (
    <div className={`checkout-buttons${compact ? ' is-compact' : ''}`}>
      {error && <p className="checkout-payment-error" role="alert">{error}</p>}
      <button
        type="button"
        className="checkout-provider-button is-mercadopago"
        onClick={() => startCheckout('mercadopago', 'ARS')}
        disabled={Boolean(loadingProvider) || totalQuantity === 0}
      >
        {loadingProvider === 'mercadopago'
          ? <AiOutlineLoading3Quarters className="checkout-loading-icon" />
          : <AiOutlineCreditCard />}
        <span>
          <strong>{loadingProvider === 'mercadopago' ? 'Preparando orden…' : 'Pagar con Mercado Pago'}</strong>
          <small>ARS · estimado ${getEstimatedArsAmount(subtotalUsd).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</small>
        </span>
      </button>
      <button
        type="button"
        className="checkout-provider-button is-stripe"
        onClick={() => startCheckout('stripe', 'USD')}
        disabled={Boolean(loadingProvider) || totalQuantity === 0}
      >
        {loadingProvider === 'stripe'
          ? <AiOutlineLoading3Quarters className="checkout-loading-icon" />
          : <AiOutlineCreditCard />}
        <span>
          <strong>{loadingProvider === 'stripe' ? 'Preparando orden…' : 'Pagar con Stripe'}</strong>
          <small>USD · ${Number(subtotalUsd).toLocaleString('en-US', { minimumFractionDigits: 2 })}</small>
        </span>
      </button>
      <p className="checkout-payment-note">
        El total definitivo se calcula y valida de forma segura en el servidor.
      </p>
    </div>
  );
}

export default CheckoutButtons;
