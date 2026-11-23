import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart.js';
import { getEstimatedArsAmount } from '../services/paymentService.js';
import CheckoutButtons from './CheckoutButtons.jsx';

function Checkout() {
  const { cart, total, totalSavings, totalQuantity } = useCart();

  if (totalQuantity === 0) {
    return (
      <main className="container">
        <div className="box has-text-centered my-6 py-6">
          <h1 className="title mb-3">Tu carrito está vacío</h1>
          <p className="mb-5 has-text-grey">Agrega un curso para comenzar tu compra.</p>
          <Link to="/" className="button is-primary is-medium">Explorar cursos</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="container checkout-page">
      <header className="checkout-page-heading">
        <p>Último paso</p>
        <h1>Finaliza tu compra</h1>
        <span>Elige tu medio de pago. Confirmaremos tu acceso cuando el proveedor verifique el pago.</span>
      </header>

      <div className="checkout-layout">
        <section className="checkout-order-summary" aria-labelledby="checkout-summary-title">
          <h2 id="checkout-summary-title">Resumen de tu orden</h2>
          <ul>
            {cart.map((item) => (
              <li key={item.id}>
                <span>
                  <strong>{item.name}</strong>
                  {item.discountPercent && (
                    <small>{item.discountPercent}% de descuento aplicado</small>
                  )}
                </span>
                <strong>${Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </li>
            ))}
          </ul>
          {totalSavings > 0 && (
            <p className="checkout-savings">
              Ahorro: ${totalSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
            </p>
          )}
          <div className="checkout-order-total">
            <span>Total USD</span>
            <strong>${total.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>
          <div className="checkout-order-estimate">
            Estimado ARS: ${getEstimatedArsAmount(total).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
          </div>
          <p className="checkout-order-disclaimer">
            La conversión a pesos es orientativa. Cada pasarela y el servidor validan el importe final.
          </p>
        </section>

        <section className="checkout-payment-methods" aria-labelledby="checkout-payment-title">
          <h2 id="checkout-payment-title">Métodos de pago</h2>
          <CheckoutButtons />
          <Link to="/cart" className="checkout-back-link">Volver al carrito</Link>
        </section>
      </div>
    </main>
  );
}

export default Checkout;
