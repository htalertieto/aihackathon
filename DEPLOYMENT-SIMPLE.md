# Simple hosting: Vercel (frontend) + Render (backend)

The fastest way to get MedTranslate hosted with GitHub auto-deploy, no CLI or YAML
pipelines to babysit. Both platforms watch this repo and redeploy on every push to `main`.

(Prefer Azure instead? See [DEPLOYMENT.md](./DEPLOYMENT.md).)

## 1. Backend → Render

1. Go to [render.com](https://render.com) → sign in with GitHub → **New → Web Service**
2. Pick `htalertieto/aihackathon`. Render will detect `render.yaml` in the repo root and
   pre-fill: root dir `backend`, build `npm install`, start `npm start`, health check
   `/api/health`.
3. On the create screen, fill in the env vars marked "sync: false" with your real values
   (from your local `backend/.env` — never commit that file):
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_KEY`
   - `CAREKUBE_ENDPOINT`
   - `CAREKUBE_KEY`
   - `CORS_ORIGIN` — leave a placeholder for now (e.g. `http://localhost:5173`); update
     it after step 2 once you have your Vercel URL.
4. Click **Create Web Service**. Render builds and gives you a URL like
   `https://medtranslate-api.onrender.com`.

   > Free tier note: the service spins down after inactivity and takes ~30–60s to wake up
   > on the next request. Fine for a demo; upgrade to a paid plan to avoid cold starts.

## 2. Frontend → Vercel

1. Go to [vercel.com](https://vercel.com) → sign in with GitHub → **Add New → Project**
2. Import `htalertieto/aihackathon`. Vercel detects `frontend/vercel.json`.
3. Set **Root Directory** to `frontend` (Vercel asks this in the import wizard).
4. Add an environment variable:
   - `VITE_API_BASE_URL` = `https://medtranslate-api.onrender.com/api` (your Render URL + `/api`)
5. Click **Deploy**. You'll get a URL like `https://aihackathon.vercel.app`.

## 3. Connect them

Back in Render → your service → **Environment** → update `CORS_ORIGIN` to your Vercel URL
(e.g. `https://aihackathon.vercel.app`) → save (Render redeploys automatically).

## 4. Verify

```powershell
curl https://medtranslate-api.onrender.com/api/health
```

Open your Vercel URL and try the Type / Record / Upload tabs.

## Updating later

Just `git push` to `main` — both Vercel and Render auto-rebuild and redeploy on every push,
no manual steps needed. Update env vars any time from each platform's dashboard (no
redeploy required for Render; Vercel needs a redeploy to pick up new build-time
`VITE_*` vars — trigger it from the Vercel dashboard's "Redeploy" button).

## Notes
- No secrets live in this repo — `render.yaml` only declares which env var *names* Render
  needs; you paste real values in Render's dashboard.
- `frontend/vercel.json` adds an SPA rewrite so client-side routes don't 404 on refresh
  (not currently used since there's no router yet, but harmless to keep).
- If you add a custom domain later, both platforms support it for free from their
  dashboards.
