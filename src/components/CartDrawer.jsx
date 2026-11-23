import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { AiOutlineClose, AiOutlineShoppingCart, AiOutlineTag } from 'react-icons/ai';
import { CartContext } from './Context.jsx';
import { db } from '../firebase/firebaseConfig.js';
import { getDemoProducts } from '../data/demoProducts.js';
import CheckoutButtons from './CheckoutButtons.jsx';
import { getEstimatedArsAmount } from '../services/paymentService.js';
import { usePreferences } from './PreferencesContext.jsx';

const DISCOUNT_PERCENT = 15;

const complementaryCourseIds = {
  'S9EVaISnr66gUfJO61mx': 'ZWk64kAGeSA4TMCB7yIa',
  '4KPZIEGZ6lj7hzjf7gLM': 'S9EVaISnr66gUfJO61mx',
  'gVdLhdDDS7Z9fMat6oqK': 'ZWk64kAGeSA4TMCB7yIa',
  'SrQqeMtpIr5aOrZieV2V': 'Bvx7NxtkST5tt3swtRta',
  'Bvx7NxtkST5tt3swtRta': 'SrQqeMtpIr5aOrZieV2V',
};

function chooseComplementaryCourse(addedCourse, catalog, cart) {
  const unavailableIds = new Set([
    ...cart.map((item) => item.id),
    addedCourse.id,
  ]);
  const candidates = catalog.filter((course) => (
    !unavailableIds.has(course.id)
    && Number(course.stock) > 0
    && Number.isFinite(Number(course.price))
  ));
  const preferredId = complementaryCourseIds[addedCourse.id];
  const preferred = candidates.find((course) => course.id === preferredId);
  if (preferred) return preferred;

  const preferredCategory = addedCourse.category === 'programming'
    ? 'design'
    : addedCourse.category === 'design'
      ? 'programming'
      : '';
  const rankedCandidates = candidates
    .map((course) => ({
      course,
      score: course.category === preferredCategory
        ? 2
        : (course.category !== addedCourse.category ? 1 : 0),
    }))
    .sort((first, second) => second.score - first.score);

  return rankedCandidates[0]?.course || null;
}

