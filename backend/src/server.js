require('dotenv').config();
const express = require('express');
const cors = require('cors');

const healthRoute = require('./routes/health');
const textRoute = require('./routes/text');
const imageRoute = require('./routes/image');
const pdfRoute = require('./routes/pdf');
const audioRoute = require('./routes/audio');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '15mb' }));

app.use('/api/health', healthRoute);
app.use('/api/text', textRoute);
app.use('/api/image', imageRoute);
app.use('/api/pdf', pdfRoute);
app.use('/api/audio', audioRoute);

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`MedTranslate backend listening on http://localhost:${PORT}`);
});
