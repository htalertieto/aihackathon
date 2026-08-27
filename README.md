# ClariCare

Helps patients understand a doctor's diagnosis by typing notes, recording the conversation,
or uploading a photo/PDF of medical documents — then explains it in plain language and
translates it into the patient's own language.

See [PLAN.md](./PLAN.md) for architecture and design details.
See [DEPLOYMENT.md](./DEPLOYMENT.md) for hosting this on Azure with GitHub Actions CI/CD,
or [DEPLOYMENT-SIMPLE.md](./DEPLOYMENT-SIMPLE.md) for the quicker Vercel + Render route.

## Project layout
```
backend/    Node.js + Express API (Azure OpenAI + CareKube integrations)
frontend/   React + Vite UI
```

## Setup

### Backend
```powershell
cd backend
npm install          # already run once
Copy-Item .env.example .env   # only if .env doesn't already exist
# .env is pre-filled with the provided hackathon credentials — do not commit it
npm run dev           # http://localhost:4000
```

### Frontend
```powershell
cd frontend
npm install           # already run once
npm run dev            # http://localhost:5173 (proxies /api to :4000)
```

Open http://localhost:5173, pick a target language, and try the **Type**, **Record**,
**Upload Image**, or **Upload PDF** tabs.

## Environment variables (`backend/.env`)
| Var                                          | Purpose                                                           |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_KEY` | Azure OpenAI Responses API — explain, translate, transcribe audio |
| `AZURE_OPENAI_PRIMARY_MODEL`                 | Default `gpt-5.4`; alternates `gpt-5.3-codex`, `gpt-5.2`          |
| `CAREKUBE_ENDPOINT` / `CAREKUBE_KEY`         | CareKube chat/completions — medical vision + text models          |
| `CAREKUBE_VISION_MODEL`                      | `lingshu-7b` — reads photos of prescriptions/reports              |
| `CAREKUBE_MEDICAL_TEXT_MODEL`                | `med42` — grounds/expands medical terminology                     |
| `PORT`, `CORS_ORIGIN`                        | Server port and allowed frontend origin                           |

**Never commit `backend/.env`** — it's gitignored and contains real API keys. Only
`.env.example` (no secrets) is committed.

## API
- `POST /api/text` `{ text, targetLanguage, useMedicalGrounding? }`
- `POST /api/image` multipart `file` + `targetLanguage`
- `POST /api/pdf` multipart `file` + `targetLanguage`
- `POST /api/audio` multipart `file` + `targetLanguage`
- `POST /api/followup` `{ context, targetLanguage, history?, question }` — stateless
  follow-up Q&A about a previous result. `context` is the original result object
  (or at least `sourceText`/`summary`/`translatedText`), `history` is the prior
  `[{role, text}]` turns. No data is stored server-side — the browser keeps and
  resends the conversation (see "Follow-up questions" below).
- `POST /api/export/openehr` `{ result, targetLanguage, history?, patient?, download? }`
  — exports the given analysis result (and optional follow-up history) as an
  [openEHR](https://openehr.org/)-style `COMPOSITION` JSON document (canonical RM
  serialization: `DV_TEXT`, `DV_CODED_TEXT`, `EVENT_CONTEXT`, `SECTION`/`EVALUATION`/
  `ADMIN_ENTRY`, etc.). Backend-only, stateless — nothing is persisted. Set
  `download: true` to receive a `Content-Disposition: attachment` response. This is a
  best-effort generic export (generic archetype ids, not a published/clinically
  reviewed openEHR template) intended for interoperability demos, not a certified
  openEHR export.
- `GET /api/health`

All return: `{ summary, keyTerms: [{term, plainMeaning}], translatedText, actionItems: [], disclaimer, ...sourceFields }`

## Follow-up questions

After getting an explanation, the UI shows an "Ask a follow-up question" box. This
conversation is **browser-only** — no database, no server-side session:
- The full Q&A history is kept in the browser's `sessionStorage`, keyed to the current
  document (cleared automatically when the tab closes).
- Each new question resends the original context + full prior history to
  `POST /api/followup`, which is entirely stateless server-side.
- Refreshing the page keeps the conversation (same tab); opening a new tab or closing
  the browser starts fresh.


## Known notes
- Frontend dev dependency `vite`/`esbuild` has a known moderate dev-server-only CORS
  advisory; fixing requires a major `vite@8` upgrade, deferred for this scaffold.
- Browser audio recording uses `webm/opus`; the backend forwards it as `wav` format to the
  Responses API — swap in a transcoding step if the model rejects the container format.
- No data is persisted; uploads are processed in-memory only.