function CartDrawer() {
  const {
    addRecommendedItem,
    cart,
    closeCartDrawer,
    drawerItem,
    isCartDrawerOpen,
    total,
    totalQuantity,
    totalSavings,
  } = useContext(CartContext);
  const { currency } = usePreferences();
  const [catalog, setCatalog] = useState([]);
  const [catalogState, setCatalogState] = useState('idle');
  const [upsellStatus, setUpsellStatus] = useState('');
  const [upsellAdded, setUpsellAdded] = useState(false);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isCartDrawerOpen || !drawerItem) return;

    let active = true;
    setCatalogState('loading');
    setUpsellStatus('');
    setUpsellAdded(false);

    getDocs(collection(db, 'items'))
      .then((snapshot) => {
        if (!active) return;
        setCatalog(snapshot.docs.map((course) => ({ id: course.id, ...course.data() })));
        setCatalogState('ready');
      })
      .catch((error) => {
        if (!active) return;
        console.error('No se pudo cargar el catálogo de complementos', error);
        if (error.code === 'permission-denied') {
          setCatalog(getDemoProducts());
          setCatalogState('ready');
        } else {
          setCatalogState('error');
        }
      });

    return () => {
      active = false;
    };
  }, [drawerItem, isCartDrawerOpen]);

  useEffect(() => {
    if (!isCartDrawerOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeCartDrawer();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isCartDrawerOpen, closeCartDrawer]);

  if (!isCartDrawerOpen || !drawerItem) return null;

  const recommendation = catalogState === 'ready'
    ? chooseComplementaryCourse(drawerItem, catalog, cart)
    : null;
  const formatMoney = (amount, moneyCurrency) => new Intl.NumberFormat(
    moneyCurrency === 'USD' ? 'en-US' : 'es-AR',
    { style: 'currency', currency: moneyCurrency, maximumFractionDigits: moneyCurrency === 'USD' ? 2 : 0 },
  ).format(amount);
  const primaryTotal = currency === 'ARS' ? getEstimatedArsAmount(total) : total;
  const secondaryTotal = currency === 'ARS' ? total : getEstimatedArsAmount(total);

  const handleAddRecommendation = () => {
    if (!recommendation) return;
    const added = addRecommendedItem(recommendation);
    setUpsellStatus(added
      ? `${recommendation.name} se agregó. El 15% de descuento se aplicó al carrito completo.`
      : 'Este complemento ya está en tu carrito o no tiene cupos disponibles.');
    if (added) setUpsellAdded(true);
  };

  return (
    <div className="cart-drawer-layer">
      <button
        type="button"
        className="cart-drawer-backdrop"
        onClick={closeCartDrawer}
        aria-label="Cerrar carrito lateral"
      />
      <aside
        className="cart-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
      >
        <header className="cart-drawer-header">
          <div>
            <p className="cart-drawer-eyebrow">Se agregó a tu carrito</p>
            <h2 id="cart-drawer-title">{drawerItem.name}</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="cart-drawer-close"
            onClick={closeCartDrawer}
            aria-label="Cerrar carrito lateral"
          >
            <AiOutlineClose />
          </button>
        </header>

        <div className="cart-drawer-content">
          <section className="cart-bundle-progress" aria-label="Descuento por paquete">
            <div className="cart-bundle-progress-copy">
              <strong>{cart.length >= 2
                ? '¡Desbloqueaste 15% OFF por paquete!'
                : '¡Sumá 1 curso más y obtené 15% OFF en todo tu carrito!'}</strong>
              <span>{cart.length >= 2
                ? `Ahorro: ${formatMoney(currency === 'ARS' ? getEstimatedArsAmount(totalSavings) : totalSavings, currency)} · ${formatMoney(currency === 'ARS' ? totalSavings : getEstimatedArsAmount(totalSavings), currency === 'ARS' ? 'USD' : 'ARS')}`
                : 'El descuento se aplica automáticamente al pagar.'}</span>
            </div>
            <div className="cart-bundle-progress-track" role="progressbar" aria-valuenow={Math.min(cart.length, 2)} aria-valuemin="0" aria-valuemax="2">
              <span style={{ width: `${cart.length >= 2 ? 100 : cart.length * 50}%` }} />
            </div>
          </section>
          <div className="cart-drawer-confirmation" role="status">
            <span className="cart-drawer-check" aria-hidden="true">✓</span>
            <div>
              <strong>¡Listo! Ya está en tu carrito.</strong>
              <span>
                {totalQuantity} {totalQuantity === 1 ? 'curso' : 'cursos'} · {formatMoney(primaryTotal, currency)}
              </span>
              <span>{formatMoney(secondaryTotal, currency === 'ARS' ? 'USD' : 'ARS')} de referencia</span>
            </div>
          </div>

          {catalogState === 'loading' && (
            <p className="cart-drawer-status" role="status">Buscando un complemento para tu curso…</p>
          )}
          {catalogState === 'error' && (
            <p className="cart-drawer-status is-error" role="alert">
              No pudimos cargar las sugerencias. Tu curso ya está guardado en el carrito.
            </p>
          )}

          {recommendation && !upsellAdded && (
            <section className="cart-cross-sell" aria-labelledby="cart-cross-sell-title">
              <span className="cart-cross-sell-label"><AiOutlineTag /> Oferta para vos</span>
              <h3 id="cart-cross-sell-title">Completa tu aprendizaje</h3>
              <p>
                Combina <strong>{drawerItem.name}</strong> con{' '}
                <strong>{recommendation.name}</strong> y obtén {DISCOUNT_PERCENT}% OFF en todo el carrito.
              </p>
              {recommendation.img && (
                <img src={recommendation.img} alt="" className="cart-cross-sell-image" />
              )}
              <div className="cart-cross-sell-price">
                <strong>{formatMoney(Number(recommendation.price), currency)}</strong>
                <span>Descuento del carrito completo</span>
              </div>
              <button type="button" className="cart-cross-sell-add" onClick={handleAddRecommendation}>
                <AiOutlineShoppingCart />
                Sumar con {DISCOUNT_PERCENT}% OFF
              </button>
            </section>
          )}

          {catalogState === 'ready' && !recommendation && (
            <p className="cart-drawer-status">
              Por ahora no encontramos un complemento disponible. Tu curso ya quedó agregado.
            </p>
          )}
          {upsellStatus && <p className="cart-drawer-status" role="status">{upsellStatus}</p>}
        </div>

        <footer className="cart-drawer-footer">
          <CheckoutButtons compact />
          <Link className="cart-drawer-view-cart" to="/cart" onClick={closeCartDrawer}>
            Ver carrito
          </Link>
          <button type="button" className="cart-drawer-continue" onClick={closeCartDrawer}>
            Seguir explorando
          </button>
        </footer>
      </aside>
    </div>
  );
}

export default CartDrawer;
