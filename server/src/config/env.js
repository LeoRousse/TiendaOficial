import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

dotenv.config({
  path: fileURLToPath(new URL('../../.env', import.meta.url)),
  override: true,
});

const port = Number(process.env.PORT || 4000);
const isProduction = process.env.NODE_ENV === 'production';
const arsExchangeRate = Number(
  process.env.ARS_EXCHANGE_RATE || process.env.ARS_PER_USD_RATE || 1000,
);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT debe ser un puerto válido.');
}

if (isProduction) {
  const requiredVariables = [
    'CLIENT_URL',
    'SERVER_PUBLIC_URL',
    'ARS_EXCHANGE_RATE',
    'MP_ACCESS_TOKEN',
    'MP_WEBHOOK_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];
  const missingVariables = requiredVariables.filter((key) => !process.env[key]);
  if (missingVariables.length > 0) {
    throw new Error(`Faltan variables de producción: ${missingVariables.join(', ')}`);
  }
  if (!process.env.CLIENT_URL.startsWith('https://')
    || !process.env.SERVER_PUBLIC_URL.startsWith('https://')) {
    throw new Error('CLIENT_URL y SERVER_PUBLIC_URL deben usar HTTPS en producción.');
  }
}

export const config = {
  port,
  clientUrl: (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  serverPublicUrl: (process.env.SERVER_PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
  databasePath: resolve(process.env.DATABASE_PATH || fileURLToPath(
    new URL('../../data/orders.sqlite', import.meta.url),
  )),
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
  firebaseClientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  firebasePrivateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  mpAccessToken: process.env.MP_ACCESS_TOKEN,
  mpWebhookSecret: process.env.MP_WEBHOOK_SECRET,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY,
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  geminiApiKey: process.env.GEMINI_API_KEY,
  arsPerUsd: arsExchangeRate,
};

if (!Number.isFinite(config.arsPerUsd) || config.arsPerUsd <= 0) {
  throw new Error('ARS_EXCHANGE_RATE debe ser mayor que cero.');
}
