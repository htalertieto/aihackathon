const express = require('express');
const pdfParse = require('pdf-parse');
const upload = require('../middleware/upload');
const { processText } = require('../services/pipeline');

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

    const parsed = await pdfParse(req.file.buffer);
    const extractedText = (parsed.text || '').trim();

    if (!extractedText) {
      return res.status(422).json({
        error: 'Could not extract text from this PDF. Try uploading a photo/screenshot instead.',
      });
    }

    const result = await processText({
      text: extractedText,
      targetLanguage,
      useMedicalGrounding: true,
      model,
    });
    res.json({ ...result, extractedText });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
