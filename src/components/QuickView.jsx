import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AiOutlineClose, AiOutlineShoppingCart } from 'react-icons/ai';
import { Link } from 'react-router-dom';
import { usePreferences } from './PreferencesContext.jsx';
import { getEstimatedArsAmount } from '../services/paymentService.js';

function QuickView({ course, isOpen, onClose, onAdd, onBuyNow, alreadyAdded, isOwned }) {
  const closeButtonRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const shouldReduceMotion = useReducedMotion();
  const { currency } = usePreferences();
  const price = Number(course.price);
  const primaryPrice = currency === 'ARS' ? getEstimatedArsAmount(price) : price;
  const secondaryPrice = currency === 'ARS'
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price)
    : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(getEstimatedArsAmount(price));

  useEffect(() => {
    if (!isOpen) return undefined;

    scrollPositionRef.current = window.scrollY;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = event.currentTarget;
      const focusableElements = dialog.querySelectorAll(
        'button:not(:disabled), a[href], input:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    };

    const dialog = document.querySelector('[data-quick-view-dialog]');
    dialog?.addEventListener('keydown', handleKeyDown);
    closeButtonRef.current?.focus({ preventScroll: true });

    return () => {
      dialog?.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
      window.scrollTo(0, scrollPositionRef.current);
    };
  }, [isOpen, onClose]);

  if (!course) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="quick-view-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.18 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.section
            className="quick-view-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`quick-view-title-${course.id}`}
            data-quick-view-dialog
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14, scale: shouldReduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 8, scale: shouldReduceMotion ? 1 : 0.98 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
          >
            <button
              ref={closeButtonRef}
              type="button"
              className="quick-view-close"
              onClick={onClose}
              aria-label="Cerrar vista rápida"
            >
              <AiOutlineClose />
            </button>
            {course.img && <img className="quick-view-image" src={course.img} alt="" />}
            <div className="quick-view-content">
              <span className="quick-view-category">
                {course.category === 'programming'
                  ? 'Programación'
                  : course.category === 'design'
                    ? 'Diseño'
                    : course.category || 'Curso'}
              </span>
              <h2 id={`quick-view-title-${course.id}`}>{course.name}</h2>
              {course.level && <p className="quick-view-level">Nivel: {course.level}</p>}
              <p className="quick-view-description">
                {course.description || 'Explora el temario y descubre todo lo que aprenderás en este curso.'}
              </p>
              <p className="quick-view-course-meta">
                ★ {course.rating || '4.8'} · {course.durationHours || 12} hs · {course.modulesCount || 5} módulos
              </p>
              {course.highlights?.length > 0 && (
                <ul className="quick-view-highlights">
                  {course.highlights.slice(0, 3).map((highlight) => <li key={highlight}>{highlight}</li>)}
                </ul>
              )}
              {course.previewLesson && (
                <details className="quick-view-preview">
                  <summary>Vista previa gratuita · Lección 1</summary>
                  <strong>{course.previewLesson.title}</strong>
                  <p>{course.previewLesson.content}</p>
                </details>
              )}
              <div className="quick-view-footer">
                <strong className="quick-view-price">
                  {new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'es-AR', {
                    style: 'currency',
                    currency,
                    maximumFractionDigits: currency === 'USD' ? 2 : 0,
                  }).format(primaryPrice)}
                  <small>{secondaryPrice} de referencia</small>
                </strong>
                <div className="quick-view-actions">
                  {isOwned ? (
                    <Link to="/mis-cursos" className="quick-view-add" onClick={onClose}>Ir a cursar</Link>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="quick-view-add"
                        onClick={() => { onAdd(); onClose(); }}
                        disabled={alreadyAdded || Number(course.stock) <= 0}
                      >
                        <AiOutlineShoppingCart />
                        {alreadyAdded ? 'Ya está en el carrito' : 'Agregar al carrito'}
                      </button>
                      <button
                        type="button"
                        className="quick-view-buy-now"
                        onClick={onBuyNow}
                        disabled={Number(course.stock) <= 0}
                      >
                        Comprar ahora
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

export default QuickView;
