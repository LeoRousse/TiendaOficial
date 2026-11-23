// Aplicar Bulma
import { useContext } from 'react';
import CartItem from './CartItem.jsx';
import { Link } from 'react-router-dom';
import { CartContext } from './Context.jsx';
import CheckoutButtons from './CheckoutButtons.jsx';
import { getEstimatedArsAmount } from '../services/paymentService.js';

const Cart = () => {
  const { cart, clearCart, total, totalSavings, totalQuantity } = useContext(CartContext);

  if (totalQuantity === 0) {
    return (
      <div className="container">
        <div className="box has-text-centered my-6 py-6">
          <h1 className="title mb-3">Tu carrito está vacío</h1>
          <p className="mb-5 has-text-grey">Explora el catálogo y elige tu próximo curso.</p>
          <Link to="/" className="button is-primary is-medium">Ver cursos</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-6">
      <div className="box">
        { cart.map(product => <CartItem key={product.id} {...product}/>) }
        <div className="cart-summary">
          <div>
            {totalSavings > 0 && (
              <p className="cart-savings">
                Ahorras ${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </p>
            )}
            <h3 className="title is-4 mb-0">
              Total: ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
            </h3>
            <p className="cart-estimated-ars">
              Estimado: ${getEstimatedArsAmount(total).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
            </p>
          </div>
          <div className="cart-actions">
            <button className="button is-danger is-medium" onClick={() => clearCart()}>Limpiar carrito</button>
            <Link to="/checkout" className="button is-success is-medium">Continuar al pago</Link>
          </div>
        </div>
        <section className="cart-payment-section" aria-label="Medios de pago">
          <h2 className="title is-5">Pagar de forma segura</h2>
          <CheckoutButtons />
        </section>
      </div>
    </div>
  );
};

export default Cart;