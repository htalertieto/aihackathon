const express = require('express');
const { buildOpenEhrComposition } = require('../services/openEhrExport');

const router = express.Router();

// Backend-only export: converts the current analysis result (and optional
// browser-side follow-up history) into an openEHR-style COMPOSITION JSON
// document (https://openehr.org/), for interoperability with openEHR-based
// systems. Nothing is stored — this is a stateless transform of data the
// caller already has in the browser.
router.post('/', (req, res, next) => {
  try {
    const { result, targetLanguage, history, patient, download } = req.body || {};
    if (!result || typeof result !== 'object') {
      return res.status(400).json({ error: 'result is required (the analysis result to export)' });
    }
    if (history !== undefined && !Array.isArray(history)) {
      return res.status(400).json({ error: 'history must be an array of {role, text} turns' });
    }

    const composition = buildOpenEhrComposition({ result, targetLanguage, history, patient });

    if (download) {
      res.setHeader('Content-Disposition', 'attachment; filename="medtranslate-openehr-composition.json"');
    }
    res.json(composition);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
