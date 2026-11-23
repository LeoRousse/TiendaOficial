import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { validateEnvironment } from './checkEnv.js';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

const validSandboxEnvironment = {
  FIREBASE_PROJECT_ID: 'tienda-quiroga-test',
  FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk-test@tienda-quiroga-test.iam.gserviceaccount.com',
  FIREBASE_PRIVATE_KEY: privateKey.replace(/\n/g, '\\n'),
  MP_ACCESS_TOKEN: 'TEST-example-sandbox-access-token',
  MP_WEBHOOK_SECRET: 'example-mercadopago-webhook-secret',
  STRIPE_SECRET_KEY: 'sk_test_example',
  STRIPE_WEBHOOK_SECRET: 'whsec_example_local_listener_secret',
  CLIENT_URL: 'http://localhost:3000',
  SERVER_PUBLIC_URL: 'https://example.ngrok-free.app',
  ARS_EXCHANGE_RATE: '1200',
};

describe('checkEnv', () => {
  it('accepts test credentials and a private key with escaped newlines', () => {
    expect(validateEnvironment(validSandboxEnvironment)).toEqual([]);
  });

  it('reports all missing variables without printing their values', () => {
    const errors = validateEnvironment({});
    expect(errors).toHaveLength(10);
    expect(errors.some((error) => error.includes('FIREBASE_PRIVATE_KEY'))).toBe(true);
    expect(errors.join(' ')).not.toContain('TEST-');
  });

  it('rejects live payment credentials, an invalid tunnel URL, and a bad exchange rate', () => {
    const errors = validateEnvironment({
      ...validSandboxEnvironment,
      MP_ACCESS_TOKEN: 'APP_USR-production-token',
      STRIPE_SECRET_KEY: 'sk_live_production-key',
      SERVER_PUBLIC_URL: 'http://localhost:4000',
      ARS_EXCHANGE_RATE: 'not-a-number',
    });

    expect(errors.some((error) => error.includes('MP_ACCESS_TOKEN'))).toBe(true);
    expect(errors.some((error) => error.includes('STRIPE_SECRET_KEY'))).toBe(true);
    expect(errors.some((error) => error.includes('SERVER_PUBLIC_URL'))).toBe(true);
    expect(errors.some((error) => error.includes('ARS_EXCHANGE_RATE'))).toBe(true);
  });
});
