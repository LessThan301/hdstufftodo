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
Customer reviews, the legal pages and the imprint are plain HTML (reviews stay in their original language).

## Languages
- German is the default regardless of browser language; a visitor's explicit choice (DE/EN buttons) is stored in `localStorage` (`hdstufftodo-lang`).
- English tour texts, tours intro, team profiles, “About Us” and the contact heading/intro are the site's original English (Weglot) translations, copied exactly (including original wording such as “Contact you us”).
- Home hero English text and navigation labels were taken from screenshots of the original English site.
- Small UI strings without a captured original translation (e.g. “What our customers say about us”, “Press & Downloads”, “Book here”, form labels/notes, gallery buttons) are preview translations – review before launch.
- Legal pages are German only.

## Legal review required before production
The Impressum/Datenschutz texts were copied unchanged and still mention Squarespace, Squarespace Analytics, cookies, Weglot and Google/Adobe Fonts. This preview uses none of them (no third-party scripts, cookies, trackers or external fonts). A visible DE/EN note on both pages says so. **Have the legal texts reviewed and updated before moving production hosting.**

## Contact form limitation
There is no form backend. “E-Mail vorbereiten” only opens the visitor's own e-mail program with a prepared message to hdstufftodo@gmail.com (`mailto:`); nothing is sent silently. Visitors without a configured mail program must use the e-mail address/phone shown.

## Tests
```
python3 test_site.py                       # 6 pages, 8 tours, local images/PDF, no external scripts (needs beautifulsoup4)
node --check assets/app.js
NODE_PATH=/path/to/node_modules node tests/dom-test.cjs   # needs jsdom; default German, DE<->EN switch, menu + Escape
```
Optional: `EN_SOURCE=en-main.json` compares English texts against the captured original translation (research file, not in this repo).

## Deploy
GitHub Pages from branch `main`, folder `/` (root). No build step. Push to `main` to redeploy.

`tools/extract-original.py` is the historical one-off extractor used on local research copies; it is **not** used to build the site.
