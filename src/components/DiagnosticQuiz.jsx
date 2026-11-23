import { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';
import { getDemoProducts } from '../data/demoProducts.js';
import {
  bundleDiscountPercent,
  diagnosticQuestions,
  getDiagnosticResult,
} from '../data/diagnosticQuiz.js';
import { CartContext } from './Context.jsx';

function DiagnosticQuiz() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState(null);
  const [cartMessage, setCartMessage] = useState('');
  const [cartError, setCartError] = useState('');
  const { addItem, addBundle, isInCart } = useContext(CartContext);

  useEffect(() => {
    let active = true;

    getDocs(collection(db, 'items'))
      .then((response) => {
        if (active) {
          setProducts(response.docs.map((product) => ({
            id: product.id,
            ...product.data(),
          })));
        }
      })
      .catch((error) => {
        if (!active) return;

        if (error.code === 'permission-denied') {
          setProducts(getDemoProducts());
          return;
        }

        console.error('No se pudieron cargar los cursos para el diagnóstico', error);
        setLoadError('No pudimos cargar los cursos. Intenta nuevamente.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const resetQuiz = () => {
    setAnswers({});
    setStep(0);
    setResult(null);
    setCartMessage('');
    setCartError('');
  };

  const selectAnswer = (value) => {
    const updatedAnswers = {
      ...answers,
      [diagnosticQuestions[step].id]: value,
    };
    setAnswers(updatedAnswers);
    setCartMessage('');
    setCartError('');

    if (step === diagnosticQuestions.length - 1) {
      setResult(getDiagnosticResult(updatedAnswers, products));
      return;
    }

    setStep((currentStep) => currentStep + 1);
  };

  const addRecommendedCourse = () => {
    if (!result?.recommendation) return;

    if (addItem(result.recommendation)) {
      setCartMessage('Curso agregado al carrito.');
      setCartError('');
    } else {
      setCartError('Este curso no tiene cupos disponibles para agregar.');
    }
  };

  const addRecommendedBundle = () => {
    if (!result?.bundle) return;

    const response = addBundle(result.bundle.courses, {
      bundleId: result.bundle.id,
      discountPercent: bundleDiscountPercent,
    });

    if (response.ok) {
      setCartMessage(
        response.alreadyAdded
          ? 'Este paquete ya está aplicado en tu carrito.'
          : `Paquete agregado con ${bundleDiscountPercent}% de descuento.`,
      );
      setCartError('');
    } else {
      setCartError(response.message);
    }
  };

  if (loading) {
    return (
      <main className="container">
        <div className="has-text-centered my-6">
          <progress className="progress is-small is-primary" max="100">Cargando</progress>
          <p>Cargando cursos para personalizar tu recomendación...</p>
        </div>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="container">
        <div className="notification is-danger has-text-centered my-6">{loadError}</div>
      </main>
    );
  }

  if (result) {
    const { recommendation, bundle } = result;
    const bundleOriginalTotal = bundle?.courses.reduce(
      (total, course) => total + Number(course.price),
      0,
    );
    const bundleDiscountedTotal = bundleOriginalTotal
      ? (bundleOriginalTotal * (1 - bundleDiscountPercent / 100)).toFixed(2)
      : null;
    const recommendationAlreadyInCart = recommendation && isInCart(recommendation.id);

    return (
      <main className="container diagnostic-page">
        <header className="store-hero">
          <h1>Tu recomendación</h1>
          <p>Un próximo paso pensado para tu objetivo, tiempo y experiencia.</p>
        </header>

        {recommendation ? (
          <section className="diagnostic-result" aria-label="Curso recomendado">
            <span className="diagnostic-result-kicker">Curso recomendado para vos</span>
            <h2>{recommendation.name}</h2>
            {recommendation.description && <p>{recommendation.description}</p>}
            <div className="diagnostic-result-actions">
              <Link className="button is-light" to={`/item/${recommendation.id}`}>
                Ver curso
              </Link>
              {recommendationAlreadyInCart ? (
                <Link className="button is-primary" to="/cart">Ver en el carrito</Link>
              ) : (
                <button className="button is-primary" type="button" onClick={addRecommendedCourse}>
                  Agregar curso al carrito
                </button>
              )}
            </div>
          </section>
        ) : (
          <div className="notification is-warning has-text-centered">
            No encontramos un curso que coincida exactamente con esta combinación.{' '}
            <Link to="/">Explora todos los cursos</Link>.
          </div>
        )}

        {bundle && (
          <section className="diagnostic-bundle" aria-label="Paquete recomendado">
            <div>
              <span className="diagnostic-result-kicker">
                Disponible por tu tiempo semanal
              </span>
              <h2>{bundle.title} · {bundleDiscountPercent}% de descuento</h2>
              <p>{bundle.description}</p>
              <ol>
                {bundle.courses.map((course, index) => (
                  <li key={course.id}>
                    <Link to={`/item/${course.id}`}>
                      {index + 1}. {course.name}
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
            <div className="diagnostic-bundle-offer">
              <span className="diagnostic-original-price">
                Antes: ${Number(bundleOriginalTotal).toLocaleString('es-AR')}
              </span>
              <strong>${Number(bundleDiscountedTotal).toLocaleString('es-AR')}</strong>
              <button className="button is-primary" type="button" onClick={addRecommendedBundle}>
                Agregar paquete al carrito
              </button>
            </div>
          </section>
        )}

        {cartMessage && (
          <div className="notification is-success has-text-centered" role="status">
            {cartMessage} <Link to="/cart">Ir al carrito</Link>
          </div>
        )}
        {cartError && (
          <div className="notification is-warning has-text-centered" role="alert">
            {cartError}
          </div>
        )}
        <div className="diagnostic-restart">
          <button className="button is-light" type="button" onClick={resetQuiz}>
            Volver a empezar
          </button>
        </div>
      </main>
    );
  }

  const question = diagnosticQuestions[step];

  return (
    <main className="container diagnostic-page">
      <header className="store-hero">
        <h1>Test de diagnóstico rápido</h1>
        <p>Responde tres preguntas y encuentra tu próximo curso.</p>
      </header>
      <section className="diagnostic-card" aria-labelledby="diagnostic-question">
        <div className="diagnostic-progress">
          <span>Paso {step + 1} de {diagnosticQuestions.length}</span>
          <progress
            className="progress is-primary"
            value={step + 1}
            max={diagnosticQuestions.length}
            aria-label={`Pregunta ${step + 1} de ${diagnosticQuestions.length}`}
          />
        </div>
        <h2 id="diagnostic-question">{question.title}</h2>
        <div className="diagnostic-options">
          {question.options.map((option) => (
            <button
              className="diagnostic-option"
              type="button"
              key={option.value}
              onClick={() => selectAnswer(option.value)}
            >
              {option.label}
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
        {step > 0 && (
          <button
            className="button is-light diagnostic-back"
            type="button"
            onClick={() => setStep((currentStep) => currentStep - 1)}
          >
            Volver
          </button>
        )}
      </section>
    </main>
  );
}

export default DiagnosticQuiz;
