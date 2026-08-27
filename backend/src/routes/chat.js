const express = require('express');
const { translateChatMessage } = require('../services/azureOpenAI');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { text, targetLanguage, sourceLanguage, model } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    if (!targetLanguage) {
      return res.status(400).json({ error: 'targetLanguage is required' });
    }

    const result = await translateChatMessage({
      text: text.trim(),
      targetLanguage,
      sourceLanguage,
      model,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
