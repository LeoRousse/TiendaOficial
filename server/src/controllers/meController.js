export function createMeController({ courseAccessService }) {
  return {
    getCourses(req, res) {
      return res.json({ courses: courseAccessService.getCoursesForUser(req.user.uid) });
    },

    updateCourseProgress(req, res, next) {
      const { lessonId, completed } = req.body || {};
      if (typeof lessonId !== 'string' || !lessonId.trim() || typeof completed !== 'boolean') {
        return res.status(400).json({ message: 'lessonId y completed son obligatorios y deben ser válidos.' });
      }

      try {
        const progress = courseAccessService.updateLessonProgress({
          uid: req.user.uid,
          courseId: req.params.courseId,
          lessonId,
          completed,
        });
        if (!progress) return res.status(404).json({ message: 'No encontramos ese curso.' });
        return res.json(progress);
      } catch (error) {
        return next(error);
      }
    },
  };
}
