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
    let pollTimer;
    let deadlineTimer;
    let requestController;
    let remainingMs = MAX_POLL_DURATION_MS;
    let deadlineStartedAt = 0;
    let finished = false;

    setState({ status: 'checking', order: null, error: '' });

    const stopTimers = () => {
      window.clearTimeout(pollTimer);
      window.clearTimeout(deadlineTimer);
      pollTimer = undefined;
      deadlineTimer = undefined;
    };

    const timeOut = () => {
      finished = true;
      requestController?.abort();
      setState({
        status: 'timeout',
        order: null,
        error: 'El pago todavía está pendiente. Puedes volver a consultar el estado.',
      });
    };

    const scheduleDeadline = () => {
      if (!active || finished || document.visibilityState !== 'visible') return;
      deadlineStartedAt = Date.now();
      deadlineTimer = window.setTimeout(timeOut, remainingMs);
    };

    const pausePolling = () => {
      if (deadlineTimer) {
        remainingMs = Math.max(0, remainingMs - (Date.now() - deadlineStartedAt));
      }
      stopTimers();
      requestController?.abort();
      requestController = undefined;
    };

    const poll = async () => {
      if (!active || finished || document.visibilityState !== 'visible') return;
      if (remainingMs <= 0) {
        timeOut();
        return;
      }

      requestController = new AbortController();
      try {
        const order = await getOrderStatus(orderId, { signal: requestController.signal });
        if (!active || requestController.signal.aborted) return;

        const status = String(order.status || '').toLowerCase();
        if (status === 'paid' || FINAL_STATUSES.has(status)) {
          finished = true;
          stopTimers();
          setState({
            status,
            order,
            error: status === 'paid' ? '' : order.message || 'El pago no se completó.',
          });
          return;
        }

        setState({ status: 'pending', order, error: '' });
        if (document.visibilityState === 'visible') {
          pollTimer = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (error) {
        if (!active || error.name === 'AbortError') return;
        console.error('No se pudo consultar el estado de la orden', error);
        setState({
          status: 'checking',
          order: null,
          error: error.message || 'Reintentando la consulta del pago…',
        });
        if (document.visibilityState === 'visible') {
          pollTimer = window.setTimeout(poll, POLL_INTERVAL_MS);
        }
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        pausePolling();
        return;
      }
      if (finished) return;
      if (remainingMs <= 0) {
        timeOut();
        return;
      }
      scheduleDeadline();
      poll();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    if (document.visibilityState === 'visible') {
      scheduleDeadline();
      poll();
    }

    return () => {
      active = false;
      stopTimers();
      requestController?.abort();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [orderId, retryKey]);

  return state;
}

export default useOrderPolling;
