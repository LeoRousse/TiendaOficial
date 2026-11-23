import Item from './Item.jsx';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

function ItemList({ products }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="container mt-6">
      <div className="columns is-multiline catalog-grid">
        <AnimatePresence initial={false} mode="popLayout">
          {products.map((product) => (
            <motion.div
              className="column is-one-third"
              key={product.id}
              layout
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.97 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2, layout: { duration: 0.24 } }}
            >
              <Item {...product} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ItemList;