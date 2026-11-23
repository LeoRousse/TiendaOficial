import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AiOutlineClose,
  AiOutlineMessage,
  AiOutlineSend,
  AiOutlineShoppingCart,
} from 'react-icons/ai';
import { CartContext } from './Context.jsx';
import { apiRequest, requestCourseRecommendation } from '../services/apiClient.js';

const suggestedQuestions = [
  '¿Necesito saber JavaScript antes de aprender React?',
  'Quiero crear una aplicación web, ¿por dónde empiezo?',
  '¿Qué curso me recomiendas para IA y cloud?',
];

const welcomeMessage = {
  id: 'welcome',
  role: 'assistant',
  text: '¡Hola! Cuéntame qué te gustaría construir y te ayudo a encontrar el mejor camino.',
  courseIds: [],
};

function OrientationChatDrawer() {
  const { addItem, isInCart } = useContext(CartContext);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState('');
  const [pendingQuestion, setPendingQuestion] = useState('');
  const [courses, setCourses] = useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [cartStatus, setCartStatus] = useState('');
  const messageListRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen || courses.length) return;
    const controller = new AbortController();
    setIsLoadingCatalog(true);
    setCatalogError('');

    apiRequest('/catalog', { signal: controller.signal })
      .then((result) => {
        setCourses((result.items || []).map((item) => ({
          ...item,
          price: Number(item.priceUsd),
          stock: Number.isFinite(Number(item.stock)) ? Number(item.stock) : 1,
        })));
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error('No se pudo cargar el catálogo para el copiloto', error);
        setCatalogError(error.message || 'No se pudo cargar el catálogo.');
      })
      .finally(() => setIsLoadingCatalog(false));

    return () => {
      controller.abort();
      setIsLoadingCatalog(false);
    };
  }, [courses.length, isOpen]);

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

  useEffect(() => {
    const handleAsk = (event) => {
      const question = event.detail?.message;
      if (typeof question !== 'string' || !question.trim()) return;
      setPendingQuestion(question);
      setInput('');
      setIsOpen(true);
    };
    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('orientation:ask', handleAsk);
    document.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('orientation:ask', handleAsk);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const sendMessage = useCallback(async (value = input) => {
    const text = value.trim();
    if (!text || isLoadingCatalog || catalogError || isSending) return;
    const history = messages
      .filter((message) => message.id !== 'welcome')
      .slice(-8)
      .map(({ role, text: messageText }) => ({ role, text: messageText }));

    setMessages((previous) => [...previous, {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      courseIds: [],
    }]);
    setInput('');
    setCartStatus('');
    setIsSending(true);

    try {
      const result = await requestCourseRecommendation(text, history);
      const recommendedIds = Array.isArray(result.recommendedCourseIds)
        ? result.recommendedCourseIds
        : [];
      setMessages((previous) => [...previous, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: result.answer,
        courseIds: recommendedIds.filter((id) => courses.some((course) => course.id === id)),
      }]);
    } catch (error) {
      console.error('No se pudo obtener orientación del copiloto', error);
      setMessages((previous) => [...previous, {
        id: `assistant-error-${Date.now()}`,
        role: 'assistant',
        text: error.message || 'No pude conectarme en este momento. Inténtalo nuevamente.',
        courseIds: [],
      }]);
    } finally {
      setIsSending(false);
    }
  }, [input, isLoadingCatalog, catalogError, isSending, messages, courses]);

  useEffect(() => {
    if (!isOpen || !pendingQuestion || !courses.length || isLoadingCatalog || catalogError) return;
    setPendingQuestion('');
    sendMessage(pendingQuestion);
  }, [pendingQuestion, isOpen, courses.length, isLoadingCatalog, catalogError, sendMessage]);

  const addRecommendedCourse = (course) => {
    const added = addItem(course);
    setCartStatus(added
      ? `${course.name} se agregó al carrito.`
      : (isInCart(course.id)
        ? 'Este curso ya está en tu carrito.'
        : 'No se pudo agregar el curso al carrito.'));
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
            {isLoadingCatalog && <p className="store-assistant-status">Cargando catálogo…</p>}
            {catalogError && (
              <div className="store-assistant-error" role="alert">{catalogError}</div>
            )}
            {messages.map((message) => (
              <article className={`store-assistant-message is-${message.role}`} key={message.id}>
                <p>{message.text}</p>
                {message.courseIds.length > 0 && (
                  <div className="store-assistant-recommendations">
                    {message.courseIds.map((courseId) => {
                      const course = courses.find((item) => item.id === courseId);
                      if (!course) return null;
                      return (
                        <div className="store-assistant-course" key={courseId}>
                          <strong>{course.name}</strong>
                          <div className="store-assistant-course-actions">
                            <Link to={`/item/${course.id}`} onClick={() => setIsOpen(false)}>
                              Ver curso
                            </Link>
                            <button
                              type="button"
                              onClick={() => addRecommendedCourse(course)}
                              disabled={isInCart(course.id)}
                            >
                              <AiOutlineShoppingCart />
                              {isInCart(course.id) ? 'En el carrito' : 'Agregar'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            ))}
            {isSending && <p className="store-assistant-status">Estoy buscando la mejor opción…</p>}
            {cartStatus && <p className="store-assistant-status" role="status">{cartStatus}</p>}
            {messages.length === 1 && !catalogError && (
              <div className="store-assistant-suggestions" aria-label="Preguntas sugeridas">
                {suggestedQuestions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    onClick={() => sendMessage(question)}
                    disabled={isLoadingCatalog || Boolean(catalogError) || isSending}
                  >
                    {question}
                  </button>
                ))}
              </div>
            )}
          </div>

          <form
            className="store-assistant-form"
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
          >
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
              disabled={isLoadingCatalog || Boolean(catalogError) || isSending}
            />
            <button
              type="submit"
              aria-label="Enviar pregunta"
              disabled={!input.trim() || isLoadingCatalog || Boolean(catalogError) || isSending}
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

export default OrientationChatDrawer;
