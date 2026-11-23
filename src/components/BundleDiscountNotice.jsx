import { usePreferences } from './PreferencesContext.jsx';
import { getEstimatedArsAmount } from '../services/paymentService.js';

function BundleDiscountNotice({ courseCount, savings }) {
  const { currency } = usePreferences();
  const formatMoney = (amount, moneyCurrency) => new Intl.NumberFormat(
    moneyCurrency === 'USD' ? 'en-US' : 'es-AR',
    { style: 'currency', currency: moneyCurrency, maximumFractionDigits: moneyCurrency === 'USD' ? 2 : 0 },
  ).format(amount);

  return (
    <section className="cart-bundle-progress" aria-label="Descuento por paquete">
      <div className="cart-bundle-progress-copy">
        <strong>{courseCount >= 2
          ? '¡Desbloqueaste 15% OFF por paquete!'
          : '¡Sumá 1 curso más y obtené 15% OFF en todo tu carrito!'}</strong>
        <span>{courseCount >= 2
          ? `Ahorro: ${formatMoney(currency === 'ARS' ? getEstimatedArsAmount(savings) : savings, currency)} · ${formatMoney(currency === 'ARS' ? savings : getEstimatedArsAmount(savings), currency === 'ARS' ? 'USD' : 'ARS')}`
          : 'El descuento se aplica automáticamente al pagar.'}</span>
      </div>
      <div className="cart-bundle-progress-track" role="progressbar" aria-valuenow={Math.min(courseCount, 2)} aria-valuemin="0" aria-valuemax="2">
        <span style={{ width: `${courseCount >= 2 ? 100 : courseCount * 50}%` }} />
      </div>
    </section>
  );
}

export default BundleDiscountNotice;
