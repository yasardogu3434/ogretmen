/* Erişilebilirlik katmanı (0.13.0): yalnız öznitelik (aria/role/tabindex) ekler.
   Görünümü ve uygulama mantığını değiştirmez. Sorun çıkarsa index.html'deki erisim.js satırını silmek yeterlidir. */
(function () {
  'use strict';
  var SEG = '.sg button,.ptabs button,.okseg button,.opts button,.thseg button,.chips button,.tabs button,.gvp button,.kf button';
  var TIK = '[data-dt],[data-go-tab],[data-ok],[data-n],[data-c],[data-go],[data-hafta]';
  var bekle = 0;
  function her(sel, fn) { var l = document.querySelectorAll(sel); for (var i = 0; i < l.length; i++) fn(l[i]); }
  function gecir() {
    bekle = 0;
    try {
      var nav = document.querySelector('nav'); if (nav && !nav.getAttribute('aria-label')) nav.setAttribute('aria-label', 'Ana menü');
      her('nav button', function (b) { if (b.classList.contains('on')) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
      her(SEG, function (b) { b.setAttribute('aria-pressed', b.classList.contains('on') ? 'true' : 'false'); });
      her('.hct .hd', function (d) { d.setAttribute('aria-hidden', 'true'); });
      her('svg:not([aria-hidden]):not([role]):not([aria-label])', function (s) { if (!s.closest('.dial')) { s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); } });
      her(TIK, function (el) {
        if (/^(BUTTON|A|INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || (window.SVGElement && el instanceof window.SVGElement)) return;
        if (el.getAttribute('role') || el.querySelector('button,a,input,select,textarea')) return;
        el.setAttribute('role', 'button'); el.setAttribute('tabindex', '0'); el.setAttribute('data-a11y', '1');
      });
      her('.okta thead th', function (h) { h.setAttribute('scope', 'col'); });
      her('.okta tbody th', function (h) { h.setAttribute('scope', 'row'); });
    } catch (e) { /* sessiz: uygulamayı asla etkilemez */ }
  }
  function planla() { if (!bekle) bekle = setTimeout(gecir, 150); }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = e.target; if (!t || !t.getAttribute || t.getAttribute('data-a11y') !== '1') return;
    e.preventDefault(); t.click();
  });
  function basla() {
    gecir();
    if (typeof MutationObserver === 'function') new MutationObserver(planla).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', basla); else basla();
})();
