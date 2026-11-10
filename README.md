# Heidelberg Stuff To Do – static preview

Static, dependency-free website for Heidelberg Stuff To Do, served at https://hdstufftodo.com (and www) via GitHub Pages.

## Structure / how to edit
| File | Content |
|---|---|
| `index.html` | Home: hero, “Wer wir sind” team profiles, photo gallery, customer reviews, press, contact CTA |
| `touren.html` | 8 tours in 5 regions (anchors `#Heidelberg`, `#Schwetzingen`, `#Mannheim`, `#Speyer`, `#Kostuemfuehrung`) |
| `kontakt.html` | Contact details + disabled direct-form preview + 8 FAQs |
| `downloads.html` | Adelsblatt article (PDF) |
| `impressum.html`, `datenschutz.html` | Original legal texts (German) + preview notes |
| `assets/content.js` | **All translatable texts**, `de` and `en`, keyed like `tour.3.price` |
| `assets/app.js` | Language switch, mobile menu, gallery buttons, fail-closed contact form |
| `assets/style.css` | Styles (locally hosted Liberation Serif + Sans, matching logo D; no external fonts) |
| `assets/images/`, `assets/downloads/` | All images and the PDF, served locally |

Elements with `data-i18n="key"` show the German text in the HTML (works without JavaScript) and are replaced from `assets/content.js` when switching language.
To change a text, edit it in **both** `assets/content.js` (`de` entry) and the German fallback in the HTML, then run the tests.
Customer reviews, the legal pages and the imprint are plain HTML (reviews stay in their original language; Impressum/Datenschutz bodies are not rewritten).


## Logo (full concept D – River Spark)
Full selected concept D: gold winding river, burgundy sparkle, elegant serif Heidelberg above tracked sans-serif **StuffToDo** (joined CamelCase as requested). The former site's bitmap wordmark is no longer used.
- `logo-river-spark.svg`: self-contained outlined vector lockup.
- `logo-river-spark-editable.svg`: editable live text source (Liberation Serif / Liberation Sans system fonts).
- `logo.png`: high-resolution transparent raster of same lockup.
- Mark-only SVG and cream-tile PNG favicons remain consistent with D.
- Cache version `rs5`.


## Languages
- German is the default regardless of browser language; a visitor's explicit choice (DE/EN buttons) is stored in `localStorage` (`hdstufftodo-lang`).
- Both German and English marketing/interface copy were revised for native, marketable tone (warm, expert guides; active, non-hype). Hard facts are unchanged: tour durations, EUR prices, group size (max 15), Heidelberg courtyard admission, team names/roles/certifications, and supported customisation to individual wishes.
- The Eichendorff quotation stays exact in German; English is a faithful natural translation.
- Customer reviews remain verbatim. Legal page bodies remain the original German texts (preview notes explain the Squarespace/Weglot/fonts mismatch).
- This preview is **not** a byte-for-byte Weglot mirror; English is an edited native translation of the same facts.

## Legal review required before production
The Impressum/Datenschutz texts were copied unchanged and still mention Squarespace, Squarespace Analytics, cookies, Weglot and Google/Adobe Fonts. This preview uses none of them (no third-party scripts, cookies, trackers or external fonts). A visible DE/EN note on both pages says so. **Have the legal texts reviewed and updated before moving production hosting.**

## Direct enquiries and owner gallery: not yet active
The direct contact form is explicitly disabled pending approved backend setup; it never opens a mail app or pretends to send. The gallery remains a public local-image gallery, **not** an owner upload service yet. See [backend activation plan](docs/BACKEND-ACTIVATION.md) for decisions, privacy/security requirements, and verified pricing sources. The isolated Worker, EU D1, exact-owner Access app and free Turnstile widget are live with 90-day retention. Public enquiries are enabled on the GitHub preview via the cross-origin hosted form; uploads/R2 remain deferred. See `backend/README.md`. Photo uploads/R2 are deferred.

## New bilingual planning sections
- Four **proposed** themed routes on `touren.html#packages`, based on the existing eight tours; owner confirmation required, no invented package prices/discounts or transport inclusions.
- Eight native DE/EN FAQs on `kontakt.html#faq`; unknown weather/cancellation/accessibility policies are explicitly for individual confirmation.
- Matching concept-D typography uses unmodified, locally served Liberation fonts under SIL OFL; redistribution notice is in `assets/fonts/LICENSE.txt`.
- Gallery heading/introduction and common footer shortcuts make the existing photographs easier to find.

## Local setup and tests
Requires Python 3.10+ and Node.js 20.19+ (Node 22+ recommended).
The static website requires no build step. Node packages support tests and the separately staged backend (see `backend/README.md`).

```sh
python3 -m venv .venv
. .venv/bin/activate
python3 -m pip install -r requirements-dev.txt
npm ci
npm test
npm start
```
Open http://127.0.0.1:8000; stop the server with Ctrl+C.
On Windows activate with `.venv\Scripts\activate` instead.

`npm test` runs separate syntax checks for both JS files, static page/asset/content checks, and the jsdom language/menu/form tests. No npm-cache path or private research file is needed.
Optional legacy comparison: set `EN_SOURCE` to your own research JSON; not required for normal tests.

## Deploy
GitHub Pages from branch `main`, folder `/` (root). No build step. Push to `main` to redeploy.

`tools/extract-original.py` is the historical one-off extractor used on local research copies; it is **not** used to build the site.
