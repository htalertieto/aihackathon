# Deploying ClariCare to Azure

This sets up **continuous deployment from GitHub**: every push to `main` that touches
`backend/**` redeploys the API, and every push touching `frontend/**` redeploys the UI.

Architecture:
- **Backend** → Azure App Service (Linux, Node 20) — `backend/` folder
- **Frontend** → Azure Static Web Apps (Free tier) — `frontend/` folder, built with Vite
- **CI/CD** → GitHub Actions workflows already added in `.github/workflows/`

---

## 0. Prerequisites

```powershell
# Install Azure CLI if you don't have it, then:
az login
az account set --subscription "<your-subscription-name-or-id>"
```

You'll also need push access to `htalertieto/aihackathon` on GitHub (to add repo secrets).

---

## 1. Create a resource group

```powershell
az group create -n rg-medtranslate -l eastus
```

## 2. Create the backend (Azure App Service)

```powershell
az appservice plan create `
  -g rg-medtranslate -n plan-medtranslate `
  --sku B1 --is-linux

az webapp create `
  -g rg-medtranslate -p plan-medtranslate `
  -n medtranslate-api `
  --runtime "NODE:20-lts"
```

> `medtranslate-api` must be globally unique — if taken, pick another name and update
> `AZURE_WEBAPP_NAME` in `.github/workflows/backend-deploy.yml` to match.

Your API will live at `https://medtranslate-api.azurewebsites.net`.

### Configure backend environment variables

Use the real values from your local `backend/.env` (never commit that file):

```powershell
az webapp config appsettings set -g rg-medtranslate -n medtranslate-api --settings `
  AZURE_OPENAI_ENDPOINT="https://oai-wese-genai-rnd-dev.openai.azure.com/openai/responses?api-version=2025-04-01-preview" `
  AZURE_OPENAI_KEY="<your-key>" `
  AZURE_OPENAI_PRIMARY_MODEL="gpt-5.4" `
  AZURE_OPENAI_ALT_MODELS="gpt-5.3-codex,gpt-5.2" `
  CAREKUBE_ENDPOINT="https://hackathon.ai.carekube.com/v1/chat/completions" `
  CAREKUBE_KEY="<your-key>" `
  CAREKUBE_VISION_MODEL="lingshu-7b" `
  CAREKUBE_MEDICAL_TEXT_MODEL="med42" `
  CORS_ORIGIN="https://<your-static-web-app-domain>.azurestaticapps.net" `
  SCM_DO_BUILD_DURING_DEPLOYMENT="true"
```

(Leave `PORT` unset — App Service injects its own `PORT`, and `server.js` already reads
`process.env.PORT`.) You'll fill in the real `CORS_ORIGIN` after step 3 once you know the
Static Web App's URL — you can update it any time with the same command.

### Get the publish profile → add as a GitHub secret

```powershell
az webapp deployment list-publishing-profiles `
  -g rg-medtranslate -n medtranslate-api --xml > publishprofile.xml
```

In GitHub: **repo → Settings → Secrets and variables → Actions → New repository secret**
- Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
- Value: paste the full contents of `publishprofile.xml`

Then delete `publishprofile.xml` locally (it contains credentials — do not commit it).

## 3. Create the frontend (Azure Static Web Apps)

Easiest path is the Azure Portal wizard (it wires up GitHub for you):

1. Portal → **Create a resource → Static Web App**
2. Plan type: **Free**
3. Deployment source: **GitHub** → authorize → pick `htalertieto/aihackathon`, branch `main`
4. Build details: Framework **Custom**, App location `frontend`, Output location `dist`
5. Create — Azure will add its own workflow file automatically **and** a repo secret
   `AZURE_STATIC_WEB_APPS_API_TOKEN`.

> Since this repo already has `.github/workflows/frontend-deploy.yml`, either delete the
> auto-generated one Azure adds (keep just one) and reuse the `AZURE_STATIC_WEB_APPS_API_TOKEN`
> secret it created, or delete the one in this repo and let Azure's own file be the source of
> truth. Either works — don't keep both targeting the same app.

Or via CLI (creates the resource, you still authorize GitHub once on first deploy):

```powershell
az staticwebapp create `
  -n medtranslate-web -g rg-medtranslate -l eastus2 `
  -s https://github.com/htalertieto/aihackathon -b main `
  --app-location "frontend" --output-location "dist" `
  --login-with-github
```

### Point the frontend at the backend

Add a repository **variable** (not secret, it's just a URL) so the build step can read it:

GitHub → **Settings → Secrets and variables → Actions → Variables tab → New repository variable**
- Name: `VITE_API_BASE_URL`
- Value: `https://medtranslate-api.azurewebsites.net/api`

Now go back to step 2 and set the backend's `CORS_ORIGIN` to your Static Web App's URL
(shown in the Azure Portal, looks like `https://<random-name>.azurestaticapps.net`).

## 4. Push to deploy

```powershell
git add .github README.md frontend/src/api.js DEPLOYMENT.md
git commit -m "Add Azure deployment workflows"
git push
```

GitHub Actions will run both workflows. Check **Actions** tab on GitHub for progress.

## 5. Verify

```powershell
curl https://medtranslate-api.azurewebsites.net/api/health
```

Open `https://<your-static-web-app>.azurestaticapps.net` and try the Type/Record/Upload tabs.

## Updating the app later

Just push to `main`:
- Changes under `backend/**` → redeploy API only
- Changes under `frontend/**` → redeploy UI only
- No manual Azure steps needed after this initial setup.

## Notes / gotchas
- Secrets (`AZURE_WEBAPP_PUBLISH_PROFILE`, `AZURE_STATIC_WEB_APPS_API_TOKEN`) live only in
  GitHub Actions secrets — never in the repo.
- App Service **B1** tier costs money (not free); use **F1 (Free)** for a low-traffic demo,
  though F1 sleeps/has quotas. Static Web Apps **Free** tier is fine for the frontend.
- If you rotate `AZURE_OPENAI_KEY`/`CAREKUBE_KEY`, just re-run the `az webapp config
  appsettings set` command — no redeploy needed, App Service restarts automatically.
- For a custom domain, use `az staticwebapp hostname set` (frontend) and App Service's
  **Custom domains** blade (backend).
