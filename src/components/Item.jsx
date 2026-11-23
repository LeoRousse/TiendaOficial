import { Link, useNavigate } from 'react-router-dom';
import { useCallback, useContext, useRef, useState } from 'react';
import { CartContext } from './Context.jsx';
import QuickView from './QuickView.jsx';
import { getEstimatedArsAmount } from '../services/paymentService.js';
import { usePreferences } from './PreferencesContext.jsx';

const Item = ({
  id,
  name,
  img,
  price,
  stock,
  level,
  category,
  description,
  durationHours,
  modulesCount,
  rating,
  highlights,
  previewLesson,
  isOwned = false,
}) => {
  const courseLevel = level || "Todos los niveles";
  const { addItem, isInCart, openCartDrawer, closeCartDrawer } = useContext(CartContext);
  const navigate = useNavigate();
  const alreadyAdded = isInCart(id);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const quickViewButtonRef = useRef(null);
  const { currency } = usePreferences();
  const priceUsd = Number(price);
  const priceArs = getEstimatedArsAmount(priceUsd);
  const formatCurrency = (amount, currency) => new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(amount);

  const handleAdd = () => {
    addItem({ id, name, img, price, stock, level, category, description });
  };
  const course = {
    id, name, img, price, stock, level, category, description,
    durationHours, modulesCount, rating, highlights, previewLesson,
  };
  const handleBuyNow = () => {
    if (isOwned) return;
    if (!alreadyAdded) addItem(course);
    closeCartDrawer();
    closeQuickView();
    navigate('/checkout');
  };

  const closeQuickView = useCallback(() => {
    setIsQuickViewOpen(false);
    window.requestAnimationFrame(() => quickViewButtonRef.current?.focus({ preventScroll: true }));
  }, []);

  return (
    <>
      <article className="box product-card has-background-white-ter rounded-lg p-5 mx-4 my-4 shadow">
        <figure className="image is-16by9 product-image">
          <img
            src={img}
            alt={name}
            className="product-card-image"
            loading="lazy"
          />
        </figure>
        <footer className="content product-card-footer mt-4">
          <div className="product-card-badges">
            <span className={`level-badge ${courseLevel.toLowerCase().replace(/\s+/g, "-")}`}>
              {courseLevel}
            </span>
            <span className={`digital-availability${stock > 0 ? "" : " is-out"}`}>
              {stock > 0 ? "Acceso inmediato" : "Inscripción cerrada"}
            </span>
          </div>
          <h2 className="product-card-title">{name}</h2>
          <p className="product-card-social-proof">
            <span aria-label={`${rating || '4.8'} de 5 estrellas`}>★ {rating || '4.8'}</span>
            <span>{durationHours || 12} hs</span>
            <span>{modulesCount || 5} módulos</span>
          </p>
          <div className="product-card-meta">
            <div className="product-card-prices">
              <span className="meta-label">Precio</span>
              <strong className="price-text">
                {formatCurrency(currency === 'ARS' ? priceArs : priceUsd, currency)}
              </strong>
              <span className="price-estimate">
                {currency === 'ARS'
                  ? `${formatCurrency(priceUsd, 'USD')} de referencia`
                  : `${formatCurrency(priceArs, 'ARS')} estimado`}
              </span>
            </div>
          </div>
          <div className="buttons product-card-actions">
            {isOwned ? (
              <Link to="/mis-cursos" className="button is-primary is-fullwidth">
                En tu biblioteca → Ir a cursar
              </Link>
            ) : alreadyAdded ? (
              <button type="button" className="button is-primary is-fullwidth" onClick={openCartDrawer}>
                Ver en el carrito
              </button>
            ) : (
              <button
                type="button"
                className="button is-primary is-fullwidth"
                onClick={handleAdd}
                disabled={Number(stock) <= 0}
              >
                Agregar al carrito
              </button>
            )}
            <div className="product-card-secondary-actions">
              <Link to={`/item/${id}`} className="button is-light is-fullwidth">Ver detalle</Link>
              <button
                ref={quickViewButtonRef}
                type="button"
                className="button is-light is-fullwidth quick-view-trigger"
                onClick={() => setIsQuickViewOpen(true)}
                aria-label={`Vista rápida: ${name}`}
              >
                Vista rápida
              </button>
            </div>
          </div>
        </footer>
      </article>
      <QuickView
        course={course}
        isOpen={isQuickViewOpen}
        onClose={closeQuickView}
        onAdd={handleAdd}
        alreadyAdded={alreadyAdded}
        isOwned={isOwned}
        onBuyNow={handleBuyNow}
      />
    </>
  );
};

export default Item;