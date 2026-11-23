import { lazy, Suspense, useState, useContext } from 'react';
import { Link } from 'react-router-dom';
import { CartContext } from './Context.jsx';
import { AiOutlineClockCircle, AiOutlineGlobal, AiOutlineSafetyCertificate, AiOutlineCheck } from 'react-icons/ai';
import EducationalAdBanner from './EducationalAdBanner.jsx';
import freeLessons from '../data/freeLessons.js';

const FreeLessonPlayground = lazy(() => import('./FreeLessonPlayground.jsx'));

function ItemDetail({
  id,
  name,
  img,
  category,
  description,
  price,
  stock,
  level,
  duration,
  language,
  certificate,
  modules,
  learnings,
}) {
  const { addItem, isInCart } = useContext(CartContext);
  const alreadyAdded = isInCart(id);
  const [openModule, setOpenModule] = useState(0);

  const categoryName = category === "programming"
    ? "Programación"
    : category === "design"
      ? "Diseño"
      : category || "Cursos";

  const courseDuration = duration || "8 semanas";
  const courseLanguage = language || "Español";
  const hasCertificate = certificate !== false;
  const freeLesson = freeLessons[id];

  const courseModules = Array.isArray(modules) && modules.length > 0
    ? modules
    : [
        { title: "Fundamentos y preparación", duration: "1 h 20 min", lessons: "Conceptos clave y entorno de trabajo" },
        { title: "Proyectos prácticos", duration: "3 h 40 min", lessons: "Construcción guiada paso a paso" },
        { title: "Buenas prácticas", duration: "2 h 10 min", lessons: "Organización, rendimiento y calidad" },
        { title: "Proyecto final", duration: "2 h", lessons: "Entrega y preparación para producción" },
      ];

  const learningPoints = Array.isArray(learnings) && learnings.length > 0
    ? learnings
    : [
        "Dominar los fundamentos esenciales del curso",
        "Crear proyectos reales aplicando buenas prácticas",
        "Resolver desafíos técnicos de forma independiente",
        "Preparar tu trabajo para compartirlo profesionalmente",
      ];

  const handleAdd = () => {
    const item = { id, name, img, price, stock, level };
    addItem(item);
  };

  return (
    <main className="course-detail-page">
      <nav className="course-breadcrumb" aria-label="Ruta de navegación">
        <Link to="/">Inicio</Link>
        <span aria-hidden="true">›</span>
        <Link to={`/category/${category}`}>{categoryName}</Link>
        <span aria-hidden="true">›</span>
        <span aria-current="page">{name}</span>
      </nav>

      <div className="course-detail-grid">
        <div className="course-main-column">
          <header className="course-detail-header">
            <span className="course-category">{categoryName}</span>
            <h1>{name}</h1>
            <p className="course-subtitle">{description}</p>

            <div className="course-meta" aria-label="Información del curso">
              <span><strong>Nivel</strong>{level || "Todos los niveles"}</span>
              <span><AiOutlineClockCircle /><strong>{courseDuration}</strong></span>
              <span><AiOutlineGlobal /><strong>{courseLanguage}</strong></span>
              {hasCertificate && (
                <span><AiOutlineSafetyCertificate /><strong>Incluye certificado</strong></span>
              )}
            </div>
          </header>

          <section className="learning-section" aria-labelledby="learning-title">
            <h2 id="learning-title">Lo que aprenderás</h2>
            <div className="learning-grid">
              {learningPoints.map((point) => (
                <div className="learning-item" key={point}>
                  <AiOutlineCheck aria-hidden="true" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </section>

          {freeLesson && (
            <Suspense fallback={<p className="playground-loading" role="status">Cargando el playground...</p>}>
              <FreeLessonPlayground courseName={name} lesson={freeLesson} />
            </Suspense>
          )}

          <section className="curriculum-section" aria-labelledby="curriculum-title">
            <div className="section-heading">
              <h2 id="curriculum-title">Temario del curso</h2>
              <span>{courseModules.length} módulos</span>
            </div>
            <div className="curriculum-list">
              {courseModules.map((module, index) => {
                const moduleTitle = typeof module === "string" ? module : module.title;
                const moduleDuration = typeof module === "string" ? "" : module.duration;
                const moduleLessons = typeof module === "string" ? "" : module.lessons;
                const isOpen = openModule === index;

                return (
                  <article className={`curriculum-item${isOpen ? " is-open" : ""}`} key={moduleTitle || index}>
                    <button
                      type="button"
                      className="curriculum-toggle"
                      aria-expanded={isOpen}
                      onClick={() => setOpenModule(isOpen ? -1 : index)}
                    >
                      <span>
                        <small>Módulo {index + 1}</small>
                        <strong>{moduleTitle}</strong>
                      </span>
                      <span className="module-duration">{moduleDuration}</span>
                      <span className="curriculum-chevron" aria-hidden="true">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && moduleLessons && (
                      <div className="curriculum-content">{moduleLessons}</div>
                    )}
                  </article>
                );
              })}
            </div>
          </section>

          <EducationalAdBanner />
        </div>

        <aside className="course-purchase-column">
          <div className="course-purchase-card">
            <figure className="course-purchase-image">
              <img src={img} alt={name} loading="eager" />
            </figure>
            <div className="course-purchase-body">
              <div className="course-price-row">
                <span>Acceso completo</span>
                <strong>${Number(price).toLocaleString("es-AR")}</strong>
              </div>
              <ul className="purchase-benefits">
                <li><AiOutlineCheck />Acceso de por vida</li>
                <li><AiOutlineCheck />Recursos descargables</li>
                <li><AiOutlineCheck />Actualizaciones incluidas</li>
                {hasCertificate && <li><AiOutlineCheck />Certificado de finalización</li>}
              </ul>

              {alreadyAdded ? (
                <Link to="/cart" className="course-purchase-button is-added">
                  Ir al carrito
                </Link>
              ) : (
                <button
                  type="button"
                  className="course-purchase-button"
                  onClick={handleAdd}
                  disabled={Number(stock) <= 0}
                >
                  {Number(stock) > 0 ? "Agregar al carrito" : "Inscripción cerrada"}
                </button>
              )}

              <p className="purchase-security">Compra segura · Acceso inmediato</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

export default ItemDetail;