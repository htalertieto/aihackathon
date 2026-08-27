const fetch = require('node-fetch');

const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const API_KEY = process.env.AZURE_OPENAI_KEY;
const PRIMARY_MODEL = process.env.AZURE_OPENAI_PRIMARY_MODEL || 'gpt-5.4';

/**
 * Low-level call to the Azure OpenAI Responses API.
 * `input` follows the Responses API "input" schema: an array of
 * { role, content: [{ type, text|input_image|input_audio, ... }] } messages,
 * or a plain string for simple text-only prompts.
 */
async function callResponses({ model = PRIMARY_MODEL, input, instructions, maxOutputTokens = 1200 }) {
  if (!ENDPOINT || !API_KEY) {
    throw new Error('Azure OpenAI is not configured (missing endpoint/key).');
  }

  const body = {
    model,
    input,
    max_output_tokens: maxOutputTokens,
  };
  if (instructions) body.instructions = instructions;

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data?.error?.message || `Azure OpenAI request failed (${res.status})`;
    throw new Error(message);
  }

  return { raw: data, text: extractOutputText(data) };
}

// The Responses API returns output as an array of items; find the text content.
function extractOutputText(data) {
  if (typeof data.output_text === 'string' && data.output_text.length) {
    return data.output_text;
  }
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && content.text) {
        chunks.push(content.text);
      } else if (content.type === 'output_audio_transcript' && content.transcript) {
        chunks.push(content.transcript);
      }
    }
  }
  return chunks.join('\n').trim();
}

/**
 * Explain + translate a patient-facing medical text into plain language,
 * in the target language, as structured JSON.
 */
async function explainAndTranslate({ text, targetLanguage, model }) {
  const instructions = [
    'You are MedTranslate, an assistant that helps patients understand medical information.',
    'You explain diagnoses/notes in simple, non-alarming, plain language and translate them',
    `into the patient's language: ${targetLanguage}.`,
    'Always include a disclaimer that this is not a substitute for professional medical advice.',
    'Respond ONLY with valid minified JSON matching this schema, no markdown fences:',
    '{"summary":string,"keyTerms":[{"term":string,"plainMeaning":string}],',
    '"translatedText":string,"actionItems":string[],"disclaimer":string}',
    'All string values must be written in the target language, except "term" which stays',
    'in the original medical term (optionally with the translated term in parentheses).',
  ].join(' ');

  const input = [
    {
      role: 'user',
      content: [{ type: 'input_text', text }],
    },
  ];

  const { text: raw } = await callResponses({ model, input, instructions });
  return parseJsonSafely(raw);
}

/**
 * Transcribe an audio recording using the Responses API multimodal input.
 */
async function transcribeAudio({ audioBase64, format = 'wav', model }) {
  const instructions = 'Transcribe the audio verbatim. Respond with only the transcript text.';
  const input = [
    {
      role: 'user',
      content: [
        {
          type: 'input_audio',
          input_audio: { data: audioBase64, format },
        },
      ],
    },
  ];
  const { text } = await callResponses({ model, input, instructions, maxOutputTokens: 800 });
  return text;
}

function parseJsonSafely(raw) {
  if (!raw) throw new Error('Empty response from model');
  const cleaned = raw.trim().replace(/^```json\s*|^```\s*|```$/g, '');
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err2) {
        // fall through
      }
    }
    throw new Error('Model did not return valid JSON: ' + cleaned.slice(0, 200));
  }
}

module.exports = {
  callResponses,
  explainAndTranslate,
  transcribeAudio,
};
