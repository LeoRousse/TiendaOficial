import { Router } from 'express';

export function createAssistantRoutes({ assistantController, limiter }) {
  const router = Router();
  router.post('/assistant/recommend', limiter, assistantController.recommend);
  return router;
}
