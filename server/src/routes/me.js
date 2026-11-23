import { Router } from 'express';

export function createMeRoutes({ meController, authMiddleware }) {
  const router = Router();
  router.get('/me/courses', authMiddleware, meController.getCourses);
  router.patch('/me/courses/:courseId/progress', authMiddleware, meController.updateCourseProgress);
  return router;
}
