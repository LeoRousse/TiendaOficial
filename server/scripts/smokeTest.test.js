import { describe, expect, it, vi } from 'vitest';
import { runSmokeTest } from './smokeTest.js';

function jsonResponse(status, body) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  };
}

describe('smoke test', () => {
  it('checks health, all priced catalog entries, and both auth rejection cases', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(200, {
        currencyExchangeRate: 1200,
        items: Array.from({ length: 9 }, (_, index) => ({
          id: `course-${index}`,
          name: `Course ${index}`,
          priceUsd: 10,
          priceArs: 12000,
        })),
      }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }))
      .mockResolvedValueOnce(jsonResponse(401, { message: 'Unauthorized' }));

    const checks = await runSmokeTest({ fetchImpl });
    expect(checks).toHaveLength(3);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(fetchImpl.mock.calls[0][0]).toBe('http://localhost:4000/health');
    expect(fetchImpl.mock.calls[1][0]).toBe('http://localhost:4000/api/catalog');
  });

  it('fails when the public catalog does not contain nine courses', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(200, {
        currencyExchangeRate: 1000,
        items: [],
      }));

    await expect(runSmokeTest({ fetchImpl }))
      .rejects.toThrow('GET /api/catalog debe devolver 9 cursos');
  });

  it('fails if the orders endpoint permits a request without authentication', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(jsonResponse(200, { status: 'ok' }))
      .mockResolvedValueOnce(jsonResponse(200, {
        currencyExchangeRate: 1000,
        items: Array.from({ length: 9 }, (_, index) => ({
          id: `course-${index}`,
          name: `Course ${index}`,
          priceUsd: 1,
          priceArs: 1000,
        })),
      }))
      .mockResolvedValueOnce(jsonResponse(201, { orderId: 'unexpected-order' }));

    await expect(runSmokeTest({ fetchImpl }))
      .rejects.toThrow('POST /api/orders sin token debe rechazarse');
  });
});
