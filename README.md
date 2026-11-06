# Heidelberg Stuff To Do

A clean, editable recreation of the public Squarespace site for Heidelberg Stuff To Do. Alexander and his mother, the site's owner, authorized this migration. This preview does not track visitors, load external assets, or use Squarespace/Weglot code.

## Pages
Home, tours, contact, downloads, imprint and privacy policy. German and English are available through the language selector; the preference is saved only in the visitor's browser.

## Editing
- **Text:** use the HTML files. Navigation and footer appear in each file; edit the relevant section. `assets/app.js` contains translated interface labels and the English tour text.
- **Tour text:** each tour in `touren.html` is an `<article class="tour">`; the English version is in `englishTours()` inside `assets/app.js`. All eight tours, times and prices are included.
- **Pictures:** files are in `assets/images/`. Use the same filename when replacing an image.
- **Contact form:** prepares a `mailto:` message to hdstufftodo@gmail.com. It never sends automatically and needs no data processing by this preview. A real form service can be connected with permission from the owner and a privacy-policy update.
- **Legal pages:** copied from the original, but the source privacy policy refers to Squarespace, Weglot and other tracking that this preview does not use. It must be reviewed before a production launch. A preview `noindex` tag is included.
- Regenerate the original German source structure with `python3 build.py`, if the research source files are present. Direct edits to generated files are not safe after running the extractor.

## Local run
`python3 -m http.server 8000` in this directory. Then visit http://localhost:8000.

## Tests
`python3 test_site.py`
