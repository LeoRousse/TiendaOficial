import { assistantInputLimits } from '../services/assistantAdvisor.js';

export function createAssistantController({ assistantAdvisor }) {
  return {
    async recommend(req, res, next) {
      const { message, history = [] } = req.body || {};
      const invalidHistory = Array.isArray(history) && history.some((entry) => (
        !entry || !['user', 'assistant'].includes(entry.role)
        || typeof entry.text !== 'string'
        || !entry.text.trim()
        || entry.text.length > assistantInputLimits.historyText
      ));
      if (typeof message !== 'string' || !message.trim()
        || message.length > assistantInputLimits.message
        || !Array.isArray(history)
        || history.length > assistantInputLimits.historyItems
        || invalidHistory) {
        return res.status(400).json({ message: 'La consulta o el historial no son válidos o exceden el límite permitido.' });
      }

      try {
        const response = await assistantAdvisor.recommend({
          message: message.trim(),
          history: history.map(({ role, text }) => ({ role, text: text.trim() })),
        });
        return res.json(response);
      } catch (error) {
        return next(error);
      }
    },
  };
}
