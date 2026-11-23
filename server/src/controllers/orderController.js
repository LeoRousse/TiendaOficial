import { catalogById } from '../data/catalog.js';

const VALID_CURRENCIES = new Set(['USD', 'ARS']);
const IDEMPOTENCY_KEY_PATTERN = /^[\w:.-]{8,200}$/;

function toMinorUnits(amount) {
  return Math.round((amount + Number.EPSILON) * 100);
}

function getCoursePriceMinor(course, currency, arsPerUsd) {
  if (currency === 'USD') return toMinorUnits(course.priceUsd);
  return toMinorUnits(course.priceUsd * arsPerUsd);
}

export function createOrderController({ store, authMiddleware, arsPerUsd }) {
  return {
    authMiddleware,

    createOrder(req, res, next) {
      try {
        const { courseIds, userId, currency } = req.body || {};
        const idempotencyKey = req.get('Idempotency-Key');

        if (!Array.isArray(courseIds) || courseIds.length < 1 || courseIds.length > 50
          || courseIds.some((id) => typeof id !== 'string' || !id.trim())
          || new Set(courseIds).size !== courseIds.length) {
          return res.status(400).json({ message: 'La lista de cursos está vacía o no es válida.' });
        }
        if (!userId || userId !== req.user.uid) {
          return res.status(403).json({ message: 'La orden no coincide con la cuenta autenticada.' });
        }
        if (!VALID_CURRENCIES.has(currency)) {
          return res.status(400).json({ message: 'La moneda debe ser USD o ARS.' });
        }
        if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
          return res.status(400).json({ message: 'Falta una clave de idempotencia válida.' });
        }

        const courses = courseIds.map((id) => catalogById.get(id));
        if (courses.some((course) => !course)) {
          return res.status(400).json({ message: 'El carrito contiene cursos que no están disponibles.' });
        }

        const items = courses.map((course) => ({
          id: course.id,
          name: course.name,
          price: getCoursePriceMinor(course, currency, arsPerUsd) / 100,
        }));
        const totalAmount = items.reduce((total, item) => total + toMinorUnits(item.price), 0);
        const order = store.createOrGetOrder({
          userId,
          idempotencyKey,
          courseIds,
          items,
          currency,
          totalAmount,
        });

        return res.status(201).json({
          orderId: order.orderId,
          status: order.status,
          totalAmount: order.totalAmount / 100,
          currency: order.currency,
          items: order.items,
        });
      } catch (error) {
        return next(error);
      }
    },

    getOrderStatus(req, res) {
      const order = store.getOrder(req.params.orderId);
      if (!order || order.userId !== req.user.uid) {
        return res.status(404).json({ message: 'No encontramos esa orden.' });
      }
      return res.json({
        orderId: order.orderId,
        status: order.status,
        unlockedCourseIds: order.status === 'paid' ? order.courseIds : [],
        updatedAt: order.updatedAt,
      });
    },
  };
}

export { getCoursePriceMinor, toMinorUnits };
