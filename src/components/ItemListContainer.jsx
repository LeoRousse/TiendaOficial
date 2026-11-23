import { useState, useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';
import ItemList from './ItemList.jsx';
import { getDemoProducts } from '../data/demoProducts.js';
import { AiOutlineSearch } from 'react-icons/ai';
import { motion } from 'framer-motion';

function CatalogSkeleton() {
  return (
    <div className="container mt-6" aria-label="Cargando cursos" aria-busy="true">
      <div className="columns is-multiline catalog-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <div className="column is-one-third" key={index}>
            <div className="catalog-skeleton" aria-hidden="true">
              <div className="skeleton-line skeleton-title" />
              <div className="skeleton-image" />
              <div className="skeleton-line skeleton-price" />
              <div className="skeleton-line skeleton-caption" />
              <div className="skeleton-button" />
              <div className="skeleton-button skeleton-button-secondary" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ItemListContainer({ greeting }) {
  const [ products, setProducts ] = useState([]);
  const [ loading, setLoading ] = useState(true);
  const [ error, setError ] = useState("");
  const [ search, setSearch ] = useState("");

  const { categoryId } = useParams(); 
  const filteredProducts = products.filter((product) => (
    product.name?.toLowerCase().includes(search.toLowerCase())
  ));

  useEffect(() => {
    setLoading(true);
    setError("");

    const itemsRef = collection(db, "items");

    const q = categoryId ? query(itemsRef, where("category", "==", categoryId)) : itemsRef;

    getDocs(q)
      .then((response) => {
        const data = response.docs.map((doc) => ({ id: doc.id, ...doc.data()}));
        setProducts(data);
      })

      .catch((error) => {
        if (error.code === "permission-denied") {
          const demoProducts = getDemoProducts();
          setProducts(categoryId
            ? demoProducts.filter((product) => product.category === categoryId)
            : demoProducts);
          setError("");
        } else {
          setError("No pudimos cargar los productos. Intenta nuevamente.");
        }
        console.error("Error al hacer el fetch", error);
      })

      .finally(() => {
        setLoading(false);
      });

    }, [categoryId]);

  return (
    <main className="container">
      <section className="store-hero">
        <h1>{greeting}</h1>
        <p>Aprende a tu ritmo con cursos prácticos de programación y diseño.</p>
      </section>
      <div className="category-bar" aria-label="Filtros por categoría">
        <NavLink to={`/`} end className={({ isActive }) => `category-chip${isActive ? " is-active" : ""}`}>
          Todos
        </NavLink>
        <NavLink to={`/category/programming`} className={({ isActive }) => `category-chip${isActive ? " is-active" : ""}`}>
          Programación
        </NavLink>
        <NavLink to={`/category/design`} className={({ isActive }) => `category-chip${isActive ? " is-active" : ""}`}>
          Diseño
        </NavLink>
      </div>
      <div className="field catalog-search">
        <div className="control has-icons-left">
          <span className="icon is-left catalog-search-icon" aria-hidden="true">
            <AiOutlineSearch />
          </span>
          <input
            className="input is-rounded"
            type="search"
            placeholder="Buscar curso por nombre..."
            value={search}
            onChange={({ target }) => setSearch(target.value)}
            aria-label="Buscar cursos por nombre"
          />
        </div>
      </div>
      {loading ? (
        <CatalogSkeleton />
      ) : error ? (
        <div className="notification is-danger has-text-centered">{error}</div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {filteredProducts.length > 0 ? (
            <ItemList products={filteredProducts} />
          ) : (
            <div className="notification is-warning has-text-centered">
              <p>No se encontraron productos de esta categoría.</p>
            </div>
          )}
        </motion.div>
      )}
    </main>
  );
}

export default ItemListContainer;