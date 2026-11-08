// DOM test (jsdom): node tests/dom-test.cjs  (NODE_PATH must contain jsdom)
// Optional: EN_SOURCE=/path/en-main.json
//   - default with EN_SOURCE: compare normalised factual fields (duration, EUR prices, group max) and tour count
//   - COMPARE_ORIGINAL_TRANSLATION=1: also assert exact original Weglot wording (legacy opt-in)
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
function facts(price) {
  const d = (price.match(/(\d+)\s*minut/i) || [])[1];
  const euros = [...price.matchAll(/EUR\s*(\d+)/gi)].map(m => +m[1]);
  const g = (price.match(/(?:bis|up to|of up to)\s*(\d+)/i) || [])[1];
  return { duration: d ? +d : null, euros, group: g ? +g : null };
}
const en = process.env.EN_SOURCE ? JSON.parse(fs.readFileSync(process.env.EN_SOURCE, 'utf8')) : null;
const legacyExact = process.env.COMPARE_ORIGINAL_TRANSLATION === '1';
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
    const expectedFacts = [
      { duration: 90, euros: [130], group: 15 },
      { duration: 90, euros: [130], group: 15 },
      { duration: 120, euros: [140], group: 15 },
      { duration: 90, euros: [130], group: 15 },
      { duration: 60, euros: [120], group: 15 },
      { duration: 60, euros: [120], group: 15 },
      { duration: 90, euros: [130], group: 15 },
      { duration: 90, euros: [170], group: 15 },
    ];
    expectedFacts.forEach((exp, i) => {
      const got = facts(C.en[`tour.${i}.price`]);
      ok(JSON.stringify(got) === JSON.stringify(exp), `en tour ${i} facts ${JSON.stringify(got)}`);
      ok(!!C.en[`tour.${i}.kicker`] && (i === 7 || !!C.en[`tour.${i}.title`]) && !!C.en[`tour.${i}.text.0`], `en tour ${i} has copy`);
    });
    ok(C.en['tour.7.text.1'], 'en tour 7 has second paragraph');
    for (let i = 0; i < 5; i++) ok(!!C.en['region.' + i], 'region ' + i);
    ok(!!C.en['tours.title'] && !!C.en['tours.lead'] && !!C.en['tours.intro'], 'tours intro present');
    // Contact heading must be natural English (not the old awkward "Contact you us")
    ok(!/Contact you us/i.test(C.en['contact.title']), 'contact title not awkward original');
    ok(/get in|contact|touch/i.test(C.en['contact.title']), 'contact title natural');
    if (legacyExact) {
      const idx = [[4,5,6,7],[8,9,10,11],[12,13,14,15],[17,18,19,20],[21,22,23,24],[26,27,28,29],[31,32,33,34]];
      idx.forEach((ix, i) => ['kicker','title','text.0','price'].forEach((f, j) => ok(C.en[`tour.${i}.${f}`] === T[ix[j]], `legacy en tour ${i} ${f}`)));
      ok(C.en['tour.7.kicker'] === T[36] && C.en['tour.7.text.0'] === T[37] && C.en['tour.7.text.1'] === T[38] && C.en['tour.7.price'] === T[39], 'legacy en tour 7');
      [3,16,25,30,35].forEach((h, i) => ok(C.en['region.' + i] === T[h], 'legacy region ' + i));
      ok(C.en['tours.title'] === T[0] && C.en['tours.lead'] === T[1] && C.en['tours.intro'] === T[2], 'legacy tours intro');
      en.team_english.members.forEach((m, i) => m.paragraphs.forEach((p, j) => ok(C.en[`team.${i}.p.${j}`] === p, `legacy team ${i} p ${j}`)));
      ok(C.en['team.intro'] === en.team_english.intro && C.en['contact.title'] === en.contact_english.headings_and_paragraphs[0].text, 'legacy team/contact intro');
    }
  }
  if (page === 'kontakt.html') {
    const f = d.getElementById('contact-form');
    f.querySelector('.form-status').textContent = '';
    f.dispatchEvent(new w.Event('submit', { cancelable: true }));
    ok(/noch nicht aktiv/.test(f.querySelector('.form-status').textContent), 'inactive form says nothing sent');
    ok(f.querySelector('fieldset[disabled]'), 'contact fields disabled until approved backend');
    ok(w.location.href === 'http://localhost/kontakt.html', 'no mail app or external navigation');
  }
}
const s = load('index.html', 'en');
ok(s.d.documentElement.lang === 'en' && s.d.querySelector('h1').textContent === s.w.HD_CONTENT.en['hero.title'], 'stored en honoured');
// Natural English smoke checks
ok(!/Contact you us/i.test(s.w.HD_CONTENT.en['contact.title']), 'EN contact title polished');
ok(/magic word/i.test(s.w.HD_CONTENT.en['team.0.p.3']), 'EN Eichendorff faithful');
console.log(failures ? `${failures} failure(s)` : 'PASS: DOM test, 0 failures');
process.exit(failures ? 1 : 0);
