import { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';
import { useAuth } from './AuthContext.jsx';
import useCartSync from '../hooks/useCartSync.js';
import useLocalStorage from '../hooks/useLocalStorage.js';
import { getEstimatedArsAmount, USD_TO_ARS_ESTIMATE_RATE } from '../services/paymentService.js';

const CART_STORAGE_KEY = 'tienda-quiroga-cart';
const EMPTY_CART = [];
const BUNDLE_DISCOUNT_RATE = 0.15;

function normalizeCart(savedCart) {
  if (!Array.isArray(savedCart)) return EMPTY_CART;

  const seenIds = new Set();
  return savedCart.reduce((uniqueCourses, product) => {
    if (!product?.id || seenIds.has(product.id)) return uniqueCourses;
    seenIds.add(product.id);
    const course = { ...product };
    const listPrice = Number(course.originalPrice ?? course.price);
    delete course.originalPrice;
    delete course.discountPercent;
    delete course.offerId;
    delete course.bundleId;
    delete course.bundleSize;
    uniqueCourses.push({
      ...course,
      price: listPrice,
      quantity: 1,
    });
    return uniqueCourses;
  }, []);
}

export const CartContext = createContext({
  cart: [],
});

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const [savedCart, setSavedCart] = useLocalStorage(CART_STORAGE_KEY, EMPTY_CART);
  const cart = useMemo(() => normalizeCart(savedCart), [savedCart]);
  const setCart = setSavedCart;
  const initialCartRef = useRef(cart);
  const [drawerItem, setDrawerItem] = useState(null);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  useCartSync(user, cart, setCart);

  useEffect(() => {
    let active = true;

    const refreshCartStock = async () => {
      if (initialCartRef.current.length === 0) return;

      const snapshots = await Promise.all(
        initialCartRef.current.map((product) => getDoc(doc(db, "items", product.id)))
      );

      if (!active) return;

      setCart((previous) => previous
        .map((product, index) => {
          const snapshot = snapshots[index];
          if (!snapshot.exists()) return null;

          const liveStock = Math.max(0, Number(snapshot.data().stock) || 0);
          return {
            ...product,
            stock: liveStock,
            quantity: Math.min(product.quantity, liveStock),
          };
        })
        .filter((product) => product && product.quantity > 0));
    };

    refreshCartStock().catch((error) => {
      console.error("No se pudo actualizar el stock del carrito", error);
    });

    return () => {
      active = false;
    };
  }, [setCart]);

  const addItem = (item) => {
    if (isInCart(item.id) || Number(item.stock) <= 0) return false;

    setCart((previous) => (
      previous.some((product) => product.id === item.id)
        ? previous
        : [...previous, { ...item, quantity: 1 }]
    ));
    setDrawerItem(item);
    setIsCartDrawerOpen(true);
    return true;
  };

  const addRecommendedItem = (item) => {
    if (isInCart(item.id) || Number(item.stock) <= 0) return false;

    setCart((previous) => (
      previous.some((product) => product.id === item.id)
        ? previous
        : [...previous, { ...item, price: Number(item.price), quantity: 1 }]
    ));
    return true;
  };

  const closeCartDrawer = useCallback(() => setIsCartDrawerOpen(false), []);
  const openCartDrawer = useCallback(() => {
    if (cart.length === 0) return false;
    setDrawerItem(cart[cart.length - 1]);
    setIsCartDrawerOpen(true);
    return true;
  }, [cart]);

  const addBundle = (items) => {
    if (!Array.isArray(items) || items.length < 2) {
      return { ok: false, message: "No pudimos agregar este paquete al carrito." };
    }

    if (items.some((item) => !Number.isFinite(Number(item.stock))
      || Number(item.stock) <= 0
      || !Number.isFinite(Number(item.price)))) {
      return { ok: false, message: "Uno o más cursos del paquete no tienen cupos disponibles." };
    }

    const distinctItems = [...new Map(items.map((item) => [item.id, item])).values()];
    const alreadyAdded = distinctItems.every((item) => cart.some((course) => course.id === item.id));
    if (alreadyAdded) return { ok: true, alreadyAdded: true };

    setCart((previous) => {
      const existingIds = new Set(previous.map((item) => item.id));
      return [
        ...previous,
        ...distinctItems
          .filter((item) => !existingIds.has(item.id))
          .map((item) => ({ ...item, price: Number(item.price), quantity: 1 })),
      ];
    });
    setDrawerItem(distinctItems[distinctItems.length - 1]);
    setIsCartDrawerOpen(true);

    return { ok: true, alreadyAdded: false };
  };

  const isInCart = (itemId) => {
    return cart.some((product) => product.id === itemId);
  };

  const clearCart = useCallback(() => {
    setCart( [] );
  }, [setCart]);

  const removeItem = (itemId) => {
    const cartUpdated = cart.filter((product) => product.id !== itemId);

    setCart(cartUpdated);
  };

  const totalQuantity = cart.reduce((acc, product) => acc + product.quantity, 0);
  const subtotalCents = cart.reduce(
    (acc, product) => acc + Math.round(Number(product.price) * 100) * product.quantity,
    0,
  );
  const subtotalUsd = subtotalCents / 100;
  const discountCents = cart.length >= 2
    ? Math.round(subtotalCents * BUNDLE_DISCOUNT_RATE)
    : 0;
  const total = (subtotalCents - discountCents) / 100;
  const estimatedTotalArs = getEstimatedArsAmount(total);
  const totalSavings = discountCents / 100;

  return (
    <CartContext.Provider value={{
      cart,
      addItem,
      addRecommendedItem,
      addBundle,
      drawerItem,
      isCartDrawerOpen,
      closeCartDrawer,
      openCartDrawer,
      removeItem,
      clearCart,
      isInCart,
      total,
      subtotalUsd,
      estimatedTotalArs,
      usdToArsEstimateRate: USD_TO_ARS_ESTIMATE_RATE,
      totalSavings,
      totalQuantity,
      bundleDiscountEligible: cart.length >= 2,
      bundleDiscountPercent: BUNDLE_DISCOUNT_RATE * 100,
    }}>
      {children}
    </CartContext.Provider>
  );
};