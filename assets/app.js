/* Heidelberg Stuff To Do – preview. Backend frame is explicitly gated off until verified. */
(function () {
  'use strict';
  var STORE = 'hdstufftodo-lang';
  var content = window.HD_CONTENT || { de: {}, en: {} };
  var doc = document;

  function stored() {
    try { var v = window.localStorage.getItem(STORE); return v === 'en' || v === 'de' ? v : null; } catch (e) { return null; }
  }
  function remember(lang) { try { window.localStorage.setItem(STORE, lang); } catch (e) { /* storage unavailable */ } }

  var current = stored() || 'de'; // German default regardless of browser language

  function t(key) { var d = content[current] || {}; return key in d ? d[key] : content.de[key]; }

  function applyLanguage(lang) {
    current = lang === 'en' ? 'en' : 'de';
    doc.documentElement.lang = current;
    doc.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n'));
      if (typeof v === 'string') el.textContent = v;
    });
    doc.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      var v = t(el.getAttribute('data-i18n-aria'));
      if (typeof v === 'string') el.setAttribute('aria-label', v);
    });
    doc.querySelectorAll('.lang-switch [data-lang]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-lang') === current));
    });
    var hosted = doc.getElementById('hosted-contact');
    if (hosted) {
      hosted.title = current === 'en' ? 'Secure tour enquiry' : 'Sichere Touranfrage';
      var frameURL = 'https://heidelberg-contact.synoikon.workers.dev/contact?lang=' + current;
      if (hosted.src !== frameURL) hosted.src = frameURL;
    }
    var nav = doc.getElementById('site-nav');
    if (nav) nav.setAttribute('aria-label', current === 'en' ? 'Main navigation' : 'Hauptnavigation');
    var group = doc.querySelector('.lang-switch');
    if (group) group.setAttribute('aria-label', t('nav.lang'));
  }

  doc.querySelectorAll('.lang-switch [data-lang]').forEach(function (b) {
    b.addEventListener('click', function () {
      var lang = b.getAttribute('data-lang');
      remember(lang);
      applyLanguage(lang);
    });
  });

  /* Mobile menu */
  var toggle = doc.querySelector('.menu-toggle');
  var nav = doc.getElementById('site-nav');
  function setMenu(open, focusToggle) {
    if (!toggle || !nav) return;
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('open', open);
    if (!open && focusToggle) toggle.focus();
  }
  if (toggle && nav) {
    toggle.addEventListener('click', function () { setMenu(toggle.getAttribute('aria-expanded') !== 'true'); });
    doc.addEventListener('keydown', function (ev) {
      if ((ev.key === 'Escape' || ev.key === 'Esc') && toggle.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
  }

  /* Gallery: buttons scroll the track; the track itself is focusable so arrow keys scroll natively */
  var track = doc.querySelector('.gallery-track');
  if (track) {
    doc.querySelectorAll('.gallery-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        var dir = Number(b.getAttribute('data-dir')) || 1;
        var amount = Math.max(track.clientWidth * 0.8, 200);
        if (typeof track.scrollBy === 'function') track.scrollBy({ left: dir * amount, behavior: 'smooth' });
        else track.scrollLeft += dir * amount;
      });
    });
    track.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        track.scrollLeft += (ev.key === 'ArrowRight' ? 1 : -1) * Math.max(track.clientWidth * 0.5, 150);
      }
    });
  }

  /* Direct delivery awaits approved backend activation. Fail closed: no submission or mail app. */
  var form = doc.getElementById('contact-form');
  if (form) {
    // GitHub Pages is a shared origin: never grant its origin direct API access.
    // The real form lives on the isolated Worker origin. No request occurs while gated off.
    if (form.dataset.backendEnabled === 'true' && form.dataset.backendUrl === 'https://heidelberg-contact.synoikon.workers.dev/contact') {
      var hosted = doc.createElement('iframe');
      hosted.id = 'hosted-contact';
      hosted.className = 'hosted-contact';
      hosted.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms');
      hosted.referrerPolicy = 'no-referrer';
      form.hidden = true;
      form.insertAdjacentElement('afterend', hosted);
    }
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      form.querySelector('.form-status').textContent = t('form.unavailable');
    });
  }

  applyLanguage(current);
})();
