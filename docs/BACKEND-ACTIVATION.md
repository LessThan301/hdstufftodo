# Direct enquiries — deployed infrastructure, activation pending

Updated 2026-11-09 (Europe/Berlin). See [backend README](../backend/README.md) for live URLs, exact non-secret resource identifiers, security architecture and 16-test result.

## Resolved (do not ask again)
- User screenshot verifies **Workers Free / Active** and Teams Free Base. Billing endpoint OAuth limitations are no longer a plan gate.
- Sole owner identity explicitly confirmed: `hdstufftodo@gmail.com`.
- User approved separate free-only Worker + D1 + Access + Turnstile resources in the existing account. These are now deployed. No paid activation, upgrade or account-wide changes.
- Photo uploads/R2 deferred, even though an existing R2 subscription is present. No bucket, upload route or storage operation was used.

## Live and verified
The independent `heidelberg-contact` Worker has the actual EU-jurisdiction D1 binding, empty schema and hourly expiry cleanup. Health reports database readiness while collection stays off. Access redirects inbox/admin API visitors to the correct application login; reusable policy is exact-email-only and Worker additionally validates signed JWTs with the real issuer/audience. The managed free Turnstile widget and both secret-manager bindings exist. No invitation/email or actual enquiry has been sent. Existing other-project resources were not altered.

## Why an isolated hosted form
GitHub Pages' origin is shared between repositories. Origin-only CORS or a Referer path cannot prove which repository submitted. The real form therefore lives on the Worker origin and will be embedded in the preview; API requests directly from the GitHub shared origin are rejected. The preview stages the real URL but does not load the iframe until explicitly activated. The disabled preview and inactive Worker page collect no form values.

## Still required, with precise next action
1. Mum opens <https://heidelberg-contact.synoikon.workers.dev/admin>, signs in as the confirmed owner, and confirms the inbox opens. No impersonation or automatic code/invite request was performed.
2. From the inbox, open **Check contact protection**, or <https://heidelberg-contact.synoikon.workers.dev/admin/check>, complete the real challenge and click **Run protection check**. It tests fresh-token acceptance and replay rejection, with no enquiry inserted or message sent. Report the result to the site administrator.
3. Confirm minimal retention and controller/privacy disclosure for actual Cloudflare processing. The configured retention is `0` (inactive), not an assumed policy. D1 jurisdiction is EU; do not claim all global edge/Access/Turnstile processing is EU-only. Original copied legal text is not certified current.
4. After those checks, set retention and verified flags, activate iframe only on the existing GitHub preview, and update availability/FAQ/privacy copy. No `hdstufftodo.com` domain change is approved here.

The public form remains disabled until all checks pass. No paid service is an automatic fallback for quota, CPU, storage or authentication errors. Free limits are account-wide; shared-limit exhaustion can affect existing projects. Observe failures and reduce/reject workload rather than upgrade.

## Deferred gallery
The current public local-image gallery is working. A friendly owner upload UI is still deferred; adding files to Git is not claimed as that feature. Any future upload project needs separate approval, image validation/re-encoding/EXIF stripping, safe publication controls and a free-only billing decision before storage is used.
