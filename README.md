# Listing Analyzer — Azure Deployment Guide

## Folder Structure

```
listing-analyzer/
├── index.html                  ← Your static web page
├── staticwebapp.config.json    ← Azure routing config
└── api/
    ├── host.json               ← Azure Functions host config
    ├── package.json
    └── gemini-proxy/
        ├── function.json       ← HTTP trigger config
        └── index.js            ← Proxy that calls Gemini API
```

---

## Step 1 — Get your Gemini API Key

1. Go to https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click **Create API key**
4. Copy the key (starts with `AIza...`) — keep it safe

---

## Step 2 — Deploy to Azure Static Web Apps

### Option A: GitHub (recommended, free CI/CD)

1. Push this entire `listing-analyzer/` folder to a GitHub repo
2. Go to https://portal.azure.com
3. Search for **Static Web Apps** → **Create**
4. Fill in:
   - **Subscription**: your subscription
   - **Resource Group**: create new or use existing
   - **Name**: e.g. `listing-analyzer`
   - **Region**: East US 2 (or closest to you)
   - **Source**: GitHub → connect your account → select your repo
   - **Build preset**: Custom
   - **App location**: `/`  (root of repo)
   - **Api location**: `api`
   - **Output location**: leave blank
5. Click **Review + Create** → **Create**
6. Azure will auto-deploy on every push to main ✅

### Option B: Azure CLI (no GitHub needed)

```bash
# Install Azure CLI if needed: https://docs.microsoft.com/cli/azure/install-azure-cli
az login

az staticwebapp create \
  --name listing-analyzer \
  --resource-group myResourceGroup \
  --location "eastus2" \
  --sku Free

az staticwebapp deploy \
  --name listing-analyzer \
  --resource-group myResourceGroup \
  --source ./listing-analyzer
```

---

## Step 3 — Add your Gemini API Key to Azure

This is the most important step — the key lives securely in Azure, never in the browser.

1. In the Azure Portal, open your **Static Web App**
2. In the left sidebar, click **Configuration**
3. Click **+ Add**
4. Set:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: paste your `AIza...` key here
5. Click **OK** → **Save**

6. Now this is in environment variables 

The Azure Function will now read this key server-side when it proxies requests to Gemini.

---

## Step 4 — Test it

1. Open your Azure Static Web App URL (shown in the Overview page, e.g. `https://salmon-beach-123.azurestaticapps.net`)
2. Enter a Whitby/Ajax address like `45 Taunton Rd W, Whitby, ON`
3. Click **Analyze** — results should appear in a few seconds

---

## How it works

```
Browser (index.html)
  │
  │  POST /api/gemini-proxy  { prompt: "..." }
  ▼
Azure Function (api/gemini-proxy/index.js)
  │  reads GEMINI_API_KEY from env
  │
  │  POST https://generativelanguage.googleapis.com/...
  ▼
Google Gemini API
  │
  └─ returns JSON analysis back to browser
```

The API key never leaves Azure. The browser only talks to your own `/api/` endpoint.

---

## Cost

- **Azure Static Web Apps Free tier**: $0/month (includes 250,000 API requests/month)
- **Google Gemini API**: Free tier includes 1,500 requests/day with gemini-2.0-flash

For a real estate listing tool used occasionally, this will cost **$0**.

---

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Proxy error 500" | Check that `GEMINI_API_KEY` is set in Azure Configuration |
| "Proxy error 404" | Make sure the `api/` folder was deployed (check GitHub Actions log) |
| Page loads but API fails | Open browser DevTools → Network tab to see the exact error |
| Function not updating | Push a new commit to trigger a fresh deploy |
