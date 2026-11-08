# Heidelberg private enquiry backend — deployed, public collection OFF

Updated 2026-11-09 (Europe/Berlin). User confirmed Workers Free via screenshot and authorised this free-only setup. No billing changes, R2 usage, domain changes, invitations, email delivery or unrelated resource changes.

## Live URLs and non-secret manifest
- Worker `heidelberg-contact`: <https://heidelberg-contact.synoikon.workers.dev/health> (`databaseReady:true`, `contactEnabled:false`, `uploadsEnabled:false` verified live).
- Owner sign-in/inbox: <https://heidelberg-contact.synoikon.workers.dev/admin>.
- Owner-only real Turnstile + replay check: <https://heidelberg-contact.synoikon.workers.dev/admin/check>. Click **Run protection check** after signing in. It sends no enquiry and writes no customer record. Report whether it passes; no impersonation or automatic authentication email was attempted.
- Hosted form: <https://heidelberg-contact.synoikon.workers.dev/contact> (inactive notice only until all gates pass).
- D1 `heidelberg-enquiries`, UUID `a15df877-b36c-4b64-b13b-5d01f9af8bf9`, jurisdiction `eu`, read replication disabled. Schema applied; live enquiry and limit tables verified empty.
- Access app `1a6c7a2e-4285-48d9-94f1-7c3fc032d397`, path `heidelberg-contact.synoikon.workers.dev/admin*`.
- Reusable allow policy `14998e1e-880b-4472-b3cf-5d469bd1d3a6`: only the user-confirmed owner `hdstufftodo@gmail.com`; no domain-wide or Everyone rules. Issuer `https://synoikon.cloudflareaccess.com`; actual application audience is in the non-secret example configuration. The login screen's old organisation display name is not its issuer.
- Free managed Turnstile widget, public sitekey `0x4AAAAAAF5NnTbd43o32Cja`; domains: exact Worker hostname, localhost, 127.0.0.1. Production server accepts only the exact Worker hostname and action `contact`.
- `TURNSTILE_SECRET` transferred directly from creation response into the Worker secret manager; random 32-byte `RATE_HASH_SECRET` generated there. No secret value entered source, chat, deployment file or logs. Future script uploads must preserve `secret_text` bindings.
- Hourly cleanup `17 * * * *` (UTC cron syntax; Europe/Berlin minute 17 each hour). No production customer data or synthetic enquiry was inserted.

## Implemented protections
Bounded streaming JSON (16 KiB), strict types/lengths, honeypot, atomic persistent quotas (5/hour/client, 200/day global), hourly HMAC IP keys instead of raw IP retention, parameterised SQL, receipt only after durable insertion. All admin routes verify the Access JWT signature, RS256 algorithm, issuer, actual audience, expiry and exact owner identity. Safe text-only DOM rendering, no-store, restrictive CSP and same-origin/custom-header CSRF checks. No upload, R2, mail or payment integration.

**GitHub Pages is a shared origin, not a repository security boundary.** The form is hosted on the isolated Worker origin and will be embedded cross-origin after activation. API requests from `https://lessthan301.github.io` are explicitly rejected; a Referer path is not treated as authentication. The parent preview never gets form values or receives wildcard/credentialed API access. The frontend contains the actual hosted URL but `data-backend-enabled="false"` means no iframe or Cloudflare script loads yet. Without JavaScript, the hosted form fieldset remains disabled; errors cannot display fake success.

Observability/traces are sampled at 0.1 and query strings redacted. Code emits no message bodies, challenge tokens, secrets or raw IP logs. Cloudflare still handles normal technical connection/sign-in metadata. EU D1 jurisdiction does not imply every Access/Turnstile/edge processing operation stays within the EU.

## Remaining activation gates
1. Mum signs in as the exact confirmed owner and confirms the inbox opens. The `/admin/check` page verifies a real challenge and rejection of its replay without sending an enquiry. Live public checks currently reach the Access login screen, not the inbox; full end-to-end login/Turnstile has NOT been claimed.
2. Approve a retention period (configurable 1–365 days; use the minimum needed) and actual controller/privacy disclosure. `RETENTION_DAYS=0`, `PRIVACY_APPROVED=false`, `OWNER_LOGIN_VERIFIED=false`, `CONTACT_ENABLED=false` remain deliberate gates. Technical preview notice was updated; original legal text still needs business/legal review.
3. Only then set verified flags/retention and activate the iframe on the **existing GitHub preview only**, updating contact/FAQ copy to match actual availability. Test real error paths and an expressly approved isolated enquiry if desired; do not send real messages as tests.

## Reproducible tests
`npm ci && npm test` plus Python requirements in the root README. **16 backend Node tests** cover real local RSA JWT checks, hostile origins, validation/quota/outage behavior, safe DOM, CSRF, owner-only challenge check, and progressive form/error/receipt semantics. SQLite in-memory schema/quota/expiry checks, static six-page checks, frontend DOM checks and esbuild ESM bundling also pass. `npm audit`: zero vulnerabilities.

`npm run build:backend` reproducibly writes the ESM deployment bundle to ignored `backend/dist/worker.mjs`; use the non-secret example manifest and preserve existing secret-manager bindings during upload.

These are local unit/SQL/DOM/bundle tests, not a workerd simulation or completed real-owner end-to-end test. Live health separately exercises the actual D1 binding with harmless `SELECT 1`.

## Free-only operating rule
Workers Free was verified; Teams Free Base is active. No subscriptions were activated or upgraded. On current Free plans, Workers requests/CPU and D1 limits reject work rather than adding paid overage. Application quotas reject excess, and outages never report success. If account plans change later, stop and reassess; never upgrade automatically. Account-wide Free allowances are shared with existing projects, so exhaustion can also affect them; no account settings or those projects were changed. R2 is excluded regardless of its existing subscription.

Sources checked this turn: [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [D1 pricing and hard Free-limit failures](https://developers.cloudflare.com/d1/platform/pricing/), [Turnstile Free plan](https://developers.cloudflare.com/turnstile/plans/).
