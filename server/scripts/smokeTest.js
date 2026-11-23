import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_BASE_URL = 'http://localhost:4000';

async function requestJson(fetchImpl, url, options) {
  let response;
  try {
    response = await fetchImpl(url, {
      ...options,
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw new Error(`No se pudo conectar con ${url}: ${error.message}`);
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    if (response.ok) throw new Error(`${url} devolvió una respuesta que no es JSON.`);
  }
  return { response, body };
}

export async function runSmokeTest({
  baseUrl = process.env.SMOKE_TEST_BASE_URL || DEFAULT_BASE_URL,
  fetchImpl = fetch,
} = {}) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  const checks = [];
  const health = await requestJson(fetchImpl, `${normalizedBaseUrl}/health`);
  if (health.response.status !== 200 || health.body?.status !== 'ok') {
    throw new Error(`GET /health falló (HTTP ${health.response.status}).`);
  }
  checks.push('GET /health devuelve HTTP 200.');

  const catalogResult = await requestJson(fetchImpl, `${normalizedBaseUrl}/api/catalog`);
  const items = catalogResult.body?.items;
  const exchangeRate = Number(catalogResult.body?.currencyExchangeRate);
  if (catalogResult.response.status !== 200
    || !Array.isArray(items)
    || items.length !== 9
    || !Number.isFinite(exchangeRate)
    || exchangeRate <= 0) {
    throw new Error(`GET /api/catalog debe devolver 9 cursos y la tasa ARS/USD (HTTP ${catalogResult.response.status}).`);
  }
  for (const item of items) {
    const expectedArs = Math.round((Number(item.priceUsd) * exchangeRate + Number.EPSILON) * 100) / 100;
    if (!item.id || !item.name
      || !Number.isFinite(Number(item.priceUsd)) || Number(item.priceUsd) <= 0
      || Number(item.priceArs) !== expectedArs) {
      throw new Error(`GET /api/catalog devolvió precio inválido para ${item.id || 'curso desconocido'}.`);
    }
  }
  checks.push(`GET /api/catalog devuelve 9 cursos con precios USD/ARS coherentes (tasa ${exchangeRate}).`);

  const orderRequest = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `smoke-test-${Date.now()}`,
    },
    body: JSON.stringify({
      courseIds: [items[0].id],
      userId: 'smoke-test-user',
      currency: 'USD',
    }),
  };
  const noToken = await requestJson(fetchImpl, `${normalizedBaseUrl}/api/orders`, orderRequest);
  if (![401, 403].includes(noToken.response.status)) {
    throw new Error(`POST /api/orders sin token debe rechazarse con HTTP 401/403; recibió ${noToken.response.status}.`);
  }

  const invalidToken = await requestJson(fetchImpl, `${normalizedBaseUrl}/api/orders`, {
    ...orderRequest,
    headers: { ...orderRequest.headers, Authorization: 'Bearer invalid-smoke-test-token' },
  });
  if (![401, 403].includes(invalidToken.response.status)) {
    throw new Error(`POST /api/orders con token inválido debe rechazarse con HTTP 401/403; recibió ${invalidToken.response.status}.`);
  }
  checks.push(`POST /api/orders rechaza solicitudes sin token y con token inválido (HTTP ${noToken.response.status}/${invalidToken.response.status}).`);

  return checks;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  runSmokeTest()
    .then((checks) => {
      checks.forEach((check) => console.log(`✓ ${check}`));
      console.log('Smoke test completado.');
    })
    .catch((error) => {
      console.error(`✗ Smoke test: ${error.message}`);
      process.exitCode = 1;
    });
}
