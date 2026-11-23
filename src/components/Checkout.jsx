import { useState, useContext } from 'react';
import { CartContext } from './Context.jsx';
import { collection, doc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';
import CheckoutForm from './CheckoutForm.jsx';
import { getDemoStock } from '../data/demoProducts.js';

function Checkout() {
  const [ loading, setLoading ] = useState(false);
  const [ orderId, setOrderId ] = useState("");
  const [ stockError, setStockError ] = useState("");
  const { cart, total, clearCart } = useContext(CartContext);

  const createOrder = async ({ name, phone, email }) => {
    setLoading(true);
    setStockError("");

    try {
      const objOrder = {
        buyer: {
          name,
          phone,
          email,
        },
        items: cart,
        total: total,
        date: Timestamp.fromDate(new Date()),
      };
      const orderRef = doc(collection(db, "orders"));

      await runTransaction(db, async (transaction) => {
        const outOfStock = [];

        for (const product of cart) {
          const productRef = doc(db, "items", product.id);
          const productSnapshot = await transaction.get(productRef);

          if (!productSnapshot.exists()) {
            outOfStock.push(product.name);
            continue;
          }

          const stockDb = productSnapshot.data().stock ?? 0;
          if (stockDb < product.quantity) {
            outOfStock.push(product.name);
            continue;
          }

          transaction.update(productRef, { stock: stockDb - product.quantity });
        }

        if (outOfStock.length > 0) {
          throw new Error(`OUT_OF_STOCK:${outOfStock.join(", ")}`);
        }

        transaction.set(orderRef, objOrder);
      });

      setOrderId(orderRef.id);
      clearCart();
    } catch (error) {
      if (error.code === "permission-denied") {
        const stock = getDemoStock();
        const outOfStock = cart
          .filter((product) => (stock[product.id] ?? 0) < product.quantity)
          .map((product) => product.name);

        if (outOfStock.length > 0) {
          setStockError(`No hay stock suficiente para: ${outOfStock.join(", ")}.`);
        } else {
          cart.forEach((product) => {
            stock[product.id] = (stock[product.id] ?? 0) - product.quantity;
          });
          localStorage.setItem("tienda-quiroga-demo-stock", JSON.stringify(stock));
          setOrderId(`LOCAL-${Date.now().toString().slice(-8)}`);
          clearCart();
        }
      } else if (error.message?.startsWith("OUT_OF_STOCK:")) {
        setStockError(`No hay stock suficiente para: ${error.message.split(":").slice(1).join(":")}.`);
      } else {
        setStockError("No pudimos procesar la compra. Intenta nuevamente.");
        console.error("Error al crear la orden: ", error);
      }
    } finally {
       setLoading(false);
    }
  };

  if (loading) {
    return <h1 className="title has-text-centered my-6">Se esta creando su orden...</h1>;
  }

  if (orderId) {
    return (
      <div className="container has-text-centered my-6">
        <h1 className="title">Compra confirmada</h1>
        <div className="notification is-success">
          El identificador de tu orden es: <strong>{orderId}</strong>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="title has-text-centered">Checkout</h1>
      <div className="box">
        {stockError && <div className="notification is-danger">{stockError}</div>}
        <CheckoutForm onConfirm={createOrder} disabled={cart.length === 0} />
      </div>
    </div>
  );
}

export default Checkout;