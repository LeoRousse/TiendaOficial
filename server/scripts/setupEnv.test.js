import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough, Writable } from 'node:stream';
import dotenv from 'dotenv';
import { afterEach, describe, expect, it } from 'vitest';
import { normalizePrivateKey, setupEnv } from './setupEnv.js';

const temporaryDirectories = [];

function createTemporaryFiles() {
  const directory = mkdtempSync(join(tmpdir(), 'tienda-quiroga-setup-'));
  temporaryDirectories.push(directory);
  const examplePath = join(directory, '.env.example');
  const envPath = join(directory, '.env');
  writeFileSync(examplePath, [
    'FIREBASE_PROJECT_ID=',
    'FIREBASE_CLIENT_EMAIL=',
    'FIREBASE_PRIVATE_KEY=',
    'MP_ACCESS_TOKEN=',
    'MP_WEBHOOK_SECRET=',
    'STRIPE_SECRET_KEY=',
    'STRIPE_WEBHOOK_SECRET=',
    'SERVER_PUBLIC_URL=',
    'ARS_EXCHANGE_RATE=1000',
    '',
  ].join('\n'));
  return { examplePath, envPath };
}

afterEach(() => {
  temporaryDirectories.splice(0).forEach((directory) => {
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('setupEnv', () => {
  it('copies the template and saves supplied values with a normalized PEM key', async () => {
    const files = createTemporaryFiles();
    const privateKey = '-----BEGIN PRIVATE KEY-----\\nexample-key\\n-----END PRIVATE KEY-----';
    const args = [
      '--FIREBASE_PROJECT_ID=tienda-quiroga-test',
      '--FIREBASE_CLIENT_EMAIL=admin@tienda-quiroga-test.iam.gserviceaccount.com',
      `--FIREBASE_PRIVATE_KEY=${privateKey}`,
      '--MP_ACCESS_TOKEN=TEST-sandbox-token',
      '--MP_WEBHOOK_SECRET=mercado-pago-webhook-secret',
      '--STRIPE_SECRET_KEY=sk_test_sandbox',
      '--STRIPE_WEBHOOK_SECRET=whsec_sandbox-secret',
      '--SERVER_PUBLIC_URL=https://test-tunnel.example.net',
      '--ARS_EXCHANGE_RATE=1200',
    ];

    await setupEnv({
      args,
      input: new PassThrough(),
      output: new PassThrough(),
      targetEnvPath: files.envPath,
      sourceExamplePath: files.examplePath,
    });

    const saved = dotenv.parse(readFileSync(files.envPath, 'utf8'));
    expect(saved.FIREBASE_PRIVATE_KEY).toBe(normalizePrivateKey(privateKey));
    expect(saved.FIREBASE_PRIVATE_KEY).toContain('\n');
    expect(saved.STRIPE_SECRET_KEY).toBe('sk_test_sandbox');
    expect(saved.SERVER_PUBLIC_URL).toBe('https://test-tunnel.example.net');
    expect(saved.ARS_EXCHANGE_RATE).toBe('1200');
  });

  it('supports copying the template without entering or modifying credentials', async () => {
    const files = createTemporaryFiles();
    await setupEnv({
      args: ['--copy-only'],
      input: new PassThrough(),
      output: new PassThrough(),
      targetEnvPath: files.envPath,
      sourceExamplePath: files.examplePath,
    });
    expect(readFileSync(files.envPath, 'utf8')).toBe(readFileSync(files.examplePath, 'utf8'));
  });

  it('prompts for missing values and does not echo secret answers', async () => {
    const files = createTemporaryFiles();
    const answers = [
      'tienda-quiroga-test',
      'admin@tienda-quiroga-test.iam.gserviceaccount.com',
      '-----BEGIN PRIVATE KEY-----\\nprivate-value\\n-----END PRIVATE KEY-----',
      'TEST-sandbox-token',
      'mercado-pago-webhook-secret',
      'sk_test_sandbox',
      'whsec_sandbox-secret',
      'https://test-tunnel.example.net',
      '',
    ];
    const outputChunks = [];
    const input = new PassThrough();
    const answersByName = new Map([
      ['FIREBASE_PROJECT_ID', answers[0]],
      ['FIREBASE_CLIENT_EMAIL', answers[1]],
      ['FIREBASE_PRIVATE_KEY', answers[2]],
      ['MP_ACCESS_TOKEN', answers[3]],
      ['MP_WEBHOOK_SECRET', answers[4]],
      ['STRIPE_SECRET_KEY', answers[5]],
      ['STRIPE_WEBHOOK_SECRET', answers[6]],
      ['SERVER_PUBLIC_URL', answers[7]],
      ['ARS_EXCHANGE_RATE', answers[8]],
    ]);
    const output = new Writable({
      write(chunk, _encoding, callback) {
        const text = chunk.toString();
        outputChunks.push(text);
        const match = /\(([A-Z_]+)\)\s+\[[^\]]+\]: $/.exec(text);
        callback();
        if (match) setImmediate(() => input.write(`${answersByName.get(match[1])}\n`));
      },
    });

    await setupEnv({
      input,
      output,
      targetEnvPath: files.envPath,
      sourceExamplePath: files.examplePath,
    });

    const saved = dotenv.parse(readFileSync(files.envPath, 'utf8'));
    const promptOutput = outputChunks.join('');
    expect(saved.FIREBASE_PRIVATE_KEY).toContain('\nprivate-value\n');
    expect(saved.STRIPE_SECRET_KEY).toBe('sk_test_sandbox');
    expect(promptOutput).not.toContain('private-value');
    expect(promptOutput).not.toContain('TEST-sandbox-token');
    expect(promptOutput).not.toContain('mercado-pago-webhook-secret');
    expect(promptOutput).not.toContain('sk_test_sandbox');
  });

  it('normalizes escaped and Windows-style newline sequences', () => {
    expect(normalizePrivateKey('line one\\r\\nline two\\n')).toBe('line one\nline two');
  });
});
