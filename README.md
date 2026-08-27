# MedTranslate

Helps patients understand a doctor's diagnosis by typing notes, recording the conversation,
or uploading a photo/PDF of medical documents — then explains it in plain language and
translates it into the patient's own language.

See [PLAN.md](./PLAN.md) for architecture and design details.
See [DEPLOYMENT.md](./DEPLOYMENT.md) for hosting this on Azure with GitHub Actions CI/CD.

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
| Var | Purpose |
|---|---|
| `AZURE_OPENAI_ENDPOINT` / `AZURE_OPENAI_KEY` | Azure OpenAI Responses API — explain, translate, transcribe audio |
| `AZURE_OPENAI_PRIMARY_MODEL` | Default `gpt-5.4`; alternates `gpt-5.3-codex`, `gpt-5.2` |
| `CAREKUBE_ENDPOINT` / `CAREKUBE_KEY` | CareKube chat/completions — medical vision + text models |
| `CAREKUBE_VISION_MODEL` | `lingshu-7b` — reads photos of prescriptions/reports |
| `CAREKUBE_MEDICAL_TEXT_MODEL` | `med42` — grounds/expands medical terminology |
| `PORT`, `CORS_ORIGIN` | Server port and allowed frontend origin |

**Never commit `backend/.env`** — it's gitignored and contains real API keys. Only
`.env.example` (no secrets) is committed.

## API
- `POST /api/text` `{ text, targetLanguage, useMedicalGrounding? }`
- `POST /api/image` multipart `file` + `targetLanguage`
- `POST /api/pdf` multipart `file` + `targetLanguage`
- `POST /api/audio` multipart `file` + `targetLanguage`
- `GET /api/health`

All return: `{ summary, keyTerms: [{term, plainMeaning}], translatedText, actionItems: [], disclaimer, ...sourceFields }`

## Known notes
- Frontend dev dependency `vite`/`esbuild` has a known moderate dev-server-only CORS
  advisory; fixing requires a major `vite@8` upgrade, deferred for this scaffold.
- Browser audio recording uses `webm/opus`; the backend forwards it as `wav` format to the
  Responses API — swap in a transcoding step if the model rejects the container format.
- No data is persisted; uploads are processed in-memory only.
