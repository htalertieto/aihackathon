const fetch = require('node-fetch');

const ENDPOINT = process.env.CAREKUBE_ENDPOINT;
const API_KEY = process.env.CAREKUBE_KEY;
const VISION_MODEL = process.env.CAREKUBE_VISION_MODEL || 'lingshu-7b';
const MEDICAL_TEXT_MODEL = process.env.CAREKUBE_MEDICAL_TEXT_MODEL || 'med42';

/**
 * Low-level call to the CareKube OpenAI-compatible /chat/completions endpoint.
 */
async function callChatCompletion({ model, messages, maxTokens = 1000, temperature = 0.2 }) {
  if (!ENDPOINT || !API_KEY) {
    throw new Error('CareKube API is not configured (missing endpoint/key).');
  }

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `CareKube request failed (${res.status})`;
    throw new Error(message);
  }

  const text = data?.choices?.[0]?.message?.content?.trim() || '';
  return { raw: data, text };
}

/**
 * Use the medical vision model (lingshu-7b) to describe/extract medical
 * content (diagnosis, prescription, lab report, doctor's handwriting, etc.)
 * from an uploaded image.
 */
async function describeMedicalImage({ imageBase64, mimeType = 'image/jpeg', model = VISION_MODEL }) {
  const messages = [
    {
      role: 'system',
      content:
        'You are a medical document reader. Extract and transcribe all visible medical text ' +
        '(diagnosis, medication names, dosages, instructions) from the image as accurately as ' +
        'possible. If handwriting is unclear, note your best guess in brackets. Output plain text only.',
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Extract the medical content from this image.' },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
      ],
    },
  ];

  const { text } = await callChatCompletion({ model, messages, maxTokens: 1200 });
  return text;
}

/**
 * Use the medical text specialist (med42) to ground/expand raw medical text
 * (e.g. verify terminology, add brief clinical context) before it is
 * simplified and translated for the patient.
 */
async function groundMedicalText({ text, model = MEDICAL_TEXT_MODEL }) {
  const messages = [
    {
      role: 'system',
      content:
        'You are a clinical assistant. Given raw notes about a patient diagnosis, correct any ' +
        'obvious medical terminology errors and briefly note what each medical term refers to. ' +
        'Keep it factual and concise. Output plain text only, no markdown.',
    },
    { role: 'user', content: text },
  ];

  const { text: grounded } = await callChatCompletion({ model, messages, maxTokens: 800 });
  return grounded;
}

module.exports = {
  callChatCompletion,
  describeMedicalImage,
  groundMedicalText,
};
