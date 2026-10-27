// Başlarken kılavuzu — hem uygulamada (ilk açılış ve Ayarlar) hem de tek başına sayfada (kilavuz.html) kullanılır.
// Yalnız sabit metin içerir; dışarıdan veri almaz, ağ isteği yapmaz.
(function () {
  'use strict';
  var KLV = window.OGR_KLV = { istem: null };
  var UA = navigator.userAgent || '';

  KLV.ios = function () { return /iPhone|iPad|iPod/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); };
  KLV.android = function () { return /Android/i.test(UA); };
  KLV.anaEkran = function () { try { return window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); } catch (e) { return false; } };
  // Başka bir uygulamanın içinde açılmış gömülü tarayıcı (kurulum yapılamaz)
  KLV.gomulu = function () { return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Snapchat|Telegram|; wv\)/i.test(UA); };

  // Android Chrome kurulum isteğini tutar (varsa tek dokunuşla ekleme düğmesi gösterilir)
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); KLV.istem = e; var b = document.getElementById('klvKur'); if (b) b.hidden = false; });
  window.addEventListener('appinstalled', function () { KLV.istem = null; var b = document.getElementById('klvKur'); if (b) b.hidden = true; });

  var CSS = '.klv{--f:#13244A;--f2:#4A5A7C;--fs:rgba(19,36,74,.08);--fl:rgba(19,36,74,.22);--inv:#fff;color:var(--f);font-family:inherit;max-width:520px;margin:0 auto;width:100%;text-align:left}'
    + '@media(prefers-color-scheme:dark){:root:not([data-th=light]) .klv{--f:#fff;--f2:rgba(255,255,255,.74);--fs:rgba(255,255,255,.12);--fl:rgba(255,255,255,.3);--inv:#13244A}}'
    + ':root[data-th=dark] .klv{--f:#fff;--f2:rgba(255,255,255,.74);--fs:rgba(255,255,255,.12);--fl:rgba(255,255,255,.3);--inv:#13244A}'
    + '.klv img.kl{width:62px;height:62px;border-radius:16px;background:#fff;padding:8px;object-fit:contain;display:block;box-shadow:0 2px 8px rgba(19,36,74,.18)}'
    + '.klv h1{font-family:"Baloo 2",system-ui,sans-serif;font-size:28px;font-weight:600;margin:22px 0 0;letter-spacing:-.5px;line-height:1.12;color:var(--f);text-align:left}'
    + '.klv .alt{color:var(--f2);font-size:15px;line-height:1.5;margin:10px 0 0;text-align:left}'
    + '.klv .sk{display:flex;gap:8px;margin-top:20px}'
    + '.klv .sk button{flex:1;border:1.5px solid var(--fl);background:none;color:var(--f);font:inherit;font-size:15px;font-weight:650;padding:11px 0;border-radius:99px;cursor:pointer}'
    + '.klv .sk button.on{background:var(--f);color:var(--inv);border-color:var(--f)}'
    + '.klv ol{list-style:none;margin:18px 0 0;padding:0;counter-reset:s}'
    + '.klv li{counter-increment:s;position:relative;padding:0 0 18px 44px;font-size:16px;line-height:1.45;color:var(--f)}'
    + '.klv li:before{content:counter(s);position:absolute;left:0;top:-1px;width:30px;height:30px;border-radius:50%;background:#C8932B;color:#fff;font-weight:700;font-size:15px;display:grid;place-items:center}'
    + '.klv li:not(:last-child):after{content:"";position:absolute;left:14px;top:32px;bottom:2px;width:2px;background:var(--fl)}'
    + '.klv li small{display:block;color:var(--f2);font-size:13.5px;line-height:1.45;margin-top:4px}'
    + '.klv li b{font-weight:700}'
    + '.klv .ic{display:inline-flex;vertical-align:middle;align-items:center;justify-content:center;width:28px;height:28px;border-radius:8px;background:var(--fs);margin:0 2px}'
    + '.klv .ic svg{width:18px;height:18px;stroke:var(--f);fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}'
    + '.klv .kt{border-radius:14px;padding:13px 15px;font-size:14px;line-height:1.5;margin-top:6px;background:var(--fs);color:var(--f2);text-align:left}'
    + '.klv .kt b{color:var(--f)}'
    + '.klv .kt.u{background:#F6EBCB;color:#3b2c06}.klv .kt.u b{color:#3b2c06}'
    + '.klv .kt.g{background:rgba(47,133,121,.2)}'
    + '.klv .bt{display:block;width:100%;border:0;background:#C8932B;color:#fff;font:inherit;font-weight:700;font-size:16px;padding:14px;border-radius:14px;cursor:pointer;margin-top:16px}'
    + '.klv .bt.ik{background:var(--f);color:var(--inv)}'
    + '.klv .ln{display:block;width:100%;border:0;background:none;color:var(--f2);font:inherit;font-size:14.5px;padding:14px 0 4px;cursor:pointer;text-align:center}'
    + '.klv .bt[hidden]{display:none}';
  var IK = {
    nokta: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/></svg>',
    paylas: '<svg viewBox="0 0 24 24"><path d="M12 15V4M8.5 7.5L12 4l3.5 3.5"/><path d="M6.5 11H6a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 18 11h-.5"/></svg>',
    ekle: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3.5"/><path d="M12 8.5v7M8.5 12h7"/></svg>',
    pusula: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></svg>'
  };
  function ic(n) { return '<span class="ic" aria-hidden="true">' + IK[n] + '</span>'; }

  var ADIM = {
    android: [
      '<b>Chrome</b> ile aç.<small>Bağlantıyı WhatsApp ya da başka bir uygulamanın içinde açtıysan sağ üstteki ' + ic('nokta') + ' menüsünden “Chrome’da aç” de.</small>',
      'Chrome’un sağ üstündeki ' + ic('nokta') + ' menüsüne dokun.',
      '<b>Ana ekrana ekle</b> (ya da <b>Uygulamayı yükle</b>) seçeneğine dokun.',
      'Açılan pencerede <b>Ekle</b> (ya da <b>Yükle</b>) düğmesine bas.',
      'Ana ekranında <b>Y. Doğu Öğretmen</b> simgesi belirir. Bundan sonra uygulamayı oradan aç.<small>Kodlarını daha önce girdiysen genellikle yeniden istenmez. İstenirse aynı kodları yaz.</small>'
    ],
    ios: [
      '<b>Safari</b> ile aç.<small>WhatsApp ya da başka bir uygulamanın içinde açtıysan ekranın alt köşesindeki “Safari’de aç” ' + ic('pusula') + ' simgesine dokun.</small>',
      'Ekranın altındaki <b>Paylaş</b> ' + ic('paylas') + ' simgesine dokun.',
      'Listeyi yukarı kaydır ve <b>Ana Ekrana Ekle</b> ' + ic('ekle') + ' seçeneğine dokun.',
      'Sağ üstteki <b>Ekle</b> düğmesine bas.',
      'Ana ekranındaki <b>Y. Doğu Öğretmen</b> simgesine dokunarak uygulamayı aç.'
    ]
  };

  var stilEkli = false;
  function stilEkle() {
    if (stilEkli) return; stilEkli = true;
    var s = document.createElement('style'); s.id = 'klvcss'; s.textContent = CSS; document.head.appendChild(s);
  }
  function el(tag, cls, html) { var x = document.createElement(tag); if (cls) x.className = cls; if (html != null) x.innerHTML = html; return x; }

  // kap: kılavuzun çizileceği kap. o: { logo, birincil, atla, bitti, atlandi }
  KLV.ciz = function (kap, o) {
    o = o || {}; stilEkle();
    var plat = KLV.ios() ? 'ios' : 'android';
    var w = el('div', 'klv'); kap.textContent = ''; kap.appendChild(w);
    var im = el('img', 'kl'); im.src = o.logo || 'ikon/logo.png'; im.alt = ''; w.appendChild(im);
    w.appendChild(el('h1', '', 'Uygulamayı telefonuna ekle'));
    w.appendChild(el('p', 'alt', 'Bir kez yapman yeterli. Sonra ana ekrandaki simgeye dokunarak uygulamayı diğer uygulamalar gibi açarsın.'));
    if (KLV.anaEkran()) w.appendChild(el('div', 'kt g', '<b>Zaten ana ekran uygulamasını kullanıyorsun.</b> Bu kılavuz yalnızca bilgi içindir.'));
    else if (KLV.gomulu()) w.appendChild(el('div', 'kt u', '<b>Bu sayfa başka bir uygulamanın içinde açılmış.</b> Ana ekrana eklemek için sayfayı ' + (KLV.ios() ? 'Safari' : 'Chrome') + ' ile aç.'));
    var sk = el('div', 'sk'); w.appendChild(sk);
    var govde = el('div'); w.appendChild(govde);
    function goster(p) {
      plat = p; sk.textContent = '';
      [['android', 'Android'], ['ios', 'iPhone']].forEach(function (x) {
        var b = el('button', x[0] === p ? 'on' : ''); b.type = 'button'; b.textContent = x[1]; b.onclick = function () { goster(x[0]); }; sk.appendChild(b);
      });
      govde.textContent = '';
      if (p === 'android') {
        var kur = el('button', 'bt ik', 'Ana ekrana ekle'); kur.type = 'button'; kur.id = 'klvKur'; kur.hidden = !KLV.istem;
        kur.onclick = function () { var i = KLV.istem; if (!i) return; try { i.prompt(); i.userChoice.then(function () { KLV.istem = null; kur.hidden = true; }, function () {}); } catch (e) {} };
        govde.appendChild(kur);
      }
      var ol = el('ol'); ADIM[p].forEach(function (h) { ol.appendChild(el('li', '', h)); }); govde.appendChild(ol);
      if (p === 'ios') govde.appendChild(el('div', 'kt u', '<b>iPhone’da önemli:</b> Ana ekrandaki uygulama Safari’den ayrı çalışır. Okul kodunu ve kişisel kodunu <b>ana ekrandaki uygulamada</b> bir kez girmen gerekir. En rahatı, önce ana ekrana eklemek, kodları sonra oradan girmektir.'));
      else govde.appendChild(el('div', 'kt', 'Düğme ya da menüdeki seçenek telefonuna göre biraz farklı adlandırılmış olabilir; “Ana ekrana ekle” ya da “Uygulamayı yükle” ikisi de aynı işi yapar.'));
    }
    goster(plat);
    var bt = el('button', 'bt', o.birincil || 'Tamam'); bt.type = 'button'; bt.onclick = function () { if (o.bitti) o.bitti(); }; w.appendChild(bt);
    if (o.atla) { var at = el('button', 'ln', o.atla); at.type = 'button'; at.onclick = function () { if (o.atlandi) o.atlandi(); else if (o.bitti) o.bitti(); }; w.appendChild(at); }
  };
})();
