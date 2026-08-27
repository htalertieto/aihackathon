const express = require('express');
const { answerFollowUp } = require('../services/pipeline');

const router = express.Router();

// Stateless follow-up Q&A: the browser sends back the original context and
// prior conversation turns on every call. Nothing is stored server-side.
router.post('/', async (req, res, next) => {
  try {
    const { context, targetLanguage, history, question, model } = req.body || {};
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'question is required' });
    }
    if (!targetLanguage) {
      return res.status(400).json({ error: 'targetLanguage is required' });
    }
    if (!context || typeof context !== 'object') {
      return res.status(400).json({ error: 'context is required (the original explanation result)' });
    }
    if (history !== undefined && !Array.isArray(history)) {
      return res.status(400).json({ error: 'history must be an array of {role, text} turns' });
    }

    const result = await answerFollowUp({ context, targetLanguage, history, question, model });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
