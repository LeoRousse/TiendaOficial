import { useContext } from 'react';
import { CartContext } from '../components/Context.jsx';

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart debe usarse dentro de CartProvider');
  }
  return context;
}

export default useCart;
