import Database from 'better-sqlite3';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

function stableOrderHash(courseIds, currency) {
  return createHash('sha256')
    .update(JSON.stringify({ courseIds: [...courseIds].sort(), currency }))
    .digest('hex');
}

export function createOrderStore(databasePath) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
  const db = new Database(databasePath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      idempotency_key TEXT NOT NULL,
      request_hash TEXT NOT NULL,
      course_ids TEXT NOT NULL,
      items TEXT NOT NULL,
      currency TEXT NOT NULL,
      total_amount INTEGER NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'expired')),
      provider TEXT,
      provider_payment_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE (user_id, idempotency_key)
    );
    CREATE TABLE IF NOT EXISTS provider_events (
      provider TEXT NOT NULL,
      event_id TEXT NOT NULL,
      processed_at TEXT NOT NULL,
      PRIMARY KEY (provider, event_id)
    );
  `);

  const findByIdempotency = db.prepare(
    'SELECT * FROM orders WHERE user_id = ? AND idempotency_key = ?',
  );
  const findById = db.prepare('SELECT * FROM orders WHERE order_id = ?');

  function toPublicOrder(row) {
    if (!row) return null;
    return {
      orderId: row.order_id,
      userId: row.user_id,
      courseIds: JSON.parse(row.course_ids),
      items: JSON.parse(row.items),
      currency: row.currency,
      totalAmount: row.total_amount,
      status: row.status,
      provider: row.provider,
      providerPaymentId: row.provider_payment_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const createOrGetOrder = db.transaction(({
    userId, idempotencyKey, courseIds, items, currency, totalAmount,
  }) => {
    const requestHash = stableOrderHash(courseIds, currency);
    const existing = findByIdempotency.get(userId, idempotencyKey);
    if (existing) {
      if (existing.request_hash !== requestHash) {
        const error = new Error('La clave de idempotencia ya se usó para otra orden.');
        error.status = 409;
        throw error;
      }
      return toPublicOrder(existing);
    }

    const now = new Date().toISOString();
    const orderId = randomUUID();
    db.prepare(`
      INSERT INTO orders (
        order_id, user_id, idempotency_key, request_hash, course_ids,
        items, currency, total_amount, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      orderId,
      userId,
      idempotencyKey,
      requestHash,
      JSON.stringify(courseIds),
      JSON.stringify(items),
      currency,
      totalAmount,
      now,
      now,
    );
    return toPublicOrder(findById.get(orderId));
  });

  const fulfillOrderTransaction = db.transaction(({
    orderId, provider, providerPaymentId, eventId,
  }) => {
    if (eventId) {
      const event = db.prepare(
        'SELECT 1 FROM provider_events WHERE provider = ? AND event_id = ?',
      ).get(provider, eventId);
      if (event) return { order: toPublicOrder(findById.get(orderId)), alreadyProcessed: true };
    }

    const order = findById.get(orderId);
    if (!order) {
      const error = new Error('La orden asociada al pago no existe.');
      error.status = 404;
      throw error;
    }

    const now = new Date().toISOString();
    if (order.status === 'pending') {
      db.prepare(`
        UPDATE orders
        SET status = 'paid', provider = ?, provider_payment_id = ?, updated_at = ?
        WHERE order_id = ? AND status = 'pending'
      `).run(provider, providerPaymentId, now, orderId);
    } else if (order.status === 'paid' && order.provider_payment_id !== providerPaymentId) {
      const error = new Error('La orden ya fue pagada con otra transacción.');
      error.status = 409;
      throw error;
    }

    if (eventId) {
      db.prepare(
        'INSERT OR IGNORE INTO provider_events (provider, event_id, processed_at) VALUES (?, ?, ?)',
      ).run(provider, eventId, now);
    }
    return { order: toPublicOrder(findById.get(orderId)), alreadyProcessed: order.status === 'paid' };
  });

  function getOrder(orderId) {
    return toPublicOrder(findById.get(orderId));
  }

  function getOrderByProviderPayment(provider, providerPaymentId) {
    const row = db.prepare(
      'SELECT * FROM orders WHERE provider = ? AND provider_payment_id = ?',
    ).get(provider, providerPaymentId);
    return toPublicOrder(row);
  }

  function close() {
    db.close();
  }

  return {
    close,
    createOrGetOrder,
    fulfillOrder: fulfillOrderTransaction,
    getOrder,
    getOrderByProviderPayment,
  };
}
