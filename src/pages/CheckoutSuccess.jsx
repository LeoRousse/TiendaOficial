import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthContext.jsx';
import { useCart } from '../hooks/useCart.js';
import useOrderPolling from '../hooks/useOrderPolling.js';
import { resolveOrderIdFromSession } from '../services/paymentService.js';

function getPurchasedCourses(order) {
  if (Array.isArray(order?.courses)) {
    return order.courses
      .map((course) => (typeof course === 'string'
        ? { id: course, name: '' }
        : { id: course.courseId || course.id, name: course.name || course.courseName || '' }))
      .filter((course) => course.id);
  }
  if (Array.isArray(order?.courseIds)) {
    return order.courseIds.map((id) => ({ id, name: '' })).filter((course) => course.id);
  }
  if (Array.isArray(order?.unlockedCourseIds)) {
    return order.unlockedCourseIds
      .map((id) => ({ id, name: '' }))
      .filter((course) => course.id);
  }
  if (Array.isArray(order?.items)) {
    return order.items
      .map((item) => (typeof item === 'string'
        ? { id: item, name: '' }
        : { id: item.courseId || item.id, name: item.name || item.courseName || '' }))
      .filter((course) => course.id);
  }
  return [];
}

function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const initialOrderId = searchParams.get('orderId');
  const [orderId, setOrderId] = useState(initialOrderId || '');
  const [resolveError, setResolveError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const completionHandled = useRef(false);
  const { user, setPurchasedCourses } = useAuth();
  const { clearCart } = useCart();
  const polling = useOrderPolling(orderId, retryKey);

  useEffect(() => {
    if (initialOrderId || !sessionId) return undefined;

    let active = true;
    resolveOrderIdFromSession(sessionId)
      .then((resolvedOrderId) => {
        if (active) setOrderId(resolvedOrderId);
      })
      .catch((error) => {
        console.error('No se pudo resolver la sesión de pago', error);
        if (active) setResolveError(error.message || 'No pudimos encontrar la orden asociada al pago.');
      });

    return () => {
      active = false;
    };
  }, [initialOrderId, sessionId]);

  useEffect(() => {
    if (polling.status !== 'paid' || completionHandled.current) return;
    completionHandled.current = true;

    const purchasedCourses = getPurchasedCourses(polling.order);
    setPurchasedCourses((previousCourses) => Array.from(new Set([
      ...(Array.isArray(previousCourses) ? previousCourses : []),
      ...purchasedCourses.map((course) => course.id),
    ])));
    clearCart();
  }, [clearCart, polling.order, polling.status, setPurchasedCourses]);

  if (!user) {
    return (
      <main className="container checkout-result-page">
        <div className="checkout-result-card">
          <h1>Inicia sesión para verificar tu compra</h1>
          <p>Usa la misma cuenta con la que iniciaste el pago.</p>
          <Link to="/login" className="button is-primary">Iniciar sesión</Link>
        </div>
      </main>
    );
  }

  const purchasedCourses = getPurchasedCourses(polling.order);
  const isFailure = ['failed', 'cancelled', 'expired', 'error'].includes(polling.status);
  const errorMessage = resolveError || polling.error;

  return (
    <main className="container checkout-result-page">
      <section className={`checkout-result-card${polling.status === 'paid' ? ' is-success' : ''}`}>
        {polling.status === 'paid' ? (
          <>
            <span className="checkout-result-icon" aria-hidden="true">✓</span>
            <h1>¡Pago confirmado!</h1>
            <p>Tu compra fue verificada. Ya puedes entrar a tus cursos.</p>
            {purchasedCourses.length > 0 && (
              <ul className="checkout-access-list">
                {purchasedCourses.map((course) => (
                  <li key={course.id}>
                    <Link to={`/item/${course.id}`}>
                      {course.name ? `Abrir ${course.name}` : 'Abrir contenido del curso'}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/mis-cursos" className="button is-primary">Ir a mis cursos</Link>
          </>
        ) : isFailure ? (
          <>
            <h1>No pudimos confirmar el pago</h1>
            <p role="alert">{errorMessage || 'El proveedor informó que el pago no se completó.'}</p>
            <Link to="/cart" className="button is-primary">Volver al carrito</Link>
          </>
        ) : (
          <>
            <span className="checkout-poll-spinner" aria-hidden="true" />
            <h1>{polling.status === 'timeout' ? 'El pago sigue pendiente' : 'Verificando tu pago…'}</h1>
            <p role={errorMessage ? 'alert' : 'status'}>
              {errorMessage || 'Estamos esperando la confirmación segura de la pasarela.'}
            </p>
            {polling.status === 'timeout' || polling.status === 'error' || resolveError ? (
              <button
                type="button"
                className="button is-primary"
                onClick={() => {
                  setResolveError('');
                  if (orderId) {
                    setRetryKey((current) => current + 1);
                  } else if (sessionId) {
                    setOrderId('');
                    resolveOrderIdFromSession(sessionId)
                      .then(setOrderId)
                      .catch((error) => setResolveError(error.message));
                  }
                }}
              >
                Volver a consultar
              </button>
            ) : null}
          </>
        )}
      </section>
    </main>
  );
}

export default CheckoutSuccess;
