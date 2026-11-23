import { Link } from 'react-router-dom';
import { useCallback, useContext, useRef, useState } from 'react';
import { CartContext } from './Context.jsx';
import QuickView from './QuickView.jsx';

const Item = ({ id, name, img, price, stock, level, category, description }) => {
  const courseLevel = level || "Todos los niveles";
  const { addItem, isInCart } = useContext(CartContext);
  const alreadyAdded = isInCart(id);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const quickViewButtonRef = useRef(null);

  const handleAdd = () => {
    addItem({ id, name, img, price, stock, level, category, description });
  };

  const closeQuickView = useCallback(() => {
    setIsQuickViewOpen(false);
    window.requestAnimationFrame(() => quickViewButtonRef.current?.focus({ preventScroll: true }));
  }, []);

  return (
    <>
      <article className="box product-card has-background-white-ter rounded-lg p-5 mx-4 my-4 shadow">
        <header className="has-text-centered mb-4">
          <h2 className="title is-4 has-text-primary">{name}</h2>
        </header>
        <figure className="image is-4by3 product-image">
          <img
            src={img}
            alt={name}
            className="is-rounded"
            loading="lazy"
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0px 4px 15px rgba(0, 0, 0, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </figure>
        <footer className="content product-card-footer mt-4">
          <div className="product-card-meta">
            <div>
              <span className="meta-label">Precio</span>
              <strong className="price-text">${price}</strong>
            </div>
            <span className={`level-badge ${courseLevel.toLowerCase().replace(/\s+/g, "-")}`}>
              {courseLevel}
            </span>
          </div>
          <p className={`digital-availability${stock > 0 ? "" : " is-out"}`}>
            {stock > 0 ? "Acceso inmediato" : "Inscripción cerrada"}
          </p>
          <div className="buttons">
            <button
              ref={quickViewButtonRef}
              type="button"
              className="button is-light is-fullwidth quick-view-trigger"
              onClick={() => setIsQuickViewOpen(true)}
              aria-label={`Vista rápida: ${name}`}
            >
              Vista rápida
            </button>
            {alreadyAdded ? (
              <Link to="/cart" className="button is-success is-fullwidth">Ver en el carrito</Link>
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
            <Link to={`/item/${id}`} className="button is-light is-fullwidth">
              Ver detalle
            </Link>
          </div>
        </footer>
      </article>
      <QuickView
        course={{ id, name, img, price, stock, level, category, description }}
        isOpen={isQuickViewOpen}
        onClose={closeQuickView}
        onAdd={handleAdd}
        alreadyAdded={alreadyAdded}
      />
    </>
  );
};

export default Item;