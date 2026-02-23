# Build Plan: DreamBig AI Price Watch (Node + Docker + Synology)

## Summary
Build a production-ready Node.js container app that runs on an internal cron schedule, discovers U.S.-only trusted offers via Gemini 2.5 Flash web grounding, ranks by total price (product + shipping), and emails a 3–5 row table per product.
Deployment target is Synology NAS using Docker Compose v3, with a local Docker-first validation workflow before NAS rollout.

## Locked Decisions
1. Offer discovery: Gemini-only web grounding.
2. Runtime schedule: internal cron loop using `CRON_SCHEDULE`.
3. Email policy: send every run.
4. Seller policy: trusted sellers only, include Costco member pricing, exclude other membership-gated offers by default.
5. Allowed official sources: manufacturer stores and authorized brand stores.
6. NAS deployment format: Docker Compose v3 (Container Manager Project).

## Implementation Scope
1. Initialize Node app (TypeScript, Node 20 LTS, ESM).
2. Build scheduled pipeline:
   - Parse/validate env.
   - Split products/recipients from delimited vars.
   - Run per-product Gemini query with controlled concurrency.
   - Normalize and validate offer rows.
   - Filter trusted sellers + U.S.-shipping eligibility.
   - Compute total amount, sort ascending, keep top 3–5.
   - Render HTML + text email.
   - Send via SMTP.
3. Add containerization for local and NAS.
4. Add docs for local Docker test and Synology deployment.
5. Add tests and quality checks.

## Project Structure
1. `src/config`
2. `src/domain`
3. `src/providers/gemini`
4. `src/email`
5. `src/scheduler`
6. `src/app`
7. `src/index.ts`
8. `docker-compose.local.yml`
9. `docker-compose.synology.yml`
10. `Dockerfile`
11. `README.md`

## Public Interfaces and Types
1. Environment contract:
   - Required: `GEMINI_API_KEY`, `CRON_SCHEDULE`, `WATCHED_PRODUCTS`, `RECIPIENT_EMAILS`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
   - Optional: `PRODUCT_DELIMITER` (`|`), `EMAIL_DELIMITER` (`,`), `TIMEZONE` (`UTC`), `MAX_RESULTS_PER_PRODUCT` (`5`), `TRUSTED_SELLERS`, `CONCURRENCY` (`3`), `RUN_ON_STARTUP` (`true|false`)
2. Domain type `OfferRow`:
   - `productName`, `priceAmount`, `shippingAmount`, `totalAmount`, `currency`, `storeName`, `productUrl`, `discountText`, `notes`, `shipsToUs`, `sourceTrustLevel`, `retrievedAt`
3. Gemini output contract:
   - top-level `offers: OfferRow[]`
   - numeric fields for price/shipping
   - boolean `shipsToUs`
   - `notes` includes membership/shipping caveats
4. Scheduler interface:
   - `startScheduler(config, jobFn)`
   - `runOnce(config)` for local/manual validation
5. Email renderer interface:
   - `buildEmailReport(results): { subject, html, text }`

## Data Flow
1. Boot and validate config with `zod`.
2. Parse product and recipient lists.
3. For each product, call Gemini with a prompt enforcing:
   - trusted U.S. sources only
   - include shipping cost
   - return JSON only in schema
4. Normalize and validate response.
5. Enforce filters in code even if model output drifts.
6. Rank by `totalAmount`, keep top rows per product.
7. Render email table columns:
   - Product price
   - Shipping price
   - Total price
   - Store
   - Link
   - Discount
   - Notes
8. Send email to all recipients.
9. Log run summary and per-product warnings/errors.

## Failure Handling and Guardrails
1. Per-product timeout and retry with exponential backoff.
2. Partial failure allowed; other products still processed.
3. If fewer than 3 valid offers, include available offers and explicit note.
4. Reject invalid URLs and non-numeric amounts.
5. Redact all secrets from logs.
6. Prevent unknown sellers unless matched in trusted allow-list or official/authorized classification.

## Testing Plan
1. Unit tests:
   - env parsing and defaults
   - delimiter parsing
   - trusted-seller filtering
   - total-price ranking
   - email HTML/text rendering
2. Provider tests:
   - Gemini response normalization with malformed/partial payloads
3. Integration tests:
   - end-to-end run with mocked Gemini + SMTP transport
4. Container tests:
   - local compose up
   - manual `run once` execution
   - cron tick smoke test

## Documentation Deliverables
1. Local Docker quickstart.
2. Synology deployment steps via Container Manager Compose project.
3. Operational notes for secrets, concurrency, and trusted seller management.

## Assumptions and Defaults
1. Currency shown in source currency; no conversion in v1.
2. One email per run containing all products.
3. Cron expression uses container `TIMEZONE`.
4. Gemini grounding can access sufficient public pricing pages for trusted sellers.
5. Authorized brand store detection is heuristic in v1.
