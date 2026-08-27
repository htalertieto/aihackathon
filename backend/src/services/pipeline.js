const { explainAndTranslate, transcribeAudio, answerFollowUp } = require('./azureOpenAI');
const { describeMedicalImage, groundMedicalText } = require('./careKube');

/**
 * Full pipeline: raw text -> (optional medical grounding) -> explain + translate.
 */
async function processText({ text, targetLanguage, useMedicalGrounding = false, model }) {
  let workingText = text;

  if (useMedicalGrounding) {
    try {
      workingText = await groundMedicalText({ text });
    } catch (err) {
      console.warn('Medical grounding failed, continuing with raw text:', err.message);
    }
  }

  const result = await explainAndTranslate({ text: workingText, targetLanguage, model });
  return { ...result, sourceText: text };
}

async function processImage({ imageBase64, mimeType, targetLanguage, model }) {
  const extractedText = await describeMedicalImage({ imageBase64, mimeType });
  const result = await processText({ text: extractedText, targetLanguage, useMedicalGrounding: true, model });
  return { ...result, extractedText };
}

async function processAudio({ audioBase64, format, targetLanguage, model }) {
  const transcript = await transcribeAudio({ audioBase64, format });
  const result = await processText({ text: transcript, targetLanguage, model });
  return { ...result, transcript };
}

module.exports = { processText, processImage, processAudio, answerFollowUp };
