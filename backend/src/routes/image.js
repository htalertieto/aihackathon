const express = require('express');
const upload = require('../middleware/upload');
const { processImage } = require('../services/pipeline');

const router = express.Router();

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file is required (field name "file")' });
    }
    const { targetLanguage, model } = req.body || {};
    if (!targetLanguage) {
      return res.status(400).json({ error: 'targetLanguage is required' });
    }

    const imageBase64 = req.file.buffer.toString('base64');
    const result = await processImage({
      imageBase64,
      mimeType: req.file.mimetype,
      targetLanguage,
      model,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
