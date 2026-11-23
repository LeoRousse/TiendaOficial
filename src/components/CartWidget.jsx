// components/CartWidget.jsx
import React, { useContext } from 'react';
import { CartContext } from './Context.jsx';
import { FaShoppingCart } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const CartWidget = () => {
  const { totalQuantity, openCartDrawer } = useContext(CartContext);

  return (
    <Link
      to="/cart"
      className="cart-widget"
      aria-label={`Carrito, ${totalQuantity} cursos`}
      onClick={(event) => {
        if (openCartDrawer()) event.preventDefault();
      }}
    >
      <FaShoppingCart aria-hidden="true" />
      <span>Carrito</span>
      <span className="cart-widget-count" aria-live="polite">{totalQuantity}</span>
    </Link>
  );
};

export default CartWidget;