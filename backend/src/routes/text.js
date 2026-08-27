const express = require('express');
const { processText } = require('../services/pipeline');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { text, targetLanguage, useMedicalGrounding, model } = req.body || {};
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    if (!targetLanguage) {
      return res.status(400).json({ error: 'targetLanguage is required' });
    }

    const result = await processText({ text, targetLanguage, useMedicalGrounding, model });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
