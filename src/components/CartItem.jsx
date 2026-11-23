import { useContext } from 'react';
import { CartContext } from './Context.jsx';

const CartItem = ({ id, name, price, quantity }) => {
  const { removeItem } = useContext(CartContext);

  const subtotal = price * quantity;

  return (
    <article className="box cart-item mb-4">
      <div className="columns is-vcentered">
        <div className="column">
          <h2 className="title is-5">{name}</h2>
        </div>
        <div className="column">
          <p className="subtitle is-6">
            Acceso: <strong>1 licencia digital</strong>
          </p>
        </div>
        <div className="column">
          <p className="subtitle is-6">
            Precio x unidad (USD):{' '}
            {`$${Number(price).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`}
          </p>
        </div>
        <div className="column">
          <p className="subtitle is-6">Subtotal: ${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</p>
        </div>
        <div className="column is-narrow">
          <button onClick={() => {removeItem(id)}} className="button is-danger">
            X
          </button>
        </div>
      </div>
    </article>
  );
};

export default CartItem;