# DreamBig AI Price Watch - Refined Requirements

## 1) Objective
Build a Node.js application that runs on a schedule inside a Linux container (Synology NAS) and emails recipients with price-watch summaries for multiple products.

## 2) Functional Requirements
1. The app must accept a list of watched products from a single delimited environment variable.
2. The app must execute on a configurable CRON schedule.
3. For each watched product, the app must use Google Gemini 2.5 Flash to produce a market summary.
4. The output per product must include top 3-5 lowest offers from trusted U.S. sellers.
5. Email notifications must be sent to one or more recipients from a single delimited environment variable.
6. Email content must include, for each product, a table with:
   - Product price
   - Shipping price
   - Total price (product + shipping)
   - Website/store name
   - Hyperlink
   - Discount information
   - Notes
7. The app must support both plain-text and HTML email (HTML table is required for readability).
8. Offer ranking must be based on total price (product price + shipping price), lowest first.
9. Only U.S.-market offers should be included (no international shipment-only offers).
10. Untrusted/unknown sources must be excluded.

## 3) Configuration Requirements
1. A Synology-compatible container YAML file must be provided.
2. The following environment variables must be supported:
   - `GEMINI_API_KEY`
   - `CRON_SCHEDULE` (CRON expression)
   - `WATCHED_PRODUCTS` (single delimited string, e.g. `|`)
   - `RECIPIENT_EMAILS` (single delimited string, e.g. `,`)
3. Additional required environment variables (recommended):
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SMTP_FROM`
   - `PRODUCT_DELIMITER` (default: `|`)
   - `EMAIL_DELIMITER` (default: `,`)
   - `TIMEZONE` (default: `UTC`)
   - `MAX_RESULTS_PER_PRODUCT` (default: `5`)
   - `TRUSTED_SELLERS` (delimited allow-list; includes defaults)
4. Default trusted sellers should include:
   - Best Buy
   - Target
   - Costco
   - Walmart
   - Official manufacturer stores (when identifiable)
   - Authorized brand stores (when identifiable)
5. Membership offer policy:
   - Include Costco member pricing/offers.
   - Exclude membership-gated pricing from other sellers by default unless explicitly enabled later.

## 4) Non-Functional Requirements
1. Code must be modular and maintainable:
   - `config/`, `scheduler/`, `providers/ai/`, `email/`, `domain/`, `app/`
2. The app must fail fast on invalid configuration.
3. Execution must be resilient:
   - Retry policy for transient API/network failures
   - Timeout limits per product query
   - Partial-success behavior (one product failure does not fail whole run)
4. The app must be performant:
   - Controlled concurrency for product processing
   - Reuse clients/connections where possible
5. The app must produce structured logs for observability.

## 5) Data and Output Contract
For each product, normalized row schema:
- `product_name`
- `price_amount`
- `shipping_amount`
- `total_amount`
- `price_currency`
- `store_name`
- `product_url`
- `discount_text`
- `notes`
- `retrieved_at`
- `ships_to_us` (boolean)
- `source_trust_level`

Rules:
1. Sort by lowest total amount first.
2. Include only 3-5 valid rows when available.
3. If fewer than 3 valid rows are found, include available rows and add a note.
4. URLs must be valid absolute links.
5. Exclude rows where `ships_to_us` is false.
6. Exclude rows that are not from trusted sellers.

## 6) Security Requirements
1. Secrets must be injected through environment variables only.
2. Secrets must never be logged.
3. Input validation/sanitization is required for all environment-derived values.
4. Container should run as non-root where possible.

## 7) Deployment Requirements (Synology NAS)
1. Provide Dockerfile optimized for Node.js production runtime.
2. Provide NAS container YAML for environment variables, restart policy, and scheduling assumptions.
3. Ensure compatibility with Linux AMD64 and ARM64 images when possible.

## 8) Testing and Quality Requirements
1. Unit tests for:
   - Env parsing and validation
   - Prompt/response normalization logic
   - Email rendering
2. Integration test (mocked external providers) for full run pipeline.
3. Linting and formatting checks in CI/local scripts.
4. Local Docker test run must be documented and supported before NAS deployment.

## 9) Recommended Clarifications Before Build
1. Define the exact product input format, for example:
   - `WATCHED_PRODUCTS="iphone 15 pro|sony wh-1000xm5|macbook air m3"`
2. Confirm whether Gemini is expected to browse live web sources directly or summarize from externally fetched search results.
3. Confirm SMTP provider and sender identity requirements (SPF/DKIM/DMARC).
4. Confirm duplicate suppression behavior (send only if price changed vs send every run).
5. Confirm whether "free shipping" and membership-restricted shipping (e.g., club/member-only) need special handling in notes.
6. Confirm acceptable rate limits and max execution duration per scheduled run.
7. Confirm if future configuration should allow additional membership-gated sellers beyond Costco.

## 10) Definition of Done
1. Scheduled container run works on Synology NAS.
2. Local Docker run is validated with documented commands and sample env values.
3. Emails are delivered to configured recipients.
4. Each product section includes a valid 3-5 row table ranked by total price (product + shipping) when data exists.
5. Results are U.S.-eligible and from trusted sellers only.
6. Table includes product price, shipping price, total price, store, link, discount, and notes.
7. Failures are logged with actionable messages.
8. README includes:
   - Local Docker test instructions
   - Synology NAS deployment step-by-step instructions
   - Env examples and run instructions
