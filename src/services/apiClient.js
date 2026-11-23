import { auth } from '../firebase/firebaseConfig.js';

const API_BASE_URL = (
  process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api'
).replace(/\/+$/, '');

export async function apiRequest(path, { authenticated = false, ...options } = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (authenticated) {
    const user = auth.currentUser;
    if (!user) throw new Error('Inicia sesión para consultar tus cursos.');
    headers.set('Authorization', `Bearer ${await user.getIdToken()}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  let payload = {};
  try {
    payload = await response.json();
  } catch (error) {
    console.error('La API devolvió una respuesta no JSON', error);
    throw new Error('El servicio devolvió una respuesta inválida.');
  }
  if (!response.ok) {
    const requestError = new Error(payload.message || `Solicitud fallida (${response.status}).`);
    requestError.status = response.status;
    throw requestError;
  }
  return payload;
}

export function getMyCourses(options = {}) {
  return apiRequest('/me/courses', { ...options, authenticated: true });
}

export function updateCourseProgress(courseId, lessonId, completed, options = {}) {
  return apiRequest(`/me/courses/${encodeURIComponent(courseId)}/progress`, {
    ...options,
    method: 'PATCH',
    authenticated: true,
    body: JSON.stringify({ lessonId, completed }),
  });
}

export function requestCourseRecommendation(message, history, options = {}) {
  return apiRequest('/assistant/recommend', {
    ...options,
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}
