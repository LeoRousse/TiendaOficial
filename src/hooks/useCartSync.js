import { useEffect } from 'react';

const USER_CART_PREFIX = 'tienda-quiroga-cart-user:';

function mergeUniqueCourses(...courseLists) {
  const courses = new Map();
  courseLists.flat().forEach((course) => {
    if (course?.id && !courses.has(course.id)) {
      courses.set(course.id, { ...course, quantity: 1 });
    }
  });
  return Array.from(courses.values());
}

function readUserCart(userId) {
  try {
    const savedCart = window.localStorage.getItem(`${USER_CART_PREFIX}${userId}`);
    const parsedCart = savedCart ? JSON.parse(savedCart) : [];
    return Array.isArray(parsedCart) ? parsedCart : [];
  } catch (error) {
    console.error('No se pudo leer el carrito guardado para esta cuenta', error);
    return [];
  }
}

function useCartSync(user, cart, setCart) {
  const userId = user?.uid || '';

  useEffect(() => {
    if (!userId) return;
    setCart((currentCart) => mergeUniqueCourses(currentCart, readUserCart(userId)));
  }, [setCart, userId]);

  useEffect(() => {
    if (!userId) return;
    try {
      window.localStorage.setItem(
        `${USER_CART_PREFIX}${userId}`,
        JSON.stringify(cart),
      );
    } catch (error) {
      console.error('No se pudo guardar el carrito para esta cuenta', error);
    }
  }, [cart, userId]);
}

export default useCartSync;
