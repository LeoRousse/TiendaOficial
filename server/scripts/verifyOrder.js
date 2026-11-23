import Database from 'better-sqlite3';
import { config } from '../src/config/env.js';

const [orderId, expectedUid] = process.argv.slice(2);
if (!orderId) {
  console.error('Uso: npm run verify:order -- <orderId> [firebaseUidEsperado]');
  process.exitCode = 1;
} else {
  const db = new Database(config.databasePath, { readonly: true });
  try {
    const row = db.prepare(`
      SELECT order_id, user_id, status, currency, total_amount, course_ids,
             provider, provider_payment_id, updated_at
      FROM orders
      WHERE order_id = ?
    `).get(orderId);

    if (!row) {
      console.error(`No existe la orden ${orderId} en ${config.databasePath}.`);
      process.exitCode = 1;
    } else {
      const result = {
        orderId: row.order_id,
        firebaseUid: row.user_id,
        expectedUidMatches: expectedUid ? row.user_id === expectedUid : undefined,
        status: row.status,
        currency: row.currency,
        totalAmount: row.total_amount / 100,
        unlockedCourseIds: row.status === 'paid' ? JSON.parse(row.course_ids) : [],
        provider: row.provider,
        providerPaymentId: row.provider_payment_id,
        updatedAt: row.updated_at,
      };
      console.log(JSON.stringify(result, null, 2));
      if (expectedUid && row.user_id !== expectedUid) {
        console.error('La orden no pertenece al Firebase UID esperado.');
        process.exitCode = 1;
      }
    }
  } finally {
    db.close();
  }
}
