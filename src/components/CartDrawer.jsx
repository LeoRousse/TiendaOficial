import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { AiOutlineClose, AiOutlineShoppingCart, AiOutlineTag } from 'react-icons/ai';
import { CartContext } from './Context.jsx';
import { db } from '../firebase/firebaseConfig.js';
import { getDemoProducts } from '../data/demoProducts.js';
import CheckoutButtons from './CheckoutButtons.jsx';
import { getEstimatedArsAmount } from '../services/paymentService.js';

const DISCOUNT_PERCENT = 20;

const complementaryCourseIds = {
  'S9EVaISnr66gUfJO61mx': 'ZWk64kAGeSA4TMCB7yIa',
  '4KPZIEGZ6lj7hzjf7gLM': 'S9EVaISnr66gUfJO61mx',
  'gVdLhdDDS7Z9fMat6oqK': 'ZWk64kAGeSA4TMCB7yIa',
  'SrQqeMtpIr5aOrZieV2V': 'Bvx7NxtkST5tt3swtRta',
  'Bvx7NxtkST5tt3swtRta': 'SrQqeMtpIr5aOrZieV2V',
  'demo-react': 'demo-ui',
  'demo-javascript': 'demo-react',
  'demo-ui': 'demo-react',
  'demo-figma': 'demo-react',
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
  } = useContext(CartContext);
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
  const discountedPrice = recommendation
    ? Number((Number(recommendation.price) * (1 - DISCOUNT_PERCENT / 100)).toFixed(2))
    : 0;

  const handleAddRecommendation = () => {
    if (!recommendation) return;
    const added = addRecommendedItem(recommendation, DISCOUNT_PERCENT);
    setUpsellStatus(added
      ? `${recommendation.name} se agregó con ${DISCOUNT_PERCENT}% de descuento.`
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
          <div className="cart-drawer-confirmation" role="status">
            <span className="cart-drawer-check" aria-hidden="true">✓</span>
            <div>
              <strong>¡Listo! Ya está en tu carrito.</strong>
              <span>
                {totalQuantity} {totalQuantity === 1 ? 'curso' : 'cursos'} · ${total.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </span>
              <span>
                Estimado ${getEstimatedArsAmount(total).toLocaleString('es-AR', { minimumFractionDigits: 2 })} ARS
              </span>
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
                <strong>{recommendation.name}</strong> y obtén {DISCOUNT_PERCENT}% OFF en el complemento.
              </p>
              {recommendation.img && (
                <img src={recommendation.img} alt="" className="cart-cross-sell-image" />
              )}
              <div className="cart-cross-sell-price">
                <del>${Number(recommendation.price).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</del>
                <strong>${discountedPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</strong>
                <span>{DISCOUNT_PERCENT}% OFF</span>
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
            Ver carrito y ofertas
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
