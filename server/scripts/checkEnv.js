import { createPrivateKey } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

export function validateEnvironment(env) {
  const errors = [];
  const required = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_PRIVATE_KEY',
    'MP_ACCESS_TOKEN',
    'MP_WEBHOOK_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'CLIENT_URL',
    'SERVER_PUBLIC_URL',
    'ARS_EXCHANGE_RATE',
  ];

  for (const name of required) {
    if (!env[name]?.trim()) errors.push(`${name}: falta definirla en server/.env.`);
  }
  if (env.FIREBASE_PROJECT_ID
    && !/^[a-z0-9][a-z0-9-]{4,28}[a-z0-9]$/.test(env.FIREBASE_PROJECT_ID)) {
    errors.push('FIREBASE_PROJECT_ID: formato de project ID no válido.');
  }
  if (env.FIREBASE_CLIENT_EMAIL
    && !/^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(env.FIREBASE_CLIENT_EMAIL)) {
    errors.push('FIREBASE_CLIENT_EMAIL: debe ser el correo de una cuenta de servicio de Firebase.');
  }

  if (env.FIREBASE_PRIVATE_KEY) {
    const normalizedPrivateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').trim();
    if (!normalizedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')
      || !normalizedPrivateKey.includes('-----END PRIVATE KEY-----')) {
      errors.push('FIREBASE_PRIVATE_KEY: debe ser una clave PEM; conserva los saltos como \\n en server/.env.');
    } else {
      try {
        createPrivateKey(normalizedPrivateKey);
      } catch {
        errors.push('FIREBASE_PRIVATE_KEY: PEM inválido o con saltos de línea mal formados.');
      }
    }
  }

  if (env.MP_ACCESS_TOKEN && !env.MP_ACCESS_TOKEN.startsWith('TEST-')) {
    errors.push('MP_ACCESS_TOKEN: en pruebas locales debe ser una credencial TEST-; se detectó una posible credencial de producción.');
  }
  if (env.MP_WEBHOOK_SECRET && env.MP_WEBHOOK_SECRET.length < 16) {
    errors.push('MP_WEBHOOK_SECRET: falta o es demasiado corto; cópialo desde la configuración de Webhooks.');
  }

  if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith('sk_test_')) {
    errors.push('STRIPE_SECRET_KEY: en pruebas locales debe comenzar con sk_test_; no uses una clave live.');
  }
  if (env.STRIPE_WEBHOOK_SECRET
    && (!env.STRIPE_WEBHOOK_SECRET.startsWith('whsec_') || env.STRIPE_WEBHOOK_SECRET.length < 20)) {
    errors.push('STRIPE_WEBHOOK_SECRET: debe comenzar con whsec_ y ser el secreto del listener/endpoint local.');
  }

  if (env.CLIENT_URL && env.CLIENT_URL !== 'http://localhost:3000') {
    errors.push('CLIENT_URL: para este entorno local debe ser exactamente http://localhost:3000.');
  }
  if (env.SERVER_PUBLIC_URL) {
    try {
      const publicUrl = new URL(env.SERVER_PUBLIC_URL);
      if (publicUrl.protocol !== 'https:'
        || !publicUrl.hostname
        || publicUrl.hostname === 'localhost'
        || publicUrl.hostname.endsWith('.example.com')) {
        errors.push('SERVER_PUBLIC_URL: usa la URL HTTPS pública actual del túnel (no localhost ni el placeholder).');
      }
    } catch {
      errors.push('SERVER_PUBLIC_URL: debe ser una URL HTTPS válida del túnel público.');
    }
  }

  const exchangeRate = Number(env.ARS_EXCHANGE_RATE);
  if (env.ARS_EXCHANGE_RATE
    && (!Number.isFinite(exchangeRate) || exchangeRate <= 0)) {
    errors.push('ARS_EXCHANGE_RATE: debe ser un número mayor que cero.');
  }

  return errors;
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && resolve(process.argv[1]) === resolve(scriptPath)) {
  if (process.env.NODE_ENV === 'production') {
    console.log('Validación de credenciales sandbox omitida en producción; el servidor valida su configuración de producción al iniciar.');
  } else {
    const envPath = fileURLToPath(new URL('../.env', import.meta.url));
    if (!existsSync(envPath)) {
    console.error('Falta server/.env. Copia server/.env.example y completa las credenciales sandbox.');
    process.exitCode = 1;
    } else {
      const errors = validateEnvironment(dotenv.parse(readFileSync(envPath)));
      if (errors.length > 0) {
        console.error('Configuración local incompleta o inválida:');
        errors.forEach((error) => console.error(`- ${error}`));
        process.exitCode = 1;
      } else {
        console.log('Configuración sandbox local válida. No se muestran valores secretos.');
      }
    }
  }
}
