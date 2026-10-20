// Öğretmen Ekranı — tasarım sürümü (Adım 6). Salt-okunur: sunucuya yalnız GET ile okuma isteği gider.
// Dinamik içerik innerHTML'e yalnız esc() ile temizlenerek girer; bağlantılar yalnız https kabul edilir.
(function () {
  'use strict';
  var A = window.OGR_AYAR;
  var APP_SURUM = '0.9.0'; // bu dosyanın kendi sürümü; config.js'teki SURUM ile eşleşmezse eski dosya kalmıştır
  var K = { okul: 'ogr_okul', kod: 'ogr_kod', cihaz: 'ogr_cihaz', onb: 'ogr_onbellek', tema: 'ogr_tema', ac: 'ogr_ac', fs: 'ogr_fs', gizle: 'ogr_gizle', notlar: 'ogr_notlar', gorulen: 'ogr_gorulen', acilis: 'ogr_acilis', gun: 'ogr_gun', son: 'ogr_son', isl: 'ogr_islendi' };
  var MESAJ = {
    okul: 'Okul kodu hatalı. Tekrar dene.',
    kod: 'Kişisel kod hatalı. Tekrar dene.',
    bekle: 'Çok fazla yanlış deneme yapıldı. 10 dakika sonra tekrar dene.',
    ag: 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.',
    sunucu: 'Sunucu şu an yanıt vermiyor. Biraz sonra tekrar dene.',
    gecersiz: 'Kodun artık geçerli değil. Okuldan yeni kod iste.'
  };
  var GUN = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  var GKISA = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
  var AY = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  var AYK = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  var LOGO = 'ikon/logo.png';

  // ---- güvenli depolama
  var bellek = {};
  function oku(k) { try { var v = localStorage.getItem(k); return v === null ? (bellek[k] || null) : v; } catch (e) { return bellek[k] || null; } }
  function yaz(k, v) { bellek[k] = v; try { localStorage.setItem(k, v); } catch (e) {} }
  function sil(k) { delete bellek[k]; try { localStorage.removeItem(k); } catch (e) {} }
  function okuJ(k, vars) { try { var v = JSON.parse(oku(k) || 'null'); return v == null ? vars : v; } catch (e) { return vars; } }
  function cihazNo() {
    var c = oku(K.cihaz);
    if (c && /^[A-Za-z0-9_-]{8,40}$/.test(c)) return c;
    var h = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', s = '';
    try { var b = new Uint8Array(20); crypto.getRandomValues(b); for (var i = 0; i < 20; i++) s += h[b[i] % h.length]; }
    catch (e) { for (var j = 0; j < 20; j++) s += h[Math.floor(Math.random() * h.length)]; }
    yaz(K.cihaz, s); return s;
  }

  // ---- küçük yardımcılar
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function f2(n) { return ('0' + n).slice(-2); }
  function mdk(s) { var a = String(s).split(':'); return (+a[0]) * 60 + (+a[1]); }
  function saatOk(s) { return /^\d{2}:\d{2}$/.test(s || ''); }
  function iso(d) { return d.getFullYear() + '-' + f2(d.getMonth() + 1) + '-' + f2(d.getDate()); }
  function tarihCoz(s) { var a = String(s).split('-'); return new Date(+a[0], +a[1] - 1, +a[2]); }
  function gunEkle(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); return x; }
  function pazartesi(d) { var w = (d.getDay() + 6) % 7; return gunEkle(d, -w); }
  function gunAy(ds) { return ds ? (+ds.slice(8)) + ' ' + AY[+ds.slice(5, 7) - 1] : ''; }
  function gunAyK(ds) { return ds ? (+ds.slice(8)) + ' ' + AYK[+ds.slice(5, 7) - 1] : ''; }
  function aralik(a, b) { if (!a) return ''; if (!b || b === a) return gunAy(a); if (a.slice(5, 7) === b.slice(5, 7)) return (+a.slice(8)) + '–' + (+b.slice(8)) + ' ' + AY[+a.slice(5, 7) - 1]; return gunAy(a) + ' – ' + gunAy(b); }
  function saatStr(t) { var d = new Date(t); return f2(d.getHours()) + ':' + f2(d.getMinutes()); }
  function ilkAd(ad) { return String(ad || '').trim().split(/\s+/)[0] || ''; }
  function norm(s) { return String(s || '').trim().toLocaleLowerCase('tr-TR').replace(/\s+/g, ' '); }
  function simdi() { return new Date(); }
  function saniye() { var d = simdi(); return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds(); }
  function guvenliLink(u) {
    try { var x = new URL(String(u)); if (x.protocol === 'https:' && x.hostname) return { href: x.href, alan: x.hostname.replace(/^www\./, '') }; } catch (e) {}
    return null;
  }
  function metinVeLink(t) {
    var linkler = [], kalan = String(t || '').replace(/https:\/\/[^\s<>"']+/g, function (m) {
      if (linkler.length < 3) { var g = guvenliLink(m); if (g) { linkler.push(g); return ''; } }
      return m;
    });
    return { metin: kalan.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim(), linkler: linkler };
  }
  function linkHTML(g) { return '<a class="dl" href="' + esc(g.href) + '" target="_blank" rel="noopener noreferrer"><span>Bağlantıyı aç</span><small>' + esc(g.alan) + '</small></a>'; }

  // ---- ağ: yalnız GET, 15 sn zaman aşımı
  function cagri(p) {
    var q = Object.keys(p).map(function (k) { return k + '=' + encodeURIComponent(p[k]); }).join('&');
    var ac = typeof AbortController === 'function' ? new AbortController() : null;
    var t = setTimeout(function () { if (ac) ac.abort(); }, 15000);
    return fetch(A.UC + '?' + q, { signal: ac ? ac.signal : undefined, cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (j) { clearTimeout(t); return (j && typeof j === 'object') ? j : { ok: false, hata: 'sunucu' }; })
      .catch(function () { clearTimeout(t); return { ok: false, hata: 'ag' }; });
  }

  // ---- görünüm tercihleri
  var R = document.documentElement;
  function tercihUygula() {
    var t = oku(K.tema);
    if (t === 'acik') R.setAttribute('data-th', 'light'); else if (t === 'koyu') R.setAttribute('data-th', 'dark'); else R.removeAttribute('data-th');
    var ac = oku(K.ac); if (ac) R.setAttribute('data-ac', ac); else R.removeAttribute('data-ac');
    var fs = parseFloat(oku(K.fs) || '1'); if (!(fs >= 0.8 && fs <= 1.3)) fs = 1;
    var s = $('scr'); if (s) s.style.zoom = fs;
  }
  var GIZLE = okuJ(K.gizle, {});

  // ---- önbellek
  function onbellek() { var o = okuJ(K.onb, null); return (o && o.y) ? o : null; }
  function eskiMi(o) {
    if (!o) return true;
    var yas = Date.now() - o.t;
    return yas > A.ESKI_SAAT * 3600 * 1000 || yas < -5 * 60 * 1000;
  }

  // ================= VERİ MODELİ (yayından türetilir; panelden gelen ham veri güvenle ayıklanır) =================
  function Y() { var o = onbellek(); return o && o.y; }
  function ortak(y, id) { var o = y && y.ortak && y.ortak[id]; return (o && o.d && typeof o.d === 'object') ? o.d : null; }
  function kisisel(y, id) { var o = y && y.kisisel && y.kisisel[id]; return (o && o.d && typeof o.d === 'object') ? o.d : null; }
  function dersListe(l) {
    if (!Array.isArray(l)) return [];
    var out = [];
    for (var i = 0; i < l.length; i++) { var d = l[i]; if (!Array.isArray(d) || !saatOk(d[1]) || !saatOk(d[2]) || mdk(d[2]) <= mdk(d[1])) return []; out.push([String(d[0]), d[1], d[2]]); }
    return out;
  }
  function kapsar(t, ds) { return t && t.bas && t.bas <= ds && ds <= (t.bit || t.bas); }
  // tip: ders | hs (hafta sonu) | tatil | yok (ritim yayınlanmamış)
  function gunBilgi(y, d) {
    var ds = iso(d), wd = d.getDay() || 7, o = { ds: ds, wd: wd, tip: 'ders', ad: '', ders: [], yarim: false, gecici: '' };
    var r = ortak(y, 'ritim'), ders = r ? dersListe(r.ders) : [];
    if (!ders.length) { o.tip = 'yok'; return o; }
    var cal = (r.gunTipi && Array.isArray(r.gunTipi.calisma)) ? r.gunTipi.calisma : [1, 2, 3, 4, 5];
    if (cal.indexOf(wd) < 0) { o.tip = 'hs'; return o; }
    var th = ortak(y, 'tatil'), yarim = false;
    if (th && Array.isArray(th.liste)) th.liste.forEach(function (h) {
      if (!h || !kapsar(h, ds)) return;
      if (!h.yarim) { o.tip = 'tatil'; o.ad = String(h.ad || 'Tatil'); } else if (o.tip !== 'tatil') { yarim = true; o.ad = String(h.ad || ''); }
    });
    if (o.tip === 'tatil') return o;
    var gc = ortak(y, 'gecici');
    if (gc && Array.isArray(gc.liste)) for (var i = 0; i < gc.liste.length; i++) {
      var g = gc.liste[i], gd = g ? dersListe(g.ders) : [];
      if (g && Array.isArray(g.tarihler) && gd.length === ders.length && g.tarihler.some(function (t) { return kapsar(t, ds); })) { ders = gd; o.gecici = String(g.ad || 'Geçici düzen'); break; }
    }
    if (yarim) { var lim = (r.gunTipi && +r.gunTipi.yarimGunDers) || 3; ders = ders.slice(0, Math.min(ders.length, lim)); o.yarim = true; }
    o.ders = ders; return o;
  }
  function akisKur(ders) {
    var sc = [];
    for (var i = 0; i < ders.length; i++) {
      sc.push(['ders', (i + 1) + '. ders', ders[i][1], ders[i][2]]);
      if (i < ders.length - 1) {
        var gap = mdk(ders[i + 1][1]) - mdk(ders[i][2]);
        if (gap > 0) sc.push([gap >= 25 ? 'öğle' : 'teneffüs', gap >= 25 ? 'Öğle arası' : 'Teneffüs', ders[i][2], ders[i + 1][1]]);
      }
    }
    return sc;
  }
  function hucre(v) {
    if (v == null || v === '') return null;
    var s = String(v), i = s.indexOf(' ');
    return { sinif: i < 0 ? s : s.slice(0, i), ders: i < 0 ? '' : s.slice(i + 1) };
  }
  function programVar(y) { var p = kisisel(y, 'program'); return (p && p.matris && typeof p.matris === 'object') ? p : null; }
  function hucreAl(y, wd, no) { var p = programVar(y); if (!p) return null; var g = p.matris[String(wd)]; return g ? hucre(g[String(no)]) : null; }
  function doldurmaListe(y) { var d = kisisel(y, 'doldurma'); return (d && Array.isArray(d.liste)) ? d.liste.filter(function (x) { return x && /^\d{4}-\d{2}-\d{2}$/.test(x.tarih || ''); }) : []; }
  function nobetim(y) {
    var n = kisisel(y, 'nobetim'); if (!n) return { liste: [], gelecek: null };
    return { liste: Array.isArray(n.liste) ? n.liste.filter(function (x) { return x && +x.gun >= 1 && +x.gun <= 7 && x.yer; }) : [], gelecek: (n.gelecek && Array.isArray(n.gelecek.liste) && /^\d{4}-\d{2}-\d{2}$/.test(n.gelecek.bas || '')) ? n.gelecek : null };
  }
  function nobetYer(y, wd, ds) {
    var n = nobetim(y), liste = n.liste;
    if (n.gelecek && ds >= n.gelecek.bas) liste = n.gelecek.liste;
    for (var i = 0; i < liste.length; i++) if (+liste[i].gun === wd) return String(liste[i].yer);
    return '';
  }
  function yayinlandi(y, tur) { return !!ortak(y, 'slayt:' + tur); }
  function duyuruListe(y) {
    var bg = iso(simdi());
    var l = Array.isArray(y && y.duyurular) ? y.duyurular.filter(function (d) { return d && d.baslik && (!d.bitis || d.bitis >= bg); }) : [];
    return l.map(function (d, i) { return { d: d, i: i }; }).sort(function (a, b) {
      var x = a.d.tarih || '9999', z = b.d.tarih || '9999'; return x < z ? -1 : (x > z ? 1 : a.i - b.i);
    }).map(function (o) { return o.d; });
  }
  function haberListe(y) {
    var p = ortak(y, 'pano'), bg = iso(simdi());
    return (p && Array.isArray(p.haberler)) ? p.haberler.filter(function (h) { return h && h.baslik && (!h.bitis || h.bitis >= bg); }) : [];
  }
  function baglantiListe(y) {
    var p = ortak(y, 'pano'), out = [];
    if (p && Array.isArray(p.baglantilar)) p.baglantilar.forEach(function (b) { var g = b && guvenliLink(b.url); if (g && b.ad) out.push({ ad: String(b.ad), g: g }); });
    return out;
  }
  // ---- görülmemiş (yeni) işareti
  var GORULEN = okuJ(K.gorulen, {});
  function yeniMi(anahtar) { return !GORULEN[anahtar]; }
  function gorulduYaz(anahtarlar) { var d = false; anahtarlar.forEach(function (a) { if (!GORULEN[a]) { GORULEN[a] = 1; d = true; } }); if (d) { var k = Object.keys(GORULEN); if (k.length > 200) k.slice(0, k.length - 200).forEach(function (x) { delete GORULEN[x]; }); yaz(K.gorulen, JSON.stringify(GORULEN)); } }

  // ================= EKRAN DURUMU =================
  var TAB = 0, PS = 0, WK = 0, CAT = 'Tümü';
  var kilit = null, durum = { yenileniyor: false, ag: 'ok' }, sonYenileme = 0;

  function baglam() {
    var y = Y(), d = simdi(), gb = y ? gunBilgi(y, d) : { tip: 'yok', ders: [], ds: iso(d), wd: d.getDay() || 7 };
    var C = { y: y, d: d, gb: gb, sc: akisKur(gb.ders || []), T: saniye(), MY: {}, COV: {}, ben: norm(y && y.kisi && y.kisi.ad) };
    if (y && gb.tip === 'ders') {
      gb.ders.forEach(function (x, i) { var h = hucreAl(y, gb.wd, i + 1); if (h) C.MY[i + 1] = h; });
      doldurmaListe(y).forEach(function (x) { if (x.tarih === gb.ds) C.COV[+x.saat] = x; });
    }
    C.A0 = C.sc.length ? mdk(C.sc[0][2]) * 60 : 0; C.Z0 = C.sc.length ? mdk(C.sc[C.sc.length - 1][3]) * 60 : 0;
    return C;
  }
  var TICKS = (function () { var t = ''; for (var i = 0; i < 60; i++) { var a = i * Math.PI / 30, r1 = i % 5 ? 86 : 84.5, r2 = 88.5, c = Math.cos(a), sn = Math.sin(a); t += '<line class="tk' + (i % 5 ? '' : ' l') + '" x1="' + (90 + r1 * c).toFixed(2) + '" y1="' + (90 + r1 * sn).toFixed(2) + '" x2="' + (90 + r2 * c).toFixed(2) + '" y2="' + (90 + r2 * sn).toFixed(2) + '"/>'; } return t; })();
  function dersNo(r) { return parseInt(r[1], 10) || 0; }
  function sonrakiOkul(C) {
    for (var i = 1; i <= 14; i++) {
      var d = gunEkle(C.d, i), g = gunBilgi(C.y, d);
      if (g.tip === 'ders' && g.ders.length) return { n: i, d: d, gb: g, ilk: g.ders[0][1], etiket: i === 1 ? 'Yarın' : GUN[d.getDay()] };
    }
    return null;
  }
  function sureTxt(sn) { return sn >= 3600 ? Math.floor(sn / 3600) + ' sa ' + Math.floor(sn % 3600 / 60) + ' dk' : Math.ceil(sn / 60) + ' dk'; }
  function guncel(C) { for (var i = 0; i < C.sc.length; i++) { var s = mdk(C.sc[i][2]) * 60, e = mdk(C.sc[i][3]) * 60; if (C.T >= s && C.T < e) return [C.sc[i], C.sc[i + 1], i]; } return [null, null, -1]; }

  // eğitim-öğretim haftası rozeti: yalnız yayında hafta tablosu varsa görünür (ortak 'egitimhaftasi' {liste:[{n,bas,bit}]})
  function egitimHaftasi(C) {
    var o = ortak(C.y, 'egitimhaftasi'), ds = iso(C.d);
    if (!o || !Array.isArray(o.liste)) o = (KZ.idx && Array.isArray(KZ.idx.hafta)) ? { liste: KZ.idx.hafta } : null;
    if (!o) return 0;
    for (var i = 0; i < o.liste.length; i++) { var h = o.liste[i]; if (h && ISODT.test(h.bas || '') && ISODT.test(h.bit || '') && h.bas <= ds && ds <= h.bit && +h.n > 0) return +h.n; }
    return 0;
  }
  var TEMA_IK = {
    oto: '<path d="M12 3a9 9 0 1 0 0 18z"/><circle cx="12" cy="12" r="9"/>',
    acik: '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    koyu: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'
  };
  var TEMA_AD = { oto: 'Otomatik', acik: 'Açık', koyu: 'Koyu' };
  function temaDegis() {
    var t = oku(K.tema) || 'oto', n = t === 'oto' ? 'acik' : (t === 'acik' ? 'koyu' : 'oto');
    if (n === 'oto') sil(K.tema); else yaz(K.tema, n);
    tercihUygula();
    var b = $('tb'); if (b) { b.innerHTML = '<svg viewBox="0 0 24 24">' + TEMA_IK[n] + '</svg>'; b.setAttribute('aria-label', 'Tema: ' + TEMA_AD[n] + ' (değiştirmek için dokun)'); }
  }
  function logoBar(C, alt) {
    var d = C.d, ad = (C.y && C.y.kisi && C.y.kisi.ad) || '', okul = (C.y && C.y.okul) || 'Yaşar Doğu Öğretmen', th = oku(K.tema) || 'oto', hf = egitimHaftasi(C);
    return '<div class="bar"><button class="who0" id="ob" type="button" aria-label="Görünüm ve hesap"><span class="lg"><img src="' + LOGO + '" alt=""></span><span class="nm"><b>' + esc(ad || okul) + '</b><span>' + esc(ad ? okul : alt) + '</span></span></button>'
      + '<div class="r"><div class="dtx"><b class="d">' + GKISA[d.getDay()] + '</b>' + d.getDate() + ' ' + AY[d.getMonth()] + (hf ? '<em class="hf">' + hf + '. hafta</em>' : '') + '</div>'
      + '<button class="ib" id="tb" type="button" aria-label="Tema: ' + TEMA_AD[th] + ' (değiştirmek için dokun)"><svg viewBox="0 0 24 24">' + TEMA_IK[th] + '</svg></button></div></div>';
  }
  function cetvel(C, mine) {
    if (!C.sc.length) return '';
    var A0 = C.A0, Z0 = C.Z0, span = Z0 - A0, h = '<div class="rule" data-lv="c">';
    C.sc.forEach(function (r) {
      if (r[0] !== 'ders') return;
      var s = mdk(r[2]) * 60, e = mdk(r[3]) * 60, l = (s - A0) / span * 100, w = (e - s) / span * 100;
      h += '<i class="' + (C.T >= e ? 'p ' : '') + (C.T >= s && C.T < e ? 'n ' : '') + (mine && (C.MY[dersNo(r)] || C.COV[dersNo(r)]) ? 'm' : '') + '" style="left:' + l.toFixed(2) + '%;width:' + w.toFixed(2) + '%' + (C.T >= s && C.T < e ? ';background:linear-gradient(90deg,var(--gold) ' + ((C.T - s) / (e - s) * 100).toFixed(1) + '%,rgba(200,147,43,.38) 0)' : '') + '"></i>';
    });
    for (var x = Math.ceil(A0 / 3600); x <= Math.floor(Z0 / 3600); x++) {
      var l2 = (x * 3600 - A0) / span * 100; if (l2 < 3 || l2 > 97) continue;
      h += '<u style="left:' + l2.toFixed(2) + '%"></u><s style="left:' + l2.toFixed(2) + '%">' + f2(x) + '</s>';
    }
    var fr = Math.min(1, Math.max(0, (C.T - A0) / span));
    return h + '<em style="left:' + (fr * 100).toFixed(2) + '%" data-t="' + f2(Math.floor(C.T / 3600)) + ':' + f2(Math.floor(C.T % 3600 / 60)) + '"></em></div>';
  }
  function gokyuzuHTML(C, ctx) {
    if (C.y && yayinlandi(C.y, 'gokyuzu')) { window.SKCTX = ctx; return '<div class="skyc" id="skyc">' + skSkeleton() + '</div>'; }
    return '<div class="hero2"><div class="t">' + esc(ctx) + '</div></div>';
  }
  function heroEski(C, mine) {
    var gb = C.gb;
    if (!C.y || gb.tip === 'yok') return gokyuzuHTML(C, 'Ders saatleri henüz yayınlanmadı');
    var nx = sonrakiOkul(C);
    if (gb.tip === 'hs') return gokyuzuHTML(C, nx ? 'Okullar ' + (nx.etiket === 'Yarın' ? 'yarın' : nx.etiket) + ' ' + nx.ilk + '\'da açılıyor' : 'Hafta sonu');
    if (gb.tip === 'tatil') return gokyuzuHTML(C, 'Bugün okul tatil' + (gb.ad ? ': ' + gb.ad : '') + (nx ? '. Dersler ' + nx.etiket.toLowerCase() + ' ' + nx.ilk + '\'da başlıyor' : ''));
    var g = guncel(C), c = g[0], n = g[1];
    if (!c) {
      if (C.T < C.A0) { var dk = C.A0 - C.T; return gokyuzuHTML(C, 'İlk ders ' + gb.ders[0][1] + '\'da, ' + sureTxt(dk) + ' sonra'); }
      return gokyuzuHTML(C, 'Gün tamamlandı.' + (nx ? ' ' + nx.etiket + ' ilk ders ' + nx.ilk + '\'da' : ''));
    }
    var e = mdk(c[3]) * 60, s0 = mdk(c[2]) * 60, left = e - C.T, les = c[0] === 'ders', fr = Math.min(1, Math.max(0, left / (e - s0))), Cc = 2 * Math.PI * 78;
    var kalan = f2(Math.floor(left / 60)) + ':' + f2(left % 60);
    var sinif = les && mine && C.MY[dersNo(c)] ? '<div class="nx" style="margin-top:4px">Sınıfın: ' + esc(C.MY[dersNo(c)].sinif) + '</div>' : '';
    return '<div class="hr"><div class="ring' + (les ? '' : ' br') + '" data-lv="r"><svg viewBox="0 0 180 180" aria-hidden="true">' + TICKS + '<circle class="tr" cx="90" cy="90" r="78"/><circle class="pg' + (les && left <= 300 ? ' son' : '') + '" cx="90" cy="90" r="78" stroke-dasharray="' + Cc.toFixed(1) + '" stroke-dashoffset="' + (Cc * (1 - fr)).toFixed(1) + '"/></svg><div class="rc"><b class="d">' + kalan.slice(0, -1) + '<span class="sd">' + kalan.slice(-1) + '</span></b><span>kalan süre</span></div></div><div class="hs"><div class="ey' + (les ? '' : ' br') + '">' + esc(c[1]) + '</div><div class="cap">' + (les ? 'ders bitimine' : (c[0] === 'öğle' ? 'öğle arasının bitimine' : 'teneffüsün bitimine')) + ' kadar</div>' + (n ? '<div class="nx">Sonra ' + esc(n[1].toLowerCase()) + ', ' + n[2] + '</div>' : '<div class="nx">Günün son dersi</div>') + sinif + '</div></div>' + cetvel(C, mine);
  }
  // ---- Üst alan: panel düzeni. Ders/teneffüste geri sayım, ders dışında slayt; düğmeyle geçiş
  var HI = 0, HX = true, HSON = 0, HLAST = 0, HFX = false, HO = null, SLAYT_MS = 10000, GERI_MS = 300000;
  var IK_ONC = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>', IK_SON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  var IK_DUR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>', IK_OYN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l12-7.5z" style="fill:currentColor"/></svg>';
  var IK_SAYAC = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 1.5M9.5 2.5h5"/></svg>', IK_SLAYT = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="12" rx="2.5"/><path d="M8 21h8"/></svg>';
  function dersAnimi(C) { return C.gb.tip === 'ders' && !!guncel(C)[0]; }
  function heroKip(C, mine) {
    if (mine) return 'sayac';
    if (!dersAnimi(C)) { HO = null; return 'slayt'; }
    if (HO === true && Date.now() - HSON > GERI_MS) HO = null;
    return HO === true ? 'slayt' : 'sayac';
  }
  var ONE_RENK = { 'Yarına bakış': '#79D1C3', 'Ders başlamadan': '#79D1C3', 'Gün tamamlandı': '#79D1C3', 'Hafta sonu': '#79D1C3', 'Bugün okul tatil': '#79D1C3', 'Belirli gün': '#B5A3FF', 'Nöbet düzeni': 'var(--gold)', 'Okuldan': 'var(--gold)', 'Duyuru': 'var(--gold)', 'Etkinlik': '#B5A3FF', 'Hatırlatma': '#79D1C3' };
  var IKN = {
    'Okuldan': '<path d="M4 10v4h3l5 4V6L7 10H4zM16 9.5a3.5 3.5 0 010 5M18.5 7a7 7 0 010 10"/>',
    'Etkinlik': '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
    'Hatırlatma': '<path d="M6 16.5V11a6 6 0 0112 0v5.5l1.5 1.5h-15zM10 20.5a2 2 0 004 0"/>',
    'Yarına bakış': '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7M12.5 8.5l3.5 3.5-3.5 3.5"/>',
    'Belirli gün': '<path d="M6 21V4M6 5h11l-2 4 2 4H6"/>',
    'Nöbet düzeni': '<path d="M4 9a6 6 0 016-5h7M17 4l-2.5-2M17 4l-2.5 2.5M20 15a6 6 0 01-6 5H7M7 20l2.5 2M7 20l2.5-2.5"/>',
    'Gün tamamlandı': '<path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/>',
    'Ders başlamadan': '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 1.5M9.5 2.5h5"/>',
    'Hafta sonu': '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    'Bugün okul tatil': '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    'Ders saatleri': '<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 1.5M9.5 2.5h5"/>'
  };
  function oneKart(p, git) {
    return '<div class="hsl" style="--c:' + (ONE_RENK[p.k] || 'var(--gold)') + '"><div class="hrow"><span class="hic"><svg viewBox="0 0 24 24" aria-hidden="true">' + (IKN[p.k] || IKN['Okuldan']) + '</svg></span><span class="ey2">' + esc(p.k) + '</span>' + (git ? '<span class="hcnt"></span>' : '') + '</div><div class="d ttl">' + esc(p.t) + '</div>' + (p.s ? '<div class="cap">' + esc(p.s) + '</div>' : '') + (git ? '<span class="go" aria-hidden="true">' + IK_SON + '</span>' : '') + '</div>';
  }
  function durumKarti(C, mine) {
    var gb = C.gb, y = C.y;
    if (!y || gb.tip === 'yok') return oneKart({ k: 'Ders saatleri', t: 'Henüz yayınlanmadı', s: 'Okul yönetimi paylaştığında burada görünür.' });
    var nx = sonrakiOkul(C), ey, cap;
    if (gb.tip === 'ders' && C.T < C.A0) { ey = 'Ders başlamadan'; cap = 'İlk ders ' + gb.ders[0][1] + '\'da'; }
    else {
      ey = gb.tip === 'hs' ? 'Hafta sonu' : (gb.tip === 'tatil' ? 'Bugün okul tatil' : 'Gün tamamlandı');
      cap = nx ? (nx.etiket === 'Yarın' ? 'Yarın' : nx.etiket) + ' ilk ders ' + nx.ilk + '\'da' : '';
    }
    var sayi = 0, planli = !!programVar(y), alt = '';
    if (nx) { nx.gb.ders.forEach(function (x, i) { if (!mine || !planli || hucreAl(y, nx.gb.wd, i + 1)) sayi++; }); alt = (nx.etiket === 'Yarın' ? 'Yarın' : nx.etiket) + ', ' + sayi + (mine && planli ? ' dersin var' : ' ders var'); }
    if (gb.tip === 'tatil' && gb.ad) alt = gb.ad + (alt ? '. ' + alt : '');
    return oneKart({ k: ey, t: cap || ey, s: alt });
  }
  function duyuruKart(d, C) {
    var z = d.tarih ? (d.tarih === C.gb.ds ? 'Bugün' : gunAyK(d.tarih)) : ''; if (saatOk(d.saat)) z += (z ? ', ' : '') + d.saat;
    var par = metinVeLink(String(d.metin || '')), ad = { etkinlik: 'Etkinlik', hatirlatma: 'Hatırlatma' }[d.tur] || 'Okuldan';
    return oneKart({ k: ad, t: d.baslik, s: [z, par.metin.replace(/\s+/g, ' ').slice(0, 90)].filter(Boolean).join(' · ') }, true);
  }
  function heroSlaytlar(C) {
    var y = C.y, s = [], akt = dersAnimi(C);
    if (yayinlandi(y, 'gokyuzu')) s.push({ id: 'gokyuzu' });
    if (!akt) s.push({ id: 'durum', h: durumKarti(C, 0) });
    duyuruListe(y).slice(0, 8).forEach(function (d, i) { s.push({ id: 'd' + i, h: duyuruKart(d, C), dt: 'du:' + i }); });
    if (!GIZLE.pano) oneCikanlar(C).forEach(function (p, i) { s.push({ id: 'o' + i, h: oneKart(p, true), dt: p.dt }); });
    if (!s.length) s.push({ id: 'durum', h: durumKarti(C, 0) });
    return s;
  }
  function hero(C, mine) {
    var kip = heroKip(C, mine), akt = dersAnimi(C), h;
    if (kip === 'sayac') {
      h = '<div class="hcar"><div class="sl one">' + (akt ? heroEski(C, mine) : durumKarti(C, mine)) + '</div>';
      if (!mine && akt) h += '<div class="hct"><span class="hsp"></span><button type="button" class="pill" data-hc="t" aria-label="Slaytları göster">' + IK_SLAYT + '<span>Slayt</span></button></div>';
      return h + '</div>';
    }
    var s = heroSlaytlar(C), n = s.length; if (HI >= n) HI = 0;
    var cur = s[HI], body = cur.h, fx = HFX; HFX = false;
    if (body && cur.id !== 'gokyuzu') body = body.replace('<span class="hcnt"></span>', '<span class="hcnt">' + (HI + 1) + ' / ' + n + '</span>');
    if (cur.id === 'gokyuzu') { window.SKCTX = ''; body = '<div class="skyc" id="skyc">' + skSkeleton() + '</div>'; }
    h = '<div class="hcar"><div class="sl' + (n === 1 ? ' one' : '') + (fx ? ' fx' : '') + '"' + (cur.dt ? ' data-dt="' + esc(cur.dt) + '"' : '') + '>' + body + '</div>';
    if (n > 1 || akt) {
      h += '<div class="hct">';
      if (n > 1) {
        h += '<button type="button" class="hb" data-hc="p" aria-label="Önceki">' + IK_ONC + '</button><div class="hd">';
        for (var i = 0; i < n; i++) h += '<i data-hc="g" data-i="' + i + '"' + (i === HI ? ' class="on"' : '') + '></i>';
        h += '</div><button type="button" class="hb" data-hc="n" aria-label="Sonraki">' + IK_SON + '</button><button type="button" class="hb hx" data-hc="x" aria-label="' + (HX ? 'Durdur' : 'Oynat') + '">' + (HX ? IK_DUR : IK_OYN) + '</button>';
      } else h += '<span class="hsp"></span>';
      if (akt) h += '<button type="button" class="pill ik" data-hc="t" aria-label="Geri sayıma dön">' + IK_SAYAC + '<span>Sayaç</span></button>';
      h += '</div>';
    }
    return h + '</div>';
  }
  function heroGit(j) {
    var s = heroSlaytlar(CTX || baglam()), n = s.length; if (n < 2) return;
    HI = ((j % n) + n) % n; HFX = true; HSON = Date.now(); HLAST = HSON; tick(true);
  }
  function secH(t, s) { return '<h2>' + esc(t) + (s ? '<span>' + esc(s) + '</span>' : '') + '</h2>'; }

  // ---- Bugün sekmesi bölümleri
  function oneCikanlar(C) {
    var y = C.y, out = [], bg = C.gb.ds, planli = !!programVar(y);
    if (yayinlandi(y, 'yarin')) {
      var yr = gunEkle(C.d, 1), g1 = gunBilgi(y, yr), t = '', s = '';
      if (g1.tip === 'ders') {
        var sayi = g1.ders.length, benim = 0;
        if (planli) g1.ders.forEach(function (x, i) { if (hucreAl(y, g1.wd, i + 1)) benim++; });
        t = GUN[yr.getDay()] + ' günü ' + (planli ? benim + ' dersin var' : sayi + ' ders var') + (g1.yarim ? ', yarım gün' : '') + '.';
        var pr = []; if (g1.gecici) pr.push('Geçici ders saatleri uygulanacak.'); var yer = nobetYer(y, g1.wd, iso(yr)); if (yer) pr.push('Nöbetin: ' + yer + '.');
        s = pr.join(' ');
      } else if (g1.tip === 'tatil') { t = GUN[yr.getDay()] + ' günü okul tatil.'; s = g1.ad; }
      else if (g1.tip === 'hs') { var nx = sonrakiOkul(C); t = nx ? 'Okullar ' + nx.etiket + ' açılıyor.' : 'Yarın hafta sonu.'; s = nx ? 'İlk ders ' + nx.ilk + '.' : ''; }
      if (t) out.push({ k: 'Yarına bakış', t: t, s: s, c: 'var(--teal)', dt: 'gun:' + iso(yr) });
    }
    var bgun = ortak(y, 'slayt:belirliGun');
    if (bgun && Array.isArray(bgun.satirlar)) {
      var son = iso(gunEkle(C.d, 7)), b = null;
      bgun.satirlar.forEach(function (x) { if (!b && x && x.ad && x.bit >= bg && x.bas <= son) b = x; });
      if (b) out.push({ k: 'Belirli gün', t: String(b.ad), s: aralik(b.bas, b.bit) + (b.bas <= bg ? ', şu an' : ''), c: '#7F62E0', dt: 'bg' });
    }
    var rh = ortak(y, 'slayt:rotasyonHatirlatma');
    if (rh && /^\d{4}-\d{2}-\d{2}$/.test(rh.tarih || '')) {
      var kalan = Math.round((tarihCoz(rh.tarih) - tarihCoz(bg)) / 86400000);
      if (kalan >= 0 && kalan <= 7) {
        var nb = nobetim(y), ek = '';
        if (nb.gelecek && nb.gelecek.liste.length) ek = ' Yeni yerin: ' + nb.gelecek.liste.map(function (x) { return GUN[(+x.gun) % 7] + ' ' + x.yer; }).join(', ') + '.';
        out.push({ k: 'Nöbet düzeni', t: 'Nöbet yerleri ' + gunAy(rh.tarih) + ' tarihinde değişiyor', s: ek.trim(), c: 'var(--gold)', dt: 'nbd' });
      }
    }
    return out;
  }
  function sOne(C) {
    var l = oneCikanlar(C); if (!l.length) return '';
    return '<div class="sec" data-k="pano">' + secH('Öne çıkanlar') + '<div class="pano" id="pano">' + l.map(function (p) { return '<div class="ps" style="--c:' + p.c + '"><p>' + esc(p.k) + '</p><div>' + esc(p.t) + '</div>' + (p.s ? '<span>' + esc(p.s) + '</span>' : '') + '</div>'; }).join('') + '</div>' + (l.length > 1 ? '<div class="seg" id="seg">' + l.map(function (_, i) { return '<i' + (i ? '' : ' class="on"') + '></i>'; }).join('') + '</div>' : '') + '</div>';
  }
  function duyuruAnahtar(d) { return 'd:' + d.baslik + '|' + (d.tarih || ''); }
  var NIK = { Etkinlik: IKN['Etkinlik'], 'Hatırlatma': IKN['Hatırlatma'], Okuldan: IKN['Okuldan'] };
  function sDuyuru(C) {
    var l = duyuruListe(C.y); if (!l.length) return '';
    var bg = C.gb.ds, yeni = l.filter(function (d) { return yeniMi(duyuruAnahtar(d)); }).length;
    return '<div class="sec" data-k="notes">' + secH('Okulda neler var', yeni ? yeni + ' yeni' : '') + '<div class="nws">' + l.map(function (d, di) {
      var par = metinVeLink(String(d.metin || '')), z = d.tarih === bg ? 'Bugün' : (d.tarih ? gunAyK(d.tarih) : '');
      if (saatOk(d.saat)) z += (z ? ', ' : '') + d.saat;
      var ad = { etkinlik: 'Etkinlik', hatirlatma: 'Hatırlatma' }[d.tur] || 'Okuldan', c = ONE_RENK[ad === 'Okuldan' ? 'Duyuru' : ad];
      return '<div class="nc" style="--c:' + c + '" data-dt="du:' + di + '"><span class="hic"><svg viewBox="0 0 24 24" aria-hidden="true">' + NIK[ad] + '</svg></span><div class="a"><b>' + esc(d.baslik) + (yeniMi(duyuruAnahtar(d)) ? '<i class="dot"></i>' : '') + '</b>' + (par.metin ? '<span class="s">' + esc(par.metin) + '</span>' : '') + par.linkler.map(linkHTML).join('') + '</div><span class="z">' + esc(z) + '</span></div>';
    }).join('') + '</div></div>';
  }
  function sAkis(C, mine) {
    if (C.gb.tip !== 'ders' || !C.sc.length) return '';
    var nBen = 0, nCov = 0, yer = mine ? nobetYer(C.y, C.gb.wd, C.gb.ds) : '';
    C.gb.ders.forEach(function (x, i) { if (C.MY[i + 1]) nBen++; if (C.COV[i + 1]) nCov++; });
    var alt = mine ? (nBen + ' ders' + (nCov ? ', ' + nCov + ' doldurma' : '') + (yer ? ', nöbet' : '')) : (C.gb.ders.length + ' ders');
    var h = '';
    if (mine && yer) h += '<div class="sec" data-k="nobet"><div class="rot" data-dt="nbd"><p>Nöbet yerin</p><div class="d" style="font-size:20px;font-weight:600;margin-top:6px;letter-spacing:-.3px">' + esc(yer) + '</div></div></div>';
    h += '<div class="sec" data-k="akis">' + secH(mine ? 'Bugünkü programın' : 'Gün akışı', alt) + '<div class="flow"><div class="rail"><i></i></div><div class="cur"></div>';
    C.sc.forEach(function (r, ri) {
      var les = r[0] === 'ders', no = dersNo(r), my = mine && les && C.MY[no], cv = mine && les && C.COV[no];
      if (!les && mine) return;
      var etiket = les ? r[1] : r[1] + ', ' + (mdk(r[3]) - mdk(r[2])) + ' dk';
      var sag = '';
      if (my) sag = '<span class="c2">' + esc(my.sinif) + (my.ders ? ' · ' + esc(my.ders) : '') + '</span>';
      else if (cv) sag = '<span class="c2">' + esc(cv.sinif || '') + '</span>';
      else if (mine && les) sag = '<span class="c2">Boş</span>';
      h += '<div class="fr ' + (les ? 'l' : 'k') + ((my || cv) ? ' my' : '') + (mine && les && !my && !cv ? ' dim' : '') + '" data-s="' + mdk(r[2]) * 60 + '" data-e="' + mdk(r[3]) * 60 + '" data-dt="ak:' + C.gb.ds + ':' + ri + '"><span class="tm">' + r[2] + '</span><b>' + esc(etiket) + '</b>' + sag + (cv ? '<span class="nb">Ders doldurma</span>' : '') + '</div>';
    });
    return h + '</div></div>';
  }
  function sNobetci(C) {
    var nb = ortak(C.y, 'nobetciler');
    if (!nb || nb.tarih !== C.gb.ds || !Array.isArray(nb.liste) || !nb.liste.length || C.gb.tip !== 'ders') return '';
    return '<div class="sec" data-k="nobet">' + secH('Bugün nöbetçi', nb.liste.length + ' kişi') + '<div class="rows">' + nb.liste.map(function (k, ki) {
      return '<div class="rw' + (C.ben && norm(k.ad) === C.ben ? ' me' : '') + '" data-dt="nb:' + ki + '"><div class="a"><b>' + esc(k.ad) + '</b></div><span class="z">' + esc(k.yer || '') + '</span></div>';
    }).join('') + '</div></div>';
  }
  function haberAnahtar(h) { return 'h:' + h.baslik + '|' + (h.kat || ''); }
  function sPanoOzet(C) {
    var l = haberListe(C.y); if (!l.length) return '';
    var yeni = l.filter(function (h) { return yeniMi(haberAnahtar(h)); }).length;
    return '<div class="sec" data-k="board">' + secH('Panoda yeni', yeni ? yeni + ' yeni' : '') + '<div class="rows">' + l.slice(0, 2).map(function (h) {
      var g = h.url ? guvenliLink(h.url) : null;
      return '<div class="rw" data-go-tab="3"><div class="a"><b>' + esc(h.baslik) + (yeniMi(haberAnahtar(h)) ? '<i class="dot"></i>' : '') + '</b><span class="s">' + esc(h.kat || 'Bilgi') + (g ? ', ' + esc(g.alan) : '') + '</span></div><span class="z">' + (h.bitis ? esc(gunAyK(h.bitis)) : '') + '</span></div>';
    }).join('') + '</div><button class="lk" type="button" data-go-tab="3">Panoyu aç</button></div>';
  }
  function damga(C) {
    var o = onbellek(), yazi = 'Henüz güncellenmedi';
    if (o) yazi = (durum.ag === 'cevrimdisi' ? 'Çevrimdışı, son bilgi ' : (durum.ag === 'bekle' ? 'Çok sık yenilendi, son bilgi ' : 'Güncellendi ')) + saatStr(o.t);
    if (durum.yenileniyor) yazi = 'Yenileniyor…';
    return '<div class="stamp' + (durum.ag !== 'ok' ? ' off' : '') + '"><i></i><span>' + esc(yazi) + '</span><button type="button" id="yn">Yenile</button></div>';
  }

  // ---- Takvim modeli: tüm kayıtlar tek listede (sınav, etkinlik, tatil, özel gün)
  var GV = null, YK = 0, CV = 0, MO = 0, KF = 'Tümü';
  var KAT = { sinav: ['Sınav', '#7F62E0'], etkinlik: ['Etkinlik', '#D9972B'], tatil: ['Tatil', '#D8584A'], ozel: ['Özel gün', '#2BA899'], nobet: ['Nöbetim', '#3D8FE0'] };
  var KFM = { 'Sınav': 'sinav', 'Etkinlik': 'etkinlik', 'Tatil': 'tatil', 'Özel gün': 'ozel', 'Nöbetim': 'nobet' };
  var ISODT = /^\d{4}-\d{2}-\d{2}$/;
  function olaylar(y) {
    var out = [], sn = ortak(y, 'sinavlar');
    if (sn && Array.isArray(sn.liste)) sn.liste.forEach(function (x) { if (x && x.ad && ISODT.test(x.tarih || '')) out.push({ bas: x.tarih, bit: x.tarih, k: 'sinav', ad: String(x.ad), alt: [saatOk(x.saat) ? x.saat : '', x.sinif || '', x.ders || ''].filter(Boolean).join(' · '), x: x }); });
    if (sn && Array.isArray(sn.haftalar)) sn.haftalar.forEach(function (x) { if (x && x.ad && ISODT.test(x.bas || '') && ISODT.test(x.bit || '') && x.bit >= x.bas) out.push({ bas: x.bas, bit: x.bit, k: 'sinav', hafta: true, ad: String(x.ad), alt: 'Sınav haftası · ' + aralik(x.bas, x.bit) }); });
    var th = ortak(y, 'tatil'); if (th && Array.isArray(th.liste)) th.liste.forEach(function (h) { if (h && ISODT.test(h.bas || '')) out.push({ bas: h.bas, bit: h.bit || h.bas, k: 'tatil', ad: String(h.ad || 'Tatil'), alt: h.yarim ? 'Yarım gün' : 'Okul kapalı' }); });
    var gc = ortak(y, 'gecici'); if (gc && Array.isArray(gc.liste)) gc.liste.forEach(function (g) { (g.tarihler || []).forEach(function (t) { if (t && ISODT.test(t.bas || '')) out.push({ bas: t.bas, bit: t.bit || t.bas, k: /sınav/i.test(g.ad || '') ? 'sinav' : 'ozel', ad: String(g.ad || 'Geçici düzen'), alt: 'Kısa ders saatleri' }); }); });
    var bg = ortak(y, 'slayt:belirliGun'); if (bg && Array.isArray(bg.satirlar)) bg.satirlar.forEach(function (x) { if (x && x.ad && ISODT.test(x.bas || '')) out.push({ bas: x.bas, bit: x.bit || x.bas, k: 'ozel', ad: String(x.ad), alt: aralik(x.bas, x.bit) }); });
    duyuruListe(y).forEach(function (d, i) { if (ISODT.test(d.tarih || '')) out.push({ bas: d.tarih, bit: d.bitis && d.bitis >= d.tarih ? d.bitis : d.tarih, k: 'etkinlik', ad: String(d.baslik), alt: (saatOk(d.saat) ? d.saat : '') || metinVeLink(String(d.metin || '')).metin.replace(/\s+/g, ' ').slice(0, 70), dt: 'du:' + i }); });
    out.sort(function (a, b) { return a.bas < b.bas ? -1 : a.bas > b.bas ? 1 : (a.k < b.k ? -1 : 1); });
    out.forEach(function (o, i) { o.i = i; });
    return out;
  }
  function olayKodu(o) { return o.dt || ('ol:' + o.i); }
  function katIk(k) { return '<i class="kd" style="background:' + KAT[k][1] + '"></i>'; }
  function tarihEtiket(ds) { var d = tarihCoz(ds); return '<span class="dn">' + d.getDate() + '</span><span class="dm">' + AYK[d.getMonth()] + '</span>'; }

  // ---- Günüm: yatay ders kartları + Bugün/Yarın + özet kutuları
  function gunumHedef(C) {
    var son = (C.gb.tip === 'ders' && C.gb.ders.length) ? mdk(C.gb.ders[C.gb.ders.length - 1][2]) * 60 : 0;
    var oto = (C.gb.tip === 'ders' && C.T < son) ? 'b' : 'y', v = GV || oto, nx = sonrakiOkul(C);
    if (v === 'b' && C.gb.tip !== 'ders') v = 'y';
    if (v === 'y' && !nx) { v = 'b'; if (C.gb.tip !== 'ders') return null; }
    var d = v === 'b' ? C.d : nx.d;
    return { v: v, d: d, G: gunBaglam(d), etiket: v === 'b' ? 'Bugün' : nx.etiket, nx: nx };
  }
  var IKT = {
    sira: '<path d="M5 12h12M13 7l5 5-5 5"/>', say: '<rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/>',
    bos: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>', nbt: '<path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6z"/>'
  };
  function tile(ic, e, v, a, kod, c) { return '<button type="button" class="tl" style="--c:' + c + '"' + (kod ? ' data-dt="' + esc(kod) + '"' : '') + '><span class="ti"><svg viewBox="0 0 24 24" aria-hidden="true">' + IKT[ic] + '</svg></span><span class="te">' + esc(e) + '</span><b class="d">' + esc(v) + '</b><span class="ta">' + esc(a) + '</span></button>'; }

  function gunSinif(x, planli) { return x.m ? esc(x.m.sinif) : (planli ? 'Boş' : ''); }
  function gunKadran(les, bugun, planli) {
    var A0 = mdk(les[0].r[2]) * 60, Z0 = mdk(les[les.length - 1].r[3]) * 60, span = Z0 - A0, R = 88, cx = 120;
    function pt(a, r) { var t = (a - 90) * Math.PI / 180; return [cx + r * Math.cos(t), cx + r * Math.sin(t)]; }
    function arc(a0, a1) { var p0 = pt(a0, R), p1 = pt(a1, R); return 'M' + p0[0].toFixed(2) + ' ' + p0[1].toFixed(2) + 'A' + R + ' ' + R + ' 0 ' + ((a1 - a0) > 180 ? 1 : 0) + ' 1 ' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2); }
    var sv = '<svg viewBox="0 0 240 240" aria-hidden="false"><circle cx="120" cy="120" r="' + R + '" class="dtr"/>';
    for (var i = 0; i < 60; i++) { var q0 = pt(i * 6, 106), q1 = pt(i * 6, i % 5 ? 109 : 112); sv += '<line class="dtk" x1="' + q0[0].toFixed(1) + '" y1="' + q0[1].toFixed(1) + '" x2="' + q1[0].toFixed(1) + '" y2="' + q1[1].toFixed(1) + '"/>'; }
    les.forEach(function (x) {
      var s0 = mdk(x.r[2]) * 60, e0 = mdk(x.r[3]) * 60, a0 = (s0 - A0) / span * 360 + 1.4, a1 = (e0 - A0) / span * 360 - 1.4, m = pt((a0 + a1) / 2, R);
      sv += '<path class="ar gx' + (x.m ? ' my' : (planli ? ' bos' : '')) + '" d="' + arc(a0, a1) + '" data-s="' + s0 + '" data-e="' + e0 + '" data-no="' + x.no + '" data-t="' + esc(x.r[2] + ' – ' + x.r[3]) + '" data-c="' + gunSinif(x, planli) + '" data-dt="ak:' + esc(x.ds) + ':' + x.ri + '"/><text class="dno" x="' + m[0].toFixed(1) + '" y="' + (m[1] + 4).toFixed(1) + '">' + x.no + '</text>';
    });
    sv += '<g class="nd" data-a0="' + A0 + '" data-z0="' + Z0 + '" style="display:none"><line x1="120" y1="12" x2="120" y2="32"/><circle cx="120" cy="22" r="5"/></g></svg>';
    var ilk = les[0], son = les[les.length - 1];
    return '<div class="dial" id="gs" data-bg="' + (bugun ? 1 : 0) + '">' + sv + '<div class="dc"><span class="dk">' + (bugun ? '' : 'Ders programı') + '</span><b class="dn d">' + (bugun ? '' : les.length + ' ders') + '</b><span class="dd">' + (bugun ? '' : esc(ilk.r[2] + ' – ' + son.r[3])) + '</span></div></div>';
  }
  function gunGovde(les, C, bugun, ds, planli) {
    les.forEach(function (x) { x.ds = ds; });
    var st = oku(K.gun); if (st !== 'b' && st !== 'd' && st !== 'v') st = 'a';
    if (st === 'd') return gunKadran(les, bugun, planli);
    if (st === 'v') {
      var hv = '<div class="gakis" id="gs" data-bg="' + (bugun ? 1 : 0) + '"><div class="grl"></div>';
      les.forEach(function (x, i) {
        if (i) hv += '<div class="gp" data-s="' + mdk(les[i - 1].r[3]) * 60 + '" data-e="' + mdk(x.r[2]) * 60 + '"></div>';
        hv += '<button type="button" class="gx gv' + (x.m ? ' my' : (planli ? ' bos' : '')) + '" data-s="' + mdk(x.r[2]) * 60 + '" data-e="' + mdk(x.r[3]) * 60 + '" data-dt="ak:' + ds + ':' + x.ri + '"><span class="tm"><b>' + esc(x.r[2]) + '</b><small>' + esc(x.r[3]) + '</small></span><span class="a"><b>' + x.no + '. ders</b><span class="k"></span></span><span class="c">' + gunSinif(x, planli) + '</span><i class="pb"><u></u></i></button>';
      });
      return hv + '<div class="gnd" aria-hidden="true"><i></i></div></div>';
    }
    if (st === 'b') return '<div class="glist" id="gs" data-bg="' + (bugun ? 1 : 0) + '">' + les.map(function (x) {
      return '<button type="button" class="gx gr' + (x.m ? ' my' : (planli ? ' bos' : '')) + '" data-s="' + mdk(x.r[2]) * 60 + '" data-e="' + mdk(x.r[3]) * 60 + '" data-dt="ak:' + ds + ':' + x.ri + '"><span class="tm">' + esc(x.r[2]) + '</span><span class="a"><b>' + x.no + '. ders</b><span class="k"></span></span><span class="c">' + gunSinif(x, planli) + '</span><i class="pb"><u></u></i></button>';
    }).join('') + '</div>';
    return '<div class="ggrid" id="gs" data-bg="' + (bugun ? 1 : 0) + '">' + les.map(function (x) {
      return '<button type="button" class="gx gt' + (x.m ? ' my' : (planli ? ' bos' : '')) + '" data-s="' + mdk(x.r[2]) * 60 + '" data-e="' + mdk(x.r[3]) * 60 + '" data-dt="ak:' + ds + ':' + x.ri + '"><span class="n">' + x.no + '. ders</span><b class="d">' + esc(x.r[2]) + '</b><span class="c">' + gunSinif(x, planli) + '</span><span class="k"></span><i class="pb"><u></u></i></button>';
    }).join('') + '</div>';
  }
  function sGunum(C) {
    var H = gunumHedef(C); if (!H) return '';
    var G = H.G, ds = G.gb.ds, bugun = H.v === 'b', planli = !!programVar(C.y), les = [], bos = [], benim = 0;
    G.sc.forEach(function (r, ri) { if (r[0] !== 'ders') return; var no = dersNo(r), m = G.MY[no] || G.COV[no]; les.push({ r: r, ri: ri, no: no, m: m }); if (m) benim++; else bos.push(no); });
    var seg = '<div class="sg" id="gv"><button type="button" data-v="b"' + (bugun ? ' class="on"' : '') + (C.gb.tip !== 'ders' ? ' disabled' : '') + '>Bugün</button>' + (H.nx ? '<button type="button" data-v="y"' + (bugun ? '' : ' class="on"') + '>' + esc(H.nx.etiket) + '</button>' : '') + '</div>';
    var alt = les.length + ' ders' + (planli ? ', ' + benim + ' sende' : '');
    var h = '<div class="sec" data-k="akis"><h2>Günüm<span>' + esc(alt) + '</span></h2>' + seg;
    var shf = olaylar(C.y).filter(function (o) { return o.hafta && o.bas <= ds && ds <= o.bit; })[0];
    if (G.gb.gecici || G.gb.yarim || shf) h += '<div class="chp" style="margin:12px 0 0">' + (shf ? '<span style="background:#7F62E038;background:color-mix(in srgb,#7F62E0 22%,transparent)">' + esc(shf.ad) + '</span>' : '') + (G.gb.yarim ? '<span>Yarım gün' + (G.gb.ad ? ', ' + esc(G.gb.ad) : '') + '</span>' : '') + (G.gb.gecici ? '<span>' + esc(G.gb.gecici) + '</span>' : '') + '</div>';
    h += gunGovde(les, C, bugun, ds, planli);
    // özet kutuları
    var simdiki = null; if (bugun) les.forEach(function (x) { if (!simdiki && C.T < mdk(x.r[3]) * 60) simdiki = x; });
    var ilk = les[0], t1;
    if (bugun && simdiki) { var cur = C.T >= mdk(simdiki.r[2]) * 60; t1 = tile('sira', cur ? 'Şu an' : 'Sıradaki', simdiki.no + '. ders', simdiki.r[2] + (simdiki.m ? ' · ' + simdiki.m.sinif : ''), 'ak:' + ds + ':' + simdiki.ri, 'var(--gold)'); }
    else if (ilk) t1 = tile('sira', 'İlk ders', ilk.no + '. ders', ilk.r[2] + (ilk.m ? ' · ' + ilk.m.sinif : ''), 'ak:' + ds + ':' + ilk.ri, 'var(--gold)');
    else t1 = '';
    var t2 = tile('say', bugun ? 'Bugün' : H.etiket, (planli ? benim : les.length) + ' ders', planli ? (bos.length ? bos.length + ' boş saat' : 'boş saat yok') : (les.length ? les[0].r[2] + ' – ' + les[les.length - 1].r[3] : ''), 'gun:' + ds, '#7F62E0');
    var t3 = planli ? tile('bos', 'Boş saatlerim', bos.length ? bos.length + ' saat' : 'Yok', bos.length ? bos.map(function (n) { return n + '.'; }).join(' ') + ' ders' : 'bütün saatler dolu', 'gun:' + ds, '#2BA899') : '';
    var yer = nobetYer(C.y, G.gb.wd, ds), t4 = tile('nbt', 'Nöbetim', yer || 'Yok', yer ? 'nöbet yerin' : 'nöbetin yok', 'nbd', '#3D8FE0');
    h += '<div class="tls">' + t1 + t2 + t3 + t4 + '</div></div>';
    return h;
  }
  // ---- Yaklaşanlar: bu hafta / bu ay
  function sYaklasan(C) {
    if (!olaylar(C.y).length) return '';
    var bg = C.gb.ds, bit = YK === 0 ? iso(gunEkle(pazartesi(C.d), 6)) : iso(new Date(C.d.getFullYear(), C.d.getMonth() + 1, 0));
    var l = olaylar(C.y).filter(function (o) { return o.bit >= bg && o.bas <= bit; }).slice(0, 12);
    var h = '<div class="sec" data-k="yk"><h2>Yaklaşanlar<span>' + (l.length ? l.length + ' kayıt' : '') + '</span></h2><div class="sg" id="yk"><button type="button" data-v="0"' + (YK === 0 ? ' class="on"' : '') + '>Bu hafta</button><button type="button" data-v="1"' + (YK === 1 ? ' class="on"' : '') + '>Bu ay</button></div>';
    if (!l.length) return h + '<div class="empty" style="padding:22px 0 0;text-align:left"><b style="font-size:15px">' + (YK === 0 ? 'Bu hafta' : 'Bu ay') + ' kayıt yok</b></div><button class="lk" type="button" data-go-tab="2">Takvimi aç</button></div>';
    h += '<div class="ystrip">' + l.map(function (o) {
      var ds = o.bas < bg ? bg : o.bas;
      return '<button type="button" class="yc" style="--c:' + KAT[o.k][1] + '" data-dt="' + esc(olayKodu(o)) + '"><span class="yd">' + tarihEtiket(ds) + '</span><span class="yk2">' + esc(KAT[o.k][0]) + '</span><b>' + esc(o.ad) + '</b><span class="ya">' + esc(o.alt) + '</span></button>';
    }).join('') + '</div><button class="lk" type="button" data-go-tab="2">Takvimi aç</button></div>';
    return h;
  }
  // ---- Takvim sekmesi: ay görünümü
  function sinavKarti(C) {
    var bg = C.gb.ds, ol = olaylar(C.y).filter(function (o) { return o.k === 'sinav' && o.bit >= bg; });
    if (!ol.length) return '';
    var hf = ol.filter(function (o) { return o.hafta; })[0], ex = ol.filter(function (o) { return !o.hafta; });
    var sayi = ex.length, ilk = ex[0], c = KAT.sinav[1];
    var simdiHafta = hf && hf.bas <= bg;
    return '<div class="sk2" style="--c:' + c + '"><div class="sk2h"><span class="hic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7zM14 3v5h5M10 13h6M10 17h4"/></svg></span><div><b class="d">Sınav takvimi</b><span>' + (sayi ? sayi + ' sınav yaklaşıyor' : 'Sınav haftası') + '</span></div></div>'
      + (hf ? '<button type="button" class="sk2w" data-dt="' + olayKodu(hf) + '"><em>' + (simdiHafta ? 'Şu an' : 'Sınav haftası') + '</em><b>' + esc(hf.ad) + '</b><span>' + esc(aralik(hf.bas, hf.bit)) + '</span></button>' : '')
      + (ilk ? '<div class="sk2l">' + ex.slice(0, 3).map(function (o) { var d = tarihCoz(o.bas); return '<button type="button" class="sk2r" data-dt="' + olayKodu(o) + '"><span class="yd">' + tarihEtiket(o.bas) + '</span><span class="a"><b>' + esc(o.ad) + '</b><span>' + esc(GKISA[d.getDay()] + (o.alt ? ' · ' + o.alt : '')) + '</span></span></button>'; }).join('') + '</div>' : '') + '</div>';
  }
  function dzTarih(a, b) {
    var d = tarihCoz(a), l1, l2;
    if (!b || b === a) { l1 = d.getDate(); l2 = AYK[d.getMonth()]; }
    else if (a.slice(5, 7) === b.slice(5, 7)) { l1 = d.getDate() + '–' + (+b.slice(8)); l2 = AYK[d.getMonth()]; }
    else { l1 = d.getDate() + ' ' + AYK[d.getMonth()]; l2 = '– ' + (+b.slice(8)) + ' ' + AYK[+b.slice(5, 7) - 1]; }
    return '<span class="dz"><b>' + esc(l1) + '</b><i>' + esc(l2) + '</i></span>';
  }
  function ayListe(ol, base, kf) {
    if (kf === 'nobet') return '';
    var m0 = iso(base), m1 = iso(new Date(base.getFullYear(), base.getMonth() + 1, 0));
    var l = ol.filter(function (o) { return o.bas <= m1 && o.bit >= m0 && (!kf || o.k === kf); }).sort(function (p, q) { return p.bas < q.bas ? -1 : (p.bas > q.bas ? 1 : 0); });
    if (!l.length) return '<div class="aylb">Bu ay kayıt yok</div>';
    return '<div class="sec">' + secH(AY[base.getMonth()] + ' kayıtları', l.length + ' kayıt') + '<div class="rows">' + l.map(function (o) {
      return '<div class="rw ev" style="--c:' + (KAT[o.k] ? KAT[o.k][1] : '#999') + '" data-dt="' + esc(olayKodu(o)) + '">' + dzTarih(o.bas, o.bit) + '<div class="a"><b>' + esc(o.ad) + '</b><span class="s">' + esc((KAT[o.k] ? KAT[o.k][0] : '') + (o.alt ? ' · ' + o.alt : '')) + '</span></div></div>';
    }).join('') + '</div></div>';
  }
  function ayHTML(C) {
    var y = C.y, base = new Date(C.d.getFullYear(), C.d.getMonth() + MO, 1), ol = olaylar(y), ym = iso(base).slice(0, 7);
    var first = (base.getDay() + 6) % 7, dim = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate(), kf = KFM[KF] || '';
    var h = '<div class="chips kf" id="kf">' + ['Tümü', 'Sınav', 'Etkinlik', 'Tatil', 'Özel gün', 'Nöbetim'].map(function (c) { return '<button type="button"' + (KF === c ? ' class="on"' : '') + '>' + (KFM[c] ? katIk(KFM[c]) : '') + c + '</button>'; }).join('') + '</div>';
    h += ayListe(ol, base, kf);
    h += '<div class="mg">' + ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map(function (g) { return '<span class="mh">' + g + '</span>'; }).join('');
    for (var i = 0; i < first; i++) h += '<span class="mc out"></span>';
    for (var g = 1; g <= dim; g++) {
      var d = new Date(base.getFullYear(), base.getMonth(), g), ds = iso(d), wd = d.getDay() || 7, ks = {}, tat = false;
      var exw = false;
      ol.forEach(function (o) { if (o.bas <= ds && ds <= o.bit) { if (!(o.hafta && kf && kf !== 'sinav')) ks[o.k] = o.hafta ? (ks[o.k] || 0) : 1; if (o.hafta && (!kf || kf === 'sinav')) exw = true; if (o.k === 'tatil' && o.alt !== 'Yarım gün') tat = true; } });
      if (gunBilgi(y, d).tip === 'ders' && nobetYer(y, wd, ds)) ks.nobet = 1;
      var dots = Object.keys(KAT).filter(function (k) { return ks[k] && (!kf || kf === k); });
      h += '<button type="button" class="mc' + (ds === C.gb.ds ? ' td' : '') + (tat && (!kf || kf === 'tatil') ? ' hol' : '') + (exw && !tat ? ' exw' : '') + (wd > 5 ? ' we' : '') + '" data-dt="gun:' + ds + '"><span>' + g + '</span><em>' + dots.map(function (k) { return '<i style="background:' + KAT[k][1] + '"></i>'; }).join('') + '</em></button>';
    }
    h += '</div>';
    return h;
  }
  function dtOlay(i) {
    var o = olaylar(Y())[i]; if (!o) return;
    var h = '<div class="chp"><span style="background:' + KAT[o.k][1] + '38;background:color-mix(in srgb,' + KAT[o.k][1] + ' 22%,transparent)">' + esc(KAT[o.k][0]) + '</span></div><div class="dbig d" style="font-size:26px;line-height:1.15">' + esc(o.ad) + '</div><div class="dsub">' + esc(aralik(o.bas, o.bit)) + (o.bas === o.bit ? ' · ' + GUN[tarihCoz(o.bas).getDay()] : '') + '</div>';
    var x = o.x, kv = '';
    if (x) { if (saatOk(x.saat)) kv += kvH('Saat', x.saat); if (x.sinif) kv += kvH('Sınıf', x.sinif); if (x.ders) kv += kvH('Ders', x.ders); if (x.yer) kv += kvH('Yer', x.yer); }
    else if (o.alt) kv += kvH('Not', o.alt);
    if (kv) h += '<div class="kvs">' + kv + '</div>';
    h += '<div class="rows" style="margin-top:20px">' + dtSatir('gun:' + o.bas, '', 'O günün programı', '', '') + '</div>';
    dtGoster(KAT[o.k][0], h);
  }

  function t0HTML(C) {
    var y = C.y;
    if (!y) return damga(C) + '<div class="empty"><b>' + (durum.yenileniyor ? 'Bilgiler getiriliyor' : 'Bilgiler alınamadı') + '</b>' + (durum.yenileniyor ? '' : 'İnternet bağlantısını kontrol edip yenile.') + '</div>';
    if (eskiMi(onbellek())) return damga(C) + '<div class="empty"><b>Bilgiler eski olduğu için gizlendi</b>Son güncelleme ' + A.ESKI_SAAT + ' saatten önce. İnternete bağlanınca otomatik yenilenir.</div>';
    if (y.yayinDurumu !== 'acik') return damga(C) + '<div class="empty"><b>Yayın şu an kapalı</b>Okul yönetimi açtığında bilgiler burada görünecek.</div>';
    var p = [sGunum(C), sYaklasan(C), sDuyuru(C), sNobetci(C), sPanoOzet(C)].join('');
    return damga(C) + (p || '<div class="empty"><b>Bugün paylaşılan bir şey yok</b>Yeni bir duyuru ya da bilgi paylaşıldığında bu sayfada görünür.</div>');
  }
  function yayinKapali(C) { return !C.y || eskiMi(onbellek()) || C.y.yayinDurumu !== 'acik'; }

  // ---- Programım sekmesi
  var NT = okuJ(K.notlar, []); if (!Array.isArray(NT)) NT = [];
  function notKaydet() { yaz(K.notlar, JSON.stringify(NT)); }
  function ritimDers(y) { var r = ortak(y, 'ritim'); return r ? dersListe(r.ders) : []; }
  function haftaGunleri(d) { var m = pazartesi(d), out = []; for (var i = 0; i < 5; i++) out.push(gunEkle(m, i)); return out; }
  function hucreAdi(y, k) {
    if (!k) return 'Genel not';
    var p = k.split(','), wd = +p[0] + 1, no = +p[1] + 1, h = hucreAl(y, wd, no);
    return (h ? h.sinif : 'Boş ders') + ', ' + GUN[wd % 7] + ' ' + no + '. ders';
  }
  function bugunHatirlat(C) {
    if (C.gb.tip !== 'ders') return '';
    var wd = C.gb.wd;
    var r = NT.filter(function (n) { return n.d === C.gb.ds || (n.w && n.k && (+n.k.split(',')[0] + 1) === wd); });
    if (!r.length) return '';
    return '<div class="sec">' + secH('Bugünkü hatırlatmaların') + '<div class="rows">' + r.map(function (n) { return '<div class="rw" data-n="' + esc(n.id) + '"><div class="a"><b>' + esc(n.t) + '</b><span class="s">' + esc(hucreAdi(C.y, n.k)) + '</span></div><span class="z">' + esc(n.tm || '') + '</span></div>'; }).join('') + '</div></div>';
  }
  function ttHTML(C) {
    var y = C.y, L = ritimDers(y), gunler = haftaGunleri(C.d), p = programVar(y), cov = {};
    doldurmaListe(y).forEach(function (x) { cov[x.tarih + '|' + (+x.saat)] = x; });
    var degis = {}; if (p && Array.isArray(p.degisen)) p.degisen.forEach(function (x) { if (x && x.gun && x.saat) degis[(+x.gun) + ',' + (+x.saat)] = 1; });
    var h = '<div class="tt"><div class="hd"></div>' + gunler.map(function (d, i) { return '<div class="hd' + (iso(d) === C.gb.ds ? ' on' : '') + '">' + GKISA[d.getDay()] + '<b>' + d.getDate() + '</b></div>'; }).join('');
    L.forEach(function (r, k) {
      h += '<div class="no">' + (k + 1) + '<br><small style="font-weight:500">' + r[1] + '</small></div>';
      gunler.forEach(function (d, i) {
        var c = hucreAl(y, i + 1, k + 1), cv = cov[iso(d) + '|' + (k + 1)], cl = '', v = '·', sm = '';
        if (cv) { cl = ' cv'; v = esc(cv.sinif || 'Doldurma'); sm = '<small>doldurma</small>'; }
        else if (c) { v = esc(c.sinif); if (degis[(i + 1) + ',' + (k + 1)]) { cl = ' nw2'; sm = '<small>yeni</small>'; } }
        else cl = ' em';
        if (iso(d) === C.gb.ds && C.gb.tip === 'ders') { var g = guncel(C); if (g[2] >= 0 && g[0][0] === 'ders' && dersNo(g[0]) === k + 1 && (c || cv)) cl += ' nowc'; }
        var kk = i + ',' + k;
        h += '<div class="' + (cl.trim() + (iso(d) === C.gb.ds ? ' td' : '') + (NT.some(function (n) { return n.k === kk; }) ? ' hn' : '')).trim() + '"' + ((c || cv) ? ' data-c="' + kk + '"' : '') + '>' + v + sm + '</div>';
      });
    });
    return h + '</div>';
  }
  function programHTML(C) {
    var y = C.y, p = programVar(y);
    if (!p) return '<div class="empty"><b>Programın henüz yayınlanmadı</b>Okul yönetimi ders programını paylaştığında burada görünür.</div>';
    var toplam = 0, siniflar = {};
    for (var wd = 1; wd <= 5; wd++) { var g = p.matris[String(wd)] || {}; Object.keys(g).forEach(function (no) { var h = hucre(g[no]); if (h) { toplam++; siniflar[h.sinif] = 1; } }); }
    return '<div class="stamp"><i></i>Güncel program' + (p.yururluk && /^\d{4}-\d{2}-\d{2}$/.test(p.yururluk) ? ', ' + gunAy(p.yururluk) + ' tarihli' : '') + '</div>' + ttHTML(C)
      + '<div class="lgd"><span><i style="background:var(--ink)"></i>Şu an</span><span><i style="border:1px solid var(--teal)"></i>Ders doldurma</span></div>'
      + '<div class="stat"><div><b>' + toplam + '</b><span>haftalık ders</span></div><div><b>' + Object.keys(siniflar).length + '</b><span>farklı sınıf</span></div></div>';
  }
  function nobetSekmesi(C) {
    var n = nobetim(C.y);
    if (!n.liste.length && !n.gelecek) return '<div class="empty"><b>Bu dönem nöbetin görünmüyor</b>Nöbet yerin belirlendiğinde burada görünür.</div>';
    var l = n.liste.slice().sort(function (a, b) { return a.gun - b.gun; });
    var h = '';
    if (l.length) {
      h += '<div class="stat"><div><b>' + l.length + '</b><span>haftalık nöbet</span></div><div><b>' + esc(l.map(function (x) { return GKISA[(+x.gun) % 7]; }).join(', ')) + '</b><span>nöbet günlerin</span></div></div>';
      h += '<div class="sec">' + secH('Haftalık nöbetin') + '<div class="rows">' + l.map(function (x) { return '<div class="rw" data-dt="gun:' + sonrakiGun(+x.gun) + '"><div class="a"><b>' + GUN[(+x.gun) % 7] + '</b><span class="s">' + esc(x.yer) + '</span></div>' + ((+x.gun) === C.gb.wd ? '<span class="z">Bugün</span>' : '') + '</div>'; }).join('') + '</div></div>';
    }
    if (n.gelecek) {
      var yeniGun = {}, eskiGun = {}; n.gelecek.liste.forEach(function (x) { yeniGun[+x.gun] = x.yer; }); n.liste.forEach(function (x) { eskiGun[+x.gun] = x.yer; });
      var gunler = Object.keys(yeniGun).concat(Object.keys(eskiGun)).filter(function (g, i, a) { return a.indexOf(g) === i; }).sort(function (p, q) { return p - q; });
      h += '<div class="sec"><div class="rot"><p>Yeni nöbet düzenin, ' + esc(gunAy(n.gelecek.bas)) + ' tarihinden itibaren</p><div class="rows">' + gunler.map(function (g) {
        var yy = yeniGun[g], oo = eskiGun[g];
        return '<div class="rw"><div class="a"><b>' + GUN[(+g) % 7] + '</b><span class="s">' + (yy ? esc(yy) + (oo && oo !== yy ? ', önceki: ' + esc(oo) : '') : 'Nöbetin yok, önceki: ' + esc(oo)) + '</span></div></div>';
      }).join('') + '</div></div></div>';
    }
    return h;
  }
  function notlarSekmesi(C) {
    var l = NT.slice().sort(function (a, b) { return ((a.d || '9') + (a.tm || '')) > ((b.d || '9') + (b.tm || '')) ? 1 : -1; });
    return '<div class="stamp"><i></i>Yalnız bu telefonda saklanır, kimse görmez</div>' + (l.length ? '<div class="sec">' + secH('Notların', l.length + ' not') + '<div class="rows">' + l.map(function (n) {
      return '<div class="rw" data-n="' + esc(n.id) + '"><div class="a"><b>' + esc(n.t) + '</b><span class="s">' + esc(hucreAdi(C.y, n.k)) + (n.w ? ', her hafta' : '') + '</span></div><span class="z">' + (n.d ? esc(gunAyK(n.d)) + (n.tm ? ', ' + esc(n.tm) : '') : '') + '</span></div>';
    }).join('') + '</div></div>' : '<div class="empty"><b>Henüz notun yok</b>Ders programında bir derse dokunarak ya da aşağıdaki düğmeyle not ekleyebilirsin.</div>')
      + '<button class="addn" id="addn" type="button">Yeni not ekle</button><button class="lk" id="bk" type="button" style="margin-top:14px">Notlarımı yedekle</button><div class="nerr" id="bkm"></div>';
  }
  function t1HTML(C) {
    if (yayinKapali(C)) return '<div class="empty"><b>Bilgiler şu an gösterilemiyor</b>Bugün sekmesinden durumu görebilirsin.</div>';
    if (PS === 0) {
      var h = '', bg = C.gb.ds, ben = C.COV;
      var ilk = null; Object.keys(ben).forEach(function (no) { if (!ilk) ilk = ben[no]; });
      if (C.gb.tip === 'ders' && ilk) h += '<div class="sec" data-k="cov"><div class="rot" data-dt="gun:' + bg + '"><p>Ders doldurma</p><div class="d" style="font-size:20px;font-weight:600;margin-top:6px;letter-spacing:-.3px">' + Object.keys(ben).map(function (no) { return no + '. ders, ' + esc(ben[no].sinif || ''); }).join('<br>') + '</div></div></div>';
      h += bugunHatirlat(C);
      if (C.gb.tip === 'ders') h += sAkis(C, 1);
      else if (C.gb.tip === 'hs' || C.gb.tip === 'tatil') {
        var nx = sonrakiOkul(C), c1 = nx ? hucreAl(C.y, nx.gb.wd, 1) : null;
        h += '<div class="empty"><b>' + (C.gb.tip === 'hs' ? 'Hafta sonu' : 'Bugün okul tatil') + '</b>' + (nx ? esc(nx.etiket) + ' dersler ' + esc(nx.ilk) + '\'da başlıyor' + (c1 ? '; ilk dersin ' + esc(c1.sinif) + ' sınıfında.' : '.') : '') + '</div>';
      } else h += '<div class="empty"><b>Ders saatleri henüz yayınlanmadı</b>Okul yönetimi paylaştığında burada görünür.</div>';
      return h;
    }
    if (PS === 1) return programHTML(C);
    if (PS === 2) return nobetSekmesi(C);
    return notlarSekmesi(C);
  }

  // ---- Hafta sekmesi
  function haftaKayitlari(C, mon) {
    var y = C.y, fri = gunEkle(mon, 4), a = iso(mon), b = iso(fri), ev = [];
    var etiket = function (ds) { var d = tarihCoz(ds); return GKISA[d.getDay()] + ' ' + d.getDate(); };
    duyuruListe(y).forEach(function (d) { if (d.tarih && d.tarih >= a && d.tarih <= b) ev.push([d.tarih, etiket(d.tarih), d.baslik, (saatOk(d.saat) ? d.saat : '') || metinVeLink(String(d.metin || '')).metin.slice(0, 80)]); });
    var th = ortak(y, 'tatil'); if (th && Array.isArray(th.liste)) th.liste.forEach(function (h) { if (h && h.bas <= b && (h.bit || h.bas) >= a) ev.push([h.bas < a ? a : h.bas, etiket(h.bas < a ? a : h.bas), h.ad || 'Tatil', h.yarim ? 'Yarım gün' : 'Okul kapalı']); });
    var gc = ortak(y, 'gecici'); if (gc && Array.isArray(gc.liste)) gc.liste.forEach(function (g) { (g.tarihler || []).forEach(function (t) { if (t && t.bas <= b && (t.bit || t.bas) >= a) { var s = t.bas < a ? a : t.bas, d = dersListe(g.ders); ev.push([s, etiket(s), 'Geçici ders saatleri', d.length ? 'Çıkış ' + d[d.length - 1][2] : String(g.ad || '')]); } }); });
    var bg = ortak(y, 'slayt:belirliGun'); if (bg && Array.isArray(bg.satirlar)) bg.satirlar.forEach(function (x) { if (x && x.bas <= b && (x.bit || x.bas) >= a) ev.push([x.bas < a ? a : x.bas, etiket(x.bas < a ? a : x.bas), String(x.ad), aralik(x.bas, x.bit)]); });
    olaylar(y).forEach(function (o) { if (o.k === 'sinav' && !/sınav günü/i.test(o.ad) && o.bas >= a && o.bas <= b) ev.push([o.bas, etiket(o.bas), o.ad, o.alt]); });
    ev.sort(function (p, q) { return p[0] < q[0] ? -1 : p[0] > q[0] ? 1 : 0; });
    return ev;
  }
  function t2HTML(C) {
    if (yayinKapali(C)) return '<div class="empty"><b>Bilgiler şu an gösterilemiyor</b>Bugün sekmesinden durumu görebilirsin.</div>';
    if (CV === 1) return ayHTML(C);
    var mon = gunEkle(pazartesi(C.d), WK * 7), a = iso(mon), y = C.y, n = nobetim(y), h = '';
    var rot = ortak(y, 'rotasyon'), sonraki = rot && rot.hafta && rot.hafta.sonraki;
    var nobetSatir = '';
    var liste = n.liste;
    if (n.gelecek && n.gelecek.bas <= a) liste = n.gelecek.liste;
    if (liste.length) nobetSatir = liste.slice().sort(function (p, q) { return p.gun - q.gun; }).map(function (x) { var d = gunEkle(mon, (+x.gun) - 1); return '<div class="rw" data-dt="gun:' + iso(d) + '"><div class="a"><b>' + GUN[(+x.gun) % 7] + ', ' + esc(x.yer) + '</b><span class="s">' + (iso(d) < C.gb.ds ? 'Tamamlandı.' : '') + '</span></div></div>'; }).join('');
    if (sonraki && sonraki === a && n.gelecek && WK >= 1) h += '<div class="sec"><div class="rot"><p>Yeni nöbet düzenin, ' + esc(gunAy(a)) + ' tarihinden itibaren</p><p style="margin-top:10px;font-weight:500">Yönetim onayladı.</p></div></div>';
    else if (sonraki && WK === 0 && iso(gunEkle(mon, 7)) === sonraki && n.gelecek) h += '<div class="sec"><div class="rot"><p>Gelecek hafta nöbet düzenin değişiyor</p><button class="lk" type="button" data-go="1">Gelecek haftaya bak</button></div></div>';
    if (nobetSatir) h += '<div class="sec">' + secH('Nöbetin') + '<div class="rows">' + nobetSatir + '</div></div>';
    var ev = haftaKayitlari(C, mon);
    if (ev.length) h += '<div class="sec">' + secH(['Geçen', 'Bu', 'Gelecek'][WK + 1] + ' haftanın kayıtları', ev.length + ' kayıt') + '<div class="rows">' + ev.map(function (e) { return '<div class="rw" data-dt="gun:' + e[0] + '"><span class="z" style="min-width:46px;flex:none;white-space:nowrap;color:var(--tx);font-weight:650">' + esc(e[1]) + '</span><div class="a"><b>' + esc(e[2]) + '</b><span class="s">' + esc(e[3]) + '</span></div></div>'; }).join('') + '</div></div>';
    return h || '<div class="empty"><b>Bu hafta paylaşılan kayıt yok</b>Etkinlik, duyuru ya da nöbet değişikliği paylaşıldığında burada görünür.</div>';
  }

  // ---- Pano sekmesi
  var EXT = '<svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  function t3HTML(C) {
    if (yayinKapali(C)) return '<div class="empty"><b>Bilgiler şu an gösterilemiyor</b>Bugün sekmesinden durumu görebilirsin.</div>';
    var hab = haberListe(C.y).filter(function (h) { return CAT === 'Tümü' || (h.kat || 'Bilgi') === CAT; }), bag = baglantiListe(C.y), h = '';
    if (bag.length) h += '<div class="sec">' + secH('Sık kullanılan bağlantılar') + '<div class="lg2">' + bag.map(function (b) { return '<a href="' + esc(b.g.href) + '" target="_blank" rel="noopener noreferrer"><b>' + esc(b.ad) + '</b><span>' + esc(b.g.alan) + '</span></a>'; }).join('') + '</div></div>';
    if (hab.length) h += '<div class="sec">' + secH('Haberler ve duyurular') + '<div class="rows">' + hab.map(function (n) {
      var g = n.url ? guvenliLink(n.url) : null, o = g ? '<a class="nw" href="' + esc(g.href) + '" target="_blank" rel="noopener noreferrer">' : '<div class="nw" style="display:block" data-dt="hb:' + haberListe(C.y).indexOf(n) + '">';
      return o + '<p class="' + ((n.kat || '') === 'Eğitim' ? 'e' : '') + '">' + esc(n.kat || 'Bilgi') + '</p><div>' + esc(n.baslik) + (yeniMi(haberAnahtar(n)) ? '<i class="dot"></i>' : '') + '</div>' + (n.metin ? '<span class="s">' + esc(n.metin) + '</span>' : '') + '<footer><span>' + (n.bitis ? 'Son gün ' + esc(gunAyK(n.bitis)) : '') + '</span>' + (g ? '<em>' + esc(g.alan) + '</em>' + EXT : '') + '</footer>' + (g ? '</a>' : '</div>');
    }).join('') + '</div></div>';
    return h || '<div class="empty"><b>Pano boş</b>Okul yönetimi haber ya da bağlantı eklediğinde burada görünür.</div>';
  }

  // ---- Üst alan
  function ilkHarfler(ad) { var p = String(ad || '').trim().split(/\s+/).filter(Boolean); return ((p[0] || '').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toLocaleUpperCase('tr-TR'); }
  function topHTML(C) {
    var y = C.y;
    if (TAB === 0) return logoBar(C, 'Öğretmen ekranı') + (yayinKapali(C) ? '' : hero(C, 0)) + (yayinKapali(C) ? selamHTML(C) : '');
    if (TAB === 1) {
      var ad = (y && y.kisi && y.kisi.ad) || '', kim = kisisel(y, 'kimlik'), p = programVar(y), sayi = 0;
      if (p) for (var wd = 1; wd <= 5; wd++) sayi += Object.keys(p.matris[String(wd)] || {}).filter(function (no) { return hucre(p.matris[String(wd)][no]); }).length;
      var alt = [(kim && kim.brans) || '', p ? sayi + ' ders' : ''].filter(Boolean).join(', ');
      var simdiTxt = (PS === 0 && !yayinKapali(C)) ? hero(C, 1) : '';
      return logoBar(C, 'Programım') + '<div class="who"><div class="av">' + esc(ilkHarfler(ad)) + '</div><div><b class="d" style="font-size:19px">' + esc(ad) + '</b><span>' + esc(alt) + '</span></div><span style="font-size:12px;color:rgba(255,255,255,.6)">Bu cihaza bağlı</span></div><div class="ptabs" id="pt">' + ['Bugün', 'Program', 'Nöbet', 'Notlarım'].map(function (x, i) { return '<button type="button" data-p="' + i + '"' + (PS === i ? ' class="on"' : '') + '>' + x + '</button>'; }).join('') + '</div>' + simdiTxt;
    }
    if (TAB === 3) {
      var cats = ['Tümü']; haberListe(y).forEach(function (h) { var k = h.kat || 'Bilgi'; if (cats.indexOf(k) < 0) cats.push(k); });
      return logoBar(C, 'Öğretmen ekranı') + '<div class="tz d">Pano</div><div class="tzs">Okuldan ve eğitimden haberler, bağlantılar</div>' + (cats.length > 2 ? '<div class="chips" id="ch">' + cats.map(function (c) { return '<button type="button"' + (CAT === c ? ' class="on"' : '') + '>' + esc(c) + '</button>'; }).join('') + '</div>' : '');
    }
    var cvh = '<div class="tabs" id="cv">' + [['0', 'Hafta'], ['1', 'Ay']].map(function (x) { return '<button type="button" data-cv="' + x[0] + '"' + (CV === +x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>';
    if (CV === 1) {
      var mb = new Date(C.d.getFullYear(), C.d.getMonth() + MO, 1);
      return logoBar(C, 'Öğretmen ekranı') + '<div class="tz d">Takvim</div>' + cvh + '<div class="mn"><button type="button" data-mo="-1" aria-label="Önceki ay">' + IK_ONC + '</button><div class="mm"><b class="d">' + AY[mb.getMonth()] + ' ' + mb.getFullYear() + '</b>' + (MO ? '<button type="button" class="bg" data-mo="0">Bugün</button>' : '') + '</div><button type="button" data-mo="1" aria-label="Sonraki ay">' + IK_SON + '</button></div>';
    }
    var mon = gunEkle(pazartesi(C.d), WK * 7), gunler = []; for (var i = 0; i < 5; i++) gunler.push(gunEkle(mon, i));
    var gl = gunler.map(function (d) { var g = y ? gunBilgi(y, d) : { tip: 'ders' }; return { d: d, h: g.tip === 'tatil', on: iso(d) === C.gb.ds }; });
    return logoBar(C, 'Öğretmen ekranı') + '<div class="tz d">Takvim</div>' + cvh + '<div class="tabs" id="wt" style="margin-top:14px">' + [['-1', 'Geçen hafta'], ['0', 'Bu hafta'], ['1', 'Gelecek hafta']].map(function (x) { return '<button type="button" data-w="' + x[0] + '"' + (WK === +x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div><div class="wk">' + gl.map(function (g) { return '<div data-dt="gun:' + iso(g.d) + '" class="' + (g.on ? 'on ' : '') + (g.h ? 'h' : '') + '">' + GKISA[g.d.getDay()] + '<b>' + g.d.getDate() + '</b></div>'; }).join('') + '</div>';
  }
  function selamHTML(C) {
    var h = C.d.getHours(), ad = ilkAd(C.y && C.y.kisi && C.y.kisi.ad);
    return '<div class="tz d">' + (h < 11 ? 'Günaydın' : (h < 18 ? 'İyi günler' : 'İyi akşamlar')) + (ad ? ', ' + esc(ad) : '') + '</div><div class="tzs">' + GUN[C.d.getDay()] + ', ' + C.d.getDate() + ' ' + AY[C.d.getMonth()] + '</div>';
  }

  // ================= GÖKYÜZÜ (yalnız ders dışı saatlerde, yönetim açtıysa) =================
const SK_LAT=41.0082,SK_LON=28.9784,SK_TZ=3,SK_RAD=Math.PI/180;const TR_MONTHS=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'],TR_DAYS=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
function skLocal(now){ const t=new Date(now.getTime()+SK_TZ*3600000); return {y:t.getUTCFullYear(), m:t.getUTCMonth(), d:t.getUTCDate(), hh:t.getUTCHours()+t.getUTCMinutes()/60+t.getUTCSeconds()/3600}; }
  function skElev(y,m,d,hh){
    const n=Math.floor((Date.UTC(y,m,d)-Date.UTC(y,0,0))/86400000);
    const g=(2*Math.PI/365)*(n-1+(hh-12)/24);
    const eqt=229.18*(0.000075+0.001868*Math.cos(g)-0.032077*Math.sin(g)-0.014615*Math.cos(2*g)-0.040849*Math.sin(2*g));
    const dec=0.006918-0.399912*Math.cos(g)+0.070257*Math.sin(g)-0.006758*Math.cos(2*g)+0.000907*Math.sin(2*g)-0.002697*Math.cos(3*g)+0.00148*Math.sin(3*g);
    const tst=hh*60+eqt+4*SK_LON-60*SK_TZ; const ha=(tst/4-180)*SK_RAD;
    return Math.asin(Math.sin(SK_LAT*SK_RAD)*Math.sin(dec)+Math.cos(SK_LAT*SK_RAD)*Math.cos(dec)*Math.cos(ha))/SK_RAD;
  }
  const _skRS = {};
  function skRiseSet(y,m,d){
    const k=y+'-'+m+'-'+d; if(_skRS[k]) return _skRS[k];
    let rise=null,set=null,prev=skElev(y,m,d,0);
    for(let i=1;i<=1440;i++){ const e=skElev(y,m,d,i/60); if(prev<-0.833&&e>=-0.833&&rise===null) rise=i/60; if(prev>=-0.833&&e<-0.833&&set===null) set=i/60; prev=e; }
    return (_skRS[k]={rise:rise==null?6:rise, set:set==null?18:set});
  }
  // Ay evresi: Meeus (Astronomical Algorithms, böl. 48) faz açısı; E = Ay'ın Güneş'ten boylam farkı (0=yeni ay, 180=dolunay)
  function skMoon(now){
    const jd=now.getTime()/86400000+2440587.5, T=(jd-2451545)/36525, r=SK_RAD;
    const D=297.8501921+445267.1114034*T, M=357.5291092+35999.0502909*T, Mp=134.9633964+477198.8675055*T;
    let E=D+6.289*Math.sin(Mp*r)-2.100*Math.sin(M*r)+1.274*Math.sin((2*D-Mp)*r)+0.658*Math.sin(2*D*r)+0.214*Math.sin(2*Mp*r)+0.110*Math.sin(D*r);
    E=((E%360)+360)%360;
    const k=(1-Math.cos(E*r))/2; let name;
    if(E<=7||E>=353) name='Yeni ay'; else if(E<83) name='Büyüyen hilal'; else if(E<=97) name='İlk dördün';
    else if(E<173) name='Büyüyen ay'; else if(E<=187) name='Dolunay'; else if(E<263) name='Küçülen ay';
    else if(E<=277) name='Son dördün'; else name='Küçülen hilal';
    return {E:E, k:k, waxing:E<180, name:name, pct:Math.round(k*100)};
  }
  const SK_KEYS=[[-18,'#050a1c','#0b1534','#1c2a5e'],[-10,'#0e1a40','#2a3470','#6a4f8c'],[-4,'#22306a','#8a4f86','#f08a5d'],[0,'#3a4a8c','#d4707a','#ffb35c'],[6,'#4a78c0','#e9a86c','#ffd27a'],[18,'#2f6fba','#7fb2e5','#ffe6a8'],[90,'#2a68b4','#86bbea','#fff0c0']];
  function skHex(c){ return [1,3,5].map(i=>parseInt(c.slice(i,i+2),16)); }
  function skMix(a,b,t){ const A=skHex(a),B=skHex(b); return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join(''); }
  function skRgba(c,a){ const v=skHex(c); return 'rgba('+v[0]+','+v[1]+','+v[2]+','+a+')'; }
  function skCols(e){
    if(e<=SK_KEYS[0][0]) return [SK_KEYS[0][1],SK_KEYS[0][2],SK_KEYS[0][3]];
    for(let i=0;i<SK_KEYS.length-1;i++){ const a=SK_KEYS[i], b=SK_KEYS[i+1]; if(e<=b[0]){ const t=(e-a[0])/(b[0]-a[0]); return [skMix(a[1],b[1],t),skMix(a[2],b[2],t),skMix(a[3],b[3],t)]; } }
    const z=SK_KEYS[SK_KEYS.length-1]; return [z[1],z[2],z[3]];
  }
  function skHM(h){ let m=Math.round(h*60); const hh=Math.floor(m/60)%24, mm=m%60; return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0'); }
  function skDur(minTotal){ const m=Math.max(0,Math.round(minTotal)); return m>=60 ? Math.floor(m/60)+' sa'+(m%60?' '+(m%60)+' dk':'') : m+' dk'; }
  const SK_STARS = Array.from({length:44},(_,i)=>({x:((i*97)%1000)/10, y:3+((i*53)%62), r:(i%5===0?2:1.4), o:0.35+((i*31)%60)/100}));
  // Tüm gökyüzü değerlerini hesaplar (saf fonksiyon; DOM'a dokunmaz). narrow: dar ekranda yay kenarlara yayılır.
  function skCompute(now, narrow){
    const L=skLocal(now), rs=skRiseSet(L.y,L.m,L.d), hh=L.hh, e=skElev(L.y,L.m,L.d,hh);
    const [top,hor,glow]=skCols(e);
    const ax0=narrow?9:26, ax1=narrow?91:74, ay=85, peak=26;
    const span=rs.set-rs.rise, t=(hh-rs.rise)/span;
    const bez=(tt)=>[ax0+(ax1-ax0)*tt, ay-4*peak*tt*(1-tt)];
    let sx,sy;
    if(t>=0&&t<=1){ [sx,sy]=bez(t); } else { const tt=t<0?Math.max(t,-0.12):Math.min(t,1.12); sx=ax0+(ax1-ax0)*tt; sy=ay+Math.abs(tt<0?tt:tt-1)*125; }
    const hn=hh<12?hh+24:hh; const mt=Math.max(0,Math.min(1,(hn-rs.set)/(rs.rise+24-rs.set)));
    const mp=bez(mt); const moon=skMoon(now);
    let arc=''; for(let i=0;i<=40;i++){ const p=bez(i/40); arc+=(i?'L':'M')+p[0].toFixed(2)+' '+p[1].toFixed(2); }
    const noon=(rs.rise+rs.set)/2, morning=hh<noon;
    let tag; if(e<-12) tag='GECE'; else if(e<-0.833) tag=morning?'ŞAFAK':'ALACAKARANLIK'; else if(e<8) tag=morning?'GÜN DOĞUMU':'ALTIN SAAT'; else tag='GÜNDÜZ';
    const hr=Math.floor(hh),g=hr<5?'İyi geceler':hr<12?'Günaydın':hr<18?'İyi günler':hr<22?'İyi akşamlar':'İyi geceler';
    let sk; const toRise=(rs.rise-hh)*60, toSet=(rs.set-hh)*60;
    if(toRise>0&&toRise<=120) sk='Güneşin doğmasına '+skDur(toRise);
    else if(toSet>0&&toSet<=150) sk='Gün batımına '+skDur(toSet);
    else if(e>=-0.833) sk='Gün doğumu '+skHM(rs.rise)+' · batımı '+skHM(rs.set);
    else if(e>-12) sk='Alacakaranlık';
    else sk=moon.name+' · %'+moon.pct+' aydınlık';
    const sub=(window.SKCTX?window.SKCTX+'\n':'')+sk;
    const day=Math.round((rs.set-rs.rise)*60);
    return {
      top:top, hor:hor, glow:glow, e:e, sunX:sx, sunY:sy, moonX:mp[0], moonY:mp[1]-3.5, moon:moon,
      moonOp:Math.max(0,Math.min(1,(-e-3)/7)), starOp:Math.max(0,Math.min(1,(-e-2)/8)),
      sunOn:e>-3, arc:arc, ax0:ax0, ax1:ax1, ay:ay, tag:tag, g:g, sub:sub, ink:e>6,
      time:String(Math.floor(hh)).padStart(2,'0')+':'+String(Math.floor(hh%1*60+1e-6)).padStart(2,'0'),
      date:L.d+' '+TR_MONTHS[L.m]+' · '+TR_DAYS[new Date(Date.UTC(L.y,L.m,L.d)).getUTCDay()],
      info:skHM(rs.rise)+'|'+skHM(rs.set)+'|'+Math.floor(day/60)+' sa '+(day%60)+' dk'
    };
  }
  // Ay (hilal/dolunay) yolu: aydınlık kenar + gölgeli terminatör
  function skMoonPath(mn){
    const r=15, k=Math.cos(2*Math.PI*(mn.E/360)), rx=r*Math.abs(k), wax=mn.waxing, cr=k>0;
    const limb=wax?1:0, term=wax?(cr?0:1):(cr?1:0);
    return 'M0 '+(-r)+'A'+r+' '+r+' 0 0 '+limb+' 0 '+r+'A'+rx.toFixed(2)+' '+r+' 0 0 '+term+' 0 '+(-r)+'Z';
  }
  const SK_ICO_SUN='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const SK_ICO_SET='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 18a5 5 0 0 0-10 0"/><path d="M12 9V2M1 18h2M21 18h2M22 22H2M8 6l4 3 4-3"/></svg>';
  function skSkeleton(v){
    const stars=SK_STARS.map(s=>'<i style="left:'+s.x+'%;top:'+s.y+'%;width:'+s.r+'px;height:'+s.r+'px;--o:'+s.o+'"></i>').join('');
    return '<div class="sk" data-sk="1">'
      + '<div class="sk-bg"></div><div class="sk-stars">'+stars+'</div>'
      + '<div class="sk-clouds" style="animation-delay:-'+((Date.now()/1000)%140).toFixed(1)+'s"><b style="left:13%;top:20%;width:96px;height:15px"></b><b style="left:15.5%;top:15%;width:58px;height:13px"></b><b style="left:62%;top:30%;width:112px;height:14px"></b><b style="left:66%;top:23%;width:64px;height:12px"></b><b style="left:84%;top:13%;width:90px;height:12px"></b></div>'
      + '<svg class="sk-arcsvg" viewBox="0 0 100 100" preserveAspectRatio="none"><path class="sk-arc" d="" fill="none" stroke="rgba(255,255,255,.4)" stroke-width="1.6" stroke-dasharray="2 6" vector-effect="non-scaling-stroke"/><line class="sk-hz" y1="79.5" y2="79.5" stroke="rgba(255,255,255,.28)" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>'
      + '<div class="sk-sun" style="--pd:-'+((Date.now()/1000)%6).toFixed(1)+'s"><b class="g2"></b><b class="g1"></b><span></span></div>'
      + '<svg class="sk-moon" viewBox="-20 -20 40 40"><circle r="15" fill="#f4f1e6" opacity=".14"/><path class="sk-mp" d="" fill="#f4f1e6"/></svg>'
      + '<div class="sk-tag"></div><div class="sk-txt"><div class="sk-g"></div><div class="sk-s"></div></div>'
      + '<div class="sk-clk"><div class="sk-t"></div><div class="sk-d"></div></div>'
      + '<div class="sk-inf"><span class="i1">'+SK_ICO_SUN+'<em></em></span><span class="i2">'+SK_ICO_SET+'<em></em></span><span class="i3"></span></div>'
      + '</div>';
  }
  function skApply(root, v){
    const q=(s)=>root.querySelector(s); const set=(s,t)=>{ const n=q(s); if(n && n.textContent!==t) n.textContent=t; };
    const sk=q('.sk'); if(!sk) return;
    sk.classList.toggle('sk-ink', !!v.ink);
    q('.sk-bg').style.background='radial-gradient(ellipse 52% 120% at '+v.sunX.toFixed(1)+'% '+Math.min(130,v.sunY).toFixed(1)+'%, '+v.glow+(v.e>-4?'dd':'66')+' 0%, transparent 70%), linear-gradient(180deg,'+v.top+' 0%,'+v.hor+' 100%)';
    q('.sk-stars').style.opacity=v.starOp.toFixed(2);
    q('.sk-clouds').style.opacity=(v.e>-6?0.5:0.18); q('.sk-clouds').style.setProperty('--cc', v.e>0?'#fff':'#9fb0d8');
    q('.sk-arc').setAttribute('d', v.arc);
    const hz=q('.sk-hz'); hz.setAttribute('x1',(v.ax0-2).toFixed(1)); hz.setAttribute('x2',(v.ax1+2).toFixed(1));
    const sun=q('.sk-sun'); sun.style.display=v.sunOn?'block':'none'; sun.style.left=v.sunX.toFixed(2)+'%'; sun.style.top=v.sunY.toFixed(2)+'%';
    sun.style.setProperty('--gl', v.glow); sun.style.setProperty('--g1', skRgba(v.glow,.28)); sun.style.setProperty('--g2', skRgba(v.glow,.17)); sun.style.setProperty('--core', v.e>6?'#fff2b8':'#ffd27a');
    const mo=q('.sk-moon'); mo.style.opacity=v.moonOp.toFixed(2); mo.style.display=v.moonOp>0.01?'block':'none'; mo.style.left=v.moonX.toFixed(2)+'%'; mo.style.top=v.moonY.toFixed(2)+'%';
    q('.sk-mp').setAttribute('d', skMoonPath(v.moon));
    set('.sk-tag', v.tag); set('.sk-g', v.g); set('.sk-s', v.sub); set('.sk-t', v.time); set('.sk-d', v.date);
    const inf=v.info.split('|'); set('.sk-inf .i1 em', inf[0]); set('.sk-inf .i2 em', inf[1]); set('.sk-inf .i3', 'Gün '+inf[2]);
  }



  // ================= ÇİZİM =================
  var CTX = null, seenTimer = null;
  function gorunurMu(C) { return !yayinKapali(C); }
  function render() {
    if (kilit) return;
    var C = baglam(); CTX = C;
    var gor = gorunurMu(C), nvw = $('nvw'), nvp = $('nvp');
    nvw.style.display = gor ? '' : 'none';
    nvp.style.display = (gor && (haberListe(C.y).length || baglantiListe(C.y).length)) ? '' : 'none';
    if ((TAB === 2 && nvw.style.display === 'none') || (TAB === 3 && nvp.style.display === 'none')) TAB = 0;
    [].forEach.call(document.querySelectorAll('nav button'), function (b) { b.classList.toggle('on', +b.getAttribute('data-t') === TAB); });
    var top = $('top'), hh = topHTML(C); top.innerHTML = hh; top.dataset.h = hh; top.dataset.kk = hh.replace(/\d+/g, '#');
    ['t0', 't1', 't2', 't3'].forEach(function (id, i) { $(id).hidden = i !== TAB; });
    if (TAB === 0) { $('t0').innerHTML = t0HTML(C); uygulaGizle(); }
    else if (TAB === 1) $('t1').innerHTML = t1HTML(C);
    else if (TAB === 2) $('t2').innerHTML = t2HTML(C);
    else $('t3').innerHTML = t3HTML(C);
    bolgeRenk();
    $('scr').dataset.tab = TAB;
    yaz(K.son, JSON.stringify([TAB, PS]));
    tick(true);
    var gs = document.getElementById('gs'); if (gs && TAB === 0) { var nk = gs.querySelector('.gk.now') || gs.querySelector('.gk:not(.past)'); if (nk) gs.scrollLeft = Math.max(0, nk.offsetLeft - (gs.clientWidth - nk.offsetWidth) / 2); }
    if (seenTimer) clearTimeout(seenTimer);
    seenTimer = setTimeout(function () {
      if (document.hidden || kilit || !CTX || !CTX.y || yayinKapali(CTX)) return;
      if (TAB === 0) gorulduYaz(duyuruListe(CTX.y).map(duyuruAnahtar).concat(haberListe(CTX.y).map(haberAnahtar)));
      else if (TAB === 3) gorulduYaz(haberListe(CTX.y).map(haberAnahtar));
    }, 5000);
  }
  var BR = { gunum: 'var(--c-gunum)', yarin: 'var(--c-yarin)', yaklasan: 'var(--c-yaklasan)', neler: 'var(--c-neler)', nobet: 'var(--c-nobet)', pano: 'var(--c-pano)', not: 'var(--c-not)' };
  function bolgeAdi(e) {
    var t = (e.textContent || '').slice(0, 48).toLocaleLowerCase('tr'), k = e.getAttribute('data-k');
    if (t.indexOf('günüm') === 0) { var on = document.querySelector('#gv button.on'); return on && on.getAttribute('data-v') !== 'b' ? 'yarin' : 'gunum'; }
    if (k === 'akis' || k === 'cov' || t.indexOf('ders doldurma') === 0 || t.indexOf('bugünkü program') === 0 || t.indexOf('gün akışı') === 0) return 'gunum';
    if (t.indexOf('yaklaşan') === 0 || t.indexOf('kayıtları') > 0) return 'yaklasan';
    if (t.indexOf('okulda neler') === 0) return 'neler';
    if (t.indexOf('nöbet') >= 0 || t.indexOf('yeni nöbet') === 0) return 'nobet';
    if (t.indexOf('notların') === 0 || t.indexOf('hatırlatma') >= 0) return 'not';
    return 'pano';
  }
  function bolgeRenk() {
    ['t0', 't1', 't2', 't3'].forEach(function (id) {
      var el = $(id); if (!el) return;
      var l = [].filter.call(el.children, function (e) { return e.classList.contains('sec') && e.style.display !== 'none'; });
      [].forEach.call(el.children, function (e) { if (e.classList.contains('sec') && e.style.display === 'none') e.removeAttribute('data-r'); });
      var r = l.map(bolgeAdi);
      l.forEach(function (e, i) {
        e.setAttribute('data-r', r[i]); e.style.setProperty('--sc', BR[r[i]]);
        if (i > 0) e.style.setProperty('--scp', BR[r[i - 1]]); else e.style.removeProperty('--scp');
        if (i < l.length - 1) e.style.setProperty('--scn', BR[r[i + 1]]); else e.style.removeProperty('--scn');
      });
    });
  }
  function ayrintiRenk(kod) {
    var p = String(kod).split(':'), t = p[0], r = 'pano';
    if (t === 'ak' || t === 'dn') r = 'gunum';
    else if (t === 'gun') r = p[1] === iso(simdi()) ? 'gunum' : 'yarin';
    else if (t === 'nb' || t === 'nbd') r = 'nobet';
    else if (t === 'du') r = 'neler';
    else if (t === 'ol' || t === 'bg') r = 'yaklasan';
    var d = $('dt'); d.setAttribute('data-r', r); d.style.setProperty('--sc', BR[r]);
  }
  function uygulaGizle() { [].forEach.call(document.querySelectorAll('#t0 [data-k]'), function (e) { e.style.display = GIZLE[e.dataset.k] ? 'none' : ''; }); bolgeRenk(); }
  function kaymaDurumu() {
    var s = $('scr'); if (!s) return;
    $('mini').classList.toggle('on', TAB === 0 && !!document.querySelector('#top .hr') && s.scrollTop > 230);
  }
  function tick(zorla) {
    if (kilit || document.hidden || !CTX) return;
    var C = baglam();
    if (C.gb.ds !== CTX.gb.ds && !zorla) { render(); return; }
    CTX = C;
    if (TAB === 0 || (TAB === 1 && PS === 0)) {
      var tp = $('top'), hh = topHTML(C), k1 = hh.replace(/-?\d+\.\d+s/g, ''), k0 = (tp.dataset.h || '').replace(/-?\d+\.\d+s/g, '');
      var skyAyni = !!$('skyc') && hh.indexOf('id="skyc"') >= 0 && k1.replace(/<div class="sk"[\s\S]*$/, '') === k0.replace(/<div class="sk"[\s\S]*$/, '');
      if (!skyAyni && tp.dataset.h !== hh) {
        var kk = hh.replace(/\d+/g, '#');
        if (tp.dataset.kk === kk && tp.querySelector('[data-lv]')) {
          var tmp = document.createElement('div'); tmp.innerHTML = hh;
          [].forEach.call(tmp.querySelectorAll('[data-lv]'), function (nd) { var o = tp.querySelector('[data-lv="' + nd.getAttribute('data-lv') + '"]'); if (o && o.innerHTML !== nd.innerHTML) o.innerHTML = nd.innerHTML; });
        } else { tp.innerHTML = hh; tp.dataset.kk = kk; }
        tp.dataset.h = hh;
      }
    }
    var skc = $('skyc'); if (skc && typeof skApply === 'function') skApply(skc, skCompute(simdi(), true));
    var g = guncel(C), c = g[0];
    $('mb').textContent = c ? f2(Math.floor((mdk(c[3]) * 60 - C.T) / 60)) + ':' + f2((mdk(c[3]) * 60 - C.T) % 60) : '';
    $('ms').textContent = c ? c[1] : '';
    [].forEach.call(document.querySelectorAll('.flow'), function (el) {
      var rows = [].slice.call(el.querySelectorAll('.fr')), yy = null;
      rows.forEach(function (r) { var s = +r.dataset.s, e = +r.dataset.e; r.classList.toggle('past', C.T >= e); r.classList.toggle('now', C.T >= s && C.T < e); if (C.T >= s && C.T < e) r.setAttribute('data-k', 'kalan ' + sureTxt(e - C.T)); else r.removeAttribute('data-k'); if (C.T >= s && C.T < e) yy = r.offsetTop + (C.T - s) / (e - s) * r.offsetHeight; });
      if (yy == null && rows.length) yy = C.T < +rows[0].dataset.s ? rows[0].offsetTop : rows[rows.length - 1].offsetTop + rows[rows.length - 1].offsetHeight;
      if (yy != null) { el.querySelector('.rail i').style.height = yy + 'px'; el.querySelector('.cur').style.top = yy + 'px'; }
    });
    [].forEach.call(document.querySelectorAll('[data-bg="1"] .gk, [data-bg="1"] .gx'), function (k) {
      var s0 = +k.dataset.s, e0 = +k.dataset.e, now = C.T >= s0 && C.T < e0;
      k.classList.toggle('past', C.T >= e0); k.classList.toggle('now', now);
      if (k.classList.contains('ar')) return;
      var kk = k.querySelector('.k'); if (kk) kk.textContent = now ? 'kalan ' + sureTxt(e0 - C.T) : (C.T >= e0 ? 'bitti' : ''); var u = k.querySelector('.pb u'); if (u) u.style.width = now ? ((C.T - s0) / (e0 - s0) * 100).toFixed(1) + '%' : '0';
    });
    var ak = document.querySelector('.gakis[data-bg="1"]');
    if (ak) {
      var seg = [].slice.call(ak.children).filter(function (e) { return e.dataset && e.dataset.s; }), yv = null, nde = ak.querySelector('.gnd');
      if (seg.length) {
        var f0 = seg[0], l0 = seg[seg.length - 1];
        if (C.T <= +f0.dataset.s) yv = f0.offsetTop;
        else if (C.T >= +l0.dataset.e) yv = l0.offsetTop + l0.offsetHeight;
        else seg.forEach(function (e) { var s1 = +e.dataset.s, e1 = +e.dataset.e; if (yv == null && C.T >= s1 && C.T < e1) yv = e.offsetTop + (C.T - s1) / (e1 - s1) * e.offsetHeight; });
      }
      if (yv != null && nde) { nde.style.display = 'block'; nde.style.top = yv.toFixed(1) + 'px'; }
    }
    var dl = document.querySelector('.dial[data-bg="1"]');
    if (dl) {
      var nd = dl.querySelector('.nd'), a0 = +nd.dataset.a0, z0 = +nd.dataset.z0, ang = Math.max(0, Math.min(1, (C.T - a0) / (z0 - a0))) * 360;
      nd.style.display = ''; nd.setAttribute('transform', 'rotate(' + ang.toFixed(2) + ' 120 120)');
      var cur = null, nxt = null;
      [].forEach.call(dl.querySelectorAll('.ar'), function (a) { var s0 = +a.dataset.s, e0 = +a.dataset.e; a.classList.toggle('past', C.T >= e0); a.classList.toggle('now', C.T >= s0 && C.T < e0); if (C.T >= s0 && C.T < e0) cur = a; else if (C.T < s0 && !nxt) nxt = a; });
      var dk = dl.querySelector('.dk'), dn = dl.querySelector('.dn'), dd = dl.querySelector('.dd');
      if (cur) { dk.textContent = 'Şu an'; dn.textContent = cur.dataset.no + '. ders'; dd.textContent = (cur.dataset.c ? cur.dataset.c + ' · ' : '') + 'kalan ' + sureTxt(+cur.dataset.e - C.T); }
      else if (nxt) { dk.textContent = C.T < a0 ? 'Ders başlamadan' : 'Teneffüs'; dn.textContent = 'Sıradaki ' + nxt.dataset.no + '. ders'; dd.textContent = nxt.dataset.t.slice(0, 5) + (nxt.dataset.c ? ' · ' + nxt.dataset.c : ''); }
      else { dk.textContent = 'Bugün'; dn.textContent = 'Bitti'; dd.textContent = ''; }
    }
    kaymaDurumu();
  }

  // ================= TIKLAMALAR (tek yerden) =================
  function kapat() { $('sh').classList.remove('on'); $('ns').classList.remove('on'); $('shd').classList.remove('on'); }
  document.addEventListener('click', function (ev) {
    var t = ev.target; if (!t || !t.closest || kilit) return;
    var b;
    if (t.closest('#dtd') || t.closest('[data-dtx]')) { dtKapat(); return; }
    if ((b = t.closest('[data-nt]'))) { var kk = b.getAttribute('data-nt'); dtKapat(); notAc(kk, null); return; }
    if ((b = t.closest('[data-dt]')) && !t.closest('a')) { dtAc(b.getAttribute('data-dt')); return; }
    if ((b = t.closest('nav button'))) { TAB = +b.getAttribute('data-t'); $('scr').scrollTop = 0; render(); return; }
    if ((b = t.closest('[data-kzr]'))) { var w0 = $('kzw'); if (w0) { w0.innerHTML = '<div class="kzn">Kazanımlar yükleniyor…</div>'; var c0 = KZ.rk; if (c0) kzDoldur(c0.my, c0.ds); } return; }
    if ((b = t.closest('[data-kz]')) && KZ.cur) { var ix = +b.getAttribute('data-kz'); KZ.sel = KZ.sel === ix ? -1 : ix; kzCiz(); return; }
    if ((b = t.closest('[data-kzi]')) && KZ.cur) { var c = KZ.cur, q = +b.getAttribute('data-kzi'), h = c.P.uniteler ? { m: kzFlat(c.P) } : kzHafta(c.P, c.ds); if (h && h.m[q]) { var isl = okuJ(K.isl, {}), kk = c.P.uniteler ? kzAnkU(c.P, c.my, h.m[q]) : kzAnk(c.P, c.my, h, q); if (isl[kk]) delete isl[kk]; else isl[kk] = 1; yaz(K.isl, JSON.stringify(isl)); kzCiz(); } return; }
    if (t.closest('#tb')) { temaDegis(); return; }
    if (t.closest('#ob')) { ayarAc(); return; }
    if (t.closest('#yn')) { yenile(true); return; }
    if ((b = t.closest('#pt button'))) { PS = +b.dataset.p; render(); return; }
    if ((b = t.closest('#gv button'))) { if (!b.disabled) { GV = b.dataset.v; render(); } return; }
    if ((b = t.closest('#yk button'))) { YK = +b.dataset.v; render(); return; }
    if ((b = t.closest('#cv button'))) { CV = +b.dataset.cv; render(); return; }
    if ((b = t.closest('[data-mo]'))) { MO = +b.dataset.mo ? MO + (+b.dataset.mo) : 0; render(); return; }
    if ((b = t.closest('#kf button'))) { KF = b.textContent; render(); return; }
    if ((b = t.closest('#wt button'))) { WK = +b.dataset.w; render(); return; }
    if ((b = t.closest('#ch button'))) { CAT = b.textContent; render(); return; }
    if ((b = t.closest('[data-go-tab]'))) { TAB = +b.dataset.goTab; $('scr').scrollTop = 0; render(); return; }
    if ((b = t.closest('[data-go]'))) { WK = +b.dataset.go; render(); return; }
    if ((b = t.closest('#t1 [data-c]'))) { dtHucre(b.dataset.c); return; }
    if ((b = t.closest('#t1 [data-n]'))) { notAc(null, b.dataset.n); return; }
    if (t.closest('#addn')) { notAc(null, null, 1); return; }
    if (t.closest('#bk')) { yedekle(); return; }
    if (t.closest('#shd')) { kapat(); return; }
  });
  function yedekle() {
    var m = $('bkm'), txt = JSON.stringify(NT);
    function tamam() { m.style.color = 'var(--teal)'; m.textContent = 'Yedek kopyalandı. Bir yere yapıştırıp sakla.'; }
    try { navigator.clipboard.writeText(txt).then(tamam, function () { m.textContent = 'Kopyalanamadı.'; }); } catch (e) { m.textContent = 'Kopyalanamadı.'; }
  }
  $('scr').addEventListener('scroll', kaymaDurumu, { passive: true });
  document.addEventListener('scroll', function (e) { var p = e.target; if (p && p.id === 'pano') { var i = Math.round(p.scrollLeft / (p.firstElementChild ? p.firstElementChild.offsetWidth : 1)); [].forEach.call(document.querySelectorAll('#seg i'), function (d, j) { d.classList.toggle('on', j === i); }); } }, true);

  // ---- sekmeler arası kaydırma
  (function () {
    var x0 = 0, y0 = 0, t0 = 0, ok = false, sc = $('scr');
    sc.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); ok = !e.target.closest('.pano,.chips,input,textarea,.sh,.lock,.tt,.hcar,.gstrip,.ystrip,.mg'); }, { passive: true });
    sc.addEventListener('touchend', function (e) {
      if (!ok) return; var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6 || Date.now() - t0 > 700) return;
      var bs = [].filter.call(document.querySelectorAll('nav button'), function (b) { return b.style.display !== 'none'; });
      var i = bs.findIndex(function (b) { return b.classList.contains('on'); }), j = i + (dx < 0 ? 1 : -1);
      if (j < 0 || j >= bs.length) return;
      TAB = +bs[j].getAttribute('data-t'); sc.scrollTop = 0; render();
      sc.classList.remove('sL', 'sR'); void sc.offsetWidth; sc.classList.add(dx < 0 ? 'sL' : 'sR');
    }, { passive: true });
  })();

  // ================= AYRINTI EKRANLARI (dokununca açılır, geri hareketiyle kapanır) =================
  var DT = { acik: false };
  function dtGoster(baslik, html) {
    $('dt').innerHTML = '<div class="dh"><button type="button" class="dback" data-dtx="1" aria-label="Geri">' + IK_ONC + '</button><h3 class="d">' + esc(baslik) + '</h3></div><div class="db">' + html + '</div>';
    if (!DT.acik) { DT.acik = true; try { history.pushState({ dt: 1 }, ''); } catch (e) {} }
    $('dt').classList.add('on'); $('dtd').classList.add('on'); var db = $('dt').querySelector('.db'); if (db) db.scrollTop = 0;
  }
  function dtKapat() {
    if (!DT.acik) return; DT.acik = false;
    $('dt').classList.remove('on'); $('dtd').classList.remove('on');
    try { if (history.state && history.state.dt) history.back(); } catch (e) {}
    render();
  }
  window.addEventListener('popstate', function () { if (DT.acik) { DT.acik = false; $('dt').classList.remove('on'); $('dtd').classList.remove('on'); render(); } });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') dtKapat(); });
  function sonrakiGun(wd) { var d = simdi(); for (var i = 0; i < 8; i++) { var x = gunEkle(d, i); if ((x.getDay() || 7) === wd) return iso(x); } return iso(d); }
  function gunBaglam(d) {
    var y = Y(), gb = gunBilgi(y, d), G = { y: y, d: d, gb: gb, sc: akisKur(gb.ders || []), MY: {}, COV: {} };
    if (y && gb.tip === 'ders') {
      gb.ders.forEach(function (x, i) { var h = hucreAl(y, gb.wd, i + 1); if (h) G.MY[i + 1] = h; });
      doldurmaListe(y).forEach(function (x) { if (x.tarih === gb.ds) G.COV[+x.saat] = x; });
    }
    return G;
  }
  function kvH(k, v) { return '<div class="kv"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>'; }
  function dtSatir(kod, sol, orta, alt, sag, cls) {
    return '<div class="rw' + (cls ? ' ' + cls : '') + '" data-dt="' + esc(kod) + '">' + (sol ? '<span class="z" style="min-width:46px;flex:none;white-space:nowrap;color:var(--tx);font-weight:650">' + esc(sol) + '</span>' : '') + '<div class="a"><b>' + esc(orta) + '</b>' + (alt ? '<span class="s">' + esc(alt) + '</span>' : '') + '</div>' + (sag ? '<span class="z">' + esc(sag) + '</span>' : '') + '</div>';
  }
  function dtAc(kod) {
    var p = String(kod).split(':'), t = p[0];
    ayrintiRenk(kod);
    if (t === 'ak') return dtAk(p[1], +p[2]);
    if (t === 'dn') { var G = gunBaglam(tarihCoz(p[1])), ix = -1; G.sc.forEach(function (r, i) { if (r[0] === 'ders' && dersNo(r) === +p[2]) ix = i; }); return ix >= 0 ? dtAk(p[1], ix) : undefined; }
    if (t === 'gun') return dtGun(p[1]);
    if (t === 'nb') return dtNobetci(+p[1]);
    if (t === 'nbd') return dtNbd();
    if (t === 'du') return dtDuyuru(+p[1]);
    if (t === 'hb') return dtHaber(+p[1]);
    if (t === 'bg') return dtBelirli();
    if (t === 'ol') return dtOlay(+p[1]);
  }
  function dtHucre(kk) {
    var C = CTX || baglam(), a = String(kk).split(','), g = haftaGunleri(C.d)[+a[0]]; if (!g) return;
    dtAc('dn:' + iso(g) + ':' + (+a[1] + 1));
  }

  // ================= KAZANIMLAR (MEB yıllık planı; uygulamayla birlikte gelen statik dosyalar, öğretmenin cihazında okunur) =================
  var KZ = { idx: null, dos: {}, cur: null, sel: -1, bekle: {} };
  var KZ_ANAH = { mat: 'mat', matematik: 'mat', turkce: 'tur', fen: 'fen', fenbilimleri: 'fen', ing: 'ing', ingilizce: 'ing', sosyal: 'sos', sosyalbilgiler: 'sos', inklap: 'ita', inkilap: 'ita', ita: 'ita', dink: 'dkab', dkab: 'dkab', muzik: 'muz', bedegt: 'bes', bedenegitimi: 'bes', resim: 'gs', gorselsanatlar: 'gs', tektsr: 'tt', tektas: 'tt', teknolojitasarim: 'tt', blsm: 'bty', bilisim: 'bty', dinkulturu: 'dkab', dinkulturuveahlakbilgisi: 'dkab', teknolojivetasarim: 'tt', bilisimteknolojileri: 'bty', bilisimteknolojilerivezilim: 'bty', tcinkilaptarihi: 'ita', inkilaptarihi: 'ita', inkilaptarihivataturkculuk: 'ita', inkilaptarihiveataturkculuk: 'ita', gorselsanat: 'gs', afets: 'afet', afetbilinci: 'afet', ahlks: 'ahlk', ahlakvevatandaslik: 'ahlk', cevres: 'cevre', cevreegitimi: 'cevre' };
  // Ders kısaltması esnek eşlenir: tam ad ya da en az 3 harflik ön ek ("Müz.", "BedEğ", "Blşm."); birden çok farklı derse uyuyorsa eşleşmez.
  function kzA(d) {
    var x = kzAd(d); if (!x) return null; if (KZ_ANAH[x]) return KZ_ANAH[x];
    if (x.length < 3) return null;
    var bul = null, k;
    for (k in KZ_ANAH) if (k.indexOf(x) === 0) { if (bul && bul !== KZ_ANAH[k]) return null; bul = KZ_ANAH[k]; }
    return bul;
  }
  // Kazanımı bilerek olmayan dersler (seçmeli, rehberlik); bunlarda sessiz kalınır, başka her eşleşmeme görünür bir not alır.
  var KZ_DOSYA = { afet: 'afet1.json', ahlk: 'ahlk1.json', cevre: 'cevre8.json' };
  var KZ_YOK = /^(reh|spor|yabdil|yabancidil|gkn|kultmed|kulturmed|dersdoldurma|doldurma)/;
  var KZ_TANI = { son: '', idx: '', dosya: '' };
  // Hücredeki ders adından eşle; ders adı yoksa ya da tanınmıyorsa öğretmenin kayıtlı branşından yedek eşleme (açıkça kazanımsız dersler hariç).
  function kzEsle(my) {
    var d = my && my.ders, a = kzA(d), kim = null, br = '';
    if (a) { KZ_TANI.son = 'ders "' + (d || '') + '" → ' + a; return { a: a, yedek: false }; }
    if (d && KZ_YOK.test(kzAd(d))) { KZ_TANI.son = 'ders "' + d + '" kazanımsız ders'; return null; }
    try { kim = kisisel(Y(), 'kimlik'); br = (kim && kim.brans) || ''; } catch (e) {}
    a = kzA(br);
    if (a) { KZ_TANI.son = 'ders "' + (d || '') + '" tanınmadı; branş "' + br + '" → ' + a; return { a: a, yedek: true }; }
    KZ_TANI.son = 'ders "' + (d || '') + '" tanınmadı, branş "' + br + '" da tanınmadı'; return { a: null, yedek: false, tani: true };
  }
  function kzAd(a) { return String(a || '').toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, function (c) { return { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' }[c]; }).replace(/[^a-z]/g, ''); }
  function kzJson(url) {
    if (KZ.bekle[url]) return KZ.bekle[url];
    return (KZ.bekle[url] = fetch(url).then(function (r) { if (!r.ok) throw 0; return r.json(); }).catch(function () { delete KZ.bekle[url]; return null; }));
  }
  function kzIndeks() {
    return kzJson('kazanim/index.json').then(function (j) { if (j && Array.isArray(j.plan)) { var ilk = !KZ.idx; KZ.idx = j; KZ_TANI.idx = j.plan.length + ' plan'; if (ilk && !kilit && !DT.acik) render(); } else if (!KZ.idx) KZ_TANI.idx = 'yüklenemedi'; return KZ.idx; });
  }
  function kzPlan(my, a) {
    if (!my || !a) return null;
    var g = parseInt(my.sinif, 10); if (!(g >= 5 && g <= 8)) return null;
    if (KZ.idx) { for (var i = 0; i < KZ.idx.plan.length; i++) if (KZ.idx.plan[i].a === a && KZ.idx.plan[i].s === g) return KZ.idx.plan[i]; return null; }
    // Liste dosyası yüklenemediyse dosya adı doğrudan türetilir (liste olmadan da çalışsın)
    return { a: a, s: g, f: KZ_DOSYA[a] || (a + g + '.json'), yedekAd: true };
  }
  function kzHafta(P, ds) {
    var son = null;
    for (var i = 0; i < P.haftalar.length; i++) {
      var h = P.haftalar[i]; if (!h.bas || !h.bit) continue;
      if (ds >= h.bas && ds <= iso(gunEkle(tarihCoz(h.bit), 2))) return h;
    }
    return son;
  }
  function kzAnk(P, my, h, i) { var m = h.m[i]; return P.anahtar + P.sinif + ':' + my.sinif + ':' + (m.k || (h.n + '#' + i)); }
  function kzCiz() {
    var c = KZ.cur, w = $('kzw'); if (!c || !w || w.getAttribute('data-ds') !== c.ds) return;
    if (c.P.uniteler) { kzCizU(c, w); return; }
    var P = c.P, my = c.my, h = kzHafta(P, c.ds), isl = okuJ(K.isl, {}), out = '';
    out += '<h4 class="kzt">Bu haftanın kazanımları</h4>';
    if (!h) { w.innerHTML = out + '<div class="kzn">Bu tarih için planda hafta bulunmuyor.</div>' + kzKaynak(P); return; }
    out += '<div class="kzs"><b>' + h.n + '. hafta</b> · ' + esc(aralik(h.bas, h.bit)) + (h.s ? ' · ' + esc(h.s) + ' ders saati' : '') + '</div>';
    if (h.u || h.kn) out += '<div class="kzu">' + (h.u ? '<b>' + esc(h.u) + '</b>' : '') + (h.kn ? '<span>' + esc(h.kn.length > 160 ? h.kn.slice(0, 157) + '…' : h.kn) + '</span>' : '') + '</div>';
    if (!h.m.length) { w.innerHTML = out + '<div class="kzn">' + (h.nt ? esc(h.nt) + '. ' : '') + 'Bu hafta için planda kazanım satırı yok.</div>' + kzKaynak(P); return; }
    var say = 0; h.m.forEach(function (m, i) { if (isl[kzAnk(P, my, h, i)]) say++; });
    out += '<div class="kzc0">' + h.m.map(function (m, i) {
      var k = kzAnk(P, my, h, i), on = KZ.sel === i, d = !!isl[k];
      return '<button type="button" class="kzc' + (on ? ' on' : '') + (d ? ' ok' : '') + '" data-kz="' + i + '" aria-expanded="' + (on ? 'true' : 'false') + '"><span>' + esc(m.k || ('K' + (i + 1))) + '</span>' + (d ? '<i aria-label="işlendi"></i>' : '') + '</button>';
    }).join('') + '</div>';
    if (KZ.sel >= 0 && h.m[KZ.sel]) {
      var m = h.m[KZ.sel], k = kzAnk(P, my, h, KZ.sel), d = !!isl[k];
      out += '<div class="kzp">' + (m.k ? '<b class="kzk">' + esc(m.k) + '</b>' : '') + (m.b ? '<em>' + esc(m.b) + '</em>' : '') + '<p>' + esc(m.t) + '</p>' + (m.d && m.d.length ? '<ul>' + m.d.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '')
        + '<button type="button" class="kzi' + (d ? ' on' : '') + '" data-kzi="' + KZ.sel + '"><span class="kzbox"></span>' + (d ? 'İşlendi · geri al' : 'İşlendi olarak işaretle') + '</button></div>';
    }
    if (h.o) out += '<details class="kzo"><summary>Ölçme ve değerlendirme</summary><p>' + esc(h.o) + '</p></details>';
    out += '<div class="kzm">' + say + '/' + h.m.length + ' işlendi · yalnız bu cihazda kayıtlı</div>' + kzKaynak(P);
    w.innerHTML = out;
  }
  // Hafta hafta planı olmayan dersler (seçmeliler): kazanımlar ünite sırasıyla listelenir
  function kzFlat(P) { var f = []; P.uniteler.forEach(function (u) { u.m.forEach(function (m) { f.push(m); }); }); return f; }
  function kzAnkU(P, my, m) { return P.anahtar + P.sinif + ':' + my.sinif + ':' + m.k; }
  function kzCizU(c, w) {
    var P = c.P, my = c.my, isl = okuJ(K.isl, {}), f = kzFlat(P), out = '', say = 0, idx = 0, i;
    for (i = 0; i < f.length; i++) if (isl[kzAnkU(P, my, f[i])]) say++;
    out += '<h4 class="kzt">Dersin kazanımları</h4><div class="kzs">Bu ders için hafta hafta plan yok. Kazanımlar ünite sırasıyla listelenir.</div>';
    P.uniteler.forEach(function (u) {
      var ilk = idx;
      out += '<div class="kzu"><b>' + esc(u.n + '. ' + u.u) + '</b>' + (u.saat ? '<span>' + esc(String(u.saat)) + ' ders saati</span>' : '') + '</div><div class="kzc0">';
      u.m.forEach(function (m) {
        var q = idx++, d = !!isl[kzAnkU(P, my, m)], on = KZ.sel === q;
        out += '<button type="button" class="kzc' + (on ? ' on' : '') + (d ? ' ok' : '') + '" data-kz="' + q + '" aria-expanded="' + (on ? 'true' : 'false') + '"><span>' + esc(m.k) + '</span>' + (d ? '<i aria-label="işlendi"></i>' : '') + '</button>';
      });
      out += '</div>';
      if (KZ.sel >= ilk && KZ.sel < idx && f[KZ.sel]) {
        var m = f[KZ.sel], d = !!isl[kzAnkU(P, my, m)];
        out += '<div class="kzp"><b class="kzk">' + esc(m.k) + '</b><p>' + esc(m.t) + '</p>' + (m.d && m.d.length ? '<ul>' + m.d.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '')
          + '<button type="button" class="kzi' + (d ? ' on' : '') + '" data-kzi="' + KZ.sel + '"><span class="kzbox"></span>' + (d ? 'İşlendi · geri al' : 'İşlendi olarak işaretle') + '</button></div>';
      }
    });
    out += '<div class="kzm">' + say + '/' + f.length + ' işlendi · yalnız bu cihazda kayıtlı</div>' + kzKaynak(P);
    w.innerHTML = out;
  }
  function kzKaynak(P) { return '<div class="kzm">Kaynak: ' + esc(P.kaynak) + '</div>' + (KZ.cur && KZ.cur.yedek ? '<div class="kzm">Ders adı programda tanınmadığı için branşına göre gösteriliyor.</div>' : ''); }
  function kzNot(ds, m, yeniden) { var w = $('kzw'); if (w && w.getAttribute('data-ds') === ds) w.innerHTML = '<div class="kzn">' + esc(m) + '</div>' + (yeniden ? '<button type="button" class="lk" data-kzr="1" style="margin-top:8px">Yeniden dene</button>' : ''); }
  function kzDoldur(my, ds) {
    var w = $('kzw'); if (!w) return;
    KZ.rk = { my: my, ds: ds };
    var e = kzEsle(my);
    if (!e) { w.innerHTML = ''; return; }
    if (!e.a) { kzNot(ds, 'Bu ders için kazanım eşleşmedi (ders: ' + (my.ders ? '"' + my.ders + '"' : 'yazılmamış') + '). Yönetime bu ders adını bildir.'); return; }
    var g = parseInt(my.sinif, 10);
    if (!(g >= 5 && g <= 8)) { w.innerHTML = ''; return; }
    kzIndeks().then(function () {
      if (!$('kzw') || $('kzw').getAttribute('data-ds') !== ds) return;
      var pl = kzPlan(my, (e.a === 'sos' && g === 8) ? 'ita' : e.a); // 8. sınıfta Sosyal Bilgiler dersinin adı İnkılap Tarihi ve Atatürkçülük
      if (!pl) { kzNot(ds, 'Bu ders ve sınıf için kazanım planı bulunmuyor.'); return; }
      kzJson('kazanim/' + pl.f).then(function (P) {
        if (!$('kzw') || $('kzw').getAttribute('data-ds') !== ds) return;
        if (!P || (!Array.isArray(P.haftalar) && !Array.isArray(P.uniteler))) { KZ_TANI.dosya = 'kazanim/' + pl.f + ' yüklenemedi'; kzNot(ds, pl.yedekAd ? 'Kazanım dosyası yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.' : 'Kazanımlar şu an yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.', true); return; }
        KZ_TANI.dosya = 'kazanim/' + pl.f + ' yüklendi';
        KZ.cur = { P: P, my: my, ds: ds, yedek: e.yedek }; KZ.sel = -1; kzCiz();
      });
    });
  }
  function dtAk(ds, idx) {
    var d = tarihCoz(ds), G = gunBaglam(d), r = G.sc[idx]; if (!r) return;
    var les = r[0] === 'ders', no = dersNo(r), bugun = ds === iso(simdi()), T = saniye(), s0 = mdk(r[2]) * 60, e0 = mdk(r[3]) * 60, du = '';
    if (bugun) du = T >= e0 ? 'Bitti' : (T >= s0 ? 'Şu an, ' + sureTxt(e0 - T) + ' kaldı' : sureTxt(s0 - T) + ' sonra');
    var my = les && G.MY[no], cv = les && G.COV[no];
    var h = '<div class="dbig d">' + esc(r[2]) + ' – ' + esc(r[3]) + '</div><div class="dsub">' + esc(GUN[d.getDay()] + ', ' + gunAy(ds)) + (du ? ' · ' + esc(du) : '') + '</div><div class="kvs">';
    if (les) {
      if (my) h += kvH('Sınıf', my.sinif) + (my.ders ? kvH('Ders', my.ders) : '');
      if (cv) h += kvH('Ders doldurma', cv.sinif || 'Evet');
      if (!my && !cv && programVar(G.y)) h += kvH('Durum', 'Boş ders');
    } else h += kvH('Süre', ((e0 - s0) / 60) + ' dk');
    h += '</div><div class="rows">';
    [[idx - 1, 'Önceki'], [idx + 1, 'Sonraki']].forEach(function (q) {
      var x = G.sc[q[0]]; if (!x) return;
      var xl = x[0] === 'ders', xn = dersNo(x), xm = xl && (G.MY[xn] || G.COV[xn]);
      h += dtSatir('ak:' + ds + ':' + q[0], x[2], x[1], q[1], xm ? xm.sinif : '');
    });
    h += dtSatir('gun:' + ds, '', 'Günün tamamı', '', '');
    h += '</div>';
    if (my || cv) h += '<button class="lk" type="button" data-nt="' + (G.gb.wd - 1) + ',' + (no - 1) + '" style="margin-top:16px">Bu derse not ekle</button>';
    if (my && kzEsle(my)) h += '<div class="kzw" id="kzw" data-ds="' + ds + '"><div class="kzn">Kazanımlar yükleniyor…</div></div>';
    dtGoster(les ? r[1] : r[1], h);
    if (my && kzEsle(my)) kzDoldur(my, ds);
  }
  function dtGun(ds) {
    var d = tarihCoz(ds), G = gunBaglam(d), y = G.y, gb = G.gb, bugun = ds === iso(simdi());
    var h = '';
    if (gb.tip === 'hs') h += '<div class="empty" style="margin-top:6px"><b>Hafta sonu</b>Ders yok.</div>';
    else if (gb.tip === 'tatil') h += '<div class="empty" style="margin-top:6px"><b>Okul tatil</b>' + esc(gb.ad || '') + '</div>';
    else if (gb.tip === 'yok') h += '<div class="empty" style="margin-top:6px"><b>Ders saatleri henüz yayınlanmadı</b></div>';
    else {
      var ch = []; if (gb.yarim) ch.push('Yarım gün' + (gb.ad ? ', ' + gb.ad : '')); if (gb.gecici) ch.push(gb.gecici);
      if (ch.length) h += '<div class="chp">' + ch.map(function (c) { return '<span>' + esc(c) + '</span>'; }).join('') + '</div>';
      var yer = nobetYer(y, gb.wd, ds);
      h += '<div class="rows">';
      if (yer) h += dtSatir('nbd', '', 'Nöbet yerin', yer, '');
      G.sc.forEach(function (r, i) {
        if (r[0] !== 'ders') return; var no = dersNo(r), m = G.MY[no] || G.COV[no];
        h += dtSatir('ak:' + ds + ':' + i, r[2], r[1], G.COV[no] ? 'Ders doldurma' : (m && m.ders) || '', m ? m.sinif : (programVar(y) ? 'Boş' : ''), m ? '' : 'dim');
      });
      h += '</div>';
    }
    var ev = olaylar(y).filter(function (o) { return o.bas <= ds && ds <= o.bit; });
    if (ev.length) h = '<div class="rows" style="margin-bottom:6px">' + ev.map(function (o) { return '<div class="rw ev" style="--c:' + KAT[o.k][1] + '" data-dt="' + esc(olayKodu(o)) + '"><div class="a"><b>' + esc(o.ad) + '</b><span class="s">' + esc(KAT[o.k][0] + (o.alt ? ' · ' + o.alt : '')) + '</span></div></div>'; }).join('') + '</div>' + h;
    dtGoster(GUN[d.getDay()] + ', ' + gunAy(ds) + (bugun ? ' · bugün' : ''), h);
  }
  function dtNobetci(i) {
    var C = CTX || baglam(), nb = ortak(C.y, 'nobetciler'); if (!nb || !Array.isArray(nb.liste) || !nb.liste[i]) return;
    var k = nb.liste[i];
    var h = '<div class="dbig d">' + esc(k.yer || '') + '</div><div class="dsub">' + esc(k.ad) + (C.ben && norm(k.ad) === C.ben ? ' · sen' : '') + '</div><div class="sec" style="margin-top:22px">' + secH('Bugün nöbetçi', nb.liste.length + ' kişi') + '<div class="rows">';
    nb.liste.forEach(function (x, j) { h += dtSatir('nb:' + j, '', x.ad, '', x.yer || '', (j === i ? 'sel' : '')); });
    dtGoster('Nöbetçi', h + '</div></div>');
  }
  function dtNbd() { var C = CTX || baglam(); dtGoster('Nöbet düzenin', nobetSekmesi(C)); }
  function dtDuyuru(i) {
    var C = CTX || baglam(), d = duyuruListe(C.y)[i]; if (!d) return;
    var par = metinVeLink(String(d.metin || '')), z = d.tarih ? (d.tarih === C.gb.ds ? 'Bugün' : GUN[tarihCoz(d.tarih).getDay()] + ', ' + gunAy(d.tarih)) : ''; if (saatOk(d.saat)) z += (z ? ', ' : '') + d.saat;
    var ad = { etkinlik: 'Etkinlik', hatirlatma: 'Hatırlatma' }[d.tur] || 'Okuldan';
    gorulduYaz([duyuruAnahtar(d)]);
    dtGoster(ad, '<div class="dbig d" style="font-size:26px;line-height:1.15">' + esc(d.baslik) + '</div>' + (z ? '<div class="dsub">' + esc(z) + '</div>' : '') + (par.metin ? '<p class="dmt">' + esc(par.metin) + '</p>' : '') + par.linkler.map(linkHTML).join(''));
  }
  function dtHaber(i) {
    var C = CTX || baglam(), n = haberListe(C.y)[i]; if (!n) return;
    var g = n.url ? guvenliLink(n.url) : null; gorulduYaz([haberAnahtar(n)]);
    dtGoster(n.kat || 'Pano', '<div class="dbig d" style="font-size:26px;line-height:1.15">' + esc(n.baslik) + '</div>' + (n.bitis ? '<div class="dsub">Son gün ' + esc(gunAyK(n.bitis)) + '</div>' : '') + (n.metin ? '<p class="dmt">' + esc(n.metin) + '</p>' : '') + (g ? linkHTML(g) : ''));
  }
  function dtBelirli() {
    var C = CTX || baglam(), b = ortak(C.y, 'slayt:belirliGun'), l = (b && Array.isArray(b.satirlar)) ? b.satirlar.filter(function (x) { return x && x.ad && x.bit >= C.gb.ds; }) : [];
    dtGoster('Belirli günler', '<div class="rows">' + (l.length ? l.map(function (x) { return dtSatir('gun:' + x.bas, '', String(x.ad), aralik(x.bas, x.bit), ''); }).join('') : '<div class="empty"><b>Yaklaşan belirli gün yok</b></div>') + '</div>');
  }
  function acilisUygula() {
    var v = oku(K.acilis) || '0', t = 0, p = 0;
    if (v === 'son') { var a = okuJ(K.son, null); if (Array.isArray(a)) { t = +a[0] || 0; p = +a[1] || 0; } }
    else if (v === '1p') { t = 1; p = 1; } else if (v === '1n') { t = 1; p = 2; } else t = +v || 0;
    if (t < 0 || t > 3) t = 0; if (p < 0 || p > 3) p = 0;
    TAB = t; PS = t === 1 ? p : 0; WK = 0;
  }

  // ================= AYARLAR =================
  var TOG = [['pano', 'Slaytta yarın ve belirli günler'], ['notes', 'Okulda neler var'], ['yk', 'Yaklaşanlar'], ['board', 'Panoda yeni'], ['nobet', 'Nöbetçiler'], ['akis', 'Günüm']];
  function secenek(id, deger, liste) { return '<div class="opts" id="' + id + '">' + liste.map(function (x) { return '<button type="button" data-v="' + esc(x[0]) + '"' + (deger === x[0] ? ' class="on"' : '') + '>' + esc(x[1]) + '</button>'; }).join('') + '</div>'; }

  var GVO = [['a', 'Izgara', '<span class="th tha"><i></i><i></i><i class="on"></i><i></i><i></i><i></i><i></i><i></i></span>'], ['b', 'Liste', '<span class="th thb"><i></i><i></i><i class="on"></i><i></i><i></i></span>'], ['v', 'Akış', '<span class="th thv"><i></i><i></i><i class="on"></i><i></i></span>'], ['d', 'Kadran', '<span class="th thd"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" class="g0"/><path d="M20 6a14 14 0 0 1 12.1 7" class="g1"/><path d="M33 16a14 14 0 0 1 0 8" class="g1"/><path d="M31 27a14 14 0 0 1-9 7.5" class="g2"/><path d="M17 34.4a14 14 0 0 1-9-6" class="g1"/><path d="M6.7 23a14 14 0 0 1 0-6" class="g1"/></svg></span>']];
  function gvSecim() {
    var v = oku(K.gun); if (v !== 'b' && v !== 'd' && v !== 'v') v = 'a';
    return '<div class="gvp" id="o_gv">' + GVO.map(function (x) { return '<button type="button" data-v="' + x[0] + '"' + (v === x[0] ? ' class="on"' : '') + '>' + x[2] + '<b>' + x[1] + '</b></button>'; }).join('') + '</div>';
  }
  function ayarAc() {
    var y = Y(), o = onbellek(), th = oku(K.tema) || 'oto', ac = oku(K.ac) || '', fs = oku(K.fs) || '1';
    var renkler = [['', '#C8932B'], ['mavi', '#3D8FE0'], ['yesil', '#2E9E73'], ['mor', '#7F62E0'], ['kirmizi', '#D8584A']];
    $('ns').classList.remove('on');
    $('sh').innerHTML = '<h3>Görünüm</h3><h4>Tema</h4>' + secenek('o_th', th, [['oto', 'Otomatik'], ['acik', 'Açık'], ['koyu', 'Koyu']])
      + '<h4>Vurgu rengi</h4><div class="sw2" id="o_ac">' + renkler.map(function (r) { return '<button type="button" aria-label="' + esc(r[0] || 'altın') + '" data-v="' + r[0] + '"' + (ac === r[0] ? ' class="on"' : '') + ' style="background:' + r[1] + '"></button>'; }).join('') + '</div>'
      + '<h4>Yazı boyutu</h4><div class="opts fsz" id="o_fs">' + [['0.92', 'Küçük', 14], ['1', 'Normal', 17], ['1.12', 'Büyük', 21]].map(function (x) { return '<button type="button" data-v="' + x[0] + '"' + (fs === x[0] ? ' class="on"' : '') + '><span style="font-size:' + x[2] + 'px">Aa</span><small>' + x[1] + '</small></button>'; }).join('') + '</div>'
      + '<h4>Bugün sayfasında günün dersleri</h4>' + gvSecim()
      + '<h4>Açılış sayfası</h4>' + secenek('o_ap', oku(K.acilis) || '0', [['0', 'Bugün'], ['1', 'Programım'], ['1p', 'Program'], ['1n', 'Nöbet'], ['2', 'Takvim'], ['3', 'Pano'], ['son', 'Son baktığım']])
      + '<h4>Bugün sekmesinde göster</h4>' + TOG.map(function (x) { return '<div class="tg' + (GIZLE[x[0]] ? '' : ' on') + '" data-k="' + x[0] + '"><span>' + x[1] + '</span><i></i></div>'; }).join('')
      + '<h4>Hesap</h4><div class="kv"><span>Öğretmen</span><b>' + esc((y && y.kisi && y.kisi.ad) || '—') + '</b></div><div class="kv"><span>Okul</span><b>' + esc((y && y.okul) || '—') + '</b></div><div class="kv"><span>Son güncelleme</span><b>' + (o ? esc(saatStr(o.t)) : '—') + '</b></div><div class="kv"><span>Sürüm</span><b>' + esc(A.SURUM) + '</b></div>'
      + tanilama()
      + '<button class="fin2" id="forget" type="button">Bu cihazdan çık</button><button class="fin" id="fin" type="button">Tamam</button>';
    $('sh').classList.add('on'); $('shd').classList.add('on');
  }
  // Sorun olduğunda öğretmenin okuyup bildirebileceği kısa durum özeti (kişisel veri içermez)
  function tanilama() {
    var sw = ('serviceWorker' in navigator) ? (navigator.serviceWorker.controller ? 'etkin' : 'yok') : 'desteklenmiyor';
    var st = (window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) ? 'ana ekran uygulaması' : 'tarayıcı';
    var satir = [['Uygulama kodu', APP_SURUM + (APP_SURUM !== A.SURUM ? ' (ayar dosyası ' + A.SURUM + ': eşleşmiyor)' : '')], ['Kazanım listesi', KZ_TANI.idx || 'henüz denenmedi'], ['Kazanım dosyası', KZ_TANI.dosya || 'henüz denenmedi'], ['Son ders eşleme', KZ_TANI.son || 'henüz denenmedi'], ['Çevrimdışı hizmet', sw], ['Çalışma biçimi', st]];
    return '<details class="kzo"><summary>Tanılama (sorun olursa göster)</summary>' + satir.map(function (x) { return '<div class="kv"><span>' + esc(x[0]) + '</span><b style="font-size:13px;font-weight:600;text-align:right">' + esc(x[1]) + '</b></div>'; }).join('') + '</details>';
  }
  $('sh').addEventListener('click', function (ev) {
    var t = ev.target, b;
    if (!t.closest('button, input, textarea, select, a, label') && $('sh').scrollTop < 8 && ev.clientY - $('sh').getBoundingClientRect().top < 64) { kapat(); return; }
    if ((b = t.closest('#o_th button'))) { if (b.dataset.v === 'oto') sil(K.tema); else yaz(K.tema, b.dataset.v); tercihUygula(); ayarAc(); return; }
    if ((b = t.closest('#o_ac button'))) { if (b.dataset.v) yaz(K.ac, b.dataset.v); else sil(K.ac); tercihUygula(); ayarAc(); return; }
    if ((b = t.closest('#o_gv button'))) { yaz(K.gun, b.dataset.v); ayarAc(); render(); return; }
    if ((b = t.closest('#o_ap button'))) { yaz(K.acilis, b.dataset.v); ayarAc(); return; }
    if ((b = t.closest('#o_fs button'))) { yaz(K.fs, b.dataset.v); tercihUygula(); ayarAc(); setTimeout(tick, 50); return; }
    if ((b = t.closest('.tg'))) { var k = b.dataset.k; GIZLE[k] = !GIZLE[k]; yaz(K.gizle, JSON.stringify(GIZLE)); b.classList.toggle('on', !GIZLE[k]); uygulaGizle(); return; }
    if (t.closest('#fin')) { kapat(); return; }
    if ((b = t.closest('#forget'))) {
      if (b.getAttribute('data-onay') !== '1') { b.setAttribute('data-onay', '1'); b.textContent = 'Emin misin? Tekrar dokun'; return; }
      sil(K.okul); sil(K.kod); sil(K.onb); kapat(); kilitGoster('okul');
    }
  });

  // ================= NOTLAR (yalnız bu telefonda) =================
  function notAc(k, id, gen) {
    var ed = id ? NT.filter(function (n) { return String(n.id) === String(id); })[0] : { k: gen ? null : k, t: '', d: '', tm: '', w: false };
    if (!ed) return;
    var ex = !!id, C = CTX || baglam();
    $('sh').classList.remove('on');
    $('ns').innerHTML = '<h3>' + (ex ? 'Notu düzenle' : 'Yeni not') + '</h3><div class="stamp" style="margin-top:0" id="nad"></div><textarea id="nt" placeholder="Notunu yaz" maxlength="400"></textarea><h4>Hatırlatma (isteğe bağlı)</h4><div class="dtr"><input type="date" id="nd"><input type="time" id="ntm"></div>'
      + (ed.k ? '<div class="tg' + (ed.w ? ' on' : '') + '" id="nw"><span>Her hafta bu derste</span><i></i></div>' : '')
      + '<div class="nerr" id="nerr"></div><button class="fin" id="nsave" type="button">Kaydet</button><button class="fin3" id="ncal" type="button">Takvime ekle</button>' + (ex ? '<button class="fin2" id="ndel" type="button">Sil</button>' : '') + '<div class="stamp"><i></i>Yalnız bu telefonda saklanır</div>';
    $('nad').textContent = hucreAdi(C.y, ed.k); $('nt').value = ed.t; $('nd').value = ed.d || ''; $('ntm').value = ed.tm || '';
    var w = $('nw'); if (w) w.onclick = function () { w.classList.toggle('on'); };
    function oku2() { return { id: ex ? ed.id : Date.now(), k: ed.k, t: $('nt').value.trim(), d: $('nd').value, tm: $('ntm').value, w: !!(w && w.classList.contains('on')) }; }
    $('nsave').onclick = function () {
      var n = oku2(); if (!n.t) { $('nerr').textContent = 'Önce notunu yaz.'; return; }
      if (ex) NT = NT.map(function (x) { return String(x.id) === String(n.id) ? n : x; }); else NT.push(n);
      notKaydet(); kapat(); render();
    };
    if (ex) $('ndel').onclick = function () { NT = NT.filter(function (x) { return String(x.id) !== String(ed.id); }); notKaydet(); kapat(); render(); };
    $('ncal').onclick = function () {
      var n = oku2(); if (!n.t || !n.d) { $('nerr').textContent = 'Takvime eklemek için not ve tarih gerekir.'; return; }
      var p = function (d, t) { return d.replace(/-/g, '') + 'T' + (t || '08:00').replace(':', '') + '00'; }, e = new Date(n.d + 'T' + (n.tm || '08:00') + ':00'); e.setMinutes(e.getMinutes() + 30);
      var en = n.d.replace(/-/g, '') + 'T' + f2(e.getHours()) + f2(e.getMinutes()) + '00', st = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
      var ics = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Ogretmen Ekrani//TR\r\nBEGIN:VEVENT\r\nUID:' + n.id + '@ogretmen\r\nDTSTAMP:' + st + '\r\nDTSTART:' + p(n.d, n.tm) + '\r\nDTEND:' + en + '\r\nSUMMARY:' + n.t.replace(/[\r\n,;\\]/g, ' ') + '\r\nBEGIN:VALARM\r\nTRIGGER:-PT10M\r\nACTION:DISPLAY\r\nDESCRIPTION:Hatırlatma\r\nEND:VALARM\r\nEND:VEVENT\r\nEND:VCALENDAR';
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = 'hatirlatma.ics'; document.body.appendChild(a); a.click(); a.remove();
      $('nerr').style.color = 'var(--teal)'; $('nerr').textContent = 'Takvim dosyası indi. Açınca telefonun takvimine eklenir.';
    };
    $('ns').classList.add('on'); $('shd').classList.add('on');
  }

  // ================= KİLİT EKRANI =================
  function kilitGoster(adim, okulKodu, ilkMesaj) {
    kilit = { adim: adim, okul: okulKodu || '', deger: '', mesaj: ilkMesaj || '', mesgul: false };
    kilitCiz();
  }
  function kilitCiz() {
    var L = $('lock'), n = kilit.adim === 'okul' ? 6 : 4;
    L.textContent = ''; L.className = 'lock on' + (kilit.mesgul ? ' busy' : '');
    function e(tag, cls, text) { var x = document.createElement(tag); if (cls) x.className = cls; if (text != null) x.textContent = text; return x; }
    var im = e('img'); im.src = LOGO; im.alt = ''; L.appendChild(im);
    L.appendChild(e('h1', '', kilit.adim === 'okul' ? 'Okul kodunu gir' : 'Kişisel kodunu gir'));
    L.appendChild(e('p', 'sub', kilit.adim === 'okul' ? 'Okul yönetiminden aldığın 6 haneli kodu yaz. Bu cihaza bir kez girmen yeterli.' : 'Sana özel verilen 4 haneli kodu yaz. Bu kod yalnız senin ders programını ve nöbetlerini açar.'));
    var kutu = e('div', 'cod'); kutu.setAttribute('aria-label', 'Girilen kod');
    for (var i = 0; i < n; i++) kutu.appendChild(e('i', i === kilit.deger.length ? 'f' : '', i < kilit.deger.length ? '•' : ''));
    L.appendChild(kutu);
    var er = e('div', 'er', kilit.mesgul ? 'Kontrol ediliyor…' : kilit.mesaj); er.setAttribute('role', 'alert'); L.appendChild(er);
    if (kilit.adim === 'kod') { var g = e('button', 'geri', '← Okul kodunu değiştir'); g.type = 'button'; g.onclick = function () { kilitGoster('okul'); }; L.appendChild(g); }
    var kp = e('div', 'kp');
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'Sil'].forEach(function (t) {
      if (t === '') { kp.appendChild(e('span')); return; }
      var b = e('button', t === 'Sil' ? 'gh' : '', t === 'Sil' ? '⌫' : t); b.type = 'button'; b.setAttribute('data-k', t); b.onclick = function () { tus(t); }; kp.appendChild(b);
    });
    L.appendChild(kp);
  }
  function tus(t) {
    if (!kilit || kilit.mesgul) return;
    var n = kilit.adim === 'okul' ? 6 : 4;
    if (t === 'Sil') kilit.deger = kilit.deger.slice(0, -1); else if (/^\d$/.test(t) && kilit.deger.length < n) kilit.deger += t;
    kilit.mesaj = '';
    if (kilit.deger.length === n) { gonder(); return; }
    kilitCiz();
  }
  function gonder() {
    var adim = kilit.adim, deger = kilit.deger;
    kilit.mesgul = true; kilitCiz();
    var p = { okul: adim === 'okul' ? deger : kilit.okul, cihaz: cihazNo() };
    if (adim === 'kod') p.kod = deger;
    cagri(p).then(function (j) {
      if (adim === 'okul') {
        if (j.ok && j.asama === 'kisisel') return kilitGoster('kod', deger);
        return kilitGoster('okul', '', j.hata === 'giris' ? MESAJ.okul : (MESAJ[j.hata] || MESAJ.sunucu));
      }
      if (j.ok && (j.yayinDurumu === 'acik' || j.yayinDurumu === 'durduruldu')) {
        yaz(K.okul, kilit.okul); yaz(K.kod, deger); yaz(K.onb, JSON.stringify({ t: Date.now(), y: j })); sonYenileme = Date.now();
        kilit = null; $('lock').className = 'lock'; $('lock').textContent = ''; TAB = 0; PS = 0; WK = 0; return render();
      }
      if (j.hata === 'giris') return kilitGoster('kod', kilit.okul, MESAJ.kod);
      return kilitGoster('kod', kilit.okul, MESAJ[j.hata] || MESAJ.sunucu);
    });
  }
  document.addEventListener('keydown', function (e) { if (!kilit) return; if (/^\d$/.test(e.key)) tus(e.key); else if (e.key === 'Backspace') tus('Sil'); });

  // ================= YENİLEME =================
  function yenile(elle) {
    var okul = oku(K.okul), kod = oku(K.kod);
    if (!okul || !kod || durum.yenileniyor) return;
    durum.yenileniyor = true; if (elle) render();
    cagri({ okul: okul, kod: kod, cihaz: cihazNo() }).then(function (j) {
      durum.yenileniyor = false; sonYenileme = Date.now();
      if (j.ok && (j.yayinDurumu === 'acik' || j.yayinDurumu === 'durduruldu')) {
        var onceki = onbellek();
        if (!j.kisi && onceki && onceki.y && onceki.y.kisi) { j.kisi = onceki.y.kisi; j.okul = onceki.y.okul; }
        yaz(K.onb, JSON.stringify({ t: Date.now(), y: j })); durum.ag = 'ok';
      } else if (j.hata === 'giris') {
        sil(K.okul); sil(K.kod); sil(K.onb); return kilitGoster('okul', '', MESAJ.gecersiz);
      } else if (j.hata === 'bekle') durum.ag = 'bekle'; else durum.ag = 'cevrimdisi';
      render();
    });
  }
  // ---- slayt kontrolleri
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-hc]'); if (!b || kilit) return;
    var k = b.getAttribute('data-hc'); HSON = Date.now();
    if (k === 'x') { HX = !HX; HLAST = HSON; HFX = false; tick(true); return; }
    if (k === 't') { HO = (heroKip(CTX || baglam(), 0) === 'slayt') ? false : true; HFX = true; tick(true); return; }
    if (k === 'p') return heroGit(HI - 1);
    if (k === 'n') return heroGit(HI + 1);
    if (k === 'g') return heroGit(+b.getAttribute('data-i'));
  });
  (function () {
    var x0 = 0, y0 = 0, ok = false, tp = $('top');
    tp.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; ok = !!e.target.closest('.hcar .sl'); HSON = Date.now(); }, { passive: true });
    tp.addEventListener('touchend', function (e) {
      if (!ok) return; var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy) * 1.3) return;
      heroGit(HI + (dx < 0 ? 1 : -1));
    }, { passive: true });
  })();
  setInterval(function () {
    if (document.hidden || kilit || !HX || TAB !== 0 || !CTX || DT.acik) return;
    var n = Date.now(); if (n - HSON < SLAYT_MS || n - HLAST < SLAYT_MS) return;
    if (heroKip(CTX, 0) !== 'slayt' || heroSlaytlar(CTX).length < 2) return;
    HLAST = n; HI++; HFX = true; tick(true);
  }, 1000);
  setInterval(function () { if (!document.hidden && !kilit) tick(); }, 1000);
  setInterval(function () { if (!document.hidden && !kilit && Date.now() - sonYenileme > A.YENILE_DK * 60000) yenile(false); }, 60000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !kilit) { render(); if (Date.now() - sonYenileme > 60000) yenile(false); } });
  window.addEventListener('online', function () { if (!kilit) yenile(false); });
  window.addEventListener('offline', function () { durum.ag = 'cevrimdisi'; if (!kilit) render(); });

  // ================= BAŞLAT =================
  tercihUygula(); kzIndeks();
  if (oku(K.okul) && oku(K.kod)) { acilisUygula(); render(); yenile(false); } else kilitGoster('okul');
  (function () { var s = document.getElementById('spl'); if (!s) return; var bekle = Math.max(0, 900 - (Date.now() - (window.__splT || Date.now()))); setTimeout(function () { s.classList.add('bit'); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 700); }, bekle); })();
  // Ayar dosyası ile uygulama dosyası farklı sürümdeyse (önbellekte eski dosya kalmış): önbellek günde en çok bir kez temizlenip yeniden yüklenir.
  // Çevrimdışıyken dokunulmaz (çevrimdışı kopya korunur); temizlik başarısız olursa yeniden yükleme yapılmaz.
  if (APP_SURUM !== A.SURUM && navigator.onLine !== false && window.caches) {
    var bugunAnh = new Date().toISOString().slice(0, 10), son = ''; try { son = localStorage.getItem('ogr_temizle') || ''; } catch (e) {}
    if (son !== bugunAnh) {
      try { localStorage.setItem('ogr_temizle', bugunAnh); } catch (e) {}
      caches.keys().then(function (k) { return Promise.all(k.map(function (x) { return caches.delete(x); })); })
        .then(function () { return navigator.serviceWorker && navigator.serviceWorker.getRegistrations ? navigator.serviceWorker.getRegistrations() : []; })
        .then(function (r) { return Promise.all(r.map(function (x) { return x.unregister(); })); })
        .then(function () { location.reload(); }, function () {});
    }
  }
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
