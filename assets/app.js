/* Heidelberg Stuff To Do – static preview. No third-party scripts, no network requests. */
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

  /* Contact: prepares an e-mail in the visitor's own mail program (mailto). Nothing is sent by this site. */
  var form = doc.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var status = form.querySelector('.form-status');
      var f = form.elements;
      var required = ['first', 'last', 'email', 'message'];
      var missing = required.filter(function (n) { return !String(f[n].value).trim(); });
      required.forEach(function (n) { f[n].setAttribute('aria-invalid', String(missing.indexOf(n) > -1)); });
      if (missing.length || (f.email.checkValidity && !f.email.checkValidity())) {
        status.textContent = t('form.error');
        (f[missing[0]] || f.email).focus();
        return;
      }
      var lines = [
        f.first.value.trim() + ' ' + f.last.value.trim(),
        f.email.value.trim(),
        f.phone.value.trim(),
        '',
        f.message.value.trim()
      ];
      var href = 'mailto:hdstufftodo@gmail.com?subject=' + encodeURIComponent(t('form.subject')) +
        '&body=' + encodeURIComponent(lines.join('\n'));
      status.textContent = t('form.opened');
      window.location.href = href;
    });
  }

  applyLanguage(current);
})();
