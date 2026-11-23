import { useCallback, useEffect, useMemo, useRef, useState, createContext } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';
import { useAuth } from './AuthContext.jsx';
import useCartSync from '../hooks/useCartSync.js';
import useLocalStorage from '../hooks/useLocalStorage.js';
import { getEstimatedArsAmount, USD_TO_ARS_ESTIMATE_RATE } from '../services/paymentService.js';

const CART_STORAGE_KEY = 'tienda-quiroga-cart';
const EMPTY_CART = [];

function normalizeCart(savedCart) {
  if (!Array.isArray(savedCart)) return EMPTY_CART;

  const seenIds = new Set();
  return savedCart.reduce((uniqueCourses, product) => {
    if (!product?.id || seenIds.has(product.id)) return uniqueCourses;
    seenIds.add(product.id);
    uniqueCourses.push({ ...product, quantity: 1 });
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

  const addRecommendedItem = (item, discountPercent = 20) => {
    if (isInCart(item.id) || Number(item.stock) <= 0) return false;

    const originalPrice = Number(item.price);
    const price = Number((originalPrice * (1 - discountPercent / 100)).toFixed(2));
    setCart((previous) => (
      previous.some((product) => product.id === item.id)
        ? previous
        : [...previous, {
            ...item,
            quantity: 1,
            price,
            originalPrice,
            discountPercent,
            offerId: 'cart-cross-sell',
          }]
    ));
    return true;
  };

  const closeCartDrawer = useCallback(() => setIsCartDrawerOpen(false), []);

  const addBundle = (items, { bundleId, discountPercent }) => {
    if (!Array.isArray(items) || items.length < 2 || !bundleId) {
      return { ok: false, message: "No pudimos agregar este paquete al carrito." };
    }

    if (items.some((item) => !Number.isFinite(Number(item.stock))
      || Number(item.stock) <= 0
      || !Number.isFinite(Number(item.price)))) {
      return { ok: false, message: "Uno o más cursos del paquete no tienen cupos disponibles." };
    }

    const bundleProducts = new Map(items.map((item) => [item.id, item]));
    const existingBundleItems = cart.filter((item) => bundleProducts.has(item.id));
    const conflictingBundle = existingBundleItems.some(
      (item) => item.bundleId && item.bundleId !== bundleId,
    );

    if (conflictingBundle) {
      return {
        ok: false,
        message: "Quita los cursos que pertenecen a otro paquete antes de agregar esta oferta.",
      };
    }

    if (existingBundleItems.length === items.length
      && existingBundleItems.every((item) => item.bundleId === bundleId)) {
      return { ok: true, alreadyAdded: true };
    }

    const bundledItems = items.map((item) => {
      const existingItem = cart.find((product) => product.id === item.id);
      const product = existingItem || item;
      const originalPrice = Number(existingItem?.originalPrice ?? product.price);
      const price = Number((originalPrice * (1 - discountPercent / 100)).toFixed(2));

      return {
        ...product,
        quantity: existingItem?.quantity ?? 1,
        price,
        originalPrice,
        bundleId,
        bundleSize: items.length,
        discountPercent,
      };
    });

    setCart((previous) => [
      ...previous.filter((item) => !bundleProducts.has(item.id)),
      ...bundledItems,
    ]);
    setDrawerItem(items[items.length - 1]);
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
    const removedItem = cart.find((product) => product.id === itemId);
    const cartUpdated = cart.filter((product) => product.id !== itemId);

    if (removedItem?.bundleId) {
      const remainingBundleItems = cartUpdated.filter(
        (product) => product.bundleId === removedItem.bundleId,
      );

      if (remainingBundleItems.length < removedItem.bundleSize) {
        return setCart(cartUpdated.map((product) => {
          if (product.bundleId !== removedItem.bundleId) return product;

          const standaloneProduct = { ...product, price: product.originalPrice };
          delete standaloneProduct.bundleId;
          delete standaloneProduct.bundleSize;
          delete standaloneProduct.discountPercent;
          delete standaloneProduct.originalPrice;
          return standaloneProduct;
        }));
      }
    }

    setCart(cartUpdated);
  };

  const totalQuantity = cart.reduce((acc, product) => acc + product.quantity, 0);
  const total = cart.reduce((acc, product) => acc + product.price * product.quantity, 0);
  const subtotalUsd = total;
  const estimatedTotalArs = getEstimatedArsAmount(total);
  const totalSavings = cart.reduce(
    (acc, product) => acc + (product.bundleId
      ? (product.originalPrice - product.price) * product.quantity
      : (product.discountPercent && Number.isFinite(Number(product.originalPrice))
        ? (product.originalPrice - product.price) * product.quantity
        : 0)),
    0,
  );

  return (
    <CartContext.Provider value={{
      cart,
      addItem,
      addRecommendedItem,
      addBundle,
      drawerItem,
      isCartDrawerOpen,
      closeCartDrawer,
      removeItem,
      clearCart,
      isInCart,
      total,
      subtotalUsd,
      estimatedTotalArs,
      usdToArsEstimateRate: USD_TO_ARS_ESTIMATE_RATE,
      totalSavings,
      totalQuantity,
    }}>
      {children}
    </CartContext.Provider>
  );
};