# ClariCare — Patient Diagnosis Translator

## Problem
Patients often can't understand a doctor's diagnosis because of language barriers or medical
jargon. This app lets a patient (or caregiver) capture what the doctor said — by typing,
recording audio, or uploading a photo/PDF of notes/reports — and get back a **plain-language,
translated explanation** of the diagnosis, key terms, and suggested next steps.

## Architecture

```
frontend (React + Vite)  <--- REST/JSON --->  backend (Node + Express)
                                                     |
                                                     |-- Azure OpenAI Responses API
                                                     |     (gpt-5.4 / gpt-5.3-codex / gpt-5.2)
                                                     |     -> explain + translate + transcribe audio
                                                     |
                                                     '-- CareKube OpenAI-compatible endpoint
                                                           (lingshu-7b: medical vision/OCR)
                                                           (med42: medical text specialist)
```

### Input modes
1. **Type it** — free text box (what the doctor said / notes).
2. **Record** — browser mic recording (webm/opus) uploaded to backend for transcription.
3. **Upload image** — photo of prescription/report -> lingshu-7b (medical multimodal) extracts
   and describes content.
4. **Upload PDF** — text extracted locally with `pdf-parse` (falls back to lingshu-7b per-page
   image OCR if the PDF has no extractable text layer).

### Pipeline (all modes converge to plain text, then):
1. **Medical grounding (optional, med42)** — sanity-check/expand medical terms in the raw text.
2. **Explain + translate (gpt-5.4 via Azure Responses API)** — single call returns structured
   JSON: `summary`, `keyTerms[{term, plainMeaning}]`, `translatedText`, `actionItems[]`,
   `disclaimer`.
3. Frontend renders a patient-friendly card in the target language.

### Model routing
| Task                        | Model                  | Endpoint type                      |
| --------------------------- | ---------------------- | ---------------------------------- |
| Explain/translate (primary) | gpt-5.4                | Azure OpenAI Responses API         |
| Alt/experimentation         | gpt-5.3-codex, gpt-5.2 | Azure OpenAI Responses API         |
| Image/medical-document OCR  | lingshu-7b             | CareKube chat/completions (vision) |
| Medical term grounding      | med42                  | CareKube chat/completions (text)   |
| Audio transcription         | gpt-5.4                | Azure Responses API (input_audio)  |

## Backend (Node.js / Express)
- `src/server.js` — app entry, CORS, JSON body limit for base64 media.
- `src/routes/` — `text.js`, `image.js`, `pdf.js`, `audio.js`, `health.js`.
- `src/services/azureOpenAI.js` — calls Azure Responses API (text/audio input, JSON output).
- `src/services/careKube.js` — calls CareKube chat/completions (lingshu-7b vision, med42 text).
- `src/services/pipeline.js` — orchestrates: extract -> ground -> explain/translate.
- `src/middleware/upload.js` — multer, in-memory, size/type limits.
- `.env` — secrets (gitignored); `.env.example` — committed template.

## Frontend (React + Vite)
- `src/components/InputTabs.jsx` — Type / Record / Upload tabs.
- `src/components/Recorder.jsx` — MediaRecorder-based mic capture.
- `src/components/FileUpload.jsx` — image/PDF picker + preview.
- `src/components/LanguageSelect.jsx` — target language dropdown.
- `src/components/ResultCard.jsx` — renders summary, key terms, translation, action items.
- `src/api.js` — fetch wrapper to backend.

## Security / Credentials
- All API keys live only in `backend/.env` (gitignored). Never sent to or stored in the
  frontend. `.env.example` documents required vars without real values.
- Basic file-size/type validation on uploads; no PHI persisted server-side (processed
  in-memory, not written to disk/DB).

## Out of scope for first pass (stretch goals)
- User accounts / history persistence
- Multi-page PDF image OCR fallback
- Streaming responses / partial UI updates
- Automated tests beyond a smoke test script
