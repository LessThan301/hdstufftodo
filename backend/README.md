# Heidelberg private enquiry backend — LIVE (uploads deferred)

Updated 2026-11-09 (Europe/Berlin). Public enquiries enabled on the GitHub preview only. Uploads/R2 remain deferred. No paid upgrades.

## Live URLs
- Health: <https://heidelberg-contact.synoikon.workers.dev/health>
- Hosted form: <https://heidelberg-contact.synoikon.workers.dev/contact>
- Owner inbox: <https://heidelberg-contact.synoikon.workers.dev/admin>
- Contact page: <https://hdstufftodo.com/kontakt.html> (GitHub preview URL redirects after the custom domain is attached)

## Non-secret manifest
- Worker `heidelberg-contact`
- D1 `heidelberg-enquiries` (`a15df877-b36c-4b64-b13b-5d01f9af8bf9`, EU jurisdiction)
- Access app `1a6c7a2e-4285-48d9-94f1-7c3fc032d397` with exact-owner policy `14998e1e-880b-4472-b3cf-5d469bd1d3a6` (`hdstufftodo@gmail.com`)
- Free Turnstile managed widget; public sitekey in example config; secrets only in Worker secret manager
- Retention: 90 days; hourly cleanup cron `17 * * * *`
- Activation: `CONTACT_ENABLED`, `OWNER_LOGIN_VERIFIED`, `PRIVACY_APPROVED` true; uploads false

## Security notes
The form is hosted on the Worker origin and embedded from `https://hdstufftodo.com` and `https://www.hdstufftodo.com`. Direct API requests from the shared GitHub Pages origin `https://lessthan301.github.io` are rejected.
