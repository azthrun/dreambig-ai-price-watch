# DreamBig AI Price Watch

Node.js scheduled container application that queries Gemini 2.5 Flash for U.S. trusted seller offers and emails price watch reports.

## What It Does
- Runs on a CRON schedule inside a Linux container.
- Watches multiple products from one delimited env var.
- Uses Gemini 2.5 Flash with web grounding (`googleSearch` tool).
- Filters to trusted U.S. sellers only.
- Includes Costco member offers, excludes other membership-gated offers by default.
- Ranks by total price (`product + shipping`) and reports top 3-5 offers per product.
- Sends HTML + text email report with columns:
  - Product Price
  - Shipping Price
  - Total Price
  - Store
  - Link
  - Discount
  - Notes

## Tech Stack
- Node.js 20 + TypeScript
- `@google/genai` for Gemini API
- `node-cron` for scheduling
- `nodemailer` for SMTP email
- `zod` for config validation
- `vitest` for tests

## Environment Variables
Required:
- `GEMINI_API_KEY`
- `CRON_SCHEDULE`
- `WATCHED_PRODUCTS`
- `RECIPIENT_EMAILS`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`

Optional:
- `MODEL_NAME` (default: `gemini-2.5-flash`)
- `PRODUCT_DELIMITER` (default: `|`)
- `EMAIL_DELIMITER` (default: `,`)
- `TRUSTED_SELLERS` (default: `best buy|target|costco|walmart`)
- `TIMEZONE` (default: `UTC`)
- `MAX_RESULTS_PER_PRODUCT` (default: `5`, range `3-5`)
- `CONCURRENCY` (default: `3`)
- `REQUEST_TIMEOUT_MS` (default: `30000`)
- `REQUEST_RETRIES` (default: `2`)
- `RUN_ON_STARTUP` (default: `false`)
- `LOG_LEVEL` (default: `info`)

## Local Development (Without Docker)
```bash
npm install
npm run test
npm run dev
```

## Local Docker Test (Required Before NAS Deploy)

### 1. Optional: create `.env` for overrides
```bash
cat > .env <<'ENV'
GEMINI_API_KEY=YOUR_KEY
CRON_SCHEDULE=0 12 */3 * *
WATCHED_PRODUCTS=iphone 16 pro|sony wh-1000xm5|macbook air m3
RECIPIENT_EMAILS=you@example.com,friend@example.com
PRODUCT_DELIMITER=|
EMAIL_DELIMITER=,
TRUSTED_SELLERS=best buy|target|costco|walmart
TIMEZONE=America/New_York
MAX_RESULTS_PER_PRODUCT=5
CONCURRENCY=3
REQUEST_TIMEOUT_MS=30000
REQUEST_RETRIES=2
RUN_ON_STARTUP=false
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=smtp-user
SMTP_PASS=smtp-pass
SMTP_FROM=alerts@example.com
LOG_LEVEL=info
ENV
```

### 2. Build + run container
```bash
docker compose -f docker-compose.local.yml up --build
```

`docker-compose.local.yml` has inline defaults so local tests can run without any env file.
If you do create `.env`, compose will use those values as overrides.

### 3. Validate behavior
- Container logs show `Scheduler started`.
- Initial run executes only if `RUN_ON_STARTUP=true`.
- Email arrives with per-product offer tables.
- Rows are sorted by total price and include shipping.

Cron note:
- `0 12 */3 * *` means at 12:00 PM on every 3rd day-of-month (3, 6, 9, ...), not a strict rolling every-72-hours interval.

### 4. Stop
```bash
docker compose -f docker-compose.local.yml down
```

## Synology NAS Deployment (Container Manager, Compose Project)

### 1. Build and push image
From your development machine:
```bash
docker build -t YOUR_REGISTRY/dreambig-ai-price-watch:latest .
docker push YOUR_REGISTRY/dreambig-ai-price-watch:latest
```

### 2. Prepare Synology compose file
- Copy `docker-compose.synology.yml`.
- Set `image` to your pushed image.
- Replace all placeholder environment values.

### 3. Open Synology Container Manager
1. Go to **Project**.
2. Click **Create**.
3. Choose **Create docker-compose.yml**.
4. Paste the compose from `docker-compose.synology.yml` (updated values).
5. Save and deploy.

### 4. Verify on NAS
1. Container status is running.
2. Logs show successful startup and schedule registration.
3. Test mail is delivered on first run.
4. Subsequent runs follow `CRON_SCHEDULE`.

### 5. Update configuration
- Edit project environment variables in Container Manager.
- Redeploy project after changes.

## Scripts
- `npm run dev` - Run app via `tsx`.
- `npm run build` - Compile TypeScript to `dist/`.
- `npm run start` - Run compiled app.
- `npm run test` - Run test suite.
- `npm run lint` - Type-check.

## Notes and Limitations
- Offer trust classification from model output is validated with local filters, but still heuristic.
- Currency conversion is not implemented in v1.
- The app sends one email per run containing all watched products.
