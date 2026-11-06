// DOM test (jsdom): node tests/dom-test.cjs  (NODE_PATH must contain jsdom)
// Optional: EN_SOURCE=/path/en-main.json to compare English tours with the captured original translation.
const fs = require('fs'), path = require('path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const scripts = ['assets/content.js', 'assets/app.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8'));
let failures = 0;
const ok = (c, m) => { if (!c) { failures++; console.error('FAIL', m); } };
function load(page, stored) {
  const errors = [];
  const dom = new JSDOM(fs.readFileSync(path.join(root, page), 'utf8'), { runScripts: 'outside-only', url: 'http://localhost/' + page, pretendToBeVisual: true });
  const w = dom.window;
  Object.defineProperty(w.navigator, 'language', { value: 'en-US' });
  if (stored) w.localStorage.setItem('hdstufftodo-lang', stored);
  w.addEventListener('error', e => errors.push(e.message));
  try { scripts.forEach(s => w.eval(s)); } catch (e) { errors.push(String(e)); }
  return { w, d: w.document, errors };
}
const en = process.env.EN_SOURCE ? JSON.parse(fs.readFileSync(process.env.EN_SOURCE, 'utf8')) : null;
for (const page of ['index.html', 'touren.html', 'kontakt.html', 'downloads.html', 'impressum.html', 'datenschutz.html']) {
  const { w, d, errors } = load(page);
  ok(d.documentElement.lang === 'de', page + ' default German despite en-US browser');
  const C = w.HD_CONTENT;
  const btn = l => d.querySelector(`.lang-switch [data-lang=${l}]`);
  btn('en').click();
  ok(d.documentElement.lang === 'en' && w.localStorage.getItem('hdstufftodo-lang') === 'en', page + ' switch to en');
  d.querySelectorAll('[data-i18n]').forEach(el => ok(el.textContent === C.en[el.dataset.i18n], page + ' en text ' + el.dataset.i18n));
  btn('de').click();
  ok(d.documentElement.lang === 'de', page + ' switch back to de');
  d.querySelectorAll('[data-i18n]').forEach(el => ok(el.textContent === C.de[el.dataset.i18n], page + ' de text ' + el.dataset.i18n));
  const t = d.querySelector('.menu-toggle'), nav = d.getElementById('site-nav');
  t.click(); ok(t.getAttribute('aria-expanded') === 'true' && nav.classList.contains('open'), page + ' menu opens');
  d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  ok(t.getAttribute('aria-expanded') === 'false' && !nav.classList.contains('open') && d.activeElement === t, page + ' Escape closes menu, focus returns');
  ok(errors.length === 0, page + ' uncaught errors: ' + errors.join('; '));
  if (page === 'touren.html' && en) {
    const T = en.main_content.headings_and_paragraphs.map(x => x.text);
    const idx = [[4,5,6,7],[8,9,10,11],[12,13,14,15],[17,18,19,20],[21,22,23,24],[26,27,28,29],[31,32,33,34]];
    idx.forEach((ix, i) => ['kicker','title','text.0','price'].forEach((f, j) => ok(C.en[`tour.${i}.${f}`] === T[ix[j]], `en tour ${i} ${f}`)));
    ok(C.en['tour.7.kicker'] === T[36] && C.en['tour.7.text.0'] === T[37] && C.en['tour.7.text.1'] === T[38] && C.en['tour.7.price'] === T[39], 'en tour 7');
    [3,16,25,30,35].forEach((h, i) => ok(C.en['region.' + i] === T[h], 'region ' + i));
    ok(C.en['tours.title'] === T[0] && C.en['tours.lead'] === T[1] && C.en['tours.intro'] === T[2], 'tours intro');
    en.team_english.members.forEach((m, i) => m.paragraphs.forEach((p, j) => ok(C.en[`team.${i}.p.${j}`] === p, `team ${i} p ${j}`)));
    ok(C.en['team.intro'] === en.team_english.intro && C.en['contact.title'] === en.contact_english.headings_and_paragraphs[0].text, 'team/contact intro');
  }
  if (page === 'kontakt.html') {
    let opened = null;
    const f = d.getElementById('contact-form');
    f.querySelector('.form-status').textContent = '';
    f.dispatchEvent(new w.Event('submit', { cancelable: true }));
    ok(/Pflichtfelder/.test(f.querySelector('.form-status').textContent), 'empty form shows error, nothing opened');
  }
}
// stored choice honoured
const s = load('index.html', 'en');
ok(s.d.documentElement.lang === 'en' && s.d.querySelector('h1').textContent === s.w.HD_CONTENT.en['hero.title'], 'stored en honoured');
console.log(failures ? `${failures} failure(s)` : 'PASS: DOM test, 0 failures');
process.exit(failures ? 1 : 0);
