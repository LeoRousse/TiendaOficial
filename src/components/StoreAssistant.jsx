import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { AiOutlineClose, AiOutlineMessage, AiOutlineSend, AiOutlineShoppingCart } from 'react-icons/ai';
import { CartContext } from './Context.jsx';
import { db } from '../firebase/firebaseConfig.js';
import { askStoreAdvisor } from '../firebase/storeAdvisor.js';

const suggestedQuestions = [
  '¿Necesito saber JavaScript antes de aprender React?',
  'Quiero crear una aplicación web, ¿por dónde empiezo?',
  '¿Qué curso me recomiendas para IA y cloud?',
];

const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  text: '¡Hola! Soy tu copiloto de aprendizaje. Cuéntame qué quieres construir y te ayudo a elegir un curso.',
};

function StoreAssistant() {
  const { addItem, isInCart } = useContext(CartContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState('');
  const [courses, setCourses] = useState([]);
  const [catalogState, setCatalogState] = useState('idle');
  const [isSending, setIsSending] = useState(false);
  const [cartStatus, setCartStatus] = useState('');
  const messageListRef = useRef(null);
  const inputRef = useRef(null);
  const requestIdRef = useRef(0);
  const catalogFetchedRef = useRef(false);

  useEffect(() => {
    if (!isOpen || catalogFetchedRef.current) return;

    catalogFetchedRef.current = true;
    setCatalogState('loading');
    getDocs(collection(db, 'items'))
      .then((snapshot) => {
        if (snapshot.empty) {
          catalogFetchedRef.current = false;
          setCatalogState('empty');
          return;
        }
        setCourses(snapshot.docs.map((course) => ({ id: course.id, ...course.data() })));
        setCatalogState('ready');
      })
      .catch((error) => {
        console.error('No se pudo cargar el catálogo para el copiloto', error);
        catalogFetchedRef.current = false;
        setCatalogState('error');
      });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [isOpen, messages, isSending]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async (value = input) => {
    const text = value.trim();
    if (!text || isSending || catalogState !== 'ready') return;

    const priorMessages = messages
      .filter((message) => message.id !== 'welcome')
      .map(({ role, text: messageText }) => ({ role, text: messageText }));
    const userMessage = { id: `user-${Date.now()}`, role: 'user', text };
    const requestId = ++requestIdRef.current;
    setMessages((previous) => [...previous, userMessage]);
    setInput('');
    setCartStatus('');
    setIsSending(true);

    try {
      const result = await askStoreAdvisor({ message: text, history: priorMessages, courses });
      if (requestId !== requestIdRef.current) return;
      const recommendedCourse = courses.find((course) => course.id === result.recommendedCourseId);
      setMessages((previous) => [...previous, {
        id: `assistant-${requestId}`,
        role: 'assistant',
        text: result.answer,
        course: recommendedCourse || null,
      }]);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('No se pudo obtener orientación del copiloto', error);
      const isAppCheckMissing = error.code === 'app-check/not-configured';
      setMessages((previous) => [...previous, {
        id: `assistant-error-${requestId}`,
        role: 'assistant',
        text: isAppCheckMissing
          ? 'Falta configurar App Check. Define REACT_APP_FIREBASE_APP_CHECK_SITE_KEY y completa la provisión de Firebase AI Logic; sigue las instrucciones del README.'
          : 'No pude conectarme en este momento. Inténtalo nuevamente en unos minutos.',
      }]);
    } finally {
      if (requestId === requestIdRef.current) setIsSending(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage();
  };

  const handleAddCourse = (course) => {
    const added = addItem(course);
    setCartStatus(added
      ? `${course.name} se agregó al carrito.`
      : (isInCart(course.id)
        ? 'Este curso ya está en tu carrito.'
        : 'No hay cupos disponibles para este curso.'));
  };

  return (
    <div className="store-assistant">
      {isOpen && (
        <section className="store-assistant-panel" aria-label="Copiloto de orientación">
          <header className="store-assistant-header">
            <div className="store-assistant-brand">
              <span className="store-assistant-avatar" aria-hidden="true">Q</span>
              <div>
                <h2>Copiloto de aprendizaje</h2>
                <p>Orientación basada en nuestros cursos</p>
              </div>
            </div>
            <button
              type="button"
              className="store-assistant-close"
              aria-label="Cerrar copiloto"
              onClick={() => setIsOpen(false)}
            >
              <AiOutlineClose />
            </button>
          </header>

          <div className="store-assistant-messages" ref={messageListRef} aria-live="polite">
            {catalogState === 'loading' && (
              <p className="store-assistant-status">Cargando cursos y temarios…</p>
            )}
            {catalogState === 'error' && (
              <div className="store-assistant-error" role="alert">
                No se pudo cargar el catálogo. Cierra y vuelve a abrir el copiloto para reintentar.
              </div>
            )}
            {catalogState === 'empty' && (
              <div className="store-assistant-error" role="status">
                Todavía no hay cursos disponibles para recomendar.
              </div>
            )}
            {messages.map((message) => (
              <article
                className={`store-assistant-message is-${message.role}`}
                key={message.id}
              >
                <p>{message.text}</p>
                {message.course && (
                  <div className="store-assistant-course">
                    <strong>{message.course.name}</strong>
                    <div className="store-assistant-course-actions">
                      <Link to={`/item/${message.course.id}`} onClick={() => setIsOpen(false)}>
                        Ver curso
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleAddCourse(message.course)}
                        disabled={isInCart(message.course.id) || Number(message.course.stock) <= 0}
                      >
                        <AiOutlineShoppingCart />
                        {isInCart(message.course.id) ? 'En el carrito' : 'Agregar'}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            ))}
            {isSending && <p className="store-assistant-status">Estoy buscando la mejor opción…</p>}
            {cartStatus && <p className="store-assistant-status" role="status">{cartStatus}</p>}
            {messages.length === 1 && catalogState === 'ready' && (
              <div className="store-assistant-suggestions" aria-label="Preguntas sugeridas">
                {suggestedQuestions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={() => sendMessage(question)}
                    disabled={isSending}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form className="store-assistant-form" onSubmit={handleSubmit}>
            <label className="visually-hidden" htmlFor="store-assistant-input">
              Escribe tu pregunta
            </label>
            <input
              id="store-assistant-input"
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="¿Qué te gustaría aprender?"
              maxLength={500}
              disabled={catalogState !== 'ready' || isSending}
            />
            <button
              type="submit"
              aria-label="Enviar pregunta"
              disabled={!input.trim() || catalogState !== 'ready' || isSending}
            >
              <AiOutlineSend />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="store-assistant-toggle"
        aria-label={isOpen ? 'Cerrar copiloto de aprendizaje' : 'Abrir copiloto de aprendizaje'}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <AiOutlineClose /> : <AiOutlineMessage />}
        <span>{isOpen ? 'Cerrar' : '¿Te orientamos?'}</span>
      </button>
    </div>
  );
}

export default StoreAssistant;
