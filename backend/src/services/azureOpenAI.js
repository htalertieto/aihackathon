const fetch = require("node-fetch");

const ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const API_KEY = process.env.AZURE_OPENAI_KEY;
const PRIMARY_MODEL = process.env.AZURE_OPENAI_PRIMARY_MODEL || "gpt-5.4";

/**
 * Low-level call to the Azure OpenAI Responses API.
 * `input` follows the Responses API "input" schema: an array of
 * { role, content: [{ type, text|input_image|input_audio, ... }] } messages,
 * or a plain string for simple text-only prompts.
 */
async function callResponses({
  model = PRIMARY_MODEL,
  input,
  instructions,
  maxOutputTokens = 1200,
}) {
  if (!ENDPOINT || !API_KEY) {
    throw new Error("Azure OpenAI is not configured (missing endpoint/key).");
  }

  const body = {
    model,
    input,
    max_output_tokens: maxOutputTokens,
  };
  if (instructions) body.instructions = instructions;

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    const message =
      data?.error?.message || `Azure OpenAI request failed (${res.status})`;
    throw new Error(message);
  }

  return { raw: data, text: extractOutputText(data) };
}

// The Responses API returns output as an array of items; find the text content.
function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text.length) {
    return data.output_text;
  }
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.type === "output_text" && content.text) {
        chunks.push(content.text);
      } else if (
        content.type === "output_audio_transcript" &&
        content.transcript
      ) {
        chunks.push(content.transcript);
      }
    }
  }
  return chunks.join("\n").trim();
}

/**
 * Explain + translate a patient-facing medical text into plain language,
 * in the target language, as structured JSON.
 */
async function explainAndTranslate({ text, targetLanguage, model }) {
  const instructions = [
    "You are ClariCare, an assistant that helps patients understand medical information.",
    "You explain diagnoses/notes in simple, non-alarming, plain language and translate them",
    `into the patient's language: ${targetLanguage}.`,
    "Always include a disclaimer that this is not a substitute for professional medical advice.",
    "Respond ONLY with valid minified JSON matching this schema, no markdown fences:",
    '{"summary":string,"keyTerms":[{"term":string,"plainMeaning":string}],',
    '"translatedText":string,"actionItems":string[],"disclaimer":string}',
    'All string values must be written in the target language, except "term" which stays',
    "in the original medical term (optionally with the translated term in parentheses).",
  ].join(" ");

  const input = [
    {
      role: "user",
      content: [{ type: "input_text", text }],
    },
  ];

  const { text: raw } = await callResponses({ model, input, instructions });
  return parseJsonSafely(raw);
}

/**
 * Transcribe an audio recording using the Responses API multimodal input.
 */
async function transcribeAudio({ audioBase64, format = "wav", model }) {
  const instructions =
    "Transcribe the audio verbatim. Respond with only the transcript text.";
  const input = [
    {
      role: "user",
      content: [
        {
          type: "input_audio",
          input_audio: { data: audioBase64, format },
        },
      ],
    },
  ];
  const { text } = await callResponses({
    model,
    input,
    instructions,
    maxOutputTokens: 800,
  });
  return text;
}

/**
 * Detect a message's language and translate it for the other participant in a chat.
 */
async function translateChatMessage({
  text,
  targetLanguage,
  sourceLanguage,
  model,
}) {
  const instructions = [
    "You are a live interpreter for a conversation between a healthcare worker and a patient.",
    "Detect the language of the source message and translate it faithfully into the requested target language.",
    "Do not add explanations, medical advice, greetings, or commentary.",
    `The requested target language is: ${targetLanguage}.`,
    sourceLanguage
      ? `The source language is expected to be: ${sourceLanguage}.`
      : "",
    "Respond ONLY with valid minified JSON, with no markdown fences:",
    '{"sourceLanguage":string,"translatedText":string}',
  ]
    .filter(Boolean)
    .join(" ");

  const input = [{ role: "user", content: [{ type: "input_text", text }] }];
  const { text: raw } = await callResponses({
    model,
    input,
    instructions,
    maxOutputTokens: 800,
  });
  const result = parseJsonSafely(raw);

  if (!result.sourceLanguage || !result.translatedText) {
    throw new Error("Model did not return a translated chat message.");
  }
  return result;
}

/**
 * Answer a patient's follow-up question about a previously explained document,
 * using the original context and prior Q&A turns for continuity. No data is
 * persisted server-side — the caller (browser) is responsible for keeping and
 * resending the conversation history on each call.
 */
async function answerFollowUp({ context, targetLanguage, history = [], question, model }) {
  const instructions = [
    'You are MedTranslate, an assistant that helps patients understand medical information.',
    `Answer the patient's follow-up question in simple, non-alarming, plain language,`,
    `written entirely in the patient's language: ${targetLanguage}.`,
    'Base your answer on the medical context provided below and the prior conversation.',
    "If the question can't be answered from the given context, say so and suggest asking",
    'their doctor or pharmacist, rather than guessing.',
    'Always remind the patient this is not a substitute for professional medical advice',
    'when relevant (e.g. dosing, urgent symptoms).',
    'Respond ONLY with valid minified JSON, no markdown fences:',
    '{"answer":string,"disclaimer":string}',
  ].join(' ');

  const contextBlock = [
    'ORIGINAL MEDICAL CONTEXT:',
    context?.sourceText ? `Source text: ${context.sourceText}` : null,
    context?.summary ? `Summary: ${context.summary}` : null,
    context?.translatedText ? `Translated explanation: ${context.translatedText}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  const input = [
    { role: 'user', content: [{ type: 'input_text', text: contextBlock }] },
    ...history.map((turn) => ({
      role: turn.role === 'assistant' ? 'assistant' : 'user',
      content: [{ type: turn.role === 'assistant' ? 'output_text' : 'input_text', text: turn.text }],
    })),
    { role: 'user', content: [{ type: 'input_text', text: question }] },
  ];

  const { text: raw } = await callResponses({ model, input, instructions, maxOutputTokens: 800 });
  return parseJsonSafely(raw);
}

function parseJsonSafely(raw) {
  if (!raw) throw new Error("Empty response from model");
  const cleaned = raw.trim().replace(/^```json\s*|^```\s*|```$/g, "");
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
    throw new Error(
      "Model did not return valid JSON: " + cleaned.slice(0, 200),
    );
  }
}

module.exports = {
  callResponses,
  explainAndTranslate,
  transcribeAudio,
  translateChatMessage,
  answerFollowUp,
};
