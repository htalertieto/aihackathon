const express = require('express');
const upload = require('../middleware/upload');
const { processAudio } = require('../services/pipeline');

const router = express.Router();

// Map common browser MediaRecorder mime types to Responses API audio formats.
function mimeToFormat(mimeType = '') {
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mp3') || mimeType.includes('mpeg')) return 'mp3';
  return 'wav'; // default; webm/opus recordings should be transcoded client-side if possible
}

router.post('/', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'file is required (field name "file")' });
    }
    const { targetLanguage, model } = req.body || {};
    if (!targetLanguage) {
      return res.status(400).json({ error: 'targetLanguage is required' });
    }

    const audioBase64 = req.file.buffer.toString('base64');
    const result = await processAudio({
      audioBase64,
      format: mimeToFormat(req.file.mimetype),
      targetLanguage,
      model,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
