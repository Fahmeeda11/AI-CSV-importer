# GrowEasy — AI-Powered CSV Importer

Upload a CSV in **any** layout — Facebook Lead export, Google Ads, a real-estate CRM
dump, a hand-made spreadsheet — and an LLM intelligently maps its arbitrary columns into
the fixed **GrowEasy CRM** schema. The hard part isn't parsing CSVs; it's mapping
unpredictable, messy real-world exports onto a strict target format, then guaranteeing the
business rules hold.

> **Position applied for:** Software Developer Intern

**Live app:** https://ai-csv-importer-eta.vercel.app · **API:** https://groweasy-csv-importer-api-rlgs.onrender.com

---

## How it works

```
Upload CSV ──▶ Preview (client-side parse, no AI) ──▶ Confirm ──▶ AI extraction (batched, streamed) ──▶ Results
```

1. **Upload** — drag & drop or file picker (`.csv`, ≤ 5 MB).
2. **Preview** — the file is parsed in the browser and shown in a virtualized table with
   sticky headers and horizontal/vertical scroll. **No AI runs yet.**
3. **Confirm** — only on confirmation does the frontend call the backend.
4. **Extract** — the backend re-parses authoritatively, batches rows, and sends each batch
   to OpenAI. Results **stream back incrementally** with a live progress bar.
5. **Results** — imported records and skipped records in separate tables, with summary
   stats and a one-click **Download CRM CSV**.

---

## Architecture

A monorepo with two independently deployable apps:

```
groweasy-csv-importer/
├── backend/     Express + TypeScript API (parse → batch → AI → normalize)
├── frontend/    Next.js (App Router) + Tailwind UI
├── samples/     Messy example CSVs (Facebook, Google Ads, real-estate, spreadsheet)
├── docker-compose.yml
└── render.yaml  Backend deploy blueprint
```

### The AI mapping strategy (two layers)

The key design decision: **the LLM maps, deterministic code enforces.**

- **`aiService`** sends each batch to OpenAI using **Structured Outputs**
  (`response_format: json_schema`, `strict: true`), so the model is *forced* to return
  valid JSON conforming to the 15-field schema. The system prompt teaches it to infer
  meaning from column names and values (e.g. `Phone`/`WhatsApp`/`Contact` → mobile),
  never to hallucinate, and to leave unknowns blank.
- **`crmService`** is a deterministic post-processor — the safety net that *guarantees* the
  assignment rules regardless of what the model returns:
  - `crm_status` / `data_source` coerced to an allowed enum value, else blank
  - `created_at` kept only if `new Date()` can parse it
  - first email / first mobile kept; extras appended to `crm_note`
  - newlines escaped (`\n`) so each record stays one valid CSV row
  - rows with **neither** email **nor** mobile are **skipped** (and reported, never dropped silently)

This separation means a sloppy model response can never violate the contract.

### CRM schema

`created_at, name, email, country_code, mobile_without_country_code, company, city, state,
country, lead_owner, crm_status, crm_note, data_source, possession_time, description`

- **`crm_status`** ∈ `GOOD_LEAD_FOLLOW_UP · DID_NOT_CONNECT · BAD_LEAD · SALE_DONE`
- **`data_source`** ∈ `leads_on_demand · meridian_tower · eden_park · varah_swamy · sarjapur_plots`

---

## Tech stack

| Layer     | Choice                                                              |
| --------- | ------------------------------------------------------------------ |
| Frontend  | Next.js 14 (App Router), TypeScript, Tailwind CSS, TanStack Virtual |
| Backend   | Node.js, Express, TypeScript, Zod, Multer, Pino                     |
| AI        | OpenAI (`gpt-4o-mini`) with Structured Outputs                      |
| Testing   | Vitest (+ Testing Library)                                         |
| Delivery  | Docker / docker-compose, Render (API), Vercel (web)                |

---

## Local setup

**Prerequisites:** Node.js 20+ and an OpenAI API key
([platform.openai.com/api-keys](https://platform.openai.com/api-keys)).

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env        # then set OPENAI_API_KEY
npm run dev                 # http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local  # NEXT_PUBLIC_API_URL defaults to http://localhost:4000
npm run dev                 # http://localhost:3000
```

Open http://localhost:3000 and try a file from [`samples/`](./samples).

### Run with Docker

```bash
cp .env.example .env        # set OPENAI_API_KEY
docker compose up --build   # web → :3000, api → :4000
```

---

## Tests

```bash
cd backend  && npm test     # crmService rules, csv parsing, batching, retry, pipeline (mocked AI)
cd frontend && npm test     # CSV builder, flow reducer, DataTable render
```

The backend suite exercises the full parse → map → normalize → skip pipeline with a mocked
OpenAI client, including the retry/failed-batch path — so it runs without an API key.

---

## API

Base URL: `NEXT_PUBLIC_API_URL` (default `http://localhost:4000`).

| Method | Route                 | Description                                             |
| ------ | --------------------- | ------------------------------------------------------ |
| `GET`  | `/health`             | Status + whether the AI key is configured              |
| `POST` | `/api/import`         | Multipart `file` → full JSON result                    |
| `POST` | `/api/import/stream`  | Multipart `file` → NDJSON stream (progress + records)  |

**`/api/import` response**

```json
{
  "records": [ { "created_at": "...", "name": "...", "email": "...", ... } ],
  "skipped": [ { "rowIndex": 3, "reason": "No email or mobile number found.", "raw": { ... } } ],
  "summary": { "totalRows": 10, "imported": 8, "skipped": 2, "batches": 1, "failedBatches": 0 }
}
```

**`/api/import/stream`** emits newline-delimited JSON events:
`{ "type": "meta", ... }` → many `{ "type": "batch", ... }` / `{ "type": "batch_error", ... }`
→ `{ "type": "done", "summary": { ... } }`.

---

## Deployment

**Backend → Render** (blueprint included):

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → pick the repo (uses `render.yaml`).
3. Set `OPENAI_API_KEY` and `ALLOWED_ORIGIN` (your Vercel URL) in the dashboard.

**Frontend → Vercel:**

1. Vercel → **New Project** → import the repo, set **Root Directory = `frontend`**.
2. Add env var `NEXT_PUBLIC_API_URL` = your Render API URL.
3. Deploy.

---

## Feature checklist

Core: arbitrary-column upload · client preview (sticky headers, scroll) · confirm gate ·
batched AI extraction · structured JSON · imported/skipped/totals.

Bonus: ✅ drag & drop · ✅ progress indicator · ✅ streaming / incremental results ·
✅ retry for failed AI batches · ✅ virtualized table · ✅ dark mode · ✅ unit tests ·
✅ Docker · ✅ deployment config · ✅ this README.
