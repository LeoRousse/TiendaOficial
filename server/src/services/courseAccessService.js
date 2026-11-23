import { catalogById } from '../data/catalog.js';
import { courseContentById } from '../data/courseContent.js';

function buildCourse(courseId, completedLessonIds, arsPerUsd) {
  const course = catalogById.get(courseId);
  const content = courseContentById[courseId];
  if (!course || !content) return null;

  const validCompletedLessonIds = completedLessonIds.filter((lessonId) =>
    content.lessons.some((lesson) => lesson.id === lessonId));
  return {
    id: course.id,
    name: course.name,
    description: content.description,
    priceUsd: course.priceUsd,
    priceArs: Math.round((course.priceUsd * arsPerUsd + Number.EPSILON) * 100) / 100,
    lessons: content.lessons.map((lesson) => ({ ...lesson })),
    completedLessonIds: validCompletedLessonIds,
    progressPercent: Math.round((validCompletedLessonIds.length / content.lessons.length) * 100),
  };
}

export function createCourseAccessService({ store, arsPerUsd }) {
  function getCoursesForUser(uid) {
    return store.getPaidCourseIds(uid)
      .map((courseId) => buildCourse(courseId, store.getCompletedLessonIds(uid, courseId), arsPerUsd))
      .filter(Boolean);
  }

  function updateLessonProgress({ uid, courseId, lessonId, completed }) {
    const course = catalogById.get(courseId);
    const content = courseContentById[courseId];
    if (!course || !content || !store.getPaidCourseIds(uid).includes(courseId)) return null;
    if (!content.lessons.some((lesson) => lesson.id === lessonId)) {
      const error = new Error('La lección no pertenece a este curso.');
      error.status = 400;
      throw error;
    }

    store.setLessonProgress(uid, courseId, lessonId, completed);
    const updated = buildCourse(courseId, store.getCompletedLessonIds(uid, courseId), arsPerUsd);
    return {
      completedLessonIds: updated.completedLessonIds,
      progressPercent: updated.progressPercent,
    };
  }

  return { getCoursesForUser, updateLessonProgress };
}
