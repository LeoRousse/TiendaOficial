import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AiOutlineCheck, AiOutlineLoading3Quarters, AiOutlineReload } from 'react-icons/ai';
import { getMyCourses, updateCourseProgress } from '../services/apiClient.js';

function MyCourses() {
  const [courses, setCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingLessonId, setSavingLessonId] = useState('');
  const [error, setError] = useState('');

  const loadCourses = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const result = await getMyCourses({ signal });
      const ownedCourses = Array.isArray(result.courses) ? result.courses : [];
      setCourses(ownedCourses);
      setSelectedCourseId((current) => (
        ownedCourses.some((course) => course.id === current)
          ? current
          : ownedCourses[0]?.id || ''
      ));
    } catch (loadError) {
      if (loadError.name !== 'AbortError') {
        console.error('No se pudieron cargar los cursos adquiridos', loadError);
        setError(loadError.message || 'No pudimos cargar tus cursos.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadCourses(controller.signal);
    return () => controller.abort();
  }, [loadCourses]);

  const selectedCourse = courses.find((course) => course.id === selectedCourseId) || null;
  const selectedLesson = selectedCourse?.lessons?.find((lesson) => lesson.id === selectedLessonId)
    || selectedCourse?.lessons?.[0]
    || null;
  const completedLessons = useMemo(
    () => new Set(selectedCourse?.completedLessonIds || []),
    [selectedCourse?.completedLessonIds],
  );

  useEffect(() => {
    if (!selectedCourse) {
      setSelectedLessonId('');
      return;
    }
    if (!selectedCourse.lessons?.some((lesson) => lesson.id === selectedLessonId)) {
      setSelectedLessonId(selectedCourse.lessons?.[0]?.id || '');
    }
  }, [selectedCourse, selectedLessonId]);

  const toggleLessonCompletion = async () => {
    if (!selectedCourse || !selectedLesson || savingLessonId) return;
    const completed = !completedLessons.has(selectedLesson.id);
    setSavingLessonId(selectedLesson.id);
    setError('');
    try {
      const result = await updateCourseProgress(
        selectedCourse.id,
        selectedLesson.id,
        completed,
      );
      setCourses((previous) => previous.map((course) => (
        course.id === selectedCourse.id
          ? {
              ...course,
              completedLessonIds: result.completedLessonIds,
              progressPercent: result.progressPercent,
            }
          : course
      )));
    } catch (saveError) {
      console.error('No se pudo guardar el progreso de la lección', saveError);
      setError(saveError.message || 'No pudimos guardar tu progreso.');
    } finally {
      setSavingLessonId('');
    }
  };

  if (loading) {
    return (
      <main className="container my-courses-page" aria-busy="true">
        <div className="my-courses-status" role="status">
          <AiOutlineLoading3Quarters className="checkout-loading-icon" />
          <span>Cargando tu biblioteca…</span>
        </div>
      </main>
    );
  }

  return (
    <main className="container my-courses-page">
      <header className="my-courses-heading">
        <div>
          <p className="my-courses-eyebrow">Tu espacio de aprendizaje</p>
          <h1>Mis cursos</h1>
          <p>Retoma tus lecciones y sigue avanzando a tu ritmo.</p>
        </div>
        <button type="button" className="my-courses-refresh" onClick={() => loadCourses()}>
          <AiOutlineReload />
          Actualizar
        </button>
      </header>

      {error && <p className="my-courses-error" role="alert">{error}</p>}

      {courses.length === 0 ? (
        <section className="my-courses-empty">
          <span aria-hidden="true">✦</span>
          <h2>Tu próximo aprendizaje empieza acá</h2>
          <p>Cuando completes una compra, tus cursos aparecerán en esta biblioteca.</p>
          <Link className="button is-primary" to="/">Explorar cursos</Link>
        </section>
      ) : (
        <div className="my-courses-layout">
          <aside className="my-courses-library" aria-label="Cursos adquiridos">
            {courses.map((course) => (
              <button
                type="button"
                key={course.id}
                className={`my-course-card${selectedCourseId === course.id ? ' is-selected' : ''}`}
                onClick={() => setSelectedCourseId(course.id)}
                aria-pressed={selectedCourseId === course.id}
              >
                {course.img && <img src={course.img} alt="" loading="lazy" />}
                <span className="my-course-card-body">
                  <strong>{course.name}</strong>
                  <span>{course.progressPercent || 0}% completado</span>
                  <span className="my-course-progress" aria-hidden="true">
                    <span style={{ width: `${course.progressPercent || 0}%` }} />
                  </span>
                </span>
              </button>
            ))}
          </aside>

          {selectedCourse && (
            <section className="lesson-viewer" aria-label={`Contenido de ${selectedCourse.name}`}>
              <header className="lesson-viewer-heading">
                <p>CURSO</p>
                <h2>{selectedCourse.name}</h2>
                <div className="lesson-progress-summary">
                  <span>{selectedCourse.progressPercent || 0}% completado</span>
                  <span>{completedLessons.size} de {selectedCourse.lessons?.length || 0} lecciones</span>
                </div>
                <div
                  className="my-course-progress is-large"
                  role="progressbar"
                  aria-label="Progreso del curso"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-valuenow={selectedCourse.progressPercent || 0}
                >
                  <span style={{ width: `${selectedCourse.progressPercent || 0}%` }} />
                </div>
              </header>

              <div className="lesson-viewer-body">
                <nav className="lesson-list" aria-label="Lecciones">
                  {(selectedCourse.lessons || []).map((lesson, index) => {
                    const isCompleted = completedLessons.has(lesson.id);
                    return (
                      <button
                        type="button"
                        key={lesson.id}
                        className={`lesson-list-item${selectedLesson?.id === lesson.id ? ' is-active' : ''}`}
                        onClick={() => setSelectedLessonId(lesson.id)}
                        aria-current={selectedLesson?.id === lesson.id ? 'step' : undefined}
                      >
                        <span className={`lesson-number${isCompleted ? ' is-complete' : ''}`}>
                          {isCompleted ? <AiOutlineCheck /> : index + 1}
                        </span>
                        <span>{lesson.title}</span>
                      </button>
                    );
                  })}
                </nav>

                {selectedLesson ? (
                  <article className="lesson-content">
                    <p className="my-courses-eyebrow">Lección {selectedCourse.lessons.indexOf(selectedLesson) + 1}</p>
                    <h3>{selectedLesson.title}</h3>
                    <div className="lesson-reading-content">
                      {(selectedLesson.content || selectedLesson.description || '')
                        .split('\n\n')
                        .filter(Boolean)
                        .map((paragraph, index) => <p key={`${selectedLesson.id}-${index}`}>{paragraph}</p>)}
                    </div>
                    <button
                      type="button"
                      className={`lesson-complete-button${completedLessons.has(selectedLesson.id) ? ' is-complete' : ''}`}
                      onClick={toggleLessonCompletion}
                      disabled={Boolean(savingLessonId)}
                    >
                      {savingLessonId === selectedLesson.id
                        ? <AiOutlineLoading3Quarters className="checkout-loading-icon" />
                        : <AiOutlineCheck />}
                      {completedLessons.has(selectedLesson.id) ? 'Lección completada' : 'Marcar como completada'}
                    </button>
                  </article>
                ) : (
                  <p className="lesson-empty">Este curso aún no tiene lecciones publicadas.</p>
                )}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}

export default MyCourses;
