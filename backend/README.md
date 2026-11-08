# Heidelberg private enquiry backend — implemented locally, NOT live

User authorised free-only setup in the existing Cloudflare account; no paid billing or subscriptions. Photo uploads/R2 are explicitly deferred. The only authorised owner is `hdstufftodo@gmail.com` (confirmed by user); no invitation, verification email or other message has been initiated.

## Implemented
- Worker ESM API with a private D1 schema, bounded streaming JSON parsing (16 KiB), server-side field validation, honeypot, persistent atomic quotas (5/hour/client, 200/day global), rotated hourly HMAC IP keys (no raw IP stored), parameterised storage and explicit failure responses.
- Canonical server-side Turnstile verification: success, exact frontend hostname and action `contact`; errors and replay rejection fail closed. Public origin is exactly `https://lessthan301.github.io`, without credentialed wildcard CORS.
- Owner-only inbox/dashboard, protected on **every** route by Access JWT signature, RS256 algorithm, issuer/audience/expiry/issued-at/subject/email checks and exact confirmed identity. No unverified identity headers accepted. Safe DOM text rendering, restrictive CSP, no-store, same-origin + custom-header protection for deletion.
- Expiry/cleanup schema and scheduled handler; no default retention is assumed. Records past expiry are not listed. The operator must approve/configure a retention period (1–365 days) and an actual cron before public activation.
- No image/upload route, R2 binding, mail service, paid service, API key in browser, public enquiry read route or third-party credentials in source.

## Reproducible local tests (no remote API/data/mail)
From repo root after README setup:
```
npm ci
npm test
# or: npm run test:backend
```
13 Node tests include actual RSA JWT signature/expiry/wrong-audience/wrong-owner checks; injected local database/verification fixtures cover persistence, quotas, outage and no-false-success behavior. Separate real SQLite in-memory tests check schema, atomic SQL quotas and expiry cleanup. esbuild verifies an ESM Worker bundle without deploying/writing it.

These are unit/local SQL/bundle tests, **not** Cloudflare workerd runtime or end-to-end Access/Turnstile tests. A workerd simulator dependency was evaluated but removed because its current dependency tree raised npm security advisories; final `npm audit` is clean.

## Remaining deployment gates — no backend resources created yet
- The OAuth connector can inspect the account/Workers but `GET /accounts/{id}/subscriptions` returns HTTP 403: **no OAuth scope covers this billing endpoint**, requiring Billing Read/Write via an API token. Do not scrape tokens or change authentication to bypass that. `default_usage_model: standard` does NOT prove Free versus Paid. Need user confirmation/evidence that Workers is on the Free plan (and no change to paid billing), or an explicitly approved read-only billing connection. This prevents promising the new workload cannot incur paid usage.
- R2 was readable already; do not create/use any bucket: photo uploads are deferred regardless of existing billing.
- Owner identity is now resolved, but Access application/AUD, reusable exact-email policy and actual owner login must be configured and verified after the free-plan gate. Do not send invitations or authentication messages automatically.
- Turnstile widget, secret-manager bindings and real fresh-token/replay validation still needed after the backend exists. Do not use dummy keys in production or expose secret values.
- Confirm retention period and update the privacy notice for actual Cloudflare processing before collecting data. `PRIVACY_APPROVED` and `OWNER_LOGIN_VERIFIED` are explicit false-by-default activation gates, not evidence themselves.

## Provisioning manifest after those gates
Only new, separate `heidelberg-contact` Worker and `heidelberg-enquiries` D1; no existing project resources. Copy `wrangler.example.jsonc` to ignored `wrangler.jsonc`, fill the actual binding/Access issuer/AUD, and use supported secret-manager channels for `TURNSTILE_SECRET` and `RATE_HASH_SECRET` (cryptographically random, at least 32 bytes). Set up Access `/admin` paths with reusable allow-only-owner policy. Bind D1; apply `schema.sql`; add hourly cleanup trigger. Leave all activation flags false until deployed inbox sign-in, proper challenges, error paths and privacy are verified. Connect frontend only last.

Never deploy this example with invented IDs or all activation flags set just to make the button appear functional. The public preview form remains disabled.
