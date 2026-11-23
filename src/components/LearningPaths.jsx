import { Link } from 'react-router-dom';
import learningPaths from '../data/learningPaths.js';

function LearningPaths() {
  return (
    <main className="container learning-paths">
      <header className="store-hero">
        <h1>Rutas de aprendizaje</h1>
        <p>
          Sigue un recorrido guiado y conecta cursos para alcanzar tus objetivos.
        </p>
      </header>

      <section className="learning-paths-grid" aria-label="Rutas disponibles">
        {learningPaths.map((path) => (
          <article className="learning-path-card" key={path.id}>
            <header className="learning-path-header">
              <span className="learning-path-kicker">
                {path.courses.length} cursos · recorrido guiado
              </span>
              <h2>{path.title}</h2>
              <p>{path.description}</p>
            </header>

            <ol className="learning-path-courses">
              {path.courses.map((course, index) => (
                <li key={course.id}>
                  <span className="learning-path-step" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Link to={`/item/${course.id}`}>{course.title}</Link>
                </li>
              ))}
            </ol>
          </article>
        ))}
      </section>
    </main>
  );
}

export default LearningPaths;
