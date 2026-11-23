import { useEffect, useState } from 'react';
import { getOrderStatus } from '../services/paymentService.js';

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_DURATION_MS = 60000;
const FINAL_STATUSES = new Set(['paid', 'failed', 'cancelled', 'expired']);

function useOrderPolling(orderId, retryKey = 0) {
  const [state, setState] = useState({
    status: orderId ? 'checking' : 'idle',
    order: null,
    error: '',
  });

  useEffect(() => {
    if (!orderId) {
      setState({ status: 'idle', order: null, error: '' });
      return undefined;
    }

    let active = true;
    let timerId;
    let timeoutId;
    let timedOut = false;
    const controller = new AbortController();
    const startedAt = Date.now();
    setState({ status: 'checking', order: null, error: '' });

    timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
      setState({
        status: 'timeout',
        order: null,
        error: 'El pago todavía está pendiente. Puedes volver a consultar el estado.',
      });
    }, MAX_POLL_DURATION_MS);

    const stopDeadline = () => window.clearTimeout(timeoutId);

    const poll = async () => {
      try {
        const order = await getOrderStatus(orderId, { signal: controller.signal });
        if (!active) return;

        const status = String(order.status || '').toLowerCase();
        if (status === 'paid') {
          stopDeadline();
          setState({ status: 'paid', order, error: '' });
          return;
        }
        if (FINAL_STATUSES.has(status)) {
          stopDeadline();
          setState({
            status,
            order,
            error: order.message || 'El pago no se completó.',
          });
          return;
        }
        if (Date.now() - startedAt >= MAX_POLL_DURATION_MS) {
          stopDeadline();
          setState({
            status: 'timeout',
            order,
            error: 'El pago todavía está pendiente. Puedes volver a consultar el estado.',
          });
          return;
        }

        setState({ status: 'pending', order, error: '' });
        timerId = window.setTimeout(poll, POLL_INTERVAL_MS);
      } catch (error) {
        if (!active || timedOut) return;
        console.error('No se pudo consultar el estado de la orden', error);
        if (Date.now() - startedAt >= MAX_POLL_DURATION_MS) {
          stopDeadline();
          setState({
            status: 'timeout',
            order: null,
            error: error.message || 'No pudimos verificar el pago. Puedes volver a consultar.',
          });
          return;
        }

        setState({
          status: 'checking',
          order: null,
          error: error.message || 'Reintentando la consulta del pago…',
        });
        timerId = window.setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();
    return () => {
      active = false;
      window.clearTimeout(timerId);
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [orderId, retryKey]);

  return state;
}

export default useOrderPolling;
