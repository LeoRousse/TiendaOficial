import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyMercadoPagoSignature({
  signature,
  requestId,
  paymentId,
  secret,
}) {
  if (!signature || !requestId || !paymentId || !secret) return false;

  const parts = Object.fromEntries(
    signature.split(',').map((part) => part.trim().split('=', 2)),
  );
  const timestamp = parts.ts;
  const receivedHash = parts.v1;
  if (!timestamp || !/^\d+$/.test(timestamp)
    || !receivedHash || !/^[a-f\d]{64}$/i.test(receivedHash)) return false;

  const manifest = `id:${String(paymentId).toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const expectedHash = createHmac('sha256', secret).update(manifest).digest();
  const actualHash = Buffer.from(receivedHash, 'hex');
  return actualHash.length === expectedHash.length && timingSafeEqual(actualHash, expectedHash);
}
