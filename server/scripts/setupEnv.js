import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { Writable } from 'node:stream';
import { stdin, stdout } from 'node:process';
import dotenv from 'dotenv';

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));
const envPath = resolve(scriptDirectory, '../.env');
const examplePath = resolve(scriptDirectory, '../.env.example');
const setupFields = [
  ['FIREBASE_PROJECT_ID', 'Firebase project ID', false],
  ['FIREBASE_CLIENT_EMAIL', 'Firebase service-account email', false],
  ['FIREBASE_PRIVATE_KEY', 'Firebase service-account private key PEM', true],
  ['MP_ACCESS_TOKEN', 'Mercado Pago TEST access token', true],
  ['MP_WEBHOOK_SECRET', 'Mercado Pago webhook signing secret', true],
  ['STRIPE_SECRET_KEY', 'Stripe sk_test_ secret key', true],
  ['STRIPE_WEBHOOK_SECRET', 'Stripe local listener whsec_ secret', true],
  ['SERVER_PUBLIC_URL', 'Public HTTPS tunnel URL', false],
  ['ARS_EXCHANGE_RATE', 'ARS per USD exchange rate', false],
];

export function normalizePrivateKey(value) {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();
}

function parseArguments(args) {
  const values = new Map();
  let copyOnly = false;
  const allowedFields = new Set(setupFields.map(([name]) => name));
  for (const argument of args) {
    if (argument === '--copy-only') {
      copyOnly = true;
      continue;
    }
    const match = /^--([A-Z_]+)=(.*)$/s.exec(argument);
    if (!match) {
      throw new Error(`Argumento no reconocido: ${argument}. Usa --VARIABLE=valor o --copy-only.`);
    }
    if (!allowedFields.has(match[1])) {
      throw new Error(`Variable no admitida por el asistente: ${match[1]}.`);
    }
    values.set(match[1], match[2]);
  }
  return { values, copyOnly };
}

export async function setupEnv({
  args = [],
  input = stdin,
  output = stdout,
  targetEnvPath = envPath,
  sourceExamplePath = examplePath,
} = {}) {
  const { values, copyOnly } = parseArguments(args);
  if (!existsSync(sourceExamplePath)) {
    throw new Error('No se encontró server/.env.example.');
  }

  if (!existsSync(targetEnvPath)) {
    copyFileSync(sourceExamplePath, targetEnvPath);
    output.write('Creado server/.env desde server/.env.example.\n');
  }
  if (copyOnly) return targetEnvPath;

  const existingText = readFileSync(targetEnvPath, 'utf8');
  const currentValues = dotenv.parse(existingText);
  const nextValues = { ...currentValues };
  let hideInput = false;
  const promptOutput = new Writable({
    write(chunk, _encoding, callback) {
      if (!hideInput) output.write(chunk);
      callback();
    },
  });
  promptOutput.isTTY = Boolean(input.isTTY);
  promptOutput.columns = output.columns;
  const readline = createInterface({
    input,
    output: promptOutput,
    terminal: Boolean(input.isTTY),
  });
  try {
    for (const [name, label, secret] of setupFields) {
      if (values.has(name)) {
        nextValues[name] = values.get(name).trim();
        continue;
      }

      const current = currentValues[name]?.trim();
      const hasCurrentValue = Boolean(
        current && !/(your-|replace-with-|\.\.\.|example\.com)/i.test(current),
      );
      const hint = hasCurrentValue ? 'configured; press Enter to keep' : 'required';
      const prompt = `${label} (${name}) [${secret ? 'input hidden' : hint}]: `;
      output.write(prompt);
      hideInput = secret;
      let answer;
      try {
        answer = await readline.question('');
      } finally {
        if (secret) output.write('\n');
        hideInput = false;
      }
      if (answer.trim()) nextValues[name] = answer;
      else if (!hasCurrentValue && secret) nextValues[name] = '';
    }
  } finally {
    readline.close();
  }

  if (nextValues.FIREBASE_PRIVATE_KEY) {
    nextValues.FIREBASE_PRIVATE_KEY = normalizePrivateKey(nextValues.FIREBASE_PRIVATE_KEY);
  }

  const outputLines = existingText.split(/\r?\n/).map((line) => {
    const match = /^\s*([A-Z_]+)\s*=/.exec(line);
    if (!match || !(match[1] in nextValues)) return line;
    return `${match[1]}=${JSON.stringify(nextValues[match[1]])}`;
  });
  writeFileSync(targetEnvPath, outputLines.join('\n'), { encoding: 'utf8', mode: 0o600 });
  output.write('Actualizado server/.env. No se imprimieron valores secretos.\n');
  return targetEnvPath;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  setupEnv({ args: process.argv.slice(2) }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
