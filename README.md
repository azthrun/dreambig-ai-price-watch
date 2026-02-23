# DreamBig AI Price Watch

A Node.js container app that runs on a CRON schedule, finds trusted U.S. product offers with Gemini 2.5 Flash, and sends HTML/text email reports.

## Features
- Scheduled execution inside a Linux container (`node-cron`).
- Multiple watched products from one delimited variable.
- Gemini 2.5 Flash with Google Search grounding (`googleSearch` tool).
- U.S.-only filtering and trusted-seller filtering.
- Costco member offers allowed; other membership-gated offers excluded.
- One row per store per product (keeps lowest total for that store).
- Ambiguous product input is resolved into up to 2 likely models and reported as separate product sections.
- Ranking by total price: `product price + shipping price`.
- Email table columns:
  - Product Price
  - Shipping Price
  - Total Price
  - Store
  - Link
  - Discount
  - Notes

## Runtime Flow
1. Load and validate env config (`zod`).
2. Resolve each input product into 1-2 model candidates (Gemini).
3. Fetch offers per resolved model (Gemini + web grounding).
4. Normalize/filter offers:
   - U.S. shippable only
   - trusted sellers only
   - membership rule enforcement
   - dedupe to one row per store
5. Rank by total price and keep top 3-5 rows.
6. Send one email per run with all product sections.

## Tech Stack
- Node.js 20
- TypeScript
- `@google/genai`
- `node-cron`
- `nodemailer`
- `zod`
- `pino`
- `vitest`

## Environment Variables
Required by app logic:
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
- `TIMEZONE` (default in app: `UTC`; local compose sets `America/Chicago`)
- `MAX_RESULTS_PER_PRODUCT` (default: `5`, allowed: `3-5`)
- `CONCURRENCY` (default: `3`)
- `REQUEST_TIMEOUT_MS` (default: `30000`)
- `REQUEST_RETRIES` (default: `2` in app; local compose sets `1`)
- `RUN_ON_STARTUP` (default: `false`)
- `LOG_LEVEL` (default: `info`)

## Project Structure
- `/Users/yunqichen/Developments/Projects/node-projects/dreambig-ai-price-watch/src/config` - env parsing/validation
- `/Users/yunqichen/Developments/Projects/node-projects/dreambig-ai-price-watch/src/providers/gemini` - model resolution and offer retrieval
- `/Users/yunqichen/Developments/Projects/node-projects/dreambig-ai-price-watch/src/domain` - offer normalization/filtering/ranking
- `/Users/yunqichen/Developments/Projects/node-projects/dreambig-ai-price-watch/src/email` - email rendering and SMTP sender
- `/Users/yunqichen/Developments/Projects/node-projects/dreambig-ai-price-watch/src/scheduler` - cron scheduler
- `/Users/yunqichen/Developments/Projects/node-projects/dreambig-ai-price-watch/src/app` - run orchestration

## Local Development
```bash
npm install
npm run test
npm run build
npm run dev
```

## Local Docker Test
`docker-compose.local.yml` is self-contained with inline defaults.

Run:
```bash
docker compose -f docker-compose.local.yml up --build
```

Stop:
```bash
docker compose -f docker-compose.local.yml down
```

Override any value at runtime (no `.env` required):
```bash
CRON_SCHEDULE='*/5 * * * *' RUN_ON_STARTUP='false' docker compose -f docker-compose.local.yml up --build
```

Cron note:
- `*/5 * * * *` = every 5 minutes.
- `0 12 */3 * *` = 12:00 PM on days 3,6,9... of each month (not rolling every 72 hours).

## Synology NAS Deployment (Compose Project)
1. Build and push image:
```bash
docker build -t YOUR_REGISTRY/dreambig-ai-price-watch:latest .
docker push YOUR_REGISTRY/dreambig-ai-price-watch:latest
```
2. Open `/Users/yunqichen/Developments/Projects/node-projects/dreambig-ai-price-watch/docker-compose.synology.yml`.
3. Set `image` to your registry image and update all environment values.
4. In Synology Container Manager:
   - Project -> Create -> Create `docker-compose.yml`
   - Paste the updated compose content
   - Deploy
5. Verify logs and email delivery.

## Testing
```bash
npm run test
npm run lint
npm run build
```

Current automated coverage includes:
- env parsing defaults and delimiters
- offer filtering/ranking behavior
- one-row-per-store deduplication
- ambiguous-product split into two models
- email template rendering

## Notes
- Seller trust classification still includes model-assisted heuristics.
- Currency conversion is not implemented in v1.
- If scheduler config is invalid, app fails fast before running startup jobs.
