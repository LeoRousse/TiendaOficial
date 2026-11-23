import { useState, useEffect, useMemo, useRef } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';
import ItemList from './ItemList.jsx';
import { getDemoProducts } from '../data/demoProducts.js';
import { AiOutlineClose, AiOutlineSearch } from 'react-icons/ai';
import { motion } from 'framer-motion';
import { useAuth } from './AuthContext.jsx';
import { getMyCourses } from '../services/apiClient.js';
import { withCourseMetadata } from '../data/courseMetadata.js';
import { getEstimatedArsAmount } from '../services/paymentService.js';
import { usePreferences } from './PreferencesContext.jsx';

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
  const [sortOrder, setSortOrder] = useState('featured');
  const [ownedCourseIds, setOwnedCourseIds] = useState([]);
  const searchInputRef = useRef(null);
  const { user, purchasedCourses } = useAuth();
  const { currency } = usePreferences();

  const { categoryId } = useParams(); 
  const filteredProducts = useMemo(() => products.filter((product) => (
    product.name?.toLowerCase().includes(search.toLowerCase())
  )).sort((first, second) => {
    const firstPrice = currency === 'ARS' ? getEstimatedArsAmount(Number(first.price)) : Number(first.price);
    const secondPrice = currency === 'ARS' ? getEstimatedArsAmount(Number(second.price)) : Number(second.price);
    if (sortOrder === 'price-asc') return firstPrice - secondPrice;
    if (sortOrder === 'price-desc') return secondPrice - firstPrice;
    return Number(second.featured ?? second.rating ?? 0) - Number(first.featured ?? first.rating ?? 0);
  }), [products, search, sortOrder, currency]);

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      } else if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    setOwnedCourseIds(purchasedCourses);
  }, [purchasedCourses]);

  useEffect(() => {
    if (!user) return undefined;
    let active = true;
    getMyCourses()
      .then(({ courses: ownedCourses = [] }) => {
        if (active) setOwnedCourseIds(ownedCourses.map((course) => course.id));
      })
      .catch((requestError) => {
        if (requestError.status !== 401 && requestError.status !== 403) {
          console.error('No se pudieron consultar tus cursos adquiridos', requestError);
        }
      });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    setLoading(true);
    setError("");

    const itemsRef = collection(db, "items");

    const q = categoryId ? query(itemsRef, where("category", "==", categoryId)) : itemsRef;

    getDocs(q)
      .then((response) => {
        const data = response.docs.map((doc) => withCourseMetadata({ id: doc.id, ...doc.data()}));
        setProducts(data);
      })

      .catch((error) => {
        if (error.code === "permission-denied") {
          const demoProducts = getDemoProducts().map(withCourseMetadata);
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
        <div className="control has-icons-left catalog-search-field">
          <span className="icon is-left catalog-search-icon" aria-hidden="true">
            <AiOutlineSearch />
          </span>
          <input
            ref={searchInputRef}
            className="input is-rounded"
            type="search"
            placeholder="Buscar curso por nombre..."
            value={search}
            onChange={({ target }) => setSearch(target.value)}
            aria-label="Buscar cursos por nombre"
          />
          {search && (
            <button
              type="button"
              className="catalog-search-clear"
              aria-label="Limpiar búsqueda"
              onClick={() => setSearch('')}
            >
              <AiOutlineClose />
            </button>
          )}
        </div>
        <label className="catalog-sort-label">
          <span>Ordenar por</span>
          <select
            className="catalog-sort-select"
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            aria-label="Ordenar cursos"
          >
            <option value="featured">Destacados</option>
            <option value="price-asc">Menor precio</option>
            <option value="price-desc">Mayor precio</option>
          </select>
        </label>
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
            <ItemList products={filteredProducts} ownedCourseIds={ownedCourseIds} />
          ) : (
            <div className="notification is-warning has-text-centered">
              {search.trim() ? (
                <>
                  <p>No encontramos cursos para “{search}”.</p>
                  <button
                    type="button"
                    className="button is-primary mt-3"
                    onClick={() => window.dispatchEvent(new CustomEvent('orientation:ask', {
                      detail: { message: `No encontré un curso llamado "${search}". ¿Qué alternativa me recomiendas?` },
                    }))}
                  >
                    Consultar con el asistente IA sobre “{search}”
                  </button>
                </>
              ) : <p>No hay cursos disponibles en esta categoría.</p>}
            </div>
          )}
        </motion.div>
      )}
    </main>
  );
}

export default ItemListContainer;