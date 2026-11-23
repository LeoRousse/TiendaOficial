import Database from 'better-sqlite3';
import { randomUUID, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const PENDING_ORDER_MAX_AGE_MS = 24 * 60 * 60 * 1000;

function stableOrderHash(courseIds, currency) {
  return createHash('sha256')
    .update(JSON.stringify({ courseIds: [...courseIds].sort(), currency }))
    .digest('hex');
}

function getDiscountedItems(items, courseIds) {
  const amounts = items.map((item) => Math.round((Number(item.price) + Number.EPSILON) * 100));
  const subtotalAmount = amounts.reduce((total, amount) => total + amount, 0);
  const discountAmount = new Set(courseIds).size >= 2
    ? Math.round(subtotalAmount * 0.15)
    : 0;
  const allocations = amounts.map((amount, index) => {
    const exactShare = subtotalAmount === 0 ? 0 : (amount * discountAmount) / subtotalAmount;
    return { index, amount: Math.floor(exactShare), remainder: exactShare - Math.floor(exactShare) };
  });
  let unallocated = discountAmount - allocations.reduce((total, item) => total + item.amount, 0);
  allocations
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index)
    .slice(0, unallocated)
    .forEach((allocation) => {
      allocation.amount += 1;
      unallocated -= 1;
    });

  const discountsByIndex = new Map(allocations.map(({ index, amount }) => [index, amount]));
  return {
    subtotalAmount,
    discountAmount,
    totalAmount: subtotalAmount - discountAmount,
    items: items.map((item, index) => ({
      ...item,
      price: (amounts[index] - discountsByIndex.get(index)) / 100,
    })),
  };
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
      subtotal_amount INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
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
    CREATE TABLE IF NOT EXISTS course_progress (
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, course_id, lesson_id)
    );
    CREATE TABLE IF NOT EXISTS unlocked_courses (
      user_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      order_id TEXT NOT NULL,
      unlocked_at TEXT NOT NULL,
      PRIMARY KEY (user_id, course_id),
      FOREIGN KEY (order_id) REFERENCES orders(order_id)
    );
  `);
  const orderColumns = new Set(db.pragma('table_info(orders)').map(({ name }) => name));
  if (!orderColumns.has('subtotal_amount')) {
    db.exec('ALTER TABLE orders ADD COLUMN subtotal_amount INTEGER NOT NULL DEFAULT 0');
  }
  if (!orderColumns.has('discount_amount')) {
    db.exec('ALTER TABLE orders ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0');
  }
  db.exec(`
    UPDATE orders
    SET subtotal_amount = total_amount
    WHERE subtotal_amount = 0 AND total_amount != 0
  `);
  const migratePaidOrders = db.transaction(() => {
    const insertEntitlement = db.prepare(`
      INSERT OR IGNORE INTO unlocked_courses (user_id, course_id, order_id, unlocked_at)
      VALUES (?, ?, ?, ?)
    `);
    db.prepare(`
    SELECT user_id, order_id, course_ids, updated_at
    FROM orders WHERE status = 'paid'
    `).all().forEach(({ user_id, order_id, course_ids, updated_at }) => {
      JSON.parse(course_ids).forEach((courseId) => {
        insertEntitlement.run(user_id, courseId, order_id, updated_at);
      });
    });
  });
  migratePaidOrders();

  const findByIdempotency = db.prepare(
    'SELECT * FROM orders WHERE user_id = ? AND idempotency_key = ?',
  );
  const findById = db.prepare('SELECT * FROM orders WHERE order_id = ?');
  const expirePendingOrders = () => {
    const cutoff = new Date(Date.now() - PENDING_ORDER_MAX_AGE_MS).toISOString();
    return db.prepare(`
      UPDATE orders
      SET status = 'expired', updated_at = ?
      WHERE status = 'pending' AND created_at <= ?
    `).run(new Date().toISOString(), cutoff).changes;
  };
  expirePendingOrders();

  function toPublicOrder(row) {
    if (!row) return null;
    return {
      orderId: row.order_id,
      userId: row.user_id,
      courseIds: JSON.parse(row.course_ids),
      items: JSON.parse(row.items),
      currency: row.currency,
      subtotalAmount: row.subtotal_amount,
      discountAmount: row.discount_amount,
      totalAmount: row.total_amount,
      status: row.status,
      provider: row.provider,
      providerPaymentId: row.provider_payment_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  const createOrGetOrder = db.transaction(({
    userId, idempotencyKey, courseIds, items, currency,
  }) => {
    expirePendingOrders();
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

    const alreadyOwnedIds = db.prepare(`
      SELECT course_id FROM unlocked_courses
      WHERE user_id = ? AND course_id IN (${courseIds.map(() => '?').join(',')})
    `).all(userId, ...courseIds).map(({ course_id }) => course_id);
    if (alreadyOwnedIds.length > 0) {
      const error = new Error('Ya tienes uno o más cursos de este carrito. Quita los cursos adquiridos para continuar.');
      error.status = 409;
      error.code = 'COURSE_ALREADY_OWNED';
      error.ownedCourseIds = alreadyOwnedIds;
      throw error;
    }

    const now = new Date().toISOString();
    const orderId = randomUUID();
    const pricedOrder = getDiscountedItems(items, courseIds);
    db.prepare(`
      INSERT INTO orders (
        order_id, user_id, idempotency_key, request_hash, course_ids,
        items, currency, subtotal_amount, discount_amount, total_amount,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
    `).run(
      orderId,
      userId,
      idempotencyKey,
      requestHash,
      JSON.stringify(courseIds),
      JSON.stringify(pricedOrder.items),
      currency,
      pricedOrder.subtotalAmount,
      pricedOrder.discountAmount,
      pricedOrder.totalAmount,
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

    if (order.status === 'pending' || order.status === 'paid') {
      const insertEntitlement = db.prepare(`
        INSERT OR IGNORE INTO unlocked_courses (user_id, course_id, order_id, unlocked_at)
        VALUES (?, ?, ?, ?)
      `);
      JSON.parse(order.course_ids).forEach((courseId) => {
        insertEntitlement.run(order.user_id, courseId, orderId, now);
      });
    }

    if (eventId) {
      db.prepare(
        'INSERT OR IGNORE INTO provider_events (provider, event_id, processed_at) VALUES (?, ?, ?)',
      ).run(provider, eventId, now);
    }
    return { order: toPublicOrder(findById.get(orderId)), alreadyProcessed: order.status === 'paid' };
  });

  function getOrder(orderId) {
    expirePendingOrders();
    return toPublicOrder(findById.get(orderId));
  }

  function getOrderByIdempotency(userId, idempotencyKey) {
    expirePendingOrders();
    return toPublicOrder(findByIdempotency.get(userId, idempotencyKey));
  }

  function getOrderByProviderPayment(provider, providerPaymentId) {
    const row = db.prepare(
      'SELECT * FROM orders WHERE provider = ? AND provider_payment_id = ?',
    ).get(provider, providerPaymentId);
    return toPublicOrder(row);
  }

  function getPaidCourseIds(userId) {
    return db.prepare(`
      SELECT course_id FROM unlocked_courses
      WHERE user_id = ? ORDER BY unlocked_at, course_id
    `).all(userId).map(({ course_id }) => course_id);
  }

  function getCompletedLessonIds(userId, courseId) {
    return db.prepare(`
      SELECT lesson_id FROM course_progress
      WHERE user_id = ? AND course_id = ? AND completed = 1
      ORDER BY updated_at, lesson_id
    `).all(userId, courseId).map(({ lesson_id }) => lesson_id);
  }

  function setLessonProgress(userId, courseId, lessonId, completed) {
    if (completed) {
      db.prepare(`
        INSERT INTO course_progress (user_id, course_id, lesson_id, completed, updated_at)
        VALUES (?, ?, ?, 1, ?)
        ON CONFLICT (user_id, course_id, lesson_id)
        DO UPDATE SET completed = 1, updated_at = excluded.updated_at
      `).run(userId, courseId, lessonId, new Date().toISOString());
    } else {
      db.prepare(`
        DELETE FROM course_progress WHERE user_id = ? AND course_id = ? AND lesson_id = ?
      `).run(userId, courseId, lessonId);
    }
  }

  function close() {
    db.close();
  }

  return {
    close,
    createOrGetOrder,
    fulfillOrder: fulfillOrderTransaction,
    getOrder,
    getOrderByIdempotency,
    getOrderByProviderPayment,
    getPaidCourseIds,
    expirePendingOrders,
    getCompletedLessonIds,
    setLessonProgress,
  };
}
