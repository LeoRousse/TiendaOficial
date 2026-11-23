jest.mock('../firebase/firebaseConfig.js', () => ({
  auth: {
    currentUser: {
      uid: 'user-1',
      getIdToken: jest.fn().mockResolvedValue('firebase-id-token'),
    },
  },
}));

import { createPendingOrder } from './paymentService.js';

describe('createPendingOrder', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends unique course IDs and never trusts or sends client prices', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ orderId: 'order-123', status: 'pending' }),
    });

    await expect(createPendingOrder([
      { id: 'course-a', price: 4.99 },
      { id: 'course-b', price: 9999 },
    ], 'user-1', 'USD', 'request-key'))
      .resolves.toEqual({ orderId: 'order-123', status: 'pending' });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:4000/api/orders');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toMatch(/^Bearer .+/);
    expect(options.headers['Idempotency-Key']).toBe('request-key');
    expect(JSON.parse(options.body)).toEqual({
      courseIds: ['course-a', 'course-b'],
      userId: 'user-1',
      currency: 'USD',
    });
  });

  it('rejects duplicate course IDs before contacting the backend', async () => {
    await expect(createPendingOrder([
      { id: 'course-a' },
      { id: 'course-a' },
    ], 'user-1', 'USD'))
      .rejects.toThrow('El carrito contiene cursos duplicados o inválidos');

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('requires the backend to confirm a pending order', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ orderId: 'order-123', status: 'paid' }),
    });

    await expect(createPendingOrder([{ id: 'course-a' }], 'user-1', 'USD'))
      .rejects.toThrow('El servicio no confirmó una orden pendiente válida');
  });
});
