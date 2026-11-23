import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { AiOutlineClose, AiOutlineShoppingCart } from 'react-icons/ai';

function QuickView({ course, isOpen, onClose, onAdd, alreadyAdded }) {
  const closeButtonRef = useRef(null);
  const scrollPositionRef = useRef(0);
  const shouldReduceMotion = useReducedMotion();

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
              <div className="quick-view-footer">
                <strong className="quick-view-price">
                  ${Number(course.price).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </strong>
                <button
                  type="button"
                  className="quick-view-add"
                  onClick={() => {
                    onAdd();
                    onClose();
                  }}
                  disabled={alreadyAdded || Number(course.stock) <= 0}
                >
                  <AiOutlineShoppingCart />
                  {alreadyAdded
                    ? 'Ya está en el carrito'
                    : (Number(course.stock) > 0 ? 'Agregar al carrito' : 'Inscripción cerrada')}
                </button>
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
