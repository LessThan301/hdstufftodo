# Direct enquiries and owner-managed gallery — decision required

Status: **not deployed; contact API/inbox code implemented and tested locally in `backend/`; no owner upload UI**. Photo uploads/R2 are deferred by user instruction. The confirmed sole admin identity is `hdstufftodo@gmail.com`; no messages or invitations have been sent. See `backend/README.md` for actual implementation, tests and the unresolved free-plan verification gate. GitHub Pages remains the preview host. The contact form fails closed (disabled inputs/button; submit handler never opens mail or transmits data). Existing explicit email/phone links remain available. The existing public gallery is working; adding files in GitHub is not a substitute for a user-friendly owner upload workflow.

## Read-only investigation (2026-11-08, Europe/Berlin)
The connected Cloudflare account is accessible. Existing scripts belong to other projects; none were read or changed. There is no Heidelberg backend created by this work. No account, billing plan, resource, mail provider, or data processor was activated.

## Smallest coherent proposal
Keep the website on GitHub Pages; add one independent Cloudflare Worker for an API and an owner-only dashboard. Use D1 for contact enquiries and image metadata, private R2 Standard storage for gallery images, and Cloudflare Access for owner authentication. Use Turnstile plus server-side verification and a rate-limit binding for the public enquiry route. A database inbox allows enquiries to be sent directly from the site without adding a separate email delivery processor. Owner email notifications are a separate decision, not an implied feature.

Alternatives considered: a hosted form endpoint plus a separate hosted image CMS adds two providers and separate privacy/billing arrangements. A Git-only image workflow is cheaper but does not meet the requested friendly upload experience. Moving the whole website off GitHub Pages is unnecessary.

## Required approval/configuration before implementation or activation
1. Confirm Cloudflare may process prospective customer enquiries and gallery uploads on behalf of this business; confirm who controls the data/account and can administer it. The currently connected personal account may not be the business's intended long-term account.
2. Confirm a secure owner login identity and whether the company will use an enquiry inbox dashboard or also wants email notifications. Do not infer an owner login address from the public contact address.
3. Approve creating a separate Heidelberg Worker, D1 database, R2 bucket, Turnstile widget and Access application; do not reuse another project's resources.
4. Approve R2 subscription/billing if required. Use a free Workers plan unless a paid upgrade is explicitly approved. Set budget alerts and app quotas; free allowances do not constitute a guarantee of zero cost.
5. Agree a retention period and process for deleting enquiries; clarify photo rights, consent for identifiable people, and who can publish images.
6. Have privacy information updated for the real processors/regions/retention/authentication before enabling collection. Existing original legal text still requires review.

## Security acceptance criteria for the implementation
- Only allow the exact GitHub Pages origin; no wildcard credentialed CORS. Explicit API paths and methods; parameterised DB queries. Validate on the server, not just browser.
- Public enquiry: JSON body limit 16 KiB, field length/type limits, valid email, no attachments, honeypot, Turnstile hostname/action verification, persistent per-IP and global quotas; minimal logs without message contents or raw IP retention. Return success only after durable persistence; display actual errors and retry advice without false success. No automatic booking/payment confirmation.
- Owner dashboard: Access session with server-side JWT signature/issuer/audience/expiry verification and explicit identity allowlist on **every** admin route. CORS is not authentication. Same-origin session/CSRF protections; no admin keys in frontend, URL, localStorage or repo.
- Uploads: owner-only; maximum 5 MiB; JPEG/PNG/WebP only, verify magic bytes and decode, limit pixel count (e.g. 24 MP), re-encode to strip EXIF/GPS, reject SVG/HTML and unsupported files. Random server-generated object keys, no client paths. Private R2; publish only intentionally approved gallery objects via safe response headers. Alt text/caption, order and delete/unpublish controls; never interpolate untrusted HTML.
- Store only IDs/metadata in D1, private objects in R2; preserve published gallery if admin login fails. No localStorage-only fake shared upload.
- Integration tests for invalid/oversize requests, bots/rate limits, auth failure, expired sessions, CSRF, invalid images, DB/R2 outage, deletion, and no false success. Use synthetic local payloads; no real external emails/test enquiries without separate authorisation.

## Verified pricing sources (review again before activation)
- [Workers](https://developers.cloudflare.com/workers/platform/pricing/): Free includes 100,000 requests/day; paid starts at USD 5/month. Free CPU and storage-product limits still apply.
- [D1](https://developers.cloudflare.com/d1/platform/pricing/): Free 5 million rows read/day, 100,000 rows written/day, 5 GB total storage (500 MB/database). Free-limit failures must be handled honestly.
- [R2](https://developers.cloudflare.com/r2/pricing/): Standard free allowance 10 GB-month, 1 million Class A and 10 million Class B operations/month. Above allowance: USD 0.015/GB-month, USD 4.50/million Class A, USD 0.36/million Class B; free egress. Subscription/payment requirements must be confirmed in the intended account; no payment or upgrade was made here.
- Access identity-plan eligibility/seat pricing and Turnstile terms need final verification once the owner's account and login method are chosen. No promised total monthly cost yet.

Do not remove the disabled state until the deployed system passes these checks and the controller approves actual personal-data collection.
