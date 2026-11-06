# Heidelberg Stuff To Do – static preview

Static, dependency-free recreation of hdstufftodo.com (published with the owner's permission) for preview on GitHub Pages.
The page carries `noindex`, but GitHub Pages is still publicly reachable. The live site and its domain are not touched by this repo.

## Structure / how to edit
| File | Content |
|---|---|
| `index.html` | Home: hero, “Wer wir sind” team profiles, photo gallery, customer reviews, press, contact CTA |
| `touren.html` | 8 tours in 5 regions (anchors `#Heidelberg`, `#Schwetzingen`, `#Mannheim`, `#Speyer`, `#Kostuemfuehrung`) |
| `kontakt.html` | Contact details + mailto form |
| `downloads.html` | Adelsblatt article (PDF) |
| `impressum.html`, `datenschutz.html` | Original legal texts (German) + preview notes |
| `assets/content.js` | **All translatable texts**, `de` and `en`, keyed like `tour.3.price` |
| `assets/app.js` | Language switch, mobile menu, gallery buttons, mailto form |
| `assets/style.css` | Styles (system Georgia + sans-serif, no web fonts) |
| `assets/images/`, `assets/downloads/` | All images and the PDF, served locally |

Elements with `data-i18n="key"` show the German text in the HTML (works without JavaScript) and are replaced from `assets/content.js` when switching language.
To change a text, edit it in **both** `assets/content.js` (`de` entry) and the German fallback in the HTML, then run the tests.
Customer reviews, the legal pages and the imprint are plain HTML (reviews stay in their original language; Impressum/Datenschutz bodies are not rewritten).


## Logo (concept D – River Spark + original wordmark)
Selected direction **D** (warm gold winding river ribbon + burgundy sparkle) replaces the Heidelberg lion/shield only. The **wordmark is the original site bitmap**, cut from the previous `logo.png` (exact “Heidelberg” / “StuffToDo” lettering, spacing, and antialiasing). Do not re-typeset it in Georgia or another font.

Editable / served assets:
| File | Role |
|---|---|
| `assets/images/logo-river-spark.svg` | Self-contained lockup: vector D mark + embedded original wordmark PNG |
| `assets/images/logo-river-spark-original-wordmark.png` | 1280×335 composed PNG (D + original wordmark) |
| `assets/images/logo-river-spark-mark.svg` / `favicon-river-spark.svg` | Mark alone (browser icon) |
| `assets/images/favicon-river-spark-32.png`, `…-192.png`, `apple-touch-icon.png` | Raster favicons on cream tile |
| `assets/images/logo.png` | Full-resolution composed PNG (native 2500×655) |

Header logo CSS matches the pre-rebuild site (`180px` / `150px` mobile). Asset URLs use `?v=rs2` cache-busting.

## Languages
- German is the default regardless of browser language; a visitor's explicit choice (DE/EN buttons) is stored in `localStorage` (`hdstufftodo-lang`).
- Both German and English marketing/interface copy were revised for native, marketable tone (warm, expert guides; active, non-hype). Hard facts are unchanged: tour durations, EUR prices, group size (max 15), Heidelberg courtyard admission, team names/roles/certifications, and supported customisation to individual wishes.
- The Eichendorff quotation stays exact in German; English is a faithful natural translation.
- Customer reviews remain verbatim. Legal page bodies remain the original German texts (preview notes explain the Squarespace/Weglot/fonts mismatch).
- This preview is **not** a byte-for-byte Weglot mirror; English is an edited native translation of the same facts.

## Legal review required before production
The Impressum/Datenschutz texts were copied unchanged and still mention Squarespace, Squarespace Analytics, cookies, Weglot and Google/Adobe Fonts. This preview uses none of them (no third-party scripts, cookies, trackers or external fonts). A visible DE/EN note on both pages says so. **Have the legal texts reviewed and updated before moving production hosting.**

## Contact form limitation
There is no form backend. “E-Mail vorbereiten” / “Prepare e-mail” only opens the visitor's own e-mail program with a prepared message to hdstufftodo@gmail.com (`mailto:`); nothing is sent silently. Visitors without a configured mail program must use the e-mail address/phone shown.

## Tests
```
python3 test_site.py                       # 6 pages, 8 tours, DE HTML=content sync, local images/PDF (needs beautifulsoup4)
node --check assets/app.js assets/content.js
NODE_PATH=/path/to/node_modules node tests/dom-test.cjs   # needs jsdom; default German, DE↔EN switch, menu + Escape
```
Optional: `EN_SOURCE=en-main.json` compares English tour **facts** (duration, price, group max) against a captured original dump (research file, not in this repo). Set `COMPARE_ORIGINAL_TRANSLATION=1` only if you need the legacy exact-wording comparison against that dump.

## Deploy
GitHub Pages from branch `main`, folder `/` (root). No build step. Push to `main` to redeploy.

`tools/extract-original.py` is the historical one-off extractor used on local research copies; it is **not** used to build the site.
