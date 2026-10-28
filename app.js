// Öğretmen Ekranı — tasarım sürümü (Adım 6). Salt-okunur: sunucuya yalnız GET ile okuma isteği gider.
// Dinamik içerik innerHTML'e yalnız esc() ile temizlenerek girer; bağlantılar yalnız https kabul edilir.
(function () {
  'use strict';
  var A = window.OGR_AYAR;
  var APP_SURUM = '0.16.4'; // bu dosyanın kendi sürümü; config.js'teki SURUM ile eşleşmezse eski dosya kalmıştır
  var K = { okul: 'ogr_okul', kod: 'ogr_kod', cihaz: 'ogr_cihaz', onb: 'ogr_onbellek', tema: 'ogr_tema', ac: 'ogr_ac', fs: 'ogr_fs', gizle: 'ogr_gizle', notlar: 'ogr_notlar', gorulen: 'ogr_gorulen', acilis: 'ogr_acilis', gun: 'ogr_gun', son: 'ogr_son', isl: 'ogr_islendi', basla: 'ogr_basla', okudum: 'ogr_okudum', ipucu: 'ogr_ipucu', kd: 'ogr_kd' };
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
  // Saatten sonra gelen "-de/-da/-te/-ta" eki, saatin SON okunan sayısına göre seçilir: 08:40'ta, 09:30'da, 10:20'de, 12:00'de.
  function saatEk(hm) {
    var m = /^(\d{1,2})[:.](\d{2})$/.exec(String(hm || '')); if (!m) return '\'da';
    var n = +m[2] ? +m[2] : +m[1], k = (n >= 10 && n % 10 === 0) ? n : n % 10;
    var E = { 0: 'da', 1: 'de', 2: 'de', 3: 'te', 4: 'te', 5: 'te', 6: 'da', 7: 'de', 8: 'de', 9: 'da', 10: 'da', 20: 'de', 30: 'da', 40: 'ta', 50: 'de' };
    return '\'' + (E[k] || 'da');
  }
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
    if (t === 'acik') R.setAttribute('data-th', 'light'); else if (t === 'koyu' || t === 'siyah') R.setAttribute('data-th', 'dark'); else R.removeAttribute('data-th');
    if (t === 'siyah') R.setAttribute('data-bk', '1'); else R.removeAttribute('data-bk');
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
  // tip: ders | hs (hafta sonu) | tatil | yok (ritim yayımlanmamış)
  function gunBilgi(y, d) {
    var ds = iso(d), wd = d.getDay() || 7, o = { ds: ds, wd: wd, tip: 'ders', ad: '', ders: [], yarim: false, gecici: '' };
    var r = ortak(y, 'ritim'), ders = r ? dersListe(r.ders) : [];
    if (!ders.length) { o.tip = 'yok'; return o; }
    var cal = (r.gunTipi && Array.isArray(r.gunTipi.calisma)) ? r.gunTipi.calisma : [1, 2, 3, 4, 5];
    if (cal.indexOf(wd) < 0) { o.tip = 'hs'; return o; }
    var th = ortak(y, 'tatil'), yarim = false, yd = 0;
    if (th && Array.isArray(th.liste)) th.liste.forEach(function (h) {
      if (!h || !kapsar(h, ds)) return;
      if (!h.yarim) { o.tip = 'tatil'; o.ad = String(h.ad || 'Tatil'); } else if (o.tip !== 'tatil') { if (!yarim && Math.floor(+h.ders) >= 1) yd = Math.floor(+h.ders); yarim = true; o.ad = String(h.ad || ''); }
    });
    if (o.tip === 'tatil') return o;
    var gc = ortak(y, 'gecici');
    if (gc && Array.isArray(gc.liste)) for (var i = 0; i < gc.liste.length; i++) {
      var g = gc.liste[i], gd = g ? dersListe(g.ders) : [];
      if (g && Array.isArray(g.tarihler) && gd.length === ders.length && g.tarihler.some(function (t) { return kapsar(t, ds); })) { ders = gd; o.gecici = String(g.ad || 'Geçici düzen'); break; }
    }
    if (yarim) { var lim = yd || (r.gunTipi && Math.floor(+r.gunTipi.yarimGunDers) >= 1 && Math.floor(+r.gunTipi.yarimGunDers)) || 3; ders = ders.slice(0, Math.min(ders.length, lim)); o.yarim = true; }
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
  function dersiz(y) {
    var p = programVar(y); if (!p) return false;
    for (var wd = 1; wd <= 5; wd++) { var g = p.matris[String(wd)] || {}, no; for (no in g) if (hucre(g[no])) return false; }
    return true;
  }
  function nobetsiz(y) { var n = nobetim(y); return !n.liste.length && !(n.gelecek && n.gelecek.liste && n.gelecek.liste.length); }
  // Panel "dersi var" dediği hâlde program gelmemiş (hiç yayımlanmamış ya da boş): sessizce "Okulun bugünü"ne düşme, sakin bir not göster.
  function programBekliyor(y) { var k = kisisel(y, 'kimlik'); return !!(k && k.dersli === true) && (!programVar(y) || dersiz(y)); }
  function programBekNotu(C) {
    if (!programBekliyor(C.y)) return '';
    return '<div class="cvs bek" role="note" style="--cv:var(--gold);cursor:default"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/></svg></span><span class="tx"><small>Ders programın</small><b>Henüz yayımlanmamış olabilir</b></span></div>';
  }
  function programVar(y) { var p = kisisel(y, 'program'); return (p && p.matris && typeof p.matris === 'object') ? p : null; }
  function hucreAl(y, wd, no) { var p = programVar(y); if (!p) return null; var g = p.matris[String(wd)]; return g ? hucre(g[String(no)]) : null; }
  var DERS_TAM = { mat: 'Matematik', tur: 'Türkçe', fen: 'Fen Bilimleri', ing: 'İngilizce', sos: 'Sosyal Bilgiler', ita: 'T.C. İnkılap Tarihi ve Atatürkçülük', dkab: 'Din Kültürü ve Ahlak Bilgisi', muz: 'Müzik', bes: 'Beden Eğitimi ve Spor', gs: 'Görsel Sanatlar' };
  function dersTam(d) { var a = kzA(d); return (a && DERS_TAM[a]) || String(d || 'Ders'); }
  function sinifSira(a, b) { var x = parseInt(a, 10) || 0, z = parseInt(b, 10) || 0; return x !== z ? x - z : (a < b ? -1 : a > b ? 1 : 0); }
  function dersGruplari(y) {
    var p = programVar(y), g = {}, out = []; if (!p) return out;
    for (var wd = 1; wd <= 5; wd++) { var gg = p.matris[String(wd)] || {}; Object.keys(gg).forEach(function (no) { var h = hucre(gg[no]); if (!h) return; var k = h.sinif + '|' + h.ders; if (!g[k]) { g[k] = { sinif: h.sinif, ders: h.ders, slots: [] }; out.push(g[k]); } g[k].slots.push({ wd: wd, no: +no }); }); }
    out.sort(function (a, b) { var t = dersTam(a.ders).localeCompare(dersTam(b.ders), 'tr'); return t || sinifSira(a.sinif, b.sinif); });
    out.forEach(function (x, i) { x.i = i; x.tam = dersTam(x.ders); });
    return out;
  }
  var GKAT = [['zumre', 'Zümre görevi'], ['rehber', 'Sınıf rehberliği'], ['kurul', 'Kurul ve komisyonlar'], ['ekip', 'Ekipler'], ['kulup', 'Kulüpler'], ['proje', 'Projeler'], ['gun', 'Belirli günler']];
  function kurulListe(y, bg) {
    var d = kisisel(y, 'gorevler'); if (!d || !Array.isArray(d.liste)) return [];
    var l = d.liste.filter(function (k) { return k && typeof k.ad === 'string' && k.ad && k.kat && (k.kat !== 'gun' || !bg || !k.bit || k.bit >= bg); }).slice(0, 80), out = [];
    GKAT.forEach(function (g) { l.forEach(function (k) { if (k.kat === g[0]) out.push(k); }); });
    return out;
  }
  function doldurmaListe(y) { var d = kisisel(y, 'doldurma'); return (d && Array.isArray(d.liste)) ? d.liste.filter(function (x) { return x && /^\d{4}-\d{2}-\d{2}$/.test(x.tarih || ''); }) : []; }
  // Ders doldurma: kişisel liste (doldurmaListe) + herkese açık günlük liste (ortak 'doldurmatoplu')
  function topluDoldurma(y, ds) {
    var o = ortak(y, 'doldurmatoplu'); if (!o || o.tarih !== ds || !Array.isArray(o.liste)) return [];
    return o.liste.filter(function (x) { return x && +x.saat >= 1 && +x.saat <= 12 && x.giren; }).map(function (x) { return { saat: +x.saat, sinif: String(x.sinif || ''), giren: String(x.giren), yerine: String(x.yerine || '') }; })
      .sort(function (a, b) { return a.saat - b.saat || (a.sinif < b.sinif ? -1 : a.sinif > b.sinif ? 1 : 0); });
  }
  // Bugünkü kendi doldurma derslerim (bitmemiş olanlar)
  function benimDoldurma(C) {
    var out = [], tl = null;
    if (!C.y || C.gb.tip !== 'ders') return out;
    C.gb.ders.forEach(function (r, i) {
      var cv = C.COV[i + 1]; if (!cv || mdk(r[2]) * 60 <= C.T) return;
      var yer = cv.yerine ? String(cv.yerine) : '';
      if (!yer) { tl = tl || topluDoldurma(C.y, C.gb.ds); tl.forEach(function (x) { if (!yer && x.saat === i + 1 && C.ben && norm(x.giren) === C.ben) yer = x.yerine; }); }
      out.push({ no: i + 1, bas: r[1], bit: r[2], sinif: String(cv.sinif || ''), yerine: yer });
    });
    return out;
  }
  function cvYerine(y, ds, no, cv) {
    if (cv && cv.yerine) return String(cv.yerine);
    var ben = norm(y && y.kisi && y.kisi.ad), yer = '';
    topluDoldurma(y, ds).forEach(function (x) { if (!yer && x.saat === +no && ben && norm(x.giren) === ben) yer = x.yerine; });
    return yer;
  }
  function cvOzet(l) { return l.map(function (x) { return x.no + '. ders ' + x.bas + (x.sinif ? ' · ' + x.sinif : ''); }).join('  ·  '); }
  function cvBaslik(l) {
    if (l.every(function (x) { return x.sinif; })) {
      if (l.length === 1) return 'Bugün ' + l[0].sinif + ' seninle';
      if (l.length === 2) return 'Bugün ' + l[0].sinif + ' ve ' + l[1].sinif + ' seninle';
      return 'Bugün ' + l.length + ' sınıf seninle';
    }
    return l.length === 1 ? 'Bugün ' + l[0].no + '. ders seninle' : 'Bugün ' + l.length + ' ders seninle';
  }
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
  function belirliListe(y) { var b = ortak(y, 'slayt:belirliGun'), bg = iso(simdi()); return (b && Array.isArray(b.satirlar)) ? b.satirlar.filter(function (x) { return x && x.ad && ISODT.test(x.bas || '') && (x.bit || x.bas) >= bg; }).sort(function (p, q) { return p.bas < q.bas ? -1 : 1; }) : []; }
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
  var TAB = 0, PS = 0, WK = 0, CAT = 'Tümü', PR = 0, AYOP = { gor: true }, GAC = {};
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
    koyu: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    siyah: '<circle cx="12" cy="12" r="8.5" style="fill:currentColor"/>'
  };
  var TEMA_AD = { oto: 'Otomatik', acik: 'Açık', koyu: 'Koyu', siyah: 'Siyah' };
  function temaDegis() {
    var t = oku(K.tema) || 'oto', n = t === 'oto' ? 'acik' : (t === 'acik' ? 'koyu' : (t === 'koyu' ? 'siyah' : 'oto'));
    if (n === 'oto') sil(K.tema); else yaz(K.tema, n);
    tercihUygula();
    var b = $('tb'); if (b) { b.innerHTML = '<svg viewBox="0 0 24 24">' + TEMA_IK[n] + '</svg>'; b.setAttribute('aria-label', 'Tema: ' + TEMA_AD[n] + ' (değiştirmek için dokun)'); }
    if (TAB === 4 && PR === 1) render();
  }
  function logoBar(C, alt) {
    var d = C.d, ad = (C.y && C.y.kisi && C.y.kisi.ad) || '', okul = (C.y && C.y.okul) || 'Yaşar Doğu Öğretmen', th = oku(K.tema) || 'oto', hf = egitimHaftasi(C);
    return '<div class="bar"><button class="who0" id="ob" type="button" aria-label="Menü ve profil"><span class="lg"><img src="' + LOGO + '" alt=""></span><span class="nm"><b>' + esc(ad || okul) + '</b><span>' + esc(ad ? okul : alt) + '</span></span><svg class="ochv" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>'
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
  // Gökyüzü kartı her saniye kendini canlandırdığı için üst alan karşılaştırılırken kartın İÇİ yok sayılır; kartın dışındaki kısım (başlık, düğmeler, noktalar) ise karşılaştırılır.
  var SKY_BIT = '<!--/sk-->';
  function skyBol(s) {
    var j = s.indexOf('<div class="sk"'), i = s.indexOf(SKY_BIT);
    if (j < 0) return [s, ''];
    return [s.slice(0, j), i < j ? '' : s.slice(i + SKY_BIT.length)];
  }
  function gokyuzuHTML(C, ctx) {
    if (C.y && yayinlandi(C.y, 'gokyuzu')) { window.SKCTX = ctx; return '<div class="skyc" id="skyc">' + skSkeleton() + '</div>' + SKY_BIT; }
    return '<div class="hero2"><div class="t">' + esc(ctx) + '</div></div>';
  }
  function heroEski(C, mine) {
    var gb = C.gb;
    if (!C.y || gb.tip === 'yok') return gokyuzuHTML(C, 'Ders saatleri henüz yayımlanmadı');
    var nx = sonrakiOkul(C);
    if (gb.tip === 'hs') return gokyuzuHTML(C, nx ? 'Okullar ' + nx.etiket.toLocaleLowerCase('tr-TR') + ' ' + nx.ilk + saatEk(nx.ilk) + ' açılıyor' : 'Hafta sonu');
    if (gb.tip === 'tatil') return gokyuzuHTML(C, 'Bugün okul tatil' + (gb.ad ? ': ' + gb.ad : '') + (nx ? '. Dersler ' + nx.etiket.toLocaleLowerCase('tr-TR') + ' ' + nx.ilk + saatEk(nx.ilk) + ' başlıyor' : ''));
    var g = guncel(C), c = g[0], n = g[1];
    if (!c) {
      if (C.T < C.A0) { var dk = C.A0 - C.T; return gokyuzuHTML(C, 'İlk ders ' + gb.ders[0][1] + saatEk(gb.ders[0][1]) + ', ' + sureTxt(dk) + ' sonra'); }
      return gokyuzuHTML(C, 'Gün tamamlandı.' + (nx ? ' ' + nx.etiket + ' ilk ders ' + nx.ilk + saatEk(nx.ilk) : ''));
    }
    var e = mdk(c[3]) * 60, s0 = mdk(c[2]) * 60, left = e - C.T, les = c[0] === 'ders', fr = Math.min(1, Math.max(0, left / (e - s0))), Cc = 2 * Math.PI * 78;
    var kalan = f2(Math.floor(left / 60)) + ':' + f2(left % 60);
    var sinif = les && mine && C.MY[dersNo(c)] ? '<div class="nx" style="margin-top:4px">Sınıfın: ' + esc(C.MY[dersNo(c)].sinif) + '</div>' : '';
    return '<div class="hr"><div class="ring' + (les ? '' : ' br') + '" data-lv="r"><svg viewBox="0 0 180 180" aria-hidden="true">' + TICKS + '<circle class="tr" cx="90" cy="90" r="78"/><circle class="pg' + (les && left <= 300 ? ' son' : '') + '" cx="90" cy="90" r="78" stroke-dasharray="' + Cc.toFixed(1) + '" stroke-dashoffset="' + (Cc * (1 - fr)).toFixed(1) + '"/></svg><div class="rc"><b class="d">' + kalan.slice(0, -1) + '<span class="sd">' + kalan.slice(-1) + '</span></b><span>kalan süre</span></div></div><div class="hs"><div class="ey' + (les ? '' : ' br') + '">' + esc(c[1]) + '</div><div class="cap">' + (les ? 'ders bitimine' : (c[0] === 'öğle' ? 'öğle arasının bitimine' : 'teneffüsün bitimine')) + ' kadar</div>' + (n ? '<div class="nx">Sonra ' + esc(n[1].toLocaleLowerCase('tr-TR')) + ', ' + n[2] + '</div>' : '<div class="nx">Günün son dersi</div>') + sinif + '</div></div>' + cetvel(C, mine);
  }
  // ---- Üst alan: panel düzeni. Ders/teneffüste geri sayım, ders dışında slayt; düğmeyle geçiş
  var SNO = 0, SNK = -1; // sınav slaytı: slayt her gösterildiğinde sıradaki 3 sınava geçmek için sayaç
  var HI = 0, HX = true, HSON = Date.now(), HLAST = Date.now(), HFX = false, HYON = 0, HO = null, SLAYT_MS = 10000, GERI_MS = 300000;
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
  var ONE_RENK = { 'Yarına bakış': '#79D1C3', 'Ders başlamadan': '#79D1C3', 'Gün tamamlandı': '#79D1C3', 'Hafta sonu': '#79D1C3', 'Bugün okul tatil': '#79D1C3', 'Belirli gün': '#B5A3FF', 'Nöbet düzeni': 'var(--gold)', 'Okuldan': 'var(--gold)', 'Duyuru': 'var(--gold)', 'Etkinlik': '#B5A3FF', 'Hatırlatma': '#79D1C3', 'Bugün sende': '#79D1C3', 'Nöbetin': '#7DB6F2', 'Yaklaşan sınav': '#B5A3FF', 'Sonraki tatil': '#F08A7E', 'Bu haftanın kazanımı': 'var(--gold)', 'Eğitim haftası': '#79D1C3', 'Derslerin': '#B5A3FF', 'Ders doldurma': '#5CC4B5', 'Görevin': '#B5A3FF' };
  var IKN = {
    'Bugün sende': '<path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h10"/>',
    'Nöbetin': '<path d="M4 9a6 6 0 016-5h7M17 4l-2.5-2M17 4l-2.5 2.5M20 15a6 6 0 01-6 5H7M7 20l2.5 2M7 20l2.5-2.5"/>',
    'Yaklaşan sınav': '<path d="M7 3h8l4 4v14H7zM14 3v5h5M10 13h6M10 17h4"/>',
    'Sonraki tatil': '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
    'Bu haftanın kazanımı': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 12l5-5"/>',
    'Derslerin': '<path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h10M9 8h5"/>',
    'Görevin': '<path d="M6 21V4M6 5h11l-2 3.5 2 3.5H6"/>',
    'Ders doldurma': '<path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h10M9 8h5"/>',
    'Eğitim haftası': '<rect x="4" y="5.5" width="16" height="14" rx="2.5"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
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
    return '<div class="hsl" style="--c:' + (ONE_RENK[p.k] || 'var(--gold)') + '"><div class="hrow"><span class="hic"><svg viewBox="0 0 24 24" aria-hidden="true">' + (IKN[p.k] || IKN['Okuldan']) + '</svg></span><span class="ey2">' + esc(p.k) + '</span>' + (git ? '<span class="hcnt"></span>' : '') + '</div><div class="d ttl">' + esc(p.t) + '</div>' + (p.satirlar ? '<div class="snl">' + p.satirlar.map(function (r) { return '<div class="snr"><b>' + esc(r[0]) + '</b><span>' + esc(r[1]) + '</span></div>'; }).join('') + '</div>' : '') + (p.s ? '<div class="cap">' + esc(p.s) + '</div>' : '') + (p.s2 ? '<div class="cap c2">' + esc(p.s2) + '</div>' : '') + (p.bar != null ? '<div class="hbar"><i style="width:' + p.bar + '%"></i></div>' : '') + (git ? '<span class="go" aria-hidden="true">' + IK_SON + '</span>' : '') + '</div>';
  }
  function durumKarti(C, mine) {
    var gb = C.gb, y = C.y;
    if (!y || gb.tip === 'yok') return oneKart({ k: 'Ders saatleri', t: 'Henüz yayımlanmadı', s: 'Okul yönetimi paylaştığında burada görünür.' });
    var nx = sonrakiOkul(C), ey, cap;
    if (gb.tip === 'ders' && C.T < C.A0) { ey = 'Ders başlamadan'; cap = 'İlk ders ' + gb.ders[0][1] + saatEk(gb.ders[0][1]); }
    else {
      ey = gb.tip === 'hs' ? 'Hafta sonu' : (gb.tip === 'tatil' ? 'Bugün okul tatil' : 'Gün tamamlandı');
      cap = nx ? (nx.etiket === 'Yarın' ? 'Yarın' : nx.etiket) + ' ilk ders ' + nx.ilk + saatEk(nx.ilk) : '';
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
  // ---- Zengin slayt kartları: yalnız GERÇEK içerik varsa kart üretilir (boş kart yok)
  var KZS = {};
  function isGunu(a, bds) { var n = 0, d = gunEkle(a, 1), son = tarihCoz(bds); for (var i = 0; i < 400 && d <= son; i++) { var w = d.getDay(); if (w >= 1 && w <= 5) n++; d = gunEkle(d, 1); } return n; }
  function gunFark(a, bds) { return Math.round((tarihCoz(bds) - tarihCoz(a)) / 86400000); }
  function kzSlayt(C) {
    var y = C.y; if (!programVar(y)) return null;
    var G = C.gb, d = C.d;
    if (!(G.tip === 'ders' && G.ders.length && C.T < C.Z0)) { var nx = sonrakiOkul(C); if (!nx) return null; G = nx.gb; d = nx.d; }
    var my = null, ea = null;
    for (var i = 0; i < G.ders.length && !my; i++) { var h = hucreAl(y, G.wd, i + 1); if (h) { var e = kzEsle(h); if (e && e.a) { my = h; ea = e; } } }
    if (!my) return null;
    var g = parseInt(my.sinif, 10); if (!(g >= 5 && g <= 8)) return null;
    var pl = kzPlan(my, (ea.a === 'sos' && g === 8) ? 'ita' : ea.a); if (!pl) return null;
    var ds = iso(d), key = pl.f + '|' + ds;
    if (key in KZS) return KZS[key] || null;
    KZS[key] = false;
    kzJson('kazanim/' + pl.f).then(function (P) {
      if (!P || !Array.isArray(P.haftalar)) return;
      var hf = kzHafta(P, ds); if (!hf || !hf.m || !hf.m.length) return;
      var m0 = hf.m[0], tx = String(m0.t || '').replace(/\s+/g, ' ');
      KZS[key] = { k: 'Bu haftanın kazanımı', t: my.sinif + (my.ders ? ' ' + my.ders : '') + (m0.k ? ' · ' + m0.k : ''), s: (tx.length > 110 ? tx.slice(0, 107) + '…' : tx) + (hf.m.length > 1 ? ' (+' + (hf.m.length - 1) + ' kazanım daha)' : ''), dt: 'gun:' + ds };
      if (!kilit && !DT.acik) render();
    });
    return null;
  }
  function yeniSlaytlar(C) {
    var y = C.y, out = [], bg = C.gb.ds; if (!y || C.gb.tip === 'yok') return out;
    var planli = !!programVar(y), bitti = C.gb.tip === 'ders' && C.T >= C.Z0, ol = null;
    function olaylarAl() { return ol || (ol = olaylar(y)); }
    // 0) Hafta sonu: tek bir 'İyi tatiller' mesajı
    if (C.gb.tip === 'hs') out.push({ k: 'Hafta sonu', t: 'İyi tatiller', s: '', dt: 'hs' });
    // 1) Bugün sende
    if (planli && C.gb.tip === 'ders' && C.gb.ders.length && !bitti) {
      var n = 0, ilk = 0, i;
      for (i = 1; i <= C.gb.ders.length; i++) if (hucreAl(y, C.gb.wd, i)) { n++; if (!ilk) ilk = i; }
      if (n) { var ih = hucreAl(y, C.gb.wd, ilk); out.push({ k: 'Bugün sende', t: 'Bugün ' + n + ' dersin var', s: 'İlk dersin ' + C.gb.ders[ilk - 1][1] + saatEk(C.gb.ders[ilk - 1][1]) + (ih ? ', ' + ih.sinif : ''), dt: 'gun:' + bg }); }
    }
    // 1b) Ders doldurma: yalnız bugün kendi doldurması varsa ve bitmediyse
    var bdl = benimDoldurma(C);
    if (bdl.length) out.push({ k: 'Ders doldurma', t: cvBaslik(bdl), s: cvOzet(bdl), dt: 'dn:' + bg + ':' + bdl[0].no });
    // 1c) Belirli gün görevi: günü başlamasına 7 gün kala (ve süren günlerde) yalnız görevli öğretmene
    var kg = kurulListe(y, bg), kn = 0;
    kg.forEach(function (k, ki) {
      if (kn >= 2 || k.kat !== 'gun' || !k.bas) return;
      var f = gunFark(bg, k.bas), bit = k.bit || k.bas; if (!(f <= 7 && bit >= bg)) return;
      kn++;
      var sure = f <= 0 ? 'Bugün görevlisin' : (f === 1 ? 'Yarın görevlisin' : 'Görevlisin') + ' · ' + aralik(k.bas, bit) + (f > 1 ? ', ' + f + ' gün sonra' : '');
      out.push({ k: 'Görevin', t: k.ad, s: sure, dt: 'kv:' + ki });
    });
    // 2) Nöbetin (bu hafta ya da gelecek 7 gün içindeki ilk nöbet günü)
    for (var j = (bitti ? 1 : 0); j <= 7; j++) {
      var dj = gunEkle(C.d, j), gj = gunBilgi(y, dj); if (gj.tip !== 'ders') continue;
      var yer = nobetYer(y, gj.wd, iso(dj));
      if (yer) { out.push({ k: 'Nöbetin', t: (j === 0 ? 'Bugün' : (j === 1 ? 'Yarın' : GUN[dj.getDay()])) + ' nöbetin var', s: yer, dt: 'nbd' }); break; }
    }
    // 3) Yaklaşan sınavlar: herhangi bir sınava 7 gün kala görünür; günü/saati geçen görünmez. Tek sınavsa eski görünüm; çoksa her gösterimde sıradaki 3 sınav.
    var sl7 = sinavGorunen(C, olaylarAl()), n7 = sl7.length;
    if (n7 === 1) {
      var sx = sl7[0];
      out.push({ k: 'Yaklaşan sınav', sid: 'sinav', t: sx.ad, s: sx.hafta ? sinavKt(C, sx) + ' · ' + aralik(sx.bas, sx.bit) : sinavKt(C, sx) + ' · ' + gunAy(sx.bas) + (sinavAlt(sx, 0) ? ' · ' + sinavAlt(sx, 0) : ''), dt: olayKodu(sx) });
    } else if (n7 > 1) {
      var b0 = n7 > 3 ? (((SNO > 0 ? SNO - 1 : 0) * 3) % n7) : 0, pi = [], pen = [];
      for (var ii = 0; ii < Math.min(3, n7); ii++) pi.push((b0 + ii) % n7);
      pi.sort(function (u, v) { return u - v; }); pi.forEach(function (k) { pen.push(sl7[k]); }); // gösterilen üçlü de tarih sırasında kalır
      out.push({ k: 'Yaklaşan sınav', sid: 'sinav', t: n7 + ' sınav yaklaşıyor', satirlar: pen.map(function (o) { return [sinavKt(C, o), o.hafta ? o.ad + ' · ' + aralik(o.bas, o.bit) : o.ad + (sinavAlt(o, 1) ? ' · ' + sinavAlt(o, 1) : '')]; }), s: n7 > 3 ? 'Tümü için dokun' : '', dt: 'sv' });
    }
    // 4) Sonraki tatil: takvim günü olarak kalan gün + tarihler (hafta sonu tatil sayılmaz, listeden yalnız gerçek tatiller seçilir)
    var th = ortak(y, 'tatil');
    if (th && Array.isArray(th.liste) && C.gb.tip !== 'tatil') {
      var tl = th.liste.filter(function (h) { return h && ISODT.test(h.bas || '') && !h.yarim && h.bas > bg; }).sort(function (p, q) { return p.bas < q.bas ? -1 : 1; })[0];
      if (tl) {
        var N = gunFark(bg, tl.bas), tad = String(tl.ad || 'Tatil'), te = olaylarAl().filter(function (o) { return o.k === 'tatil' && o.bas === tl.bas; })[0];
        out.push({ k: 'Sonraki tatil', t: tad + ' · ' + (N <= 1 ? 'yarın' : N + ' gün kaldı'), s: aralik(tl.bas, tl.bit || tl.bas), dt: 'st:' + tl.bas });
      }
    }
    // 4b) Derslerin: her ders için şubeleri (dokununca liste)
    var dg = dersGruplari(y), dgrp = {}, dsr = [];
    dg.forEach(function (x) { var k = kzAd(x.tam); if (!dgrp[k]) { dgrp[k] = { tam: x.tam, sin: [], saat: 0, k: k }; dsr.push(dgrp[k]); } dgrp[k].sin.push(x.sinif); dgrp[k].saat += x.slots.length; });
    dsr.forEach(function (x) { out.push({ k: 'Derslerin', t: x.tam, s: x.sin.join(' · ') + ' — haftada ' + x.saat + ' saat', dt: dg.length === 1 ? 'dr:0' : 'dl:' + x.k }); });
    // 5) Bu haftanın kazanımı (ders programı + kazanım planı; yoksa kart çıkmaz)
    var kz = kzSlayt(C); if (kz) out.push(kz);
    // 6) Eğitim-öğretim haftası
    var eo = ortak(y, 'egitimhaftasi'); if (!eo || !Array.isArray(eo.liste)) eo = (KZ.idx && Array.isArray(KZ.idx.hafta)) ? { liste: KZ.idx.hafta } : null;
    if (eo) for (var q = 0; q < eo.liste.length; q++) { var eh = eo.liste[q]; if (eh && ISODT.test(eh.bas || '') && ISODT.test(eh.bit || '') && eh.bas <= bg && bg <= eh.bit && +eh.n > 0) { var eyb = eyBilgi(C); out.push({ k: 'Eğitim haftası', t: eh.n + '. eğitim-öğretim haftası', s: aralik(eh.bas, eh.bit), s2: eyb ? 'Yılın %' + eyb.pct + '’i geride · ' + eyb.kalan + ' okul günü kaldı' : '', bar: eyb ? eyb.pct : null, dt: 'eh' }); break; } }
    return out;
  }
  // ---- 0.15.0: milli bayram günlerinde ilk slayt dalgalanan Türk bayrağı (hareketi azalt açıksa durağan kalır)
  var BAYRAM = { '10-29': ['Cumhuriyet Bayramı', 'Cumhuriyetimizin {y}. yılı kutlu olsun', 1923], '04-23': ['Ulusal Egemenlik ve Çocuk Bayramı', '23 Nisan kutlu olsun'], '05-19': ['Atatürk’ü Anma, Gençlik ve Spor Bayramı', '19 Mayıs kutlu olsun'], '08-30': ['Zafer Bayramı', 'Zafer Bayramımız kutlu olsun'], '07-15': ['Demokrasi ve Milli Birlik Günü', 'Şehitlerimizi saygıyla anıyoruz'], '05-01': ['Emek ve Dayanışma Günü', '1 Mayıs kutlu olsun'] };
  function bayramBugun(d) {
    var k = f2(d.getMonth() + 1) + '-' + f2(d.getDate()), b = BAYRAM[k];
    if (b) return { ad: b[0], t: b[1].replace('{y}', b[2] ? (d.getFullYear() - b[2]) : '') };
    if (k === '10-28' && d.getHours() >= 13) return { ad: 'Cumhuriyet Bayramı arifesi', t: 'Yarın Cumhuriyet Bayramı' };
    return null;
  }
  // ---- 0.16.4: dalgalanan bayrak canvas ile çizilir (2 piksellik ince dilimler; basamak/kesik görünmez). Yalnız bayrak görünürken çalışır.
  var BY = { on: false, son: 0, t0: 0, W: 0, H: 0, off: null, A: 0 };
  var BY_AZ = !!(window.matchMedia && matchMedia('(prefers-reduced-motion:reduce)').matches);
  function bayrakOff(W, H) {
    var A = 17 * 2, FH = H + 4 * A, o = document.createElement('canvas'); o.width = W; o.height = FH;
    var g = o.getContext('2d'), sc = W / 90;
    g.fillStyle = '#E30A17'; g.fillRect(0, 0, W, FH);
    g.setTransform(sc, 0, 0, sc, 0, FH / 2);
    g.fillStyle = '#fff'; g.beginPath(); g.arc(30, 0, 15, 0, 6.2832); g.fill();
    g.fillStyle = '#E30A17'; g.beginPath(); g.arc(33.75, 0, 12, 0, 6.2832); g.fill();
    g.fillStyle = '#fff'; g.fill(new Path2D('M41.75 0l13.568-4.408-8.386 11.541V-7.133l8.386 11.541z'));
    BY.off = o; BY.W = W; BY.H = H; BY.A = A; BY.FH = FH;
  }
  function bayrakCiz(cv, t) {
    var dpr = Math.min(2, window.devicePixelRatio || 1), W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
    if (W < 20 || H < 20) return;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    if (!BY.off || BY.W !== W || BY.H !== H) bayrakOff(W, H);
    var c = cv.getContext('2d'), A = BY.A * dpr / 2, FH = BY.FH, FW = W, SW = 2, x, u, ph, amp, dy, sl, dh;
    c.clearRect(0, 0, W, H);
    for (x = 0; x < FW; x += SW) {
      u = (x + SW / 2) / FW; ph = u * 7 - t * 3.1; amp = A * (0.25 + 0.9 * u);
      dy = Math.sin(ph) * amp + Math.sin(ph * 1.9 + 1.3) * amp * 0.18;
      sl = Math.cos(ph) * (0.25 + 0.9 * u); dh = FH * (1 + 0.06 * sl);
      c.drawImage(BY.off, x, 0, SW, FH, x, (H - dh) / 2 + dy, SW, dh);
      c.fillStyle = sl > 0 ? 'rgba(0,0,0,' + (sl * 0.34).toFixed(3) + ')' : 'rgba(255,255,255,' + (-sl * 0.2).toFixed(3) + ')';
      c.fillRect(x, 0, SW, H);
    }
  }
  function bayrakDongu(ts) {
    var cv = document.querySelector('.hcar > .sl:not(.out) canvas.bcv');
    if (!cv || document.hidden) { BY.on = false; if (cv || BY.bekle) { BY.bekle = true; setTimeout(function () { BY.bekle = false; bayrakBasla(); }, 500); } return; }
    var r = cv.getBoundingClientRect();
    if (r.bottom > 0 && r.top < (window.innerHeight || 800) && (ts - BY.son >= 33 || BY_AZ)) {
      BY.son = ts;
      try { bayrakCiz(cv, BY_AZ ? 0.6 : (ts - BY.t0) / 1000); } catch (e) {}
    }
    if (BY_AZ && cv.getAttribute('data-ok')) { BY.on = false; BY.bekle = true; setTimeout(function () { BY.bekle = false; bayrakBasla(); }, 700); return; }
    if (BY_AZ) cv.setAttribute('data-ok', '1');
    requestAnimationFrame(bayrakDongu);
  }
  function bayrakBasla() {
    if (BY.on) return; BY.on = true; if (!BY.t0) BY.t0 = performance.now();
    requestAnimationFrame(bayrakDongu);
  }
  function bayrakHTML(b) {
    setTimeout(bayrakBasla, 0);
    return '<div class="bay" role="img" aria-label="Dalgalanan Türk bayrağı. ' + esc(b.t) + '"><canvas class="bcv" aria-hidden="true"></canvas><div class="bsc"></div><div class="btx"><small>' + esc(b.ad) + '</small><b>' + esc(b.t) + '</b></div></div>';
  }
  function heroSlaytlar(C) {
    var y = C.y, s = [], akt = dersAnimi(C), bay = bayramBugun(C.d);
    if (bay) s.push({ id: 'bayrak', h: bayrakHTML(bay) });
    if (yayinlandi(y, 'gokyuzu')) s.push({ id: 'gokyuzu' });
    if (!akt) s.push({ id: 'durum', h: durumKarti(C, 0) });
    if (!GIZLE.pano) yeniSlaytlar(C).forEach(function (p, i) { s.push({ id: p.sid || 'y' + i, h: oneKart(p, true), dt: p.dt || undefined }); });
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
    var cur = s[HI];
    if (cur && cur.id === 'sinav' && SNK !== HSON) { SNK = HSON; SNO++; s = heroSlaytlar(C); n = s.length; if (HI >= n) HI = 0; cur = s[HI]; }
    var body = cur.h, fx = HFX; HFX = false;
    if (body && !cur.dt && cur.id !== 'gokyuzu') body = body.replace(/<span class="go" aria-hidden="true"><svg[\s\S]*?<\/svg><\/span>/, '');
    if (body && cur.id !== 'gokyuzu') body = body.replace('<span class="hcnt"></span>', '<span class="hcnt">' + (HI + 1) + ' / ' + n + '</span>');
    if (cur.id === 'gokyuzu') { window.SKCTX = ''; body = '<div class="skyc" id="skyc">' + skSkeleton() + '</div>' + SKY_BIT; }
    h = '<div class="hcar"><div class="sl' + (n === 1 ? ' one' : '') + (fx ? ' fx' + (HYON > 0 ? ' fxs' : (HYON < 0 ? ' fxr' : '')) : '') + '"' + (cur.dt ? ' data-dt="' + esc(cur.dt) + '"' : '') + '>' + body + '</div>';
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
  // Slayt geçişi: eski kart sola (geri yönde sağa) kayıp solar, yeni kart karşı yönden kayarak gelir.
  // Eski kartın dokunulmaz bir kopyası ~0,6 sn üstte kalır; durum/mantık değişmez, yalnız görsel katman.
  function slaytKopya() {
    var sl = document.querySelector('#top .hcar > .sl'); if (!sl) return null;
    var k = sl.cloneNode(true), q = [k].concat([].slice.call(k.querySelectorAll('*')));
    [].forEach.call(sl.querySelectorAll('canvas.bcv'), function (c0, i) { var c1 = k.querySelectorAll('canvas.bcv')[i]; if (c1 && c0.width) { c1.width = c0.width; c1.height = c0.height; try { c1.getContext('2d').drawImage(c0, 0, 0); } catch (e) {} } });
    q.forEach(function (e) { ['id', 'data-hc', 'data-dt', 'data-lv', 'data-i', 'data-sk'].forEach(function (a) { e.removeAttribute(a); }); });
    k.classList.remove('fx', 'fxs', 'fxr', 'one'); k.setAttribute('aria-hidden', 'true'); k.setAttribute('inert', '');
    return k;
  }
  function slaytGecis(degis, yon) {
    var onceki = HI, kopya = slaytKopya();
    degis();
    var hc = document.querySelector('#top .hcar');
    if (!kopya || !hc || HI === onceki) return;
    kopya.classList.add('out', yon > 0 ? 'ol' : 'or'); hc.appendChild(kopya);
    setTimeout(function () { if (kopya.parentNode) kopya.parentNode.removeChild(kopya); }, 700);
  }
  function heroGit(j) {
    var s = heroSlaytlar(CTX || baglam()), n = s.length; if (n < 2) return;
    var yon = j >= HI ? 1 : -1;
    slaytGecis(function () { HI = ((j % n) + n) % n; HFX = true; HYON = yon; HSON = Date.now(); HLAST = HSON; tick(true); HYON = 0; }, yon);
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
      else if (g1.tip === 'hs') { var nx = sonrakiOkul(C); t = nx ? 'Okullar ' + nx.etiket.toLocaleLowerCase('tr-TR') + ' açılıyor.' : 'Yarın hafta sonu.'; s = nx ? 'İlk ders ' + nx.ilk + '.' : ''; }
      if (t) out.push({ k: 'Yarına bakış', t: t, s: s, c: 'var(--teal)', dt: 'gun:' + iso(yr) });
    }
    var bgun = ortak(y, 'slayt:belirliGun');
    if (bgun && Array.isArray(bgun.satirlar)) {
      var son = iso(gunEkle(C.d, 14)), b = null;
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
  function sAkis(C, mine, baslik) {
    if (C.gb.tip !== 'ders' || !C.sc.length) return '';
    var nBen = 0, nCov = 0, yer = mine ? nobetYer(C.y, C.gb.wd, C.gb.ds) : '';
    C.gb.ders.forEach(function (x, i) { if (C.MY[i + 1]) nBen++; if (C.COV[i + 1]) nCov++; });
    var alt = mine ? (nBen + ' ders' + (nCov ? ', ' + nCov + ' doldurma' : '') + (yer ? ', nöbet' : '')) : (C.gb.ders.length + ' ders');
    var h = '';
    if (mine && yer) h += '<div class="sec" data-k="nobet"><div class="rot" data-dt="nbd"><p>Nöbet yerin</p><div class="d" style="font-size:20px;font-weight:600;margin-top:6px;letter-spacing:-.3px">' + esc(yer) + '</div></div></div>';
    h += '<div class="sec" data-k="akis">' + secH(mine ? 'Bugünkü programın' : (baslik || 'Gün akışı'), alt) + '<div class="flow"><div class="rail"><i></i></div><div class="cur"></div>';
    C.sc.forEach(function (r, ri) {
      var les = r[0] === 'ders', no = dersNo(r), my = mine && les && C.MY[no], cv = mine && les && C.COV[no];
      if (!les && mine) return;
      var etiket = les ? r[1] : r[1] + ', ' + (mdk(r[3]) - mdk(r[2])) + ' dk';
      var sag = '';
      if (my) sag = '<span class="c2">' + esc(my.sinif) + (my.ders ? ' · ' + esc(my.ders) : '') + '</span>';
      else if (cv) sag = '<span class="c2">' + esc(cv.sinif || '') + '</span>';
      else if (mine && les) sag = '<span class="c2">Boş</span>';
      h += '<div class="fr ' + (les ? 'l' : 'k') + ((my || cv) ? ' my' : '') + (cv ? ' cvr' : '') + (mine && les && !my && !cv ? ' dim' : '') + '" data-s="' + mdk(r[2]) * 60 + '" data-e="' + mdk(r[3]) * 60 + '" data-dt="ak:' + C.gb.ds + ':' + ri + '"><span class="tm">' + r[2] + '</span><b>' + esc(etiket) + '</b>' + sag + (cv ? '<span class="nb">Doldurma</span>' : '') + '</div>';
    });
    return h + '</div></div>';
  }
  // Haftalık yayında 'gunler' (tarih+liste) vardır: gün tarihe göre seçilir. Eski biçim (yalnız bugünün tarih/liste alanı) da çalışır.
  function nobetListe(y, ds) {
    var nb = ortak(y, 'nobetciler'); if (!nb) return [];
    var l = null;
    if (Array.isArray(nb.gunler)) { for (var i = 0; i < nb.gunler.length; i++) { var g = nb.gunler[i]; if (g && g.tarih === ds && Array.isArray(g.liste)) { l = g.liste; break; } } }
    if (!l && nb.tarih === ds && Array.isArray(nb.liste)) l = nb.liste;
    return (l || []).filter(function (k) { return k && typeof k.ad === 'string' && k.ad; });
  }
  function sNobetci(C) {
    var nbl = nobetListe(C.y, C.gb.ds);
    if (!nbl.length || C.gb.tip !== 'ders') return '';
    return '<div class="sec" data-k="nobet">' + secH('Bugün nöbetçi', nbl.length + ' kişi') + '<div class="rows">' + nbl.map(function (k, ki) {
      return '<div class="rw' + (C.ben && norm(k.ad) === C.ben ? ' me' : '') + '" data-dt="nb:' + ki + '"><div class="a"><b>' + esc(k.ad) + '</b></div><span class="z">' + esc(k.yer || '') + '</span></div>';
    }).join('') + '</div><div class="paysat">' + payBtn('nobg', 'Günlük liste resmi') + (nobHafta(C).length > 1 ? payBtn('nobh', 'Haftalık liste resmi') : '') + '</div></div>';
  }
  // Slaytın hemen altındaki kısa özet (yalnız kendi doldurması varsa)
  function doldurmaSerit(C) {
    var l = benimDoldurma(C); if (!l.length) return '';
    return '<button type="button" class="cvs" data-dt="dn:' + C.gb.ds + ':' + l[0].no + '"><span class="ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h10a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h10M9 8h5"/></svg></span><span class="tx"><small>Ders doldurma</small><b>' + esc(cvOzet(l)) + '</b></span><span class="go"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></span></button>';
  }
  // Herkese açık günlük liste: gelmeyen öğretmen yerine giren nöbetçiler (saat imleci tick() içinde ilerler)
  function sDoldurmaToplu(C) {
    if (C.gb.tip !== 'ders') return '';
    var l = topluDoldurma(C.y, C.gb.ds); if (!l.length) return '';
    var ds = C.gb.ds;
    var rows = l.map(function (x) {
      var r = C.gb.ders[x.saat - 1]; if (!r) return '';
      var sen = C.ben && norm(x.giren) === C.ben;
      return '<div class="cr' + (sen ? ' me' : '') + '" data-s="' + mdk(r[1]) * 60 + '" data-e="' + mdk(r[2]) * 60 + '"' + (sen ? ' data-dt="dn:' + ds + ':' + x.saat + '"' : '') + '><div class="sa"><b>' + x.saat + '. ders</b><small>' + esc(r[1]) + '</small></div><div class="sn"' + kdA(x.sinif) + '>' + esc(x.sinif || '·') + '</div><div class="nm"><small class="g">' + esc(x.yerine ? x.yerine + ' yerine' : 'Gelmeyen öğretmen yerine') + '</small><span class="d2">' + esc(x.giren) + '</span><small class="k"></small></div></div>';
    }).join('');
    if (!rows) return '';
    return '<div class="sec" data-k="dolt">' + secH('Bugün ders doldurma', l.length + ' ders') + '<div class="cvhd"><i></i>Gelmeyen öğretmenlerin yerine giren nöbetçiler</div><div class="tl2"><div class="rl"><i></i></div><div class="im"><b></b></div>' + rows + '</div></div>';
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
  // ---- 0.15.5: yaklaşan sınav yardımcıları (7 gün; günü ya da saati geçen sınav görünmez)
  function sinavGorunen(C, liste) {
    var bg = C.gb.ds, son = iso(gunEkle(C.d, 7));
    function anh(o) { return o.bas + '|' + ((o.x && saatOk(o.x.saat)) ? o.x.saat : '99:99') + '|' + o.ad; }
    return liste.filter(function (o) {
      if (o.k !== 'sinav' || o.bit < bg || o.bas > son) return false;
      if (o.bas === bg && o.bit === bg && o.x && saatOk(o.x.saat) && C.T >= mdk(o.x.saat) * 60) return false;
      return true;
    }).sort(function (a, b) { var x = anh(a), z = anh(b); return x < z ? -1 : (x > z ? 1 : 0); });
  }
  function sinavKt(C, o) {
    var bg = C.gb.ds;
    if (o.bas <= bg) return o.hafta ? 'Şu an' : 'Bugün' + (o.x && saatOk(o.x.saat) ? ' ' + o.x.saat : '');
    var kl = gunFark(bg, o.bas); return kl === 1 ? 'Yarın' : kl + ' gün sonra';
  }
  function sinavAlt(o, saatsiz) {
    if (o.x) return [(!saatsiz && saatOk(o.x.saat)) ? o.x.saat : '', o.x.sinif || '', o.x.ders || ''].filter(Boolean).join(' · ');
    return o.alt || '';
  }
  function dtSinavlar() {
    var C = CTX || baglam(), l = sinavGorunen(C, olaylar(C.y)), h = '<div class="dsub" style="margin-top:0">Önümüzdeki 7 gün</div><div class="rows">';
    if (!l.length) h += '<div class="empty"><b>Yaklaşan sınav yok</b></div>';
    l.forEach(function (o) { h += dtSatir(olayKodu(o), sinavKt(C, o), o.ad, o.hafta ? aralik(o.bas, o.bit) : gunAy(o.bas) + (sinavAlt(o, 1) ? ' · ' + sinavAlt(o, 1) : ''), ''); });
    dtGoster('Yaklaşan sınavlar', h + '</div>');
  }
  // ---- 0.15.5: eğitim yılı bilgileri (MEB hafta listesinden; panelin yolculuk slaytıyla aynı hesap)
  var EYM = { ds: '', v: null };
  function eyBilgi(C) {
    if (EYM.ds === C.gb.ds && EYM.y === C.y) return EYM.v;
    var v = null, o = ortak(C.y, 'egitimhaftasi');
    if (!o || !Array.isArray(o.liste)) o = (KZ.idx && Array.isArray(KZ.idx.hafta)) ? { liste: KZ.idx.hafta } : null;
    var w = o ? o.liste.filter(function (h) { return h && ISODT.test(h.bas || '') && ISODT.test(h.bit || '') && +h.n > 0; }).sort(function (a, b) { return a.bas < b.bas ? -1 : 1; }) : [];
    // Panelin yayınladığı eğitim yılı tarihleri öncelikli; yayın yoksa MEB hafta listesinden (4+ hafta) türetilir.
    var pb = ortak(C.y, 'egitimyili'), pv = pb && ISODT.test(pb.bas || '') && ISODT.test(pb.d1bit || '') && ISODT.test(pb.d2bas || '') && ISODT.test(pb.bit || '') && pb.bas < pb.d1bit && pb.d1bit < pb.d2bas && pb.d2bas < pb.bit;
    if (pv || w.length > 4) {
      var ds = C.gb.ds, i, wn = 0, bas, bit, t1, t2;
      if (pv) { bas = pb.bas; bit = pb.bit; t1 = pb.d1bit; t2 = pb.d2bas; }
      else {
        bas = w[0].bas; bit = w[w.length - 1].bit; var gi = -1, gm = 0;
        for (i = 0; i < w.length - 1; i++) { var g = gunFark(w[i].bit, w[i + 1].bas); if (g >= gm) { gm = g; gi = i; } }
        t1 = gi >= 0 ? w[gi].bit : ''; t2 = gi >= 0 ? w[gi + 1].bas : '';
      }
      var tot = Math.max(1, gunFark(bas, bit)), got = Math.min(tot, Math.max(0, gunFark(bas, ds)));
      for (i = 0; i < w.length; i++) if (w[i].bas <= ds) wn = +w[i].n;
      if (!w.length) wn = ds < bas ? 0 : Math.floor(got / 7) + 1;
      var kalan = 0, d, y = C.y; for (i = 0; i < 400; i++) { d = gunEkle(C.d, i); if (iso(d) > bit) break; try { if (gunBilgi(y, d).tip === 'ders') kalan++; } catch (e) {} }
      var dn = '1. dönem', dp = 100;
      if (t1) {
        if (ds <= t1) dp = Math.round(Math.min(1, gunFark(bas, ds) / Math.max(1, gunFark(bas, t1))) * 100);
        else if (ds >= t2) { dn = '2. dönem'; dp = Math.round(Math.min(1, gunFark(t2, ds) / Math.max(1, gunFark(t2, bit))) * 100); }
      } else dp = Math.round(got / tot * 100);
      v = { pct: Math.round(got / tot * 100), hafta: wn, toplam: w.length, kalan: kalan, bas: bas, bit: bit, t1: t1, t2: t2, donem: dn, dpct: dp };
    }
    EYM = { ds: C.gb.ds, y: C.y, v: v }; return v;
  }
  function dtEgitimYili() {
    var C = CTX || baglam(), e = eyBilgi(C); if (!e) return;
    var h = '<div class="dbig d">%' + e.pct + '</div><div class="dsub">Eğitim yılının %' + e.pct + '’i geride kaldı</div><div class="ebar"><i style="width:' + e.pct + '%"></i></div><div class="kvs">'
      + kvH('Eğitim-öğretim haftası', e.hafta ? e.hafta + '. hafta' + (e.toplam ? ' / ' + e.toplam : '') : '—') + kvH('Kalan okul günü', String(e.kalan)) + kvH(e.donem + ' ilerlemesi', e.dpct >= 100 ? '%100 · tamamlandı' : '%' + e.dpct)
      + kvH(e.t1 && C.gb.ds <= e.t1 ? '1. dönem sonu (karne)' : 'Eğitim yılı sonu (karne)', gunAy(e.t1 && C.gb.ds <= e.t1 ? e.t1 : e.bit)) + kvH('Yıl başı – yıl sonu', aralik(e.bas, e.bit)) + '</div>';
    dtGoster('Eğitim yılı', h);
  }
  function okulaDonus(y, d0) { for (var i = 0; i < 60; i++) { var d = gunEkle(d0, i); try { if (gunBilgi(y, d).tip === 'ders') return d; } catch (e) {} } return null; }
  function dtTatil(bas) {
    var C = CTX || baglam(), th = ortak(C.y, 'tatil'), t = th && Array.isArray(th.liste) ? th.liste.filter(function (x) { return x && x.bas === bas; })[0] : null; if (!t) return;
    var bit = t.bit || t.bas, N = gunFark(C.gb.ds, bas), sure = gunFark(bas, bit) + 1, d = okulaDonus(C.y, gunEkle(tarihCoz(bit), 1));
    var h = '<div class="dbig d" style="font-size:26px;line-height:1.15">' + esc(String(t.ad || 'Tatil')) + '</div><div class="dsub">' + esc(aralik(bas, bit)) + '</div><div class="kvs">'
      + kvH('Kalan gün', N <= 1 ? 'Yarın' : N + ' gün') + kvH('Tatil süresi', sure + ' gün') + (d ? kvH('Okulun açılışı', GUN[d.getDay()] + ', ' + gunAy(iso(d))) : '') + '</div>';
    dtGoster('Sonraki tatil', h);
  }
  function dtHaftaSonu() {
    var C = CTX || baglam(), d = okulaDonus(C.y, C.d); if (!d) return;
    var G = gunBilgi(C.y, d), ilk = G.ders && G.ders[0] ? G.ders[0][1] : '', l = sinavGorunen(C, olaylar(C.y));
    var h = '<div class="dbig d" style="font-size:26px;line-height:1.15">' + GUN[d.getDay()] + ', ' + gunAy(iso(d)) + '</div><div class="dsub">' + (ilk ? 'İlk ders ' + esc(ilk) + saatEk(ilk) : 'Okul açılıyor') + '</div>';
    if (l.length) { h += '<div class="rows" style="margin-top:20px">'; l.forEach(function (o) { h += dtSatir(olayKodu(o), sinavKt(C, o), o.ad, o.hafta ? aralik(o.bas, o.bit) : gunAy(o.bas) + (sinavAlt(o, 1) ? ' · ' + sinavAlt(o, 1) : ''), ''); }); h += '</div>'; }
    dtGoster('Gelecek hafta', h);
  }
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

  // 0.16.0: kadran = gerçek saat yüzü. Tüm gün 360°; ders ve teneffüsler süreleriyle orantılı; akrep merkezden gerçek zamanla döner.
  var KD = { C: 150, R: 100, W: 32 };
  function kdPt(a, r) { var t = (a - 90) * Math.PI / 180; return [KD.C + r * Math.cos(t), KD.C + r * Math.sin(t)]; }
  function kdF(p) { return p[0].toFixed(2) + ' ' + p[1].toFixed(2); }
  // halka dilimi; köşeleri yumuşatmak için aynı renkte round-join çizgi ile birlikte kullanılır (CSS)
  function kdSek(a0, a1, rI, rO) {
    var big = (a1 - a0) > 180 ? 1 : 0;
    return 'M' + kdF(kdPt(a0, rO)) + 'A' + rO + ' ' + rO + ' 0 ' + big + ' 1 ' + kdF(kdPt(a1, rO)) + 'L' + kdF(kdPt(a1, rI)) + 'A' + rI + ' ' + rI + ' 0 ' + big + ' 0 ' + kdF(kdPt(a0, rI)) + 'Z';
  }
  function gunSinif(x, planli) { return x.m ? esc(x.m.sinif) : (planli ? 'Boş' : ''); }

  // 0.16.2 kadran merkezi: saat dokusu (ışınlar, halkalar, altın saat noktaları), 12 konumunda "durum penceresi", altta dijital saat
  function kdMerkez(bugun, nles, ilkSaat) {
    var h = '<g class="mkz" aria-hidden="true">', i, a, q0, q1, big;
    for (i = 0; i < 120; i++) { a = i * 3; big = i % 10 === 0; q0 = kdPt(a, big ? 46 : 60); q1 = kdPt(a, 76); h += '<line class="mkl' + (big ? ' b' : '') + '" x1="' + q0[0].toFixed(1) + '" y1="' + q0[1].toFixed(1) + '" x2="' + q1[0].toFixed(1) + '" y2="' + q1[1].toFixed(1) + '"/>'; }
    for (i = 22; i <= 58; i += 6) h += '<circle class="mkr' + (i % 12 === 4 ? ' b' : '') + '" cx="150" cy="150" r="' + i + '"/>';
    for (i = 0; i < 12; i++) { q0 = kdPt(i * 30, 80); h += '<circle class="mkn" cx="' + q0[0].toFixed(1) + '" cy="' + q0[1].toFixed(1) + '" r="1.7"/>'; }
    h += '<circle cx="150" cy="150" r="82" fill="url(#mkg)"/><circle cx="150" cy="150" r="82" fill="url(#mkg2)"/><circle class="mkh" cx="150" cy="150" r="17"/>';
    h += '<g class="mkw ' + (bugun ? 'b' : 'x') + '"><rect class="mkpr" x="112" y="91" width="76" height="30" rx="12"/><rect class="mkpi" x="114.5" y="93.5" width="71" height="25" rx="9.5"/><text class="mkv mkl2" x="150" y="109.4" text-anchor="middle">' + (bugun ? '' : esc(ilkSaat || '')) + '</text><path class="mkck" d="M-8.5 .5L-2.5 6.5L9 -6" transform="translate(150 105.4)"/><rect class="mkbg" x="124" y="113.6" width="52" height="1.6" rx=".8"/><rect class="mkbp" x="124" y="113.6" width="0" height="1.6" rx=".8"/></g>';
    h += '<g class="mkp"><rect class="mkpr" x="116" y="184" width="68" height="28" rx="14"/><rect class="mkpi" x="118.5" y="186.5" width="63" height="23" rx="11.5"/><text class="mkd mkt" x="150" y="203.6" text-anchor="middle">' + '' + '</text></g>';
    return h + '</g>';
  }
  function gunKadran(les, bugun, planli) {
    var A0 = mdk(les[0].r[2]) * 60, Z0 = mdk(les[les.length - 1].r[3]) * 60, span = Z0 - A0, rI = KD.R - KD.W / 2 + 2, rO = KD.R + KD.W / 2 - 2, INS = 0.5, i;
    var sv = '<svg viewBox="0 0 300 300" role="group" aria-label="Ders kadranı"><defs><radialGradient id="mkg" cx="34%" cy="26%" r="95%"><stop offset="0" class="mka"/><stop offset=".5" class="mkb"/><stop offset="1" class="mkc0"/></radialGradient><radialGradient id="mkg2" cx="72%" cy="82%" r="60%"><stop offset="0" class="mkd0"/><stop offset="1" class="mkc0"/></radialGradient><pattern id="kdh" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="kdhl"/></pattern><radialGradient id="kdg1" cx="38%" cy="30%" r="80%"><stop offset="0" class="g1a"/><stop offset=".6" class="g1b"/><stop offset="1" class="g1c"/></radialGradient><linearGradient id="kdg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="g2a"/><stop offset=".45" class="g2b"/><stop offset="1" class="g2c"/></linearGradient><linearGradient id="kdg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="g3a"/><stop offset="1" class="g3b"/></linearGradient><radialGradient id="kdg4" cx="50%" cy="50%" r="50%"><stop offset=".86" stop-color="#000" stop-opacity="0"/><stop offset="1" class="g4"/></radialGradient></defs>';
    sv += '<circle cx="150" cy="150" r="149" class="kdcam"/><circle cx="150" cy="150" r="149" fill="url(#kdg4)"/><ellipse cx="116" cy="58" rx="86" ry="46" transform="rotate(-24 116 58)" class="kdsp"/><circle cx="150" cy="150" r="148.4" class="kdbz"/><circle cx="150" cy="150" r="' + KD.R + '" class="kdtr"/>';
    for (var tt = Math.ceil(A0 / 600) * 600; tt < Z0; tt += 600) {
      var ta = (tt - A0) / span * 360, hr = tt % 3600 === 0, q0 = kdPt(ta, 142), q1 = kdPt(ta, hr ? 148 : 145);
      sv += '<line class="kdtk' + (hr ? ' h' : '') + '" x1="' + q0[0].toFixed(1) + '" y1="' + q0[1].toFixed(1) + '" x2="' + q1[0].toFixed(1) + '" y2="' + q1[1].toFixed(1) + '"/>';
    }
    var s0q = kdPt(0, 141), s1q = kdPt(0, 148); sv += '<line class="kdtk s" x1="' + s0q[0].toFixed(1) + '" y1="' + s0q[1].toFixed(1) + '" x2="' + s1q[0].toFixed(1) + '" y2="' + s1q[1].toFixed(1) + '"/>';
    les.forEach(function (x, i) {
      var s0 = mdk(x.r[2]) * 60, e0 = mdk(x.r[3]) * 60, a0 = (s0 - A0) / span * 360 + INS, a1 = (e0 - A0) / span * 360 - INS, mid = (a0 + a1) / 2, p = kdPt(mid, KD.R), rot = (mid > 90 && mid < 270) ? mid + 180 : mid;
      var hal = x.m ? ' my' : (planli && !x.cv ? ' bos' : ''), cvc = x.cv ? ' cv' : '', lab = x.m ? esc(x.m.sinif) : (planli ? (x.cv ? '' : 'Boş') : String(x.no)), pb = kdPt(mid, 130.5);
      sv += '<path class="ar gx' + hal + cvc + '" d="' + kdSek(a0, a1, rI, rO) + '" data-i="' + i + '" data-s="' + s0 + '" data-e="' + e0 + '" data-g0="' + a0.toFixed(2) + '" data-g1="' + a1.toFixed(2) + '" data-no="' + x.no + '" data-t="' + esc(x.r[2] + ' – ' + x.r[3]) + '" data-c="' + gunSinif(x, planli) + '" data-dt="ak:' + esc(x.ds) + ':' + x.ri + '"/>';
      if (lab === 'Boş') sv += '<rect class="dnb" data-i="' + i + '" x="-15" y="-8.6" width="30" height="17" rx="8.5" transform="translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ') rotate(' + rot.toFixed(1) + ')"/>';
      sv += '<text class="dno' + hal + cvc + '" data-i="' + i + '" transform="translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ') rotate(' + rot.toFixed(1) + ')" y="4.6">' + lab + '</text>';
      if (planli) sv += '<g class="kdb" data-i="' + i + '"><circle cx="' + pb[0].toFixed(1) + '" cy="' + pb[1].toFixed(1) + '" r="10.5"/><text x="' + pb[0].toFixed(1) + '" y="' + (pb[1] + 4.7).toFixed(1) + '">' + x.no + '</text></g>';
    });
    sv += kdMerkez(bugun, les.length, String(les[0].r[2]).slice(0, 5));
    sv += '<path class="apg" d="" style="display:none"/>';
    sv += '<g class="nd' + (bugun ? '' : ' sol') + '" data-a0="' + A0 + '" data-z0="' + Z0 + '" transform="translate(150 150)"' + (bugun ? ' style="display:none"' : '') + '><path class="el" d="M0 22L-3.6 0L0 -114L3.6 0Z"/><circle class="hb" r="8"/><circle class="hb2" r="3.2"/></g></svg>';
    var ilk = les[0], son = les[les.length - 1], hasCv = false, hasBos = false;
    les.forEach(function (x) { if (x.cv) hasCv = true; if (planli && !x.m && !x.cv) hasBos = true; });
    var lej = '<div class="kdl">' + (planli ? '<span><i class="a"></i>Dersim</span>' : '<span><i class="b"></i>Ders</span>') + (hasCv ? '<span><i class="e"></i>Doldurma</span>' : '') + (hasBos ? '<span><i class="d"></i>Boş saat</span>' : '') + '<span><i class="t"></i>Teneffüs</span>' + (bugun ? '<span><i class="c"></i>Şimdi</span>' : '') + '</div>';
    return '<div class="dial kdy" id="gs" data-bg="' + (bugun ? 1 : 0) + '">' + sv + '<div class="dc"><span class="dk">' + (bugun ? '' : 'Ders programı') + '</span><b class="dn d">' + (bugun ? '' : les.length + ' ders') + '</b><span class="dd">' + (bugun ? '' : esc(ilk.r[2] + ' – ' + son.r[3])) + '</span></div></div>' + lej;
  }
  // ---- 0.14.0 Günüm: yeni gösterimler (Şerit, Hat, Gün takvimi, Odak)
  var GV_GECERLI = ['a', 'b', 'v', 'd', 'e', 'f', 'g', 'h'];
  function gvDeger() { var v = oku(K.gun); return GV_GECERLI.indexOf(v) >= 0 ? v : 'v'; }
  function gvAyarAc() {
    AYOP.gor = true; ayarAc();
    setTimeout(function () { var e = $('o_gv'); if (e && e.scrollIntoView) e.scrollIntoView(true); }, 80);
  }
  function gzSn(x, planli) { return x.m ? x.m.sinif : (planli ? 'Boş' : ''); }
  function gzOz(x, planli, ds) {
    var c = gzSn(x, planli);
    return ' data-s="' + mdk(x.r[2]) * 60 + '" data-e="' + mdk(x.r[3]) * 60 + '" data-no="' + x.no + '" data-c="' + esc(c) + '" data-t="' + esc(x.r[2] + ' – ' + x.r[3]) + '" data-dt="ak:' + ds + ':' + x.ri + '" aria-label="' + esc(x.no + '. ders' + (c ? ', ' + c : '') + ', ' + x.r[2] + ' – ' + x.r[3] + (x.cv ? ', doldurma' : '')) + '"';
  }
  function gzMod(x, planli) { return (x.m ? ' my' : (planli ? ' bos' : '')) + (x.cv ? ' cv' : ''); }
  function gzKart(les, bugun, etiket) {
    var ilk = les[0], son = les[les.length - 1], st = bugun ? ['', '', '', 0] : [etiket, les.length + ' ders', ilk.r[2] + ' – ' + son.r[3], 0];
    return '<div class="gzf"><small data-gz="kick">' + esc(st[0]) + '</small><b class="gzbg" data-gz="big">' + esc(st[1]) + '</b><span class="al" data-gz="alt">' + esc(st[2]) + '</span><div class="pr"><u data-gz="pct"></u></div><div class="sx"><span data-gz="kal"></span><span data-gz="snr"></span></div></div>';
  }
  function gunYeni(st, les, C, bugun, ds, planli) {
    var A0 = mdk(les[0].r[2]) * 60, Z0 = mdk(les[les.length - 1].r[3]) * 60, span = Math.max(1, Z0 - A0), n = les.length, H = gunumHedef(C), etiket = H ? H.etiket : 'Yarın';
    var rt = '<div class="gzr gz' + st + '" id="gs" data-bg="' + (bugun ? 1 : 0) + '" data-fz="' + (bugun ? '' : 's') + '" data-a0="' + A0 + '" data-z0="' + Z0 + '">', h = rt;
    function yz(s) { return ((s - A0) / span * 100).toFixed(2); }
    if (st === 'e') {
      h += '<div class="gzs-bar"><div class="gzs-trk"></div>';
      les.forEach(function (x) {
        var s0 = mdk(x.r[2]) * 60, e0 = mdk(x.r[3]) * 60;
        h += '<button type="button" class="gzx gzs-b' + gzMod(x, planli) + '"' + gzOz(x, planli, ds) + ' style="left:calc(' + yz(s0) + '% + 1px);width:calc(' + ((e0 - s0) / span * 100).toFixed(2) + '% - 2px)"><u></u><b>' + x.no + '</b></button>';
      });
      if (bugun) h += '<div class="gzs-n" style="display:none"><b></b></div>';
      h += '</div><div class="gzs-ax"><span style="left:0">' + esc(les[0].r[2]) + '</span>';
      for (var i = 1; i < n; i++) { var g = mdk(les[i].r[2]) - mdk(les[i - 1].r[3]); if (g >= 30) h += '<span style="left:' + yz((mdk(les[i].r[2]) + mdk(les[i - 1].r[3])) / 2 * 60) + '%">uzun ara · ' + g + ' dk</span>'; }
      h += '<span style="left:100%">' + esc(les[n - 1].r[3]) + '</span></div>' + gzKart(les, bugun, etiket);
    } else if (st === 'f') {
      h += '<div class="gzl" data-gz="hat"></div><div class="gzh" data-n="' + n + '" style="--n:' + n + '"><div class="gzh-l"><i></i></div><div class="gzh-s">';
      les.forEach(function (x) {
        var lab = (x.m || planli) ? String(gzSn(x, planli)) : String(x.no);
        h += '<button type="button" class="gzx gzh-st' + gzMod(x, planli) + '"' + gzOz(x, planli, ds) + '><span class="n">' + ((x.m || planli) ? x.no : '') + '</span><span class="o' + (lab.length > 3 ? ' l4' : '') + '">' + esc(lab) + '</span><span class="t">' + esc(x.r[2]) + '</span></button>';
      });
      h += '</div>';
      h += (bugun ? '<i class="gzh-tr" style="display:none"></i>' : '') + '</div>';
    } else if (st === 'g') {
      var a0m = Math.floor(A0 / 3600) * 60, z0m = Math.ceil(Z0 / 3600) * 60, ppm = 1.25;
      h = h.replace('data-a0="' + A0 + '"', 'data-a0="' + a0m + '" data-pp="' + ppm + '"');
      h += '<div class="gzl" data-gz="hat"></div><div class="gzc" style="height:' + ((z0m - a0m) * ppm) + 'px">';
      for (var t = a0m; t <= z0m; t += 60) h += '<div class="gzc-h" style="top:' + ((t - a0m) * ppm) + 'px"><span>' + f2(t / 60) + ':00</span></div>';
      for (var j = 1; j < n; j++) { var g2 = mdk(les[j].r[2]) - mdk(les[j - 1].r[3]); if (g2 >= 30) h += '<div class="gzc-g" style="top:' + ((mdk(les[j - 1].r[3]) - a0m) * ppm) + 'px;height:' + (g2 * ppm) + 'px">uzun ara · ' + g2 + ' dk</div>'; }
      les.forEach(function (x) {
        var s0 = mdk(x.r[2]), e0 = mdk(x.r[3]);
        h += '<button type="button" class="gzx gzc-b' + gzMod(x, planli) + '"' + gzOz(x, planli, ds) + ' style="top:' + ((s0 - a0m) * ppm + 1) + 'px;height:' + ((e0 - s0) * ppm - 2) + 'px"><u></u><span><b>' + x.no + '. ders</b><small>' + esc(x.r[2] + '–' + x.r[3]) + (x.cv ? ' · doldurma' : '') + '</small></span><em' + (x.m ? kdA(x.m.sinif) : '') + '>' + esc(gzSn(x, planli)) + '</em></button>';
      });
      if (bugun) h += '<div class="gzc-n" style="display:none"><b></b></div>';
      h += '</div>';
    } else {
      var C2 = 282.7;
      h += '<div class="gzo-d">' + les.map(function (x) { return '<button type="button" class="gzx gzo-k' + gzMod(x, planli) + '"' + gzOz(x, planli, ds) + '>' + esc(gzSn(x, planli) || (x.no + '.')) + '</button>'; }).join('') + '</div>';
      h += '<div class="gzo-c"><div class="gzo-r"><svg viewBox="0 0 104 104" aria-hidden="true"><circle class="t" cx="52" cy="52" r="45"/><circle class="p" cx="52" cy="52" r="45" stroke-dasharray="' + C2 + '" stroke-dashoffset="' + C2 + '"/></svg><div><b data-gz="rn"></b><span data-gz="rl"></span></div></div><div class="gzo-i"><small data-gz="kick">' + (bugun ? '' : esc(etiket)) + '</small><b class="gzbg" data-gz="big">' + (bugun ? '' : n + ' ders') + '</b><span class="al" data-gz="alt">' + (bugun ? '' : esc(les[0].r[2] + ' – ' + les[n - 1].r[3])) + '</span><span class="al" data-gz="snr"></span></div></div>';
      h += '<div class="gzo-s"><div data-gz="sp"><span>Önceki</span><b></b></div><div data-gz="sn"><span>Sonraki</span><b></b></div></div>';
    }
    return h + '</div>';
  }
  // Hat: istasyon dairesi, hücre genişliğine göre 26–38 px (dar ekranda küçülür, şube adı sığsın diye)
  function hatBoyut(el) {
    var s = el.querySelector('.gzh-s'), n = +el.getAttribute('data-n') || 1, cell = s ? s.offsetWidth / n : 0; if (!cell) return;
    var sd = Math.max(27, Math.min(38, Math.floor(cell - 10)));
    if (el.getAttribute('data-sd') !== String(sd)) { el.setAttribute('data-sd', sd); el.style.setProperty('--sd', sd + 'px'); }
  }
  function gzGuncelle(rt, C) {
    var xs = [].slice.call(rt.querySelectorAll('.gzx')), cur = null, nxt = null, prv = null, ci = -1, ni = -1, pi = -1, T = C.T;
    if (!xs.length) return;
    xs.forEach(function (k, i) {
      var s0 = +k.dataset.s, e0 = +k.dataset.e, now = T >= s0 && T < e0;
      k.classList.toggle('past', T >= e0); k.classList.toggle('now', now);
      if (now) { cur = k; ci = i; } else if (T < s0 && !nxt) { nxt = k; ni = i; }
      if (T >= e0) { prv = k; pi = i; }
      var u = k.querySelector('u'); if (u) u.style.width = now ? ((T - s0) / (e0 - s0) * 100).toFixed(1) + '%' : '0';
    });
    var faz = cur ? 'd' : (!prv ? 'o' : (nxt ? 't' : 'b'));
    rt.setAttribute('data-fz', faz);
    function put(nm, v, ih) { var e = rt.querySelector('[data-gz="' + nm + '"]'); if (e) { if (ih) e.innerHTML = v; else e.textContent = v; } }
    function bas(k) { return k.dataset.t.slice(0, 5); }
    function snf(k) { return k.dataset.c ? ' · ' + esc(k.dataset.c) : ''; }
    var kick, big, alt = '', kal = '', snr = '', pct = 0, f2h = function (s) { return f2(Math.floor(s / 3600)) + ':' + f2(Math.floor(s % 3600 / 60)); };
    if (faz === 'd') {
      kick = 'Şu an'; big = cur.dataset.no + '. ders'; alt = (cur.dataset.c ? cur.dataset.c + ' · ' : '') + cur.dataset.t.replace(' – ', '–');
      pct = (T - +cur.dataset.s) / (+cur.dataset.e - +cur.dataset.s);
      kal = 'Kalan <b>' + sureTxt(+cur.dataset.e - T) + '</b>';
      snr = nxt ? 'Sıradaki <b>' + nxt.dataset.no + '. ders</b> ' + bas(nxt) + snf(nxt) : 'Son ders';
    } else if (faz === 't') {
      kick = 'Teneffüs'; big = sureTxt(+nxt.dataset.s - T) + ' kaldı'; alt = 'Sıradaki ' + nxt.dataset.no + '. ders · ' + bas(nxt) + (nxt.dataset.c ? ' · ' + nxt.dataset.c : '');
      pct = (T - +prv.dataset.e) / (+nxt.dataset.s - +prv.dataset.e);
    } else if (faz === 'o') {
      kick = 'Ders başlamadan'; big = sureTxt(+nxt.dataset.s - T); alt = nxt.dataset.no + '. ders · ' + bas(nxt) + (nxt.dataset.c ? ' · ' + nxt.dataset.c : '');
    } else { kick = 'Bugün'; big = 'Dersler bitti'; alt = xs.length + ' ders tamamlandı'; }
    pct = Math.max(0, Math.min(1, pct));
    put('kick', kick); put('big', big); put('alt', alt); put('kal', kal, true); put('snr', snr, true);
    var pu = rt.querySelector('[data-gz="pct"]'); if (pu) pu.style.width = (pct * 100).toFixed(1) + '%';
    var A0 = +rt.dataset.a0, Z0 = +rt.dataset.z0, n = xs.length;
    // Şerit
    var sn = rt.querySelector('.gzs-n');
    if (sn) { var pc = Math.max(0, Math.min(1, (T - A0) / (Z0 - A0))) * 100; sn.style.display = ''; sn.style.left = pc.toFixed(2) + '%'; sn.querySelector('b').textContent = faz === 't' ? 'Teneffüs' : f2h(T); }
    // Hat
    var tr = rt.querySelector('.gzh-tr'), hl = rt.querySelector('.gzh-l i');
    if (tr && hl) {
      var gh = rt.querySelector('.gzh'), hs = rt.querySelector('.gzh-s'), cw = hs && n ? hs.offsetWidth / n : 0, sdv = gh ? (parseFloat(gh.getAttribute('data-sd')) || 32) : 32, dw = cw > 0 ? Math.min(0.42, (sdv / 2 + 2) / cw) : 0;
      var pos = faz === 'd' ? ci : (faz === 'o' ? -dw : (faz === 'b' ? n - 1 + dw : pi + dw + (T - +prv.dataset.e) / Math.max(1, +nxt.dataset.s - +prv.dataset.e) * (1 - 2 * dw))), fr = n > 1 ? pos / (n - 1) : 0;
      tr.style.display = faz === 'd' ? 'none' : ''; tr.style.left = 'calc(100% / ' + n + ' * ' + (pos + 0.5).toFixed(4) + ')'; hl.style.width = (Math.max(0, Math.min(1, fr)) * 100).toFixed(2) + '%';
      [].forEach.call(rt.querySelectorAll('.gzh-st'), function (k) {
        var s1 = +k.dataset.s, e1 = +k.dataset.e, tt = k.querySelector('.t'); if (!tt) return;
        if (!tt.hasAttribute('data-t0')) tt.setAttribute('data-t0', tt.textContent);
        var tx = tt.getAttribute('data-t0'), pc = 0;
        if (T >= e1) tx = Math.round((e1 - s1) / 60) + ' dk'; else if (T >= s1) { tx = sureTxt(e1 - T); pc = (T - s1) / (e1 - s1) * 100; }
        if (tt.textContent !== tx) tt.textContent = tx;
        k.style.setProperty('--p', pc.toFixed(1));
      });
    }
    var hat = rt.querySelector('[data-gz="hat"]');
    if (hat) {
      var hc = faz === 'd' ? '' : (faz === 'b' ? ' fn' : ' tn');
      hat.className = 'gzl' + hc;
      hat.innerHTML = '<i></i><b>' + esc(faz === 'd' ? 'Şu an · ' + cur.dataset.no + '. ders' : (faz === 't' ? 'Teneffüs · ' + sureTxt(+nxt.dataset.s - T) : (faz === 'o' ? 'Ders başlamadan ' + sureTxt(+nxt.dataset.s - T) : 'Dersler bitti'))) + '</b><span>' + esc(faz === 'd' ? 'kalan ' + sureTxt(+cur.dataset.e - T) : (faz === 'b' ? n + ' ders tamamlandı' : (faz === 't' ? 'sonra ' + nxt.dataset.no + '. ders ' + bas(nxt) : nxt.dataset.no + '. ders ' + bas(nxt)))) + '</span>';
    }
    // Gün takvimi
    var gn = rt.querySelector('.gzc-n');
    if (gn) { var pp = +rt.dataset.pp || 1.25, y = (T / 60 - A0) * pp, hz = rt.querySelector('.gzc').offsetHeight; if (y >= 0 && y <= hz) { gn.style.display = ''; gn.style.top = y.toFixed(1) + 'px'; gn.querySelector('b').textContent = f2h(T); } else gn.style.display = 'none'; }
    // Odak
    var rg = rt.querySelector('.gzo-r .p');
    if (rg) {
      var rn, rl, rf;
      if (faz === 'd') { rn = Math.ceil((+cur.dataset.e - T) / 60); rl = 'dk kaldı'; rf = pct; }
      else if (faz === 't') { rn = Math.ceil((+nxt.dataset.s - T) / 60); rl = 'dk teneffüs'; rf = pct; }
      else if (faz === 'o') { rn = Math.ceil((+nxt.dataset.s - T) / 60); rl = 'dk sonra'; rf = 0; }
      else { rn = '✓'; rl = 'bitti'; rf = 1; }
      if (typeof rn === 'number' && rn >= 100) { rn = Math.floor(rn / 60); rl = 'sa sonra'; }
      put('rn', String(rn)); put('rl', rl);
      rg.style.strokeDashoffset = (282.7 * (1 - rf)).toFixed(1);
      var sp = rt.querySelector('[data-gz="sp"]'), sx = rt.querySelector('[data-gz="sn"]');
      function yaz2(el, k) { el.classList.toggle('dim', !k); el.querySelector('b').textContent = k ? k.dataset.no + '. ders · ' + (k.dataset.c || '—') : '—'; }
      var oncek = faz === 'd' ? (ci > 0 ? xs[ci - 1] : null) : prv, sonra = faz === 'd' ? (nxt || null) : (faz === 'b' ? null : nxt);
      if (faz === 'd') { oncek = ci > 0 ? xs[ci - 1] : null; }
      if (sp) yaz2(sp, oncek); if (sx) yaz2(sx, sonra);
    }
  }

  function gunGovde(les, C, bugun, ds, planli) {
    les.forEach(function (x) { x.ds = ds; });
    var st = gvDeger();
    if (st === 'd') return gunKadran(les, bugun, planli);
    if (st === 'e' || st === 'f' || st === 'g' || st === 'h') return gunYeni(st, les, C, bugun, ds, planli);
    if (st === 'v') {
      var hv = '<div class="gakis" id="gs" data-bg="' + (bugun ? 1 : 0) + '"><div class="grl"></div>';
      les.forEach(function (x, i) {
        if (i) hv += '<div class="gp" data-s="' + mdk(les[i - 1].r[3]) * 60 + '" data-e="' + mdk(x.r[2]) * 60 + '"></div>';
        hv += '<button type="button" class="gx gv' + (x.m ? ' my' : (planli ? ' bos' : '')) + (x.cv ? ' cv' : '') + '" data-s="' + mdk(x.r[2]) * 60 + '" data-e="' + mdk(x.r[3]) * 60 + '" data-dt="ak:' + ds + ':' + x.ri + '"><span class="tm"><b>' + esc(x.r[2]) + '</b><small>' + esc(x.r[3]) + '</small></span><span class="a"><b>' + x.no + '. ders</b>' + (x.cv ? '<span class="tg2">doldurma</span>' : '') + '<span class="k"></span></span><span class="c"' + (x.m ? kdA(x.m.sinif) : '') + '>' + gunSinif(x, planli) + '</span><i class="pb"><u></u></i></button>';
      });
      return hv + '<div class="gnd" aria-hidden="true"><i></i></div></div>';
    }
    if (st === 'b') return '<div class="glist" id="gs" data-bg="' + (bugun ? 1 : 0) + '">' + les.map(function (x) {
      return '<button type="button" class="gx gr' + (x.m ? ' my' : (planli ? ' bos' : '')) + (x.cv ? ' cv' : '') + '" data-s="' + mdk(x.r[2]) * 60 + '" data-e="' + mdk(x.r[3]) * 60 + '" data-dt="ak:' + ds + ':' + x.ri + '"><span class="tm">' + esc(x.r[2]) + '</span><span class="a"><b>' + x.no + '. ders</b>' + (x.cv ? '<span class="tg2">doldurma</span>' : '') + '<span class="k"></span></span><span class="c"' + (x.m ? kdA(x.m.sinif) : '') + '>' + gunSinif(x, planli) + '</span><i class="pb"><u></u></i></button>';
    }).join('') + '</div>';
    return '<div class="ggrid" id="gs" data-bg="' + (bugun ? 1 : 0) + '">' + les.map(function (x) {
      return '<button type="button" class="gx gt' + (x.m ? ' my' : (planli ? ' bos' : '')) + (x.cv ? ' cv' : '') + '" data-s="' + mdk(x.r[2]) * 60 + '" data-e="' + mdk(x.r[3]) * 60 + '" data-dt="ak:' + ds + ':' + x.ri + '"><span class="n">' + x.no + '. ders</span><b class="d">' + esc(x.r[2]) + '</b><span class="c"' + (x.m ? kdA(x.m.sinif) : '') + '>' + gunSinif(x, planli) + '</span>' + (x.cv ? '<span class="tg2">doldurma</span>' : '') + '<span class="k"></span><i class="pb"><u></u></i></button>';
    }).join('') + '</div>';
  }

  // ---- 0.16.1 Günüm alt alanı: sıradaki dersin + Nöbet / Kalan / Hafta çipleri (görünüm ve Bugün/Yarın seçiminden bağımsız, kişiye özel)
  function nxBenim(G) {
    var l = [];
    G.sc.forEach(function (r, ri) { if (r[0] !== 'ders') return; var no = dersNo(r), m = G.MY[no] || G.COV[no]; if (m) l.push({ r: r, ri: ri, no: no, m: m, cv: !!G.COV[no] }); });
    return l;
  }
  function nxHaftaSay(y) {
    var p = programVar(y), say = [0, 0, 0, 0, 0], sn = [{}, {}, {}, {}, {}];
    if (!p) return { say: say, sn: sn };
    for (var wd = 1; wd <= 5; wd++) { var g = p.matris[String(wd)] || {}; Object.keys(g).forEach(function (no) { var h = hucre(g[no]); if (h) { say[wd - 1]++; sn[wd - 1][h.sinif] = 1; } }); }
    return { say: say, sn: sn };
  }
  function nxBilgi(C) {
    var y = C.y, T = C.T, b = { ser: null, nobet: null, kalan: null, hafta: null, sinir: 0 }, i;
    var G0 = C.gb.tip === 'ders' ? gunBaglam(C.d) : null, ol0 = G0 ? nxBenim(G0) : [], k = null, sonraki = null;
    ol0.forEach(function (x) { if (!k && T < mdk(x.r[3]) * 60) k = x; });
    if (k) {
      var s0 = mdk(k.r[2]) * 60, e0 = mdk(k.r[3]) * 60, simdi = T >= s0;
      b.ser = { tur: simdi ? 'simdi' : 'sirada', ds: G0.gb.ds, ri: k.ri, no: k.no, sinif: k.m.sinif, s: s0, e: e0, bas: k.r[2], bit: k.r[3], etiket: '' };
      b.sinir = simdi ? e0 : s0;
    } else {
      for (i = 1; i <= 14 && !b.ser; i++) {
        var d = gunEkle(C.d, i), gb = gunBilgi(y, d);
        if (gb.tip !== 'ders' || !gb.ders.length) continue;
        var G = gunBaglam(d), ol = nxBenim(G);
        if (ol.length) b.ser = { tur: 'yarin', ds: gb.ds, ri: ol[0].ri, no: ol[0].no, sinif: ol[0].m.sinif, s: 0, e: 0, bas: ol[0].r[2], bit: ol[0].r[3], etiket: i === 1 ? 'Yarın' : GUN[d.getDay()] };
      }
      b.sinir = 86400;
    }
    // Nöbet
    var yer = C.gb.tip === 'ders' ? nobetYer(y, C.gb.wd, C.gb.ds) : '';
    if (yer) b.nobet = { var_: true, yer: yer, alt: 'bugün' };
    else {
      var sn = null;
      for (i = 1; i <= 7 && !sn; i++) { var d2 = gunEkle(C.d, i), g2 = gunBilgi(y, d2); if (g2.tip !== 'ders') continue; var y2 = nobetYer(y, g2.wd, g2.ds); if (y2) sn = { gun: i === 1 ? 'Yarın' : GUN[d2.getDay()], yer: y2 }; }
      b.nobet = { var_: false, yer: 'Yok', alt: sn ? 'Sonra: ' + sn.gun + ' · ' + sn.yer : 'nöbet görevin yok' };
    }
    // Kalan
    if (G0) { var kal = 0; ol0.forEach(function (x) { if (T < mdk(x.r[3]) * 60) kal++; }); b.kalan = { kal: kal, top: ol0.length, ds: C.gb.ds }; }
    else b.kalan = { kal: 0, top: 0, ds: iso(C.d), yok: true };
    // Hafta
    var hs = nxHaftaSay(y), wi = C.gb.tip === 'ders' ? (C.gb.wd || 0) - 1 : ((C.d.getDay() || 7) - 1);
    var mx = 0, mi = -1; hs.say.forEach(function (n, j) { if (n > mx) { mx = n; mi = j; } });
    b.hafta = { say: hs.say, bug: wi, mx: mx, mi: mi };
    b.anahtar = [b.ser ? b.ser.tur + b.ser.ds + b.ser.ri : '-', b.kalan.kal, b.kalan.top, b.nobet.yer, b.nobet.alt, b.hafta.say.join('')].join('|');
    return b;
  }
  var NXG = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'], NXGI = ['P', 'S', 'Ç', 'P', 'C'], NXGT = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  function nxHtml(b) {
    var h = '<div class="nxw" data-nxk="' + esc(b.anahtar) + '" data-nxb="' + b.sinir + '">';
    if (b.ser) {
      var r = b.ser, lab = r.tur === 'simdi' ? 'Şu an' : (r.tur === 'sirada' ? 'Sıradaki dersin' : r.etiket + ' ilk dersin'), buyuk = r.tur === 'simdi' ? '' : r.bas;
      h += '<button type="button" class="nxs' + (r.tur === 'simdi' ? ' now' : '') + '" data-dt="ak:' + esc(r.ds) + ':' + r.ri + '" data-nxs="' + r.s + '" data-nxe="' + r.e + '" data-nxt="' + r.tur + '"><span class="k" data-bit="' + esc(r.bit) + '">' + esc(lab) + '</span><b>' + r.no + '. ders</b><span class="sn"><u>' + esc(r.sinif) + '</u><span class="nxe">' + (r.tur === 'yarin' ? esc(GUN[tarihCoz(r.ds).getDay()]) : '') + '</span></span><span class="t"><strong class="nxv">' + esc(buyuk) + '</strong></span></button>';
    }
    h += '<div class="nxc">';
    // Nöbet
    h += '<button type="button" class="nxp' + (b.nobet.var_ ? ' on' : ' dim') + '" style="--c:#3D8FE0" data-dt="nbd"><span class="k"><i></i>Nöbet</span><span class="v"><b>' + esc(b.nobet.yer) + '</b></span><span class="sb">' + esc(b.nobet.alt) + '</span></button>';
    // Kalan
    var K = b.kalan, pc = K.top ? Math.round(100 * (K.top - K.kal) / K.top) : 0, kv = K.yok ? '–' : (K.top && !K.kal ? '✓' : String(K.kal)), ks = K.yok ? 'bugün ders yok' : (K.top ? (K.kal ? K.top + ' dersten kalan' : 'bugün tamam') : 'bugün ders yok');
    h += '<button type="button" class="nxp" style="--c:#2BA899" data-dt="gun:' + esc(K.ds) + '"><span class="k"><i></i>Kalan</span><span class="v"><span class="rg" style="--p:' + pc + '"><b>' + kv + '</b></span></span><span class="sb">' + ks + '</span></button>';
    // Hafta
    var H = b.hafta, mxv = Math.max(1, H.mx);
    h += '<button type="button" class="nxp" style="--c:#7F62E0" data-dt="hf"><span class="k"><i></i>Hafta</span><span class="v"><span class="bars">' + H.say.map(function (n, j) { return '<i class="' + (j === H.bug ? 't' : '') + '" style="height:' + Math.max(4, Math.round(30 * n / mxv)) + 'px"></i>'; }).join('') + '</span></span><span class="sb">' + (H.mx ? 'Yoğun: ' + NXG[H.mi] + ' · ' + H.mx : 'program yok') + '</span></button>';
    return h + '</div></div>';
  }
  // saniyelik güncelleme: şerit metni yerinde; sınır aşılınca (ders başladı/bitti) alt alan yeniden kurulur
  function nxGuncelle(C) {
    var w = document.querySelector('.nxw'); if (!w) return;
    if (C.T >= (+w.dataset.nxb || 0) && +w.dataset.nxb < 86400) {
      var pl = !!programVar(C.y), tmp = document.createElement('div'); tmp.innerHTML = pl ? nxHtml(nxBilgi(C)) : nxHtmlO(nxBilgiO(C));
      if (tmp.firstChild) w.parentNode.replaceChild(tmp.firstChild, w); w = document.querySelector('.nxw'); if (!w) return;
    }
    var sr = w.querySelector('.nxs'); if (!sr) return;
    var tur = sr.dataset.nxt, s0 = +sr.dataset.nxs, e0 = +sr.dataset.nxe, el = sr.querySelector('.nxe'), v = sr.querySelector('.nxv');
    if (tur === 'sirada' && el) el.textContent = sureTxt(Math.max(0, s0 - C.T)) + ' sonra';
    else if (tur === 'teneffus') { if (v) v.textContent = sureTxt(Math.max(0, s0 - C.T)); }
    else if (tur === 'simdi') { if (v) v.textContent = sureTxt(Math.max(0, e0 - C.T)); if (el) el.textContent = sr.dataset.nxo ? 'kalan' : 'kalan · bitiş ' + sr.querySelector('.k').dataset.bit; }
  }

  // ---- 0.16.2 Kişisel programı olmayanlar için okul geneli alt alan (aynı cam dil, aynı tıklama/geri davranışı)
  function nxBilgiO(C) {
    var T = C.T, b = { ser: null, bugun: null, kalan: null, yak: null, sinir: 0 }, i, k = null, onc = null;
    var G0 = C.gb.tip === 'ders' ? gunBaglam(C.d) : null, ders = [];
    if (G0) G0.sc.forEach(function (r, ri) { if (r[0] === 'ders') ders.push({ r: r, ri: ri, no: dersNo(r), s: mdk(r[2]) * 60, e: mdk(r[3]) * 60 }); });
    ders.forEach(function (x, j) { if (!k && T < x.e) { k = x; onc = j; } });
    if (k) {
      var tur = T >= k.s ? 'simdi' : (onc === 0 ? 'sirada' : 'teneffus');
      b.ser = { tur: tur, ds: G0.gb.ds, ri: k.ri, no: k.no, bas: k.r[2], bit: k.r[3], s: k.s, e: k.e, etiket: '' };
      b.sinir = tur === 'simdi' ? k.e : k.s;
    } else {
      var nx = sonrakiOkul(C);
      if (nx) { var G1 = gunBaglam(nx.d), r1 = null; G1.sc.forEach(function (r, ri) { if (!r1 && r[0] === 'ders') r1 = { r: r, ri: ri }; });
        if (r1) b.ser = { tur: 'yarin', ds: nx.gb.ds, ri: r1.ri, no: dersNo(r1.r), bas: r1.r[2], bit: r1.r[3], s: 0, e: 0, etiket: nx.etiket }; }
      b.sinir = 86400;
    }
    // Bugün
    var gb = C.gb, ds0 = iso(C.d);
    if (gb.tip === 'ders') b.bugun = { v: ders.length + ' ders', alt: gb.yarim ? ((gb.ad && !/^yarım gün$/i.test(gb.ad)) ? 'Yarım gün · ' + gb.ad : 'Yarım gün') : (ders.length ? 'son ders ' + ders[ders.length - 1].r[3] : ''), on: !!(gb.yarim || gb.gecici), ds: ds0 };
    else if (gb.tip === 'tatil') b.bugun = { v: 'Tatil', alt: gb.ad || 'okul kapalı', on: true, ds: ds0 };
    else b.bugun = { v: gb.tip === 'hs' ? 'Hafta sonu' : 'Ders yok', alt: gb.tip === 'hs' ? 'okul kapalı' : '', on: false, ds: ds0 };
    // Kalan
    if (ders.length) { var kal = 0; ders.forEach(function (x) { if (T < x.e) kal++; }); b.kalan = { kal: kal, top: ders.length, ds: ds0 }; } else b.kalan = { kal: 0, top: 0, ds: ds0, yok: true };
    // Yaklaşan (sınav + etkinlik)
    var yak = null, bg = ds0;
    olaylar(C.y).forEach(function (o) { if (o.hafta || (o.k !== 'sinav' && o.k !== 'etkinlik') || o.bit < bg) return;
      if (o.k === 'sinav' && o.bas === bg && o.bit === bg && o.x && saatOk(o.x.saat) && T >= mdk(o.x.saat) * 60) return; var g = o.bas < bg ? bg : o.bas; if (!yak || g < yak.g) yak = { o: o, g: g }; });
    if (yak) { var fark = Math.round((tarihCoz(yak.g) - tarihCoz(bg)) / 86400000); b.yak = { ad: yak.o.ad, kat: KAT[yak.o.k][0], fark: fark, kod: olayKodu(yak.o), alt: yak.o.alt || '', saat: (yak.o.x && saatOk(yak.o.x.saat)) ? yak.o.x.saat : '' }; }
    b.anahtar = [b.ser ? b.ser.tur + b.ser.ds + b.ser.ri : '-', b.kalan.kal, b.kalan.top, b.bugun.v, b.bugun.alt, b.yak ? b.yak.kod + b.yak.fark : '-'].join('|');
    return b;
  }
  function nxHtmlO(b) {
    var h = '<div class="nxw" data-nxk="' + esc(b.anahtar) + '" data-nxb="' + b.sinir + '">';
    if (b.ser) {
      var r = b.ser, lab = r.tur === 'simdi' ? 'Şu an' : (r.tur === 'sirada' ? 'Ders başlamadan' : (r.tur === 'teneffus' ? 'Teneffüs · sıradaki ders' : r.etiket + ' ilk ders')), buyuk = r.tur === 'simdi' || r.tur === 'teneffus' ? '' : r.bas;
      h += '<button type="button" class="nxs' + (r.tur === 'simdi' ? ' now' : '') + '" data-dt="ak:' + esc(r.ds) + ':' + r.ri + '" data-nxs="' + r.s + '" data-nxe="' + r.e + '" data-nxt="' + r.tur + '" data-nxo="1"><span class="k" data-bit="' + esc(r.bit) + '">' + esc(lab) + '</span><b>' + r.no + '. ders</b><span class="sn"><u>' + esc(r.bas + ' – ' + r.bit) + '</u><span class="nxe">' + (r.tur === 'yarin' ? esc(GUN[tarihCoz(r.ds).getDay()]) : '') + '</span></span><span class="t"><strong class="nxv">' + esc(buyuk) + '</strong></span></button>';
    }
    h += '<div class="nxc">';
    var B = b.bugun;
    h += '<button type="button" class="nxp' + (B.on ? ' on' : '') + '" style="--c:#7F62E0" data-dt="gun:' + esc(B.ds) + '"><span class="k"><i></i>Bugün</span><span class="v"><b>' + esc(B.v) + '</b></span><span class="sb">' + esc(B.alt) + '</span></button>';
    var K = b.kalan, pc = K.top ? Math.round(100 * (K.top - K.kal) / K.top) : 0, kv = K.yok ? '–' : (K.top && !K.kal ? '✓' : String(K.kal)), ks = K.yok ? 'bugün ders yok' : (K.kal ? K.top + ' dersten kalan' : 'bugün tamam');
    h += '<button type="button" class="nxp" style="--c:#2BA899" data-dt="gun:' + esc(K.ds) + '"><span class="k"><i></i>Kalan</span><span class="v"><span class="rg" style="--p:' + pc + '"><b>' + kv + '</b></span></span><span class="sb">' + ks + '</span></button>';
    var Y = b.yak;
    if (Y) h += '<button type="button" class="nxp' + (Y.fark <= 2 ? ' on' : '') + '" style="--c:#E0703D" data-dt="' + esc(Y.kod) + '"><span class="k"><i></i>Yaklaşan</span><span class="v"><b>' + esc(Y.ad) + '</b></span><span class="sb">' + esc(Y.kat) + ' · ' + (Y.fark <= 0 ? 'bugün' : (Y.fark === 1 ? 'yarın' : Y.fark + ' gün sonra')) + (Y.saat && Y.fark <= 1 ? ' ' + Y.saat : '') + '</span></button>';
    else h += '<button type="button" class="nxp dim" style="--c:#E0703D" data-go-tab="2"><span class="k"><i></i>Yaklaşan</span><span class="v"><b>Sakin</b></span><span class="sb">sınav/etkinlik yok</span></button>';
    return h + '</div><div class="nxd">Kişisel programın yüklenince dersin burada sana özel görünür.</div></div>';
  }
  function dtHafta() {
    var C = CTX || baglam(), y = C.y, hs = nxHaftaSay(y), top = hs.say.reduce(function (a, b) { return a + b; }, 0), pt = pazartesi(C.d);
    var h = '<div class="dbig d">' + top + ' ders</div><div class="dsub">haftalık yükün · ' + hs.say.filter(function (n) { return n; }).length + ' gün</div><div class="rows">';
    for (var wd = 1; wd <= 5; wd++) {
      var ds = iso(gunEkle(pt, wd - 1)), sinifs = Object.keys(hs.sn[wd - 1]).join(', ');
      h += dtSatir('gun:' + ds, NXG[wd - 1], NXGT[wd - 1], sinifs || 'ders yok', hs.say[wd - 1] ? hs.say[wd - 1] + ' ders' : '', hs.say[wd - 1] ? '' : 'dim');
    }
    dtGoster('Haftalık yükün', h + '</div>');
  }
  function sGunum(C) {
    var H = gunumHedef(C); if (!H) return '';
    var G = H.G, ds = G.gb.ds, bugun = H.v === 'b', planli = !!programVar(C.y), les = [], bos = [], benim = 0, dols = 0;
    G.sc.forEach(function (r, ri) { if (r[0] !== 'ders') return; var no = dersNo(r), m = G.MY[no] || G.COV[no]; les.push({ r: r, ri: ri, no: no, m: m, cv: !!G.COV[no] }); if (m) { benim++; if (G.COV[no]) dols++; } else bos.push(no); });
    var seg = '<div class="sg" id="gv"><button type="button" data-v="b"' + (bugun ? ' class="on"' : '') + (C.gb.tip !== 'ders' ? ' disabled' : '') + '>Bugün</button>' + (H.nx ? '<button type="button" data-v="y"' + (bugun ? '' : ' class="on"') + '>' + esc(H.nx.etiket) + '</button>' : '') + '</div>';
    var alt = les.length + ' ders' + (planli ? ', ' + (benim - dols) + ' sende' + (dols ? ', ' + dols + ' doldurma' : '') : '');
    var h = '<div class="sec" data-k="akis"><h2>Günüm<span>' + esc(alt) + '</span></h2>' + seg;
    var shf = olaylar(C.y).filter(function (o) { return o.hafta && o.bas <= ds && ds <= o.bit; })[0];
    if (G.gb.gecici || G.gb.yarim || shf) h += '<div class="chp" style="margin:12px 0 0">' + (shf ? '<span style="background:#7F62E038;background:color-mix(in srgb,#7F62E0 22%,transparent)">' + esc(shf.ad) + '</span>' : '') + (G.gb.yarim ? '<span>Yarım gün' + (G.gb.ad ? ', ' + esc(G.gb.ad) : '') + '</span>' : '') + (G.gb.gecici ? '<span>' + esc(G.gb.gecici) + '</span>' : '') + '</div>';
    var gg = gunGovde(les, C, bugun, ds, planli), kdLej = '', st0 = gvDeger(), li = gg.indexOf('<div class="kdl">');
    if (st0 === 'd' && li >= 0) { kdLej = gg.slice(li); gg = gg.slice(0, li); }
    h += gg;
    h += '<button type="button" class="gvh" data-gvay aria-label="Görünümü değiştirmek için dokun"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>Görünümü değiştirmek için dokun</button>';
    if (planli) { h += nxHtml(nxBilgi(C)) + (st0 === 'd' ? kdLej : ''); }
    else { h += nxHtmlO(nxBilgiO(C)) + (st0 === 'd' ? kdLej : ''); }
    return h + '</div>';
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

  // ---- Geçmiş: tarihi geçen sınav/etkinlik/tatil kayıtları (yeniden eskiye); panelin 'gecmis' yayını + eldeki kayıtlar
  function gecmisListe(y, bg) {
    var m = {}, out = [], g = ortak(y, 'gecmis');
    function ekle(o) { var key = [o.k, o.ad, o.bas, o.bit, o.alt].join('|'); if (m[key]) return; m[key] = 1; out.push(o); }
    olaylar(y).forEach(function (o) { if (o.bit < bg && KAT[o.k] && o.k !== 'nobet') ekle({ k: o.k, ad: o.ad, bas: o.bas, bit: o.bit, alt: o.alt || '' }); });
    if (g && Array.isArray(g.liste)) g.liste.forEach(function (x) {
      if (!x || !x.ad || !KAT[x.k] || x.k === 'nobet' || !ISODT.test(x.bas || '')) return;
      var bt = (ISODT.test(x.bit || '') && x.bit >= x.bas) ? x.bit : x.bas; if (bt >= bg) return;
      ekle({ k: x.k, ad: String(x.ad), bas: x.bas, bit: bt, alt: x.h ? 'Sınav haftası · ' + aralik(x.bas, bt) : String(x.alt || '') });
    });
    out.sort(function (a, b) { return a.bas < b.bas ? 1 : a.bas > b.bas ? -1 : (a.ad < b.ad ? -1 : 1); });
    return out;
  }
  function gecmisSuz(C) {
    var kf = KFM[KF] || ''; if (kf === 'nobet') kf = '';
    return gecmisListe(C.y, C.gb.ds).filter(function (o) { return !kf || o.k === kf; });
  }
  function gecmisHTML(C) {
    var kf = KFM[KF] || ''; if (kf === 'nobet') kf = '';
    var l = gecmisSuz(C), top = gecmisListe(C.y, C.gb.ds).length;
    var h = '<div class="chips kf" id="kf">' + ['Tümü', 'Sınav', 'Etkinlik', 'Tatil', 'Özel gün'].map(function (c) { return '<button type="button"' + ((KF === c || (!kf && c === 'Tümü')) ? ' class="on"' : '') + '>' + (KFM[c] ? katIk(KFM[c]) : '') + c + '</button>'; }).join('') + '</div>';
    if (!l.length) return h + '<div class="empty ei-takvim"><b>' + (top ? 'Bu türde geçmiş kayıt yok' : 'Geçmiş kayıt yok') + '</b>Tarihi geçen sınav, etkinlik ve tatiller burada, yeniden eskiye doğru toplanır.</div>';
    var gr = [], son = '';
    l.forEach(function (o) { var ay = o.bas.slice(0, 7); if (ay !== son) { son = ay; gr.push({ ay: ay, l: [] }); } gr[gr.length - 1].l.push(o); });
    h += '<div class="sec">' + secH('Geçmiş kayıtlar', l.length + ' kayıt') + '<div class="okpay">' + pdfBtn('gect', 'Tüm geçmişi PDF olarak al') + '</div>' + (kf ? '<div class="okpay" style="margin-top:8px">' + pdfBtn('gec', KAT[kf][0] + ' kayıtlarını PDF olarak al') + '</div>' : '') + '</div>';
    gr.forEach(function (g) {
      h += '<div class="sec">' + secH(AY[+g.ay.slice(5, 7) - 1] + ' ' + g.ay.slice(0, 4), g.l.length + ' kayıt') + '<div class="rows">' + g.l.map(function (o) {
        return '<div class="rw ev" style="--c:' + KAT[o.k][1] + '">' + dzTarih(o.bas, o.bit) + '<div class="a"><b>' + esc(o.ad) + '</b><span class="s">' + esc(KAT[o.k][0] + (o.alt ? ' · ' + o.alt : '')) + '</span></div></div>';
      }).join('') + '</div></div>';
    });
    return h;
  }
  function gecmisPdf(suzulu) {
    var C = CTX || baglam(), l = suzulu ? gecmisSuz(C) : gecmisListe(C.y, C.gb.ds); if (!l.length) return;
    var SAT = 13, say = Math.ceil(l.length / SAT), kf = KFM[KF] || '', ek = (suzulu && kf && kf !== 'nobet') ? ' · ' + KAT[kf][0] : '';
    var bloblar = [], k = 0, ilk = null, okul = (C.y && C.y.okul) || '';
    function sayfa() {
      if (k >= say) {
        pdfKurCok(bloblar, 1754 * 2, 1240 * 2, function (pb) {
          if (!pb) return;
          var dosya = 'gecmis-' + (ek ? okAra(KAT[kf][0]) : 'tum-kayitlar') + '-' + C.gb.ds + '.pdf';
          if (PAY.url) { try { URL.revokeObjectURL(PAY.url); } catch (e) {} }
          if (PAY.thumb) { try { URL.revokeObjectURL(PAY.thumb); } catch (e) {} }
          PAY.blob = pb; PAY.dosya = dosya; PAY.baslik = 'Geçmiş kayıtlar'; PAY.url = URL.createObjectURL(pb); PAY.thumb = URL.createObjectURL(ilk); PAY.file = null;
          try { PAY.file = new File([pb], dosya, { type: 'application/pdf' }); } catch (e) {}
          var can2 = false; try { can2 = !!(PAY.file && navigator.canShare && navigator.canShare({ files: [PAY.file] })); } catch (e) {}
          ayrintiRenk('ak:0');
          dtGoster('PDF önizleme', '<img class="payimg" src="' + PAY.thumb + '" alt="Geçmiş kayıtlar PDF önizlemesi"><div class="paybt">' + (can2 ? '<button type="button" class="payb pri" id="paygo">Paylaş</button>' : '') + '<button type="button" class="payb' + (can2 ? '' : ' pri') + '" id="paysave">' + (can2 ? 'PDF kaydet' : 'PDF indir') + '</button></div><p class="oknot" style="margin:10px 0 0">A4 yatay, ' + say + ' sayfa, yazdırmaya hazır.</p>');
        });
        return;
      }
      var parca = l.slice(k * SAT, (k + 1) * SAT);
      var o = { baslik: 'Geçmiş kayıtlar' + ek, alt: l.length + ' kayıt · yeniden eskiye · sayfa ' + (k + 1) + '/' + say, sut: ['Tarih', 'Tür', 'Kayıt'], w: [1.1, 0.8, 3], solHiza: true, W: 1754, H: 1240, S: 2, jpeg: true, rh: 64, okul: okul, tarih: payTarih(C), not: 'Tarihi geçen sınav, etkinlik ve tatil kayıtları.',
        sat: parca.map(function (r) { return [aralik(r.bas, r.bit), KAT[r.k][0], [r.ad, r.alt || '']]; }) };
      payCiz(o, function (blob) { if (!blob) return; bloblar.push(blob); if (!ilk) ilk = blob; k++; sayfa(); });
    }
    sayfa();
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
    var p = [dersiz(y) ? sAkis(C, 0, 'Okulun bugünü') : sGunum(C), sNobetci(C), sDoldurmaToplu(C), sDuyuru(C), sYaklasan(C), sPanoOzet(C)].join('');
    return programBekNotu(C) + doldurmaSerit(C) + damga(C) + (p || '<div class="empty ei-zarf"><b>Bugün paylaşılan bir şey yok</b>Yeni bir duyuru ya da bilgi paylaşıldığında bu sayfada görünür.</div>');
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
        h += '<div class="' + (cl.trim() + (iso(d) === C.gb.ds ? ' td' : '') + (NT.some(function (n) { return n.k === kk; }) ? ' hn' : '')).trim() + '"' + ((c || cv) ? ' data-c="' + kk + '"' + kdA(cv ? cv.sinif : c.sinif) : '') + '>' + v + sm + '</div>';
      });
    });
    return h + '</div>';
  }
  function derslerimHTML(C) {
    var l = dersGruplari(C.y); if (!l.length) return '';
    return '<div class="sec">' + secH('Derslerim', l.length + ' ders-şube') + '<div class="dg">' + l.map(function (x) { return '<button type="button" class="dkart" data-dt="dr:' + x.i + '"><b class="d"' + kdA(x.sinif) + '>' + esc(x.sinif) + '</b><span>' + esc(x.tam) + '</span><em>haftada ' + x.slots.length + ' saat</em></button>'; }).join('') + '</div></div>';
  }
  function gorevHTML(C) {
      var kl = kurulListe(C.y, C.gb.ds), khtml = '';
      if (kl.length) {
        khtml += '<div class="sec" data-k="kurul">' + secH('Görevlerim', kl.length + ' görev');
        GKAT.forEach(function (g) {
          var gl = kl.filter(function (k) { return k.kat === g[0]; }); if (!gl.length) return;
          khtml += '<div class="gkl">' + esc(g[1]) + '</div><div class="rows">' + gl.map(function (k) {
            var alt = k.gorev || 'Üye'; if (k.bas) alt = aralik(k.bas, k.bit || k.bas) + ' · ' + alt;
            return dtSatir('kv:' + kl.indexOf(k), '', k.ad, alt, '');
          }).join('') + '</div>';
        });
        khtml += '</div>';
      }
    return khtml;
  }
  var GRENK = { zumre: '#2F8579', rehber: '#3D8FE0', kurul: '#7F62E0', ekip: '#D8584A', kulup: '#D9972B', proje: '#2E9E73', gun: '#2BA899' };
  function gorevSatir(C) {
    var n = kurulListe(C.y, C.gb.ds).length; if (!n || yayinKapali(C)) return '';
    return '<button type="button" class="gsat" data-cg="4,0"><b>Görevlerim</b><span>' + n + ' görev</span><i>›</i></button>';
  }
  function gorevSayfa(C) {
    var kl = kurulListe(C.y, C.gb.ds);
    if (!kl.length) return '<div class="empty ei-gorev"><b>Görevlendirmen görünmüyor</b>Okul yönetimi paylaştığında burada görünür.</div>';
    return '<div class="gwrap">' + GKAT.map(function (g) {
      var gl = kl.filter(function (k) { return k.kat === g[0]; }); if (!gl.length) return '';
      return '<div class="gck' + (GAC[g[0]] ? ' open' : '') + '" style="--c:' + GRENK[g[0]] + '"><button type="button" class="gch" data-gck="' + g[0] + '" aria-expanded="' + (GAC[g[0]] ? 'true' : 'false') + '"><i></i><b>' + esc(g[1]) + '</b><em>' + gl.length + '</em><span class="chv">›</span></button><div class="gin"><div class="rows">' + gl.map(function (k) {
        var alt = k.gorev || 'Üye'; if (k.bas) alt = aralik(k.bas, k.bit || k.bas) + ' · ' + alt;
        return dtSatir('kv:' + kl.indexOf(k), '', k.ad, alt, '');
      }).join('') + '</div></div></div>';
    }).join('') + '</div>';
  }
  // ================= OKUL PROGRAMI (yalnız idare / rehberlik: kişisel 'okulprogram' verisi varsa) =================
  // Veri: {dersler:[ad], ogretmenler:[ad], siniflar:[{ad, p:[gün][saat] -> 0 | [dersIx, ogrIx|-1, ortakIx?]}]}. Gelmeyen öğretmen/sebep verisi hiç gelmez.
  var OK = { kd: 0, g: -1, s: -1, o: -1, bh: 0, q: '' }, OKC = null, OKGUN = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum'], OKGUNT = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma'];
  function okulVeri(y) {
    var d = kisisel(y, 'okulprogram');
    return (d && Array.isArray(d.siniflar) && Array.isArray(d.dersler) && Array.isArray(d.ogretmenler) && d.siniflar.length) ? d : null;
  }
  function okHuc(d, sn, gi, hi) {
    var c = sn && sn.p && sn.p[gi] && sn.p[gi][hi]; if (!Array.isArray(c)) return null;
    var ders = d.dersler[c[0]]; if (ders == null) return null;
    var o1 = c[1] >= 0 ? d.ogretmenler[c[1]] : null, o2 = (c.length > 2 && c[2] >= 0) ? d.ogretmenler[c[2]] : null;
    return { ders: String(ders), ogr: o1 == null ? '' : String(o1), co: o2 == null ? '' : String(o2) };
  }
  function okSaatSay(d) {
    var m = 0; d.siniflar.forEach(function (sn) { if (sn && Array.isArray(sn.p)) sn.p.forEach(function (g) { if (Array.isArray(g) && g.length > m) m = g.length; }); });
    return Math.min(m, 12);
  }
  function okOgrDizin(d) {
    if (OKC && OKC.d === d) return OKC;
    var m = Object.create(null);
    d.ogretmenler.forEach(function (n) { m[String(n)] = []; });
    d.siniflar.forEach(function (sn) {
      if (!sn) return;
      for (var gi = 0; gi < 5; gi++) for (var hi = 0; hi < 12; hi++) {
        var h = okHuc(d, sn, gi, hi); if (!h) continue;
        [h.ogr, h.co].forEach(function (n) { if (n && m[n]) { (m[n][gi] = m[n][gi] || [])[hi] = { sinif: String(sn.ad), ders: h.ders }; } });
      }
    });
    OKC = { d: d, m: m, adlar: Object.keys(m).sort(function (a, b) { return a.localeCompare(b, 'tr'); }) };
    return OKC;
  }
  function okKisa(n) { var p = String(n || '').trim().split(/\s+/).filter(Boolean); return p.length < 2 ? (p[0] || '') : p[0].charAt(0) + '. ' + p[p.length - 1]; }
  function okAnh(s) { return String(s || '').toLocaleUpperCase('tr-TR').replace(/[^A-Z0-9ÇĞİÖŞÜ]/g, ''); }
  function okZaman(C) {
    var gi = (C.gb.tip === 'ders' && C.gb.wd >= 1 && C.gb.wd <= 5) ? C.gb.wd - 1 : -1, hi = -1;
    if (gi >= 0) C.gb.ders.forEach(function (r, i) { if (mdk(r[1]) * 60 <= C.T && C.T < mdk(r[2]) * 60) hi = i; });
    return { gi: gi, hi: hi };
  }
  function okSaatler(C) { var r = ortak(C.y, 'ritim'), l = (C.gb.tip === 'ders' && C.gb.ders.length) ? C.gb.ders : (r ? dersListe(r.ders) : []); return l; }
  function okGunSec(C) { if (OK.g >= 0 && OK.g < 5) return OK.g; var g = (C.d.getDay() + 6) % 7; return g < 5 ? g : 0; }
  function okThead(C, n, z, gi, bos) {
    var sa = okSaatler(C), h = '<tr><th class="st">' + (bos || '') + '</th>';
    for (var i = 0; i < n; i++) {
      var now = z.gi === gi && z.hi === i;
      h += '<th class="' + (now ? 'now' : '') + '">' + (i + 1) + '<small>' + (sa[i] ? esc(sa[i][1]) : '') + '</small>' + (now ? '<em>şimdi</em>' : '') + '</th>';
    }
    return h + '</tr>';
  }
  function okSekme(etk, liste, secili) {
    return '<div class="okseg">' + liste.map(function (x) { return '<button type="button" data-ok="' + etk + ':' + x[0] + '"' + (x[0] === secili ? ' class="on"' : '') + '>' + esc(x[1]) + '</button>'; }).join('') + '</div>';
  }
  function okGunSeg(C, g, z) {
    return '<div class="okseg okgun">' + OKGUN.map(function (a, i) { return '<button type="button" data-ok="g:' + i + '"' + (i === g ? ' class="on"' : '') + '>' + a + (z.gi === i ? '<i></i>' : '') + '</button>'; }).join('') + '</div>';
  }
  function okGeri(ad, alt) { return '<button type="button" class="okgeri" data-ok="b"><span aria-hidden="true">‹</span> Listeye dön</button><div class="okbas"><b class="d">' + esc(ad) + '</b><span>' + esc(alt) + '</span></div>'; }
  function okSubeler(C, d, z) {
    var kds = []; d.siniflar.forEach(function (sn) { var k = parseInt(sn && sn.ad, 10) || 0; if (kds.indexOf(k) < 0) kds.push(k); }); kds.sort(function (a, b) { return a - b; });
    if (kds.indexOf(OK.kd) < 0) OK.kd = kds[0];
    var g = okGunSec(C), n = okSaatler(C).length || okSaatSay(d), dold = {}, bugun = (z.gi === g);
    if (bugun) topluDoldurma(C.y, C.gb.ds).forEach(function (x) { dold[x.saat + '|' + okAnh(x.sinif)] = x; });
    var h = '<div class="okw">' + okSekme('k', kds.map(function (k) { return [k, k ? k + '. sınıf' : 'Diğer']; }), OK.kd) + okGunSeg(C, g, z) + okAraKutu('Şube ya da öğretmen ara') + '<div class="okt"><table class="okta"><thead>' + okThead(C, okSaatSay(d) || n, z, g, 'Şube') + '</thead><tbody>';
    var say = okSaatSay(d);
    d.siniflar.forEach(function (sn, ix) {
      if (!sn || (parseInt(sn.ad, 10) || 0) !== OK.kd) return;
      var rs = '<th class="st"><button type="button" data-ok="s:' + ix + '">' + esc(sn.ad) + '</button></th>', qs = String(sn.ad);
      for (var i = 0; i < say; i++) {
        var c = okHuc(d, sn, g, i), now = z.gi === g && z.hi === i, dd = dold[(i + 1) + '|' + okAnh(sn.ad)], oc = ' data-oc="s:' + ix + ':' + g + ':' + i + '" tabindex="0"';
        if (dd) { qs += ' ' + dd.giren; rs += '<td class="dold' + (now ? ' now' : '') + '"' + oc + '><b>' + esc(okKisa(dd.giren)) + '</b><small>' + esc(dd.yerine ? dd.yerine + ' yerine' : 'Ders doldurma') + '</small></td>'; }
        else if (c) { qs += ' ' + c.ogr + ' ' + c.ders; rs += '<td' + (now ? ' class="now"' : '') + oc + '><b>' + esc(c.ders) + '</b><small>' + esc(okKisa(c.ogr)) + '</small></td>'; }
        else rs += '<td class="bos' + (now ? ' now' : '') + '">·</td>';
      }
      h += '<tr data-q="' + esc(okAra(qs)) + '">' + rs + '</tr>';
    });
    return h + '</tbody></table></div>' + '<p class="oknot">' + (bugun && z.hi >= 0 ? 'Altın renkli sütun şu an süren derstir. ' : '') + 'Yeşil hücre: ders doldurma. Şube adına dokununca haftalık programı açılır. Hücreye dokununca ayrıntısı açılır.</p>' + (bugun && z.hi >= 0 ? '<button type="button" class="okgit" data-ogit="1">Şimdiye git</button>' : '') + '</div>';
  }
  function okSubeHaf(C, d, z) {
    var sn = d.siniflar[OK.s], say = okSaatSay(d), sa = okSaatler(C);
    var h = '<div class="okw">' + okGeri(String(sn.ad), 'Haftalık ders programı') + '<div class="okt"><table class="okta okh"><thead><tr><th class="st">Saat</th>' + OKGUN.map(function (a, i) { return '<th class="' + (z.gi === i ? 'tod' : '') + '">' + a + '</th>'; }).join('') + '</tr></thead><tbody>';
    for (var i = 0; i < say; i++) {
      h += '<tr><th class="st">' + (i + 1) + '<small>' + (sa[i] ? esc(sa[i][1]) : '') + '</small></th>';
      for (var g = 0; g < 5; g++) {
        var c = okHuc(d, sn, g, i), now = z.gi === g && z.hi === i;
        h += c ? '<td' + (now ? ' class="now"' : '') + ' data-oc="s:' + OK.s + ':' + g + ':' + i + '" tabindex="0"><b>' + esc(c.ders) + '</b><small>' + esc(okKisa(c.ogr)) + (c.co ? ' · ' + esc(okKisa(c.co)) : '') + '</small>' + (now ? '<em>şimdi</em>' : '') + '</td>' : '<td class="bos' + (now ? ' now' : '') + '">·' + (now ? '<em>şimdi</em>' : '') + '</td>';
      }
      h += '</tr>';
    }
    return h + '</tbody></table></div></div>';
  }
  function okOgrListe(C, d, z) {
    var X = okOgrDizin(d);
    var B = okBos(C, d, z, X), h = '<div class="okw">' + okAraKutu('Öğretmen adı ara') + '<div class="rows okl">';
    X.adlar.forEach(function (n, ix) {
      var m = X.m[n], top = 0, kim = '';
      m.forEach(function (g) { if (g) g.forEach(function (c) { if (c) top++; }); });
      if (z.gi >= 0 && z.hi >= 0 && m[z.gi] && m[z.gi][z.hi]) kim = m[z.gi][z.hi].sinif;
      h += '<div class="rw okr" data-q="' + esc(okAra(n)) + '" data-ok="o:' + ix + '"><div class="a"><b>' + esc(n) + '</b><span class="s">' + top + ' ders/hafta</span></div><span class="z">' + (kim ? '<i class="okn">şimdi ' + esc(kim) + '</i>' : '') + '</span></div>';
    });
    return h + '</div>' + B.alt + B.ust + '</div>';
  }
  function okOgrHaf(C, d, z) {
    var X = okOgrDizin(d), n = X.adlar[OK.o], m = X.m[n] || [], say = okSaatSay(d), sa = okSaatler(C), top = 0;
    m.forEach(function (g) { if (g) g.forEach(function (c) { if (c) top++; }); });
    var h = '<div class="okw">' + okGeri(n, top + ' ders/hafta') + '<div class="okt"><table class="okta okh"><thead><tr><th class="st">Saat</th>' + OKGUN.map(function (a, i) { return '<th class="' + (z.gi === i ? 'tod' : '') + '">' + a + '</th>'; }).join('') + '</tr></thead><tbody>';
    for (var i = 0; i < say; i++) {
      h += '<tr><th class="st">' + (i + 1) + '<small>' + (sa[i] ? esc(sa[i][1]) : '') + '</small></th>';
      for (var g = 0; g < 5; g++) {
        var c = m[g] && m[g][i], now = z.gi === g && z.hi === i;
        h += c ? '<td' + (now ? ' class="now"' : '') + ' data-oc="o:' + OK.o + ':' + g + ':' + i + '" tabindex="0"><b>' + esc(c.sinif) + '</b><small>' + esc(c.ders) + '</small>' + (now ? '<em>şimdi</em>' : '') + '</td>' : '<td class="bos' + (now ? ' now' : '') + '">·' + (now ? '<em>şimdi</em>' : '') + '</td>';
      }
      h += '</tr>';
    }
    return h + '</tbody></table></div></div>';
  }
  function okulSayfa(C) {
    var d = okulVeri(C.y);
    if (!d) return '<div class="empty ei-saat"><b>Okul programı yok</b>Okul yönetimi paylaştığında burada görünür.</div>';
    var z = okZaman(C), ic;
    if (PR === 2) ic = (OK.s >= 0 && d.siniflar[OK.s]) ? okSubeHaf(C, d, z) : okSubeler(C, d, z);
    else ic = (OK.o >= 0 && okOgrDizin(d).adlar[OK.o] != null) ? okOgrHaf(C, d, z) : okOgrListe(C, d, z);
    var pb = (PR === 2 && OK.s >= 0 && d.siniflar[OK.s]) ? '<div class="okpay">' + payBtn('sube') + '</div><div class="okpay" style="margin-top:8px">' + pdfBtn('sube', 'Haftalık programı PDF olarak al') + '</div>' : ((PR === 3 && OK.o >= 0 && okOgrDizin(d).adlar[OK.o] != null) ? '<div class="okpay">' + payBtn('ogr') + '</div><div class="okpay" style="margin-top:8px">' + pdfBtn('ogr', 'Haftalık programı PDF olarak al') + '</div>' : '');
    return '<div id="okl" data-k="' + z.gi + ':' + z.hi + ':' + C.gb.ds + '">' + ic + pb + '</div>';
  }
  function okulTick(C) {
    if (TAB !== 4 || (PR !== 2 && PR !== 3)) return;
    var e = $('okl'); if (!e) return;
    var z = okZaman(C); if (e.getAttribute('data-k') === z.gi + ':' + z.hi + ':' + C.gb.ds) return;
    var w = document.querySelector('#okl .okt'), sl = w ? w.scrollLeft : 0;
    render(); w = document.querySelector('#okl .okt'); if (w) w.scrollLeft = sl;
  }
  function okulTikla(b) {
    var v = String(b.getAttribute('data-ok')).split(':'), k = v[0], n = +v[1];
    if (k === 'k') OK.kd = n; else if (k === 'g') OK.g = n; else if (k === 'h') OK.bh = n; else if (k === 's') { OK.s = n; OK.q = ''; $('scr').scrollTop = 0; } else if (k === 'o') { OK.o = n; OK.q = ''; $('scr').scrollTop = 0; } else if (k === 'b') { OK.s = -1; OK.o = -1; OK.q = ''; OK.bh = 0; $('scr').scrollTop = 0; } else return;
    render();
  }

  // ================= 0.13.0 EK: arama, boş öğretmen, hücre ayrıntısı, resim paylaşımı, menü ipucu =================
  // Hepsi eklemedir: mevcut işlevlerin mantığı değişmez. Gelmeyen öğretmen/sebep verisi hiçbir yerde kullanılmaz.
  function okAra(s) { return String(s || '').toLocaleLowerCase('tr-TR').replace(/[çğıöşüâîû]/g, function (c) { return { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' }[c]; }).replace(/[^a-z0-9]/g, ''); }
  var IK_ARA = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>';
  function okAraKutu(ph, id, deger) {
    return '<div class="oara">' + IK_ARA + '<input id="' + (id || 'oks') + '" type="search" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="' + esc(ph) + '" aria-label="' + esc(ph) + '" value="' + esc(deger == null ? OK.q : deger) + '"></div>' + (id ? '' : '<p class="oknot" id="okbos" hidden>Eşleşen kayıt yok.</p>');
  }
  // Tablo/liste satırlarını yazılana göre süzer (satırda data-q: okAra ile hazırlanmış metin). Giriş yoksa hiçbir şey yapmaz.
  function okFiltre() {
    var i = $('oks'); if (!i) return;
    var q = okAra(i.value), l = document.querySelectorAll('#okl [data-q]'), n = 0, g = 0;
    for (var k = 0; k < l.length; k++) { var ok = !q || (l[k].getAttribute('data-q') || '').indexOf(q) >= 0; l[k].style.display = ok ? '' : 'none'; if (ok) g++; n++; }
    var b = $('okbos'); if (b) b.hidden = !(q && n && !g);
  }
  // Öğretmenin o gün okulda olup olmadığı yalnız ders programından çıkarılır: dersi yok → okulda değil;
  // dersi var ve bu saat iki dersinin arasında → okulda; baştan önce/sondan sonra → bilinemez.
  function okDurum(m, gi, hi) {
    var l = []; if (m && m[gi]) m[gi].forEach(function (c, i) { if (c) l.push(i); });
    if (!l.length) return 'yok';
    if (m[gi][hi]) return 'derste';
    return (l[0] < hi && hi < l[l.length - 1]) ? 'okulda' : 'belirsiz';
  }
  function okBugunSay(m, gi) { var k = 0; if (m && m[gi]) m[gi].forEach(function (c) { if (c) k++; }); return k; }
  // İki parça döner: alt = "Şu anda dersi boş olanlar" (listenin altında), ust = "Bugün dersi olmayanlar" (kapalı kart, en altta)
  function okBos(C, d, z, X) {
    var bos = { ust: '', alt: '' };
    if (z.gi < 0 || C.gb.tip !== 'ders') return bos;
    var sa = okSaatler(C), n = sa.length || okSaatSay(d), base = z.hi, i;
    if (base < 0) { for (i = 0; i < sa.length; i++) { if (mdk(sa[i][1]) * 60 > C.T) { base = i; break; } } }
    var nbl = {}; nobetListe(C.y, C.gb.ds).forEach(function (k) { nbl[norm(k.ad)] = 1; });
    var dolT = {}; topluDoldurma(C.y, C.gb.ds).forEach(function (x) { dolT[norm(x.giren)] = 1; });
    var yok = [];
    X.adlar.forEach(function (nm, ix) { if (okBugunSay(X.m[nm], z.gi) === 0) yok.push({ n: nm, ix: ix, et: nbl[norm(nm)] ? 'nöbetçi' : (dolT[norm(nm)] ? 'doldurmada' : '') }); });
    yok.sort(function (a, b) { return a.n.localeCompare(b.n, 'tr'); });
    bos.ust = '<div class="obk"><details class="obkart oyok"><summary>Bugün dersi olmayanlar <span class="okn">' + yok.length + '</span></summary><p class="obnot">Okulda olmadıkları varsayılır; ders doldurma adayı sayılmazlar.</p>'
      + (yok.length ? '<div class="obch">' + yok.map(function (x) { return '<button type="button" data-ok="o:' + x.ix + '">' + esc(okKisa(x.n)) + (x.et ? '<small>' + x.et + '</small>' : '') + '</button>'; }).join('') + '</div>' : '') + '</details></div>';
    if (base < 0) return bos;
    var secenek = []; for (i = 0; i < 3 && base + i < n; i++) secenek.push(i);
    var off = Math.min(OK.bh || 0, secenek.length - 1), hi = base + off;
    var dol = {}; topluDoldurma(C.y, C.gb.ds).forEach(function (x) { if (+x.saat === hi + 1) dol[norm(x.giren)] = 1; });
    var okulda = [], bel = 0, dolL = [];
    X.adlar.forEach(function (nm, ix) {
      var m = X.m[nm], dr = okDurum(m, z.gi, hi);
      if (dr === 'derste') return;
      if (dol[norm(nm)]) { dolL.push(okKisa(nm)); return; }
      if (dr === 'okulda') okulda.push({ n: nm, ix: ix, s: okBugunSay(m, z.gi), nb: !!nbl[norm(nm)] });
      else if (dr !== 'yok') bel++;
    });
    okulda.sort(function (a, b) { return a.s - b.s || a.n.localeCompare(b.n, 'tr'); });
    var et = (hi + 1) + '. ders' + (off === 0 ? (z.hi >= 0 ? ' (şimdi)' : ' (sıradaki)') : '');
    var h = '<div class="obk obalt"><div class="obkart"><h3 class="d"><i></i>Şu anda dersi boş olanlar</h3><div class="alt">' + esc(et) + (sa[hi] ? ' · ' + esc(sa[hi][1]) + '–' + esc(sa[hi][2]) : '') + ' · bugün dersi var, iki dersinin arasında</div>';
    if (secenek.length > 1) h += okSekme('h', secenek.map(function (k) { return [k, (base + k + 1) + '. ders']; }), off);
    h += okulda.length ? '<div class="obch">' + okulda.map(function (x) { return '<button type="button" data-ok="o:' + x.ix + '">' + esc(okKisa(x.n)) + '<small>bugün ' + x.s + ' ders' + (x.nb ? ' · nöbetçi' : '') + '</small></button>'; }).join('') + '</div>'
      : '<p class="obnot">Bu saatte iki dersinin arasında olduğu bilinen öğretmen yok.</p>';
    if (dolL.length) h += '<p class="obnot">Bu saatte ders doldurmada: ' + esc(dolL.join(', ')) + ' (boş sayılmadı).</p>';
    if (bel) h += '<p class="obnot"><b>' + bel + ' öğretmen</b> için okulda olup olmadığı bilinmiyor: dersleri henüz başlamamış ya da bitmiş olabilir. Burada gösterilmedi.</p>';
    bos.alt = h + '<p class="obnot">Yalnız ders programına göre hesaplanır. Gelmeyen öğretmen bilgisi uygulamaya gönderilmediği için izinli ya da raporlu biri de burada görünebilir.</p></div></div>';
    return bos;
  }
  function okSimdiyeGit() {
    var w = document.querySelector('#okl .okt'), th = document.querySelector('#okl thead th.now'); if (!w || !th) return;
    w.scrollLeft += (th.getBoundingClientRect().left - w.getBoundingClientRect().left) - (w.clientWidth - th.offsetWidth) / 2;
  }
  // Hücreye dokununca ayrıntı: s:şubeIx:gün:saat (şube görünümü) ya da o:öğretmenIx:gün:saat (öğretmen görünümü)
  function okHucreAc(kod) {
    var C = CTX || baglam(), d = okulVeri(C.y); if (!d) return;
    var p = String(kod).split(':'), t = p[0], ix = +p[1], g = +p[2], i = +p[3], sa = okSaatler(C), r = sa[i], X = okOgrDizin(d), z = okZaman(C);
    var saat = r ? r[1] + ' – ' + r[2] : '', alt = OKGUNT[g] + ', ' + (i + 1) + '. ders' + (saat ? ' · ' + saat : ''), h = '', bas = '', baslik = '';
    function git(k, ad, rol, ek) { return '<div class="rw" data-go="' + k + '"><div class="a"><b>' + esc(ad) + '</b><span class="s">' + esc(rol) + (ek ? ' · ' + esc(ek) : '') + '</span></div></div>'; }
    function ogr(nm, rol) { var q = X.adlar.indexOf(nm); if (q < 0) return kvH(rol, nm); var m = X.m[nm]; return git('o:' + q, nm, rol, okBugunSay(m, g) + ' ders ' + (z.gi === g ? 'bugün' : OKGUNT[g] + ' günü')); }
    if (t === 's') {
      var sn = d.siniflar[ix]; if (!sn) return; var c = okHuc(d, sn, g, i); baslik = String(sn.ad); bas = c ? c.ders : 'Bu saatte ders yok';
      h = '<div class="kvs">' + kvH('Şube', sn.ad) + (c ? kvH('Ders', c.ders) : '') + '</div>';
      var rows = '';
      if (c && c.ogr) rows += ogr(c.ogr, 'Öğretmen'); if (c && c.co) rows += ogr(c.co, 'Ortak öğretmen');
      if (z.gi === g) topluDoldurma(C.y, C.gb.ds).forEach(function (x) { if (+x.saat === i + 1 && okAnh(x.sinif) === okAnh(sn.ad)) rows += '<div class="rw"><div class="a"><b>' + esc(x.giren) + '</b><span class="s">Ders doldurma' + (x.yerine ? ' · ' + esc(x.yerine) + ' yerine' : '') + '</span></div></div>'; });
      rows += git('s:' + ix, 'Haftalık programı aç', String(sn.ad));
      h += '<div class="rows">' + rows + '</div>';
    } else if (t === 'o') {
      var nm = X.adlar[ix]; if (nm == null) return; var m = X.m[nm], c2 = m[g] && m[g][i]; baslik = nm; bas = c2 ? c2.sinif : 'Bu saatte ders yok';
      var top = 0; m.forEach(function (gg) { if (gg) gg.forEach(function (cc) { if (cc) top++; }); });
      h = '<div class="kvs">' + (c2 ? kvH('Sınıf', c2.sinif) + kvH('Ders', c2.ders) : '') + kvH(z.gi === g ? 'Bugün' : OKGUNT[g], okBugunSay(m, g) + ' ders') + kvH('Haftalık', top + ' ders') + '</div>';
      var rows2 = '';
      if (c2) { for (var q = 0; q < d.siniflar.length; q++) if (d.siniflar[q] && String(d.siniflar[q].ad) === c2.sinif) { rows2 += git('s:' + q, c2.sinif + ' haftalık programı', 'Şube'); break; } }
      rows2 += git('o:' + ix, 'Haftalık programı aç', nm);
      h += '<div class="rows">' + rows2 + '</div>';
    } else return;
    ayrintiRenk('ak:0');
    dtGoster(baslik, '<div class="dbig d">' + esc(bas) + '</div><div class="dsub">' + esc(alt) + '</div>' + h);
  }
  // Ayrıntı ya da arama penceresinden ilgili öğretmen/şube sayfasına geç
  function okGit(kod) {
    var C = CTX || baglam(), d = okulVeri(C.y); if (!d) return;
    var p = String(kod).split(':'), ix = +p[1];
    dtKapat();
    OK.q = ''; OK.bh = 0;
    if (p[0] === 's') { var sn = d.siniflar[ix]; if (!sn) return; TAB = 4; PR = 2; OK.s = ix; OK.o = -1; OK.kd = parseInt(sn.ad, 10) || 0; }
    else { TAB = 4; PR = 3; OK.o = ix; OK.s = -1; }
    WK = 0; $('scr').scrollTop = 0; render();
  }
  document.addEventListener('input', function (e) { var t = e.target; if (t && t.id === 'oks') { OK.q = t.value; okFiltre(); } });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    var t = e.target; if (!t || !t.getAttribute || !t.hasAttribute('data-oc')) return;
    e.preventDefault(); okHucreAc(t.getAttribute('data-oc'));
  });

  // ---- Resim olarak paylaş: tablo telefonda çizilir (sunucuya hiçbir şey gitmez); yalnız program/nöbet bilgisi içerir
  var PAY = { blob: null, url: '', dosya: '', file: null, baslik: '', thumb: '' };
  var PAY_FN = '"Baloo 2","Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif';
  function payMetin(x, t, w, px, ag) {
    t = String(t); var s = px; x.font = ag + ' ' + s + 'px ' + PAY_FN;
    while (x.measureText(t).width > w && s > 13) { s--; x.font = ag + ' ' + s + 'px ' + PAY_FN; }
    if (x.measureText(t).width > w) { while (t.length > 1 && x.measureText(t + '…').width > w) t = t.slice(0, -1); t += '…'; }
    return t;
  }
  // o: {okul, baslik, alt, sut:[başlık], w:[ağırlık], sat:[[hücre | [ana, alt]]], vurgu:sütunNo, not}
  function payCiz(o, bit) {
    var W = o.W || 1080, S = o.S || 1, M = 36, tw = W - 2 * M, ust = 196, hh = 60, rh = o.rh || 96, n = o.sat.length, nsut = o.sut.length;
    var ws = o.w || o.sut.map(function () { return 1; }), tp = 0, i, j; ws.forEach(function (a) { tp += a; });
    var H = o.H || (ust + hh + n * rh + (o.not ? 56 : 0) + 78);
    var cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S; var x = cv.getContext('2d'); if (S !== 1) x.scale(S, S);
    function bitti(img) {
      x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, W, H);
      x.fillStyle = '#13244A'; x.fillRect(0, 0, W, 150);
      var lx = M + 52, ly = 75;
      x.fillStyle = '#FFFFFF'; x.beginPath(); x.arc(lx, ly, 52, 0, Math.PI * 2); x.fill();
      if (img) { try { x.save(); x.beginPath(); x.arc(lx, ly, 48, 0, Math.PI * 2); x.clip(); x.drawImage(img, lx - 48, ly - 48, 96, 96); x.restore(); } catch (e) {} }
      var tx = M + 128, mw = W - tx - M;
      x.textBaseline = 'alphabetic'; x.fillStyle = 'rgba(255,255,255,.78)'; x.fillText(payMetin(x, o.okul || 'Yaşar Doğu Öğretmen', mw, 26, '500'), tx, 56);
      x.fillStyle = '#FFFFFF'; x.fillText(payMetin(x, o.baslik, mw, 46, '700'), tx, 108);
      x.fillStyle = '#13244A'; x.fillText(payMetin(x, o.alt || '', W - 2 * M, 26, '500'), M, 184);
      var cx = [M], cw = [];
      for (j = 0; j < nsut; j++) { cw.push(tw * ws[j] / tp); cx.push(cx[j] + cw[j]); }
      var y0 = ust;
      for (j = 0; j < nsut; j++) {
        x.fillStyle = o.vurgu === j ? '#F5E3B8' : '#E8EDF6'; x.fillRect(cx[j], y0, cw[j], hh);
        x.fillStyle = '#13244A'; x.textAlign = j === 0 && o.solHiza ? 'left' : 'center';
        x.fillText(payMetin(x, o.sut[j], cw[j] - 16, 26, '700'), j === 0 && o.solHiza ? cx[j] + 14 : cx[j] + cw[j] / 2, y0 + 39);
      }
      for (i = 0; i < n; i++) {
        var y = y0 + hh + i * rh;
        for (j = 0; j < nsut; j++) {
          var c = o.sat[i][j]; x.fillStyle = o.vurgu === j ? '#FDF6E3' : (i % 2 ? '#F7F9FC' : '#FFFFFF'); x.fillRect(cx[j], y, cw[j], rh);
          var ana = Array.isArray(c) ? c[0] : c, alt = Array.isArray(c) ? c[1] : '', mx = cx[j] + (j === 0 && o.solHiza ? 14 : cw[j] / 2), ha = (j === 0 && o.solHiza) ? 'left' : 'center';
          x.textAlign = ha; var bos = (ana === '' || ana === '·');
          x.fillStyle = bos ? '#9AA6BC' : '#13244A';
          if (alt) { x.fillText(payMetin(x, ana, cw[j] - 16, 30, '700'), mx, y + rh / 2 - 4); x.fillStyle = '#5A6985'; x.fillText(payMetin(x, alt, cw[j] - 16, 23, '500'), mx, y + rh / 2 + 28); }
          else x.fillText(payMetin(x, ana, cw[j] - 16, 30, bos ? '500' : '700'), mx, y + rh / 2 + 10);
        }
      }
      x.textAlign = 'left'; x.strokeStyle = '#C9D3E3'; x.lineWidth = 2;
      for (i = 0; i <= n + 1; i++) { var yy = y0 + (i === 0 ? 0 : hh + (i - 1) * rh); x.beginPath(); x.moveTo(M, yy); x.lineTo(M + tw, yy); x.stroke(); }
      for (j = 0; j <= nsut; j++) { x.beginPath(); x.moveTo(cx[j], y0); x.lineTo(cx[j], y0 + hh + n * rh); x.stroke(); }
      var fy = y0 + hh + n * rh;
      if (o.not) { x.fillStyle = '#5A6985'; x.fillText(payMetin(x, o.not, W - 2 * M, 22, '500'), M, fy + 40); fy += 56; }
      x.fillStyle = '#5A6985'; x.fillText(payMetin(x, 'Yaşar Doğu Öğretmen', 500, 22, '600'), M, fy + 52);
      x.textAlign = 'right'; x.fillText(o.tarih || '', W - M, fy + 52); x.textAlign = 'left';
      var mt = o.jpeg ? 'image/jpeg' : 'image/png';
      if (cv.toBlob) cv.toBlob(function (b) { bit(b); }, mt, o.jpeg ? 0.92 : undefined);
      else { try { var u = cv.toDataURL(mt).split(',')[1], bin = atob(u), a = new Uint8Array(bin.length); for (var k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k); bit(new Blob([a], { type: mt })); } catch (e) { bit(null); } }
    }
    var im = new Image(), son = false;
    function bir(g) { if (son) return; son = true; bitti(g); }
    im.onload = function () { bir(im); }; im.onerror = function () { bir(null); }; setTimeout(function () { bir(null); }, 1500); im.src = LOGO;
  }
  function payTarih(C) { return GKISA[C.d.getDay()] + ' ' + C.d.getDate() + ' ' + AY[C.d.getMonth()] + ' ' + C.d.getFullYear(); }
  function payBtn(tip, etiket) { return '<button type="button" class="paybtn" data-pay="' + tip + '">' + '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5"/><circle cx="9" cy="10.5" r="1.6"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/></svg>' + esc(etiket || 'Resim olarak paylaş') + '</button>'; }
  function payHaftaTablo(C, gun, hucreFn, say) {
    var sa = okSaatler(C), sat = [], i, g;
    for (i = 0; i < say; i++) { var s = [[String(i + 1), sa[i] ? sa[i][1] : '']]; for (g = 0; g < 5; g++) s.push(hucreFn(g, i) || '·'); sat.push(s); }
    return sat;
  }
  function nobHafta(C) {
    var nb = ortak(C.y, 'nobetciler'); if (!nb || !Array.isArray(nb.gunler)) return [];
    var mon = pazartesi(C.d), a = iso(mon), b = iso(gunEkle(mon, 6));
    return nb.gunler.filter(function (g) { return g && typeof g.tarih === 'string' && g.tarih >= a && g.tarih <= b && Array.isArray(g.liste) && g.liste.some(function (k) { return k && typeof k.ad === 'string' && k.ad; }); }).sort(function (p, q) { return p.tarih < q.tarih ? -1 : 1; });
  }
  // ---- 0.15.0: PDF — yazdırmaya hazır A4 yatay; tablo görüntüsü JPEG olarak tek sayfalık PDF'e konur (ek kütüphane yok, ağ yok)
  function pdfKurCok(bloblar, gen, yuk, cb) {
    var imgs = [], k = 0;
    function oku() {
      if (k >= bloblar.length) { kur(); return; }
      var fr = new FileReader();
      fr.onerror = function () { cb(null); };
      fr.onload = function () { imgs.push(new Uint8Array(fr.result)); k++; oku(); };
      fr.readAsArrayBuffer(bloblar[k]);
    }
    function kur() {
      try {
        var n = imgs.length, parcalar = [], toplam = 0, ofs = [], i;
        var ekle = function (x) { if (typeof x === 'string') { var u = new Uint8Array(x.length); for (var q = 0; q < x.length; q++) u[q] = x.charCodeAt(q) & 255; x = u; } parcalar.push(x); toplam += x.length; };
        var p10 = function (v) { return ('0000000000' + v).slice(-10); };
        ekle('%PDF-1.4\n%\u00e2\u00e3\u00cf\u00d3\n');
        ofs[1] = toplam; ekle('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
        var kids = []; for (i = 0; i < n; i++) kids.push((3 + 3 * i) + ' 0 R');
        ofs[2] = toplam; ekle('2 0 obj\n<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>\nendobj\n');
        for (i = 0; i < n; i++) {
          var pg = 3 + 3 * i, im = pg + 1, ct = pg + 2, jpg = imgs[i], ic = 'q 842 0 0 595 0 0 cm /Im0 Do Q';
          ofs[pg] = toplam; ekle(pg + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 ' + im + ' 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ' + ct + ' 0 R >>\nendobj\n');
          ofs[im] = toplam; ekle(im + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + gen + ' /Height ' + yuk + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n'); ekle(jpg); ekle('\nendstream\nendobj\n');
          ofs[ct] = toplam; ekle(ct + ' 0 obj\n<< /Length ' + ic.length + ' >>\nstream\n' + ic + '\nendstream\nendobj\n');
        }
        var xr = toplam, say = 3 + 3 * n, lst = ''; for (i = 1; i < say; i++) lst += p10(ofs[i]) + ' 00000 n \n';
        ekle('xref\n0 ' + say + '\n0000000000 65535 f \n' + lst + 'trailer\n<< /Size ' + say + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF\n');
        cb(new Blob(parcalar, { type: 'application/pdf' }));
      } catch (e) { cb(null); }
    }
    oku();
  }
  function pdfKur(blob, gen, yuk, cb) { pdfKurCok([blob], gen, yuk, cb); }
  function pdfBtn(tip, etiket) { return '<button type="button" class="paybtn" data-pay="' + tip + 'pdf"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 16.5h6"/></svg>' + esc(etiket || 'PDF olarak al') + '</button>'; }
  function payHazirla(tip) {
    if (tip === 'gecpdf' || tip === 'gectpdf') { gecmisPdf(tip === 'gecpdf'); return; }
    var pdf = /pdf$/.test(tip); if (pdf) tip = tip.slice(0, -3);
    var C = CTX || baglam(), o = null, dosya = 'program.png', y = C.y, okul = (y && y.okul) || '';
    var so = /^so(sube|ogr)$/.test(tip); if (so) tip = tip.slice(2);
    if (tip === 'sube' || tip === 'ogr') {
      var d = so ? subeVeri(y) : okulVeri(y); if (!d) return; var say = okSaatSay(d) || okSaatler(C).length;
      if (tip === 'sube') {
        var sn = d.siniflar[so ? SO.s : OK.s]; if (!sn) return;
        o = { baslik: String(sn.ad) + ' haftalık ders programı', alt: 'Ders ve öğretmen', sat: payHaftaTablo(C, 0, function (g, i) { var c = okHuc(d, sn, g, i); return c ? [c.ders, okKisa(c.ogr) + (c.co ? ' · ' + okKisa(c.co) : '')] : null; }, say) };
        dosya = 'program-' + (okAra(sn.ad) || 'sube') + '.png';
      } else {
        var X = so ? null : okOgrDizin(d), nm = so ? SOG.ogr : X.adlar[OK.o]; if (nm == null) return; var m = so ? ogrHaf(d, nm) : X.m[nm];
        o = { baslik: nm, alt: 'Haftalık ders programı', sat: payHaftaTablo(C, 0, function (g, i) { var c = m[g] && m[g][i]; return c ? [c.sinif, c.ders] : null; }, say) };
        dosya = 'program-' + (okAra(nm) || 'ogretmen') + '.png';
      }
      o.sut = ['Saat', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum']; o.w = [1.05, 1, 1, 1, 1, 1];
    } else if (tip === 'prog') {
      var p = programVar(y); if (!p) return; var mx = 0, wd;
      for (wd = 1; wd <= 5; wd++) Object.keys(p.matris[String(wd)] || {}).forEach(function (no) { if (hucre(p.matris[String(wd)][no]) && +no > mx) mx = +no; });
      if (!mx) return;
      o = { baslik: (y && y.kisi && y.kisi.ad) || 'Ders programım', alt: 'Haftalık ders programı', sut: ['Saat', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum'], w: [1.05, 1, 1, 1, 1, 1],
        sat: payHaftaTablo(C, 0, function (g, i) { var c = hucre((p.matris[String(g + 1)] || {})[String(i + 1)]); return c ? [c.sinif, c.ders || ''] : null; }, Math.min(mx, 12)) };
      dosya = 'ders-programim.png';
    } else if (tip === 'nobg') {
      var l = nobetListe(y, C.gb.ds); if (!l.length) return;
      o = { baslik: 'Günlük nöbet listesi', alt: GUN[C.d.getDay()] + ', ' + gunAy(C.gb.ds), sut: ['Nöbetçi öğretmen', 'Nöbet yeri'], w: [1.3, 1], solHiza: true, rh: 78, sat: l.map(function (k) { return [k.ad, k.yer || '·']; }) };
      dosya = 'nobet-' + C.gb.ds + '.png';
    } else if (tip === 'nobh') {
      var gl = nobHafta(C); if (!gl.length) return; var sat = [];
      gl.forEach(function (g) { var dd = tarihCoz(g.tarih), ls = g.liste.filter(function (k) { return k && typeof k.ad === 'string' && k.ad; }); ls.forEach(function (k, q) { sat.push([q === 0 ? [GUN[dd.getDay()], gunAy(g.tarih)] : '', k.ad, k.yer || '·']); }); });
      o = { baslik: 'Haftalık nöbet çizelgesi', alt: gunAy(gl[0].tarih) + ' – ' + gunAy(gl[gl.length - 1].tarih), sut: ['Gün', 'Nöbetçi öğretmen', 'Nöbet yeri'], w: [1, 1.5, 1.1], solHiza: true, rh: 80, sat: sat };
      dosya = 'nobet-hafta-' + gl[0].tarih + '.png';
    } else return;
    o.okul = okul; o.tarih = payTarih(C); o.not = 'Yalnız ders ve nöbet bilgisi içerir.';
    var bt = o.baslik;
    if (pdf) { o.W = 1754; o.H = 1240; o.S = 2; o.jpeg = true; o.rh = Math.max(60, Math.min(150, Math.floor((1240 - 196 - 60 - 56 - 78) / Math.max(1, o.sat.length)))); dosya = dosya.replace(/\.png$/, '.pdf'); }
    payCiz(o, function (blob) {
      if (!blob) { return; }
      if (pdf) {
        pdfKur(blob, o.W * o.S, o.H * o.S, function (pb) {
          if (!pb) return;
          if (PAY.url) { try { URL.revokeObjectURL(PAY.url); } catch (e) {} }
          if (PAY.thumb) { try { URL.revokeObjectURL(PAY.thumb); } catch (e) {} }
          PAY.blob = pb; PAY.dosya = dosya; PAY.baslik = bt; PAY.url = URL.createObjectURL(pb); PAY.thumb = URL.createObjectURL(blob); PAY.file = null;
          try { PAY.file = new File([pb], dosya, { type: 'application/pdf' }); } catch (e) {}
          var can2 = false; try { can2 = !!(PAY.file && navigator.canShare && navigator.canShare({ files: [PAY.file] })); } catch (e) {}
          ayrintiRenk('ak:0');
          dtGoster('PDF önizleme', '<img class="payimg" src="' + PAY.thumb + '" alt="' + esc(bt) + ' PDF önizlemesi"><div class="paybt">' + (can2 ? '<button type="button" class="payb pri" id="paygo">Paylaş</button>' : '') + '<button type="button" class="payb' + (can2 ? '' : ' pri') + '" id="paysave">' + (can2 ? 'PDF kaydet' : 'PDF indir') + '</button></div><p class="oknot" style="margin:10px 0 0">A4 yatay, yazdırmaya hazır.</p>');
        });
        return;
      }
      if (PAY.url) { try { URL.revokeObjectURL(PAY.url); } catch (e) {} }
      PAY.blob = blob; PAY.dosya = dosya; PAY.baslik = bt; PAY.url = URL.createObjectURL(blob); PAY.file = null;
      try { PAY.file = new File([blob], dosya, { type: 'image/png' }); } catch (e) {}
      var can = false; try { can = !!(PAY.file && navigator.canShare && navigator.canShare({ files: [PAY.file] })); } catch (e) {}
      ayrintiRenk('ak:0');
      dtGoster('Resim önizleme', '<img class="payimg" src="' + PAY.url + '" alt="' + esc(bt) + ' resmi"><div class="paybt">' + (can ? '<button type="button" class="payb pri" id="paygo">Paylaş</button>' : '') + '<button type="button" class="payb' + (can ? '' : ' pri') + '" id="paysave">' + (can ? 'Kaydet' : 'Resmi indir') + '</button></div><p class="oknot" style="margin:10px 0 0">Resme uzun basarak da kaydedebilirsin.</p>');
    });
  }
  function payGonder() {
    if (!PAY.file || !navigator.share) { payKaydet(); return; }
    try { navigator.share({ files: [PAY.file], title: PAY.baslik }).then(function () {}, function (e) { if (e && e.name === 'AbortError') return; payKaydet(); }); } catch (e) { payKaydet(); }
  }
  function payKaydet() {
    if (!PAY.url) return;
    var a = document.createElement('a'); a.href = PAY.url; a.download = PAY.dosya; a.style.display = 'none'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  // ================= 0.15.0: KADEME NOKTASI, HIZLI İŞLEMLER (UZUN BASMA), ŞUBE ÖĞRETMENLERİ =================
  // Şubenin yanında kademe (5/6/7/8) rengi: yalnız küçük bir nokta; hiçbir ölçü/yerleşim değişmez. Ayarlar › Görünüm'den kapatılır.
  function kdAyar() { return oku(K.kd) !== '0'; }
  function kdA(sinif) { if (!kdAyar()) return ''; var m = /^\s*([5-8])/.exec(String(sinif == null ? '' : sinif)); return m ? ' data-kd="' + m[1] + '"' : ''; }

  // ---- Şube öğretmenleri: 'okulprogram' (idare/rehberlik) ya da öğretmene özel, yalnız kendi şubelerini içeren 'subeprogram' verisi varsa çalışır; yoksa hiçbir şey görünmez.
  function subeVeri(y) {
    var d = okulVeri(y) || kisisel(y, 'subeprogram');
    return (d && Array.isArray(d.siniflar) && Array.isArray(d.dersler) && Array.isArray(d.ogretmenler) && d.siniflar.length) ? d : null;
  }
  function subeBul(d, ad) { var a = okAnh(ad); if (!a) return -1; for (var i = 0; i < d.siniflar.length; i++) if (d.siniflar[i] && okAnh(d.siniflar[i].ad) === a) return i; return -1; }
  function subeOgrler(d, si) {
    var sn = d.siniflar[si], m = Object.create(null), sira = [], g, h;
    for (g = 0; g < 5; g++) for (h = 0; h < 12; h++) {
      var c = okHuc(d, sn, g, h); if (!c) continue;
      [c.ogr, c.co].forEach(function (n) { if (!n) return; if (!m[n]) { m[n] = { ad: n, dersler: [], say: 0 }; sira.push(n); } m[n].say++; if (m[n].dersler.indexOf(c.ders) < 0) m[n].dersler.push(c.ders); });
    }
    return sira.map(function (n) { return m[n]; }).sort(function (a, b) { return String(a.dersler[0]).localeCompare(String(b.dersler[0]), 'tr') || a.ad.localeCompare(b.ad, 'tr'); });
  }
  function subeOgrBolumu(C, sinif, hepsi) {
    var d = subeVeri(C.y); if (!d) return ''; var si = subeBul(d, sinif); if (si < 0) return '';
    var l = subeOgrler(d, si).filter(function (x) { return hepsi || norm(x.ad) !== C.ben; }); if (!l.length) return '';
    var sa = encodeURIComponent(String(d.siniflar[si].ad));
    return '<h4 class="kzt" style="margin-top:18px">Şube öğretmenleri</h4><div class="rows">' + l.map(function (x) { return dtSatir('so:' + sa + ':' + encodeURIComponent(x.ad), '', x.ad, x.dersler.join(', ') + ' · haftada ' + x.say + ' saat', ''); }).join('') + '</div>';
  }
  function dtSubeOgr(ad, ogr) {
    var C = CTX || baglam(), d = subeVeri(C.y); if (!d) return;
    var m = ogrHaf(d, ogr), say = okSaatSay(d), sa = okSaatler(C), z = okZaman(C), top = 0, i, g, tum = !!okulVeri(C.y); SOG.ogr = ogr;
    m.forEach(function (gg) { if (gg) gg.forEach(function (c) { if (c) top++; }); });
    var h = '<div class="okw"><div class="okbas"><b class="d">' + esc(ogr) + '</b><span>haftada ' + top + ' ders</span></div><div class="okt"><table class="okta okh okfit"><thead><tr><th class="st">Saat</th>' + OKGUN.map(function (a2, k) { return '<th class="' + (z.gi === k ? 'tod' : '') + '">' + a2 + '</th>'; }).join('') + '</tr></thead><tbody>';
    for (i = 0; i < say; i++) {
      h += '<tr><th class="st">' + (i + 1) + '<small>' + (sa[i] ? esc(sa[i][1]) : '') + '</small></th>';
      for (g = 0; g < 5; g++) {
        var c = m[g] && m[g][i], now = z.gi === g && z.hi === i;
        h += c ? '<td' + (now ? ' class="now"' : '') + '><b>' + esc(c.sinif) + '</b><small>' + esc(c.ders) + '</small>' + (now ? '<em>şimdi</em>' : '') + '</td>' : '<td class="bos' + (now ? ' now' : '') + '">·' + (now ? '<em>şimdi</em>' : '') + '</td>';
      }
      h += '</tr>';
    }
    dtGoster(ogr, h + '</tbody></table></div><p class="oknot">' + (tum ? 'Okulun tüm şubelerindeki dersleri gösterilir.' : 'Yalnız senin de girdiğin şubelerdeki dersleri gösterilir.') + '</p><div class="okpay">' + payBtn('soogr') + '</div><div class="okpay" style="margin-top:8px">' + pdfBtn('soogr', 'Haftalık programı PDF olarak al') + '</div></div>');
  }

  // ---- Şube öğretmenleri sekmesi (profil menüsü › OKUL): şube listesi › şubenin programı + öğretmenleri › öğretmenin haftalık tablosu
  var SO = { s: -1 }, SOG = { ogr: null };
  // Öğretmenin haftalık tablosu: yalnız verideki (kullanıcının görebildiği) şubelerden derlenir.
  function ogrHaf(d, ad) { return okOgrDizin(d).m[ad] || []; }
  function soSayfa(C) {
    var d = subeVeri(C.y);
    if (!d) return '<div class="empty ei-saat"><b>Şube bilgisi yok</b>Okul yönetimi paylaştığında burada görünür.</div>';
    var z = okZaman(C), sn = SO.s >= 0 ? d.siniflar[SO.s] : null, h;
    if (sn) {
      var say = okSaatSay(d), sa = okSaatler(C), i, g;
      h = '<div class="okw"><button type="button" class="okgeri" data-sbo="b"><span aria-hidden="true">‹</span> Şube listesi</button><div class="okbas"><b class="d">' + esc(String(sn.ad)) + '</b><span>Haftalık ders programı</span></div><div class="okt"><table class="okta okh okfit"><thead><tr><th class="st">Saat</th>' + OKGUN.map(function (a2, k) { return '<th class="' + (z.gi === k ? 'tod' : '') + '">' + a2 + '</th>'; }).join('') + '</tr></thead><tbody>';
      for (i = 0; i < say; i++) {
        h += '<tr><th class="st">' + (i + 1) + '<small>' + (sa[i] ? esc(sa[i][1]) : '') + '</small></th>';
        for (g = 0; g < 5; g++) {
          var c = okHuc(d, sn, g, i), now = z.gi === g && z.hi === i;
          h += c ? '<td' + (now ? ' class="now"' : '') + '><b>' + esc(c.ders) + '</b><small>' + esc(okKisa(c.ogr)) + (c.co ? ' · ' + esc(okKisa(c.co)) : '') + '</small>' + (now ? '<em>şimdi</em>' : '') + '</td>' : '<td class="bos' + (now ? ' now' : '') + '">·' + (now ? '<em>şimdi</em>' : '') + '</td>';
        }
        h += '</tr>';
      }
      return '<div id="sol">' + h + '</tbody></table></div></div>' + subeOgrBolumu(C, sn.ad, true) + '<p class="oknot" style="margin-top:10px">Bir öğretmene dokununca haftalık ders tablosu açılır.</p><div class="okpay">' + payBtn('sosube') + '</div><div class="okpay" style="margin-top:8px">' + pdfBtn('sosube', 'Haftalık programı PDF olarak al') + '</div></div>';
    }
    var kds = [], gr = {};
    d.siniflar.forEach(function (s2, ix) { if (!s2) return; var k = parseInt(s2.ad, 10) || 0; if (!gr[k]) { gr[k] = []; kds.push(k); } gr[k].push(ix); });
    kds.sort(function (x, y2) { return x - y2; });
    h = '<div id="sol"><div class="okbas" style="margin-top:6px"><b class="d">Şube öğretmenleri</b><span>Bir şubeye dokun: programı ve öğretmenleri açılır.</span></div>';
    kds.forEach(function (k) {
      h += '<h4 class="kzt" style="margin-top:14px">' + (k ? k + '. sınıf' : 'Diğer') + '</h4><div class="rows okl">';
      gr[k].forEach(function (ix) {
        var s3 = d.siniflar[ix], n = subeOgrler(d, ix).length;
        h += '<div class="rw okr" data-sbo="' + ix + '"><div class="a"><b' + kdA(s3.ad) + '>' + esc(String(s3.ad)) + '</b><span class="s">' + n + ' öğretmen</span></div></div>';
      });
      h += '</div>';
    });
    return h + '</div>';
  }

  // ---- Hızlı işlemler: ders kartına uzun basınca (ya da bağlam menüsü tuşuyla) açılır; aynı işlemler ders ayrıntısında da vardır
  var LP = { t: null, x: 0, y: 0, atesli: false, sup: 0, son: 0 };
  var LP_SEC = '[data-dt^="ak:"], #t1 .tt > [data-c]';
  function lpHedef(el) {
    var b = el.closest(LP_SEC), C = CTX || baglam(); if (!b) return null;
    if (b.hasAttribute('data-dt')) {
      var p = b.getAttribute('data-dt').split(':'), G = gunBaglam(tarihCoz(p[1])), r = G.sc[+p[2]]; if (!r || r[0] !== 'ders') return null;
      return { ds: p[1], no: dersNo(r), ri: +p[2] };
    }
    if (b.hasAttribute('data-c')) {
      var a = b.getAttribute('data-c').split(','), g = haftaGunleri(C.d)[+a[0]]; if (!g) return null;
      var G2 = gunBaglam(g), no = +a[1] + 1, ix = -1; G2.sc.forEach(function (r2, i) { if (r2[0] === 'ders' && dersNo(r2) === no) ix = i; });
      return ix >= 0 ? { ds: iso(g), no: no, ri: ix } : null;
    }
    return null;
  }
  function kzHepsi(my, ds) {
    return new Promise(function (res) {
      var e = kzEsle(my), g = parseInt(my && my.sinif, 10);
      if (!e || !e.a || !(g >= 5 && g <= 8)) { res({ hata: 'Bu ders için kazanım planı bulunamadı.' }); return; }
      kzIndeks().then(function () {
        var pl = kzPlan(my, (e.a === 'sos' && g === 8) ? 'ita' : e.a);
        if (!pl || pl.not) { res({ hata: 'Bu ders ve sınıf için kazanım planı bulunmuyor.' }); return; }
        return kzJson('kazanim/' + pl.f).then(function (P) {
          if (!P || !Array.isArray(P.haftalar)) { res({ hata: (P && P.uniteler) ? 'Bu dersin kazanımları haftalara bölünmemiş. “Kazanımları aç” ile tek tek işaretleyebilirsin.' : 'Kazanım dosyası yüklenemedi. İnternet bağlantını kontrol et.' }); return; }
          var h = kzHafta(P, ds); if (!h || !h.m.length) { res({ hata: 'Bu hafta için planda kazanım yok.' }); return; }
          var isl = okuJ(K.isl, {}), yeni = [], tum = [];
          h.m.forEach(function (m, i) { var k = kzAnk(P, my, h, i); tum.push(k); if (!isl[k]) { isl[k] = 1; yeni.push(k); } });
          yaz(K.isl, JSON.stringify(isl)); res({ n: h.m.length, yeni: yeni, tum: tum });
        });
      }, function () { res({ hata: 'Kazanım listesi açılamadı.' }); });
    });
  }
  function lpAc(h) {
    var G = gunBaglam(tarihCoz(h.ds)), r = G.sc[h.ri]; if (!r) return;
    var my = G.MY[h.no], cv = G.COV[h.no]; if (!my && !cv) return;
    var sn = (my && my.sinif) || (cv && cv.sinif) || '', d = tarihCoz(h.ds), kz = !!(my && kzEsle(my));
    var kk = (G.gb.wd - 1) + ',' + (h.no - 1);
    $('sh').classList.remove('on');
    $('ns').innerHTML = '<h3>' + esc((sn ? sn + ' · ' : '') + h.no + '. ders') + '</h3><div class="stamp" style="margin-top:0">' + esc(GUN[d.getDay()] + ', ' + gunAy(h.ds) + ' · ' + r[2] + '–' + r[3]) + '</div>'
      + (kz ? '<button class="fin" id="lpis" type="button">Bu haftanın kazanımlarını işlendi yap</button>' : '')
      + '<button class="fin3" id="lpnt" type="button">Not ekle</button>' + (kz ? '<button class="fin3" id="lpkz" type="button">Kazanımları aç</button>' : '') + '<div class="nerr" id="lpm" role="status" aria-live="polite"></div>';
    $('lpnt').onclick = function () { notAc(kk, null); };
    if (kz) {
      $('lpkz').onclick = function () { kapat(); dtAc('dn:' + h.ds + ':' + h.no); setTimeout(function () { var e = $('kzw'); if (e && e.scrollIntoView) e.scrollIntoView(true); }, 350); };
      $('lpis').onclick = function () {
        var m = $('lpm'); m.style.color = 'var(--mut)'; m.textContent = 'Kazanımlar işaretleniyor…';
        kzHepsi(my, h.ds).then(function (s) {
          m = $('lpm'); if (!m) return;
          if (s.hata) { m.style.color = '#B3392C'; m.textContent = s.hata; return; }
          m.style.color = 'var(--teal)';
          m.innerHTML = '<span>' + (s.yeni.length ? s.yeni.length + ' kazanım işlendi olarak işaretlendi.' : 'Bu haftanın ' + s.n + ' kazanımı zaten işlenmişti.') + '</span> <button type="button" class="lk" id="lpgeri" style="margin-left:6px">' + (s.yeni.length ? 'Geri al' : 'İşaretleri kaldır') + '</button>';
          $('lpgeri').onclick = function () {
            var isl = okuJ(K.isl, {}); (s.yeni.length ? s.yeni : s.tum).forEach(function (k) { delete isl[k]; }); yaz(K.isl, JSON.stringify(isl));
            m = $('lpm'); if (m) { m.style.color = 'var(--mut)'; m.textContent = 'İşaretler geri alındı.'; }
          };
        });
      };
    }
    $('ns').classList.add('on'); $('shd').classList.add('on');
  }
  (function () {
    function uygun(e) { var el = e.target && e.target.closest ? e.target.closest(LP_SEC) : null; return (el && !el.closest('#dt') && !el.closest('#ns') && !el.closest('#cek') && !el.closest('#sh')) ? el : null; }
    function birak() { clearTimeout(LP.t); LP.t = null; if (LP.atesli) { LP.sup = Date.now(); LP.atesli = false; } }
    document.addEventListener('pointerdown', function (e) {
      if (kilit || (e.pointerType === 'mouse' && e.button !== 0)) return;
      var el = uygun(e); if (!el) return;
      LP.x = e.clientX; LP.y = e.clientY; clearTimeout(LP.t);
      LP.t = setTimeout(function () {
        LP.t = null; var h = lpHedef(el); if (!h) return;
        LP.atesli = true; LP.son = Date.now(); try { if (navigator.vibrate) navigator.vibrate(12); } catch (x) {}
        lpAc(h);
      }, 520);
    }, true);
    document.addEventListener('pointerup', birak, true);
    document.addEventListener('pointercancel', function () { clearTimeout(LP.t); LP.t = null; LP.atesli = false; }, true);
    document.addEventListener('pointermove', function (e) { if (LP.t && (Math.abs(e.clientX - LP.x) > 10 || Math.abs(e.clientY - LP.y) > 10)) { clearTimeout(LP.t); LP.t = null; } }, true);
    document.addEventListener('scroll', function () { clearTimeout(LP.t); LP.t = null; }, true);
    document.addEventListener('contextmenu', function (e) {
      var el = uygun(e); if (!el) return; e.preventDefault();
      if (Date.now() - LP.son < 1500) return;
      var h = lpHedef(el); if (h) { LP.son = Date.now(); lpAc(h); }
    }, true);
    document.addEventListener('click', function (e) { if (LP.sup && Date.now() - LP.sup < 600) { LP.sup = 0; e.stopPropagation(); e.preventDefault(); } }, true);
  })();

  // ---- Menü ipucu: ilk açılışta bir kez
  function ipucuKonum() {
    var e = $('oipu'), ob = $('ob'), ph = $('ph'); if (!e || !ob || !ph) return;
    var r = ob.getBoundingClientRect(), pr = ph.getBoundingClientRect(), sc = $('scr');
    e.style.display = (sc && sc.scrollTop > 40) ? 'none' : '';
    e.style.top = Math.round(r.bottom - pr.top + 10) + 'px';
    e.style.left = Math.max(10, Math.round(r.left - pr.left)) + 'px';
  }
  function ipucuKapat() { yaz(K.ipucu, '1'); var e = $('oipu'); if (e && e.parentNode) e.parentNode.removeChild(e); }
  var ipucuBekle = false;
  function ipucuKontrol() {
    var e = $('oipu');
    if (oku(K.ipucu)) { if (e && e.parentNode) e.parentNode.removeChild(e); return; }
    if (e) { ipucuKonum(); return; }
    if (ipucuBekle || kilit) return;
    ipucuBekle = true;
    setTimeout(function () {
      ipucuBekle = false;
      if (oku(K.ipucu) || kilit || $('oipu') || !$('ob') || !$('ph')) return;
      var b = document.createElement('div'); b.id = 'oipu'; b.className = 'oipu'; b.setAttribute('role', 'status');
      b.innerHTML = '<b>Menü ve profil burada</b>Ad kartına dokun: ders programları, ayarlar ve hesap menüsü açılır.<button type="button" id="ipuok">Anladım</button>';
      $('ph').appendChild(b); ipucuKonum();
    }, 1400);
  }
  $('scr').addEventListener('scroll', ipucuKonum, { passive: true });

  function t4HTML(C) { return PR === 0 ? gorevSayfa(C) : (PR === 2 || PR === 3) ? okulSayfa(C) : PR === 4 ? soSayfa(C) : ayarHTML(); }
  function programHTML(C) {
    var y = C.y, p = programVar(y);
    if (!p) return '<div class="empty ei-takvim"><b>Programın henüz yayımlanmadı</b>Okul yönetimi ders programını paylaştığında burada görünür.</div>';
    var toplam = 0, siniflar = {};
    for (var wd = 1; wd <= 5; wd++) { var g = p.matris[String(wd)] || {}; Object.keys(g).forEach(function (no) { var h = hucre(g[no]); if (h) { toplam++; siniflar[h.sinif] = 1; } }); }
    return '<div class="stamp"><i></i>Güncel program' + (p.yururluk && /^\d{4}-\d{2}-\d{2}$/.test(p.yururluk) ? ', ' + gunAy(p.yururluk) + ' tarihli' : '') + '</div>' + ttHTML(C)
      + derslerimHTML(C) + '<div class="lgd"><span><i style="background:var(--ink)"></i>Şu an</span><span><i style="border:1px solid var(--teal)"></i>Ders doldurma</span></div>'
      + '<div class="stat"><div><b>' + toplam + '</b><span>haftalık ders</span></div><div><b>' + Object.keys(siniflar).length + '</b><span>farklı sınıf</span></div></div>' + (toplam ? '<div class="okpay">' + payBtn('prog', 'Programı resim olarak paylaş') + '</div><div class="okpay" style="margin-top:8px">' + pdfBtn('prog', 'Programı PDF olarak al') + '</div>' : '');
  }
  function nobetSekmesi(C) {
    var n = nobetim(C.y);
    if (!n.liste.length && !(n.gelecek && n.gelecek.liste.length)) return '<div class="empty ei-cay"><b>Nöbet görevin yok</b>' + (n.gelecek ? esc(gunAy(n.gelecek.bas)) + ' tarihinden itibaren geçerli yeni düzende de nöbet yerin yok.' : 'Nöbet yerin belirlendiğinde burada görünür.') + '</div>';
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
    }).join('') + '</div></div>' : '<div class="empty ei-not"><b>Henüz notun yok</b>Ders programında bir derse dokunarak ya da aşağıdaki düğmeyle not ekleyebilirsin.</div>')
      + '<button class="addn" id="addn" type="button">Yeni not ekle</button>'
      + (l.length ? '<button class="lk" id="nall" type="button" style="display:block;margin-top:14px">Tüm notlarımı telefondaki notlara gönder</button>' : '')
      + '<button class="lk" id="bk" type="button" style="display:block;margin-top:10px">Notlarımı ve işaretlerimi yedekle</button><div class="nerr" id="bkm"></div>'
      + '<div class="note warn"><b>Yedek almayı unutma</b>Notların ve “işlendi” işaretlerin bu telefonun hafızasında durur. Telefonu değiştirirsen, tarayıcı verilerini silersen ya da uygulamayı kaldırırsan kaybolur. Ara sıra yedek almanı öneririz.<button class="lk" id="vgit" type="button" style="display:block;margin:8px 0 0">Yedekten geri yükle ve ayrıntılar</button></div>';
  }
  function t1HTML(C) {
    if (yayinKapali(C)) return '<div class="empty"><b>Bilgiler şu an gösterilemiyor</b>Bugün sekmesinden durumu görebilirsin.</div>';
    if (PS === 0 && dersiz(C.y)) return programBekNotu(C) + gorevSatir(C) + bugunHatirlat(C) + (C.gb.tip === 'ders' ? sAkis(C, 0, 'Okulun bugünü') : '<div class="empty ei-gunes"><b>' + (C.gb.tip === 'hs' ? 'Hafta sonu' : 'Bugün okul tatil') + '</b>İyi dinlenmeler.</div>');
    if (PS === 0) {
      var h = '', bg = C.gb.ds, ben = C.COV;
      var ilk = null; Object.keys(ben).forEach(function (no) { if (!ilk) ilk = ben[no]; });
      if (C.gb.tip === 'ders' && ilk) {
        var cvn = Object.keys(ben).map(Number).sort(function (a, b) { return a - b; });
        h += '<div class="sec" data-k="cov"><h2>Ders doldurma<span>bugün ' + cvn.length + ' ders</span></h2><div class="cvbox">' + cvn.map(function (no) {
          var r = C.gb.ders[no - 1], cy = cvYerine(C.y, bg, no, ben[no]);
          return '<div class="l" data-dt="dn:' + bg + ':' + no + '"><b class="d">' + no + '. ders</b><span class="cvt">' + (r ? esc(r[1]) + '–' + esc(r[2]) : '') + '<br><strong>' + esc(ben[no].sinif || '') + '</strong></span><em>' + esc(cy ? cy + ' yerine' : 'Gelmeyen öğretmen yerine') + '</em></div>';
        }).join('') + '</div></div>';
      }
      h += bugunHatirlat(C);
      var khtml = '';
      var gsat = gorevSatir(C);
      if (C.gb.tip === 'ders') { if (C.T >= C.Z0) h += '<div class="gbit"><b>Bugünkü derslerin bitti</b>Aşağıda bugünkü programını görebilirsin.</div>'; h += sAkis(C, 1); }
      else if (C.gb.tip === 'hs' || C.gb.tip === 'tatil') {
        var nx = sonrakiOkul(C), c1 = nx ? hucreAl(C.y, nx.gb.wd, 1) : null;
        h += '<div class="empty ei-gunes"><b>' + (C.gb.tip === 'hs' ? 'Hafta sonu' : 'Bugün okul tatil') + '</b>' + (nx ? esc(nx.etiket) + ' dersler ' + esc(nx.ilk) + saatEk(nx.ilk) + ' başlıyor' + (c1 ? '; ilk dersin ' + esc(c1.sinif) + ' sınıfında.' : '.') : '') + '</div>';
      } else h += '<div class="empty ei-saat"><b>Ders saatleri henüz yayımlanmadı</b>Okul yönetimi paylaştığında burada görünür.</div>';
      return programBekNotu(C) + gsat + h + khtml;
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
    kurulListe(y, a).forEach(function (k) { if (k.kat === 'gun' && k.bas && k.bas <= b && (k.bit || k.bas) >= a) ev.push([k.bas < a ? a : k.bas, etiket(k.bas < a ? a : k.bas), 'Görevlisin: ' + k.ad, k.gorev || 'Görevli']); });
    ev.sort(function (p, q) { return p[0] < q[0] ? -1 : p[0] > q[0] ? 1 : 0; });
    return ev;
  }
  function t2HTML(C) {
    if (yayinKapali(C)) return '<div class="empty"><b>Bilgiler şu an gösterilemiyor</b>Bugün sekmesinden durumu görebilirsin.</div>';
    if (CV === 1) return ayHTML(C);
    if (CV === 2) return gecmisHTML(C);
    var mon = gunEkle(pazartesi(C.d), WK * 7), a = iso(mon), y = C.y, n = nobetim(y), h = '';
    var rot = ortak(y, 'rotasyon'), sonraki = rot && rot.hafta && rot.hafta.sonraki;
    var nobetSatir = '';
    var liste = n.liste;
    if (n.gelecek && n.gelecek.bas <= a) liste = n.gelecek.liste;
    if (liste.length) nobetSatir = liste.slice().sort(function (p, q) { return p.gun - q.gun; }).map(function (x) { var d = gunEkle(mon, (+x.gun) - 1); return '<div class="rw" data-dt="gun:' + iso(d) + '"><div class="a"><b>' + GUN[(+x.gun) % 7] + ', ' + esc(x.yer) + '</b><span class="s">' + (iso(d) < C.gb.ds ? 'Tamamlandı.' : '') + '</span></div></div>'; }).join('');
    var ev = haftaKayitlari(C, mon);
    if (ev.length) h += '<div class="sec">' + secH(['Geçen', 'Bu', 'Gelecek'][WK + 1] + ' haftanın kayıtları', ev.length + ' kayıt') + '<div class="rows">' + ev.map(function (e) { return '<div class="rw" data-dt="gun:' + e[0] + '"><span class="z" style="min-width:46px;flex:none;white-space:nowrap;color:var(--tx);font-weight:650">' + esc(e[1]) + '</span><div class="a"><b>' + esc(e[2]) + '</b><span class="s">' + esc(e[3]) + '</span></div></div>'; }).join('') + '</div></div>';
    if (nobetSatir) h += '<div class="sec">' + secH('Nöbetin') + '<div class="rows">' + nobetSatir + '</div></div>';
    if (sonraki && sonraki === a && n.gelecek && (n.liste.length || n.gelecek.liste.length) && WK >= 1) h += '<div class="sec"><div class="rot"><p>Yeni nöbet düzenin, ' + esc(gunAy(a)) + ' tarihinden itibaren</p><p style="margin-top:10px;font-weight:500">Yönetim onayladı.</p><button class="lk" type="button" data-dt="nbd">Önceki ve yeni yerlerini gör</button></div></div>';
    else if (sonraki && WK === 0 && iso(gunEkle(mon, 7)) === sonraki && n.gelecek && (n.liste.length || n.gelecek.liste.length)) h += '<div class="sec"><div class="rot"><p>Gelecek hafta nöbet düzenin değişiyor</p><button class="lk" type="button" data-hafta="1">Gelecek haftaya bak</button></div></div>';
    return h || '<div class="empty ei-takvim"><b>Bu hafta paylaşılan kayıt yok</b>Etkinlik, duyuru ya da nöbet değişikliği paylaşıldığında burada görünür.</div>';
  }

  // ---- Pano sekmesi
  var EXT = '<svg viewBox="0 0 24 24"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  function t3HTML(C) {
    if (yayinKapali(C)) return '<div class="empty"><b>Bilgiler şu an gösterilemiyor</b>Bugün sekmesinden durumu görebilirsin.</div>';
    var hab = haberListe(C.y).filter(function (h) { return CAT === 'Tümü' || (h.kat || 'Bilgi') === CAT; }), bag = baglantiListe(C.y), h = '';
    var du = duyuruListe(C.y), bl = belirliListe(C.y);
    if (du.length && CAT === 'Tümü') h += '<div class="sec">' + secH('Okuldan duyurular', du.length + ' duyuru') + '<div class="rows">' + du.map(function (d, i) { var z = d.tarih ? gunAyK(d.tarih) + (saatOk(d.saat) ? ', ' + d.saat : '') : ''; return '<div class="rw" data-dt="du:' + i + '"><div class="a"><b>' + esc(d.baslik) + (yeniMi(duyuruAnahtar(d)) ? '<i class="dot"></i>' : '') + '</b>' + (d.metin ? '<span class="s">' + esc(metinVeLink(String(d.metin)).metin.replace(/\s+/g, ' ').slice(0, 90)) + '</span>' : '') + '</div>' + (z ? '<span class="z">' + esc(z) + '</span>' : '') + '</div>'; }).join('') + '</div></div>';
    if (bl.length && CAT === 'Tümü') h += '<div class="sec">' + secH('Belirli gün ve haftalar') + '<div class="rows">' + bl.map(function (x) { return dtSatir('gun:' + x.bas, '', String(x.ad), aralik(x.bas, x.bit || x.bas), ''); }).join('') + '</div></div>';
    if (hab.length) h += '<div class="sec">' + secH('Haberler') + '<div class="rows">' + hab.map(function (n) {
      var g = n.url ? guvenliLink(n.url) : null, o = g ? '<a class="nw" href="' + esc(g.href) + '" target="_blank" rel="noopener noreferrer">' : '<div class="nw" style="display:block" data-dt="hb:' + haberListe(C.y).indexOf(n) + '">';
      return o + '<p class="' + ((n.kat || '') === 'Eğitim' ? 'e' : '') + '">' + esc(n.kat || 'Bilgi') + '</p><div>' + esc(n.baslik) + (yeniMi(haberAnahtar(n)) ? '<i class="dot"></i>' : '') + '</div>' + (n.metin ? '<span class="s">' + esc(n.metin) + '</span>' : '') + '<footer><span>' + (n.bitis ? 'Son gün ' + esc(gunAyK(n.bitis)) : '') + '</span>' + (g ? '<em>' + esc(g.alan) + '</em>' + EXT : '') + '</footer>' + (g ? '</a>' : '</div>');
    }).join('') + '</div></div>';
    if (bag.length) h += '<div class="sec">' + secH('Sık kullanılan bağlantılar') + '<div class="lg2">' + bag.map(function (b) { return '<a href="' + esc(b.g.href) + '" target="_blank" rel="noopener noreferrer"><b>' + esc(b.ad) + '</b><span>' + esc(b.g.alan) + '</span></a>'; }).join('') + '</div></div>';
    return h || '<div class="empty ei-pano"><b>Pano boş</b>Okul yönetimi duyuru, haber ya da bağlantı eklediğinde burada görünür.</div>';
  }

  // ---- Üst alan
  function ilkHarfler(ad) { var p = String(ad || '').trim().split(/\s+/).filter(Boolean); return ((p[0] || '').charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : '')).toLocaleUpperCase('tr-TR'); }
  function topHTML(C) {
    var y = C.y;
    if (TAB === 0) return logoBar(C, 'Öğretmen ekranı') + (yayinKapali(C) ? '' : hero(C, 0)) + (yayinKapali(C) ? selamHTML(C) : '');
    if (TAB === 1) {
      if (dersiz(y) && PS === 1) PS = 0; if (dersiz(y) && nobetsiz(y) && PS === 2) PS = 0;
      var ad = (y && y.kisi && y.kisi.ad) || '', kim = kisisel(y, 'kimlik'), p = programVar(y), sayi = 0;
      if (p) for (var wd = 1; wd <= 5; wd++) sayi += Object.keys(p.matris[String(wd)] || {}).filter(function (no) { return hucre(p.matris[String(wd)][no]); }).length;
      var alt = [(kim && kim.brans) || '', p && sayi ? sayi + ' ders' : ''].filter(Boolean).join(', ');
      var simdiTxt = (PS === 0 && !yayinKapali(C)) ? hero(C, 1) : '';
      return logoBar(C, 'Programım') + '<div class="who"><div class="av">' + esc(ilkHarfler(ad)) + '</div><div><b class="d" style="font-size:19px">' + esc(ad) + '</b><span>' + esc(alt) + '</span></div><span style="font-size:12px;color:rgba(255,255,255,.6)">Bu cihaza bağlı</span></div><div class="ptabs" id="pt">' + ['Bugün', 'Program', 'Nöbet', 'Notlarım'].map(function (x, i) { return [x, i]; }).filter(function (t) { return !(dersiz(y) && (t[1] === 1 || (t[1] === 2 && nobetsiz(y)))); }).map(function (t) { return '<button type="button" data-p="' + t[1] + '"' + (PS === t[1] ? ' class="on"' : '') + '>' + t[0] + '</button>'; }).join('') + '</div>' + simdiTxt;
    }
    if (TAB === 4) {
      var ad4 = (y && y.kisi && y.kisi.ad) || '', kim4 = kisisel(y, 'kimlik'), gv4 = kurulListe(y, C.gb.ds).length > 0 && !yayinKapali(C);
      var okO = !!okulVeri(y);
      if ((PR === 2 || PR === 3) && !okO) PR = gv4 ? 0 : 1;
      if (PR === 4 && !subeVeri(y)) PR = gv4 ? 0 : 1;
      if (!gv4 && PR === 0) PR = 1;
      return logoBar(C, 'Profil') + '<div class="who"><div class="av">' + esc(ilkHarfler(ad4)) + '</div><div><b class="d" style="font-size:19px">' + esc(ad4) + '</b><span>' + esc((kim4 && kim4.brans) || '') + '</span></div></div>'
        + '<div class="ptabs" id="pf">' + [['Görevlerim', 0], ['Ayarlar', 1]].filter(function (x) { return x[1] === 1 || gv4; }).map(function (x) { return '<button type="button" data-p="' + x[1] + '"' + (PR === x[1] ? ' class="on"' : '') + '>' + x[0] + '</button>'; }).join('') + '</div>';
    }
    if (TAB === 3) {
      var cats = ['Tümü']; haberListe(y).forEach(function (h) { var k = h.kat || 'Bilgi'; if (cats.indexOf(k) < 0) cats.push(k); });
      return logoBar(C, 'Öğretmen ekranı') + '<div class="tz d">Pano</div><div class="tzs">Duyurular, belirli günler, haberler ve bağlantılar</div>' + (cats.length > 2 ? '<div class="chips" id="ch">' + cats.map(function (c) { return '<button type="button"' + (CAT === c ? ' class="on"' : '') + '>' + esc(c) + '</button>'; }).join('') + '</div>' : '');
    }
    var cvh = '<div class="tabs" id="cv">' + [['0', 'Hafta'], ['1', 'Ay'], ['2', 'Geçmiş']].map(function (x) { return '<button type="button" data-cv="' + x[0] + '"' + (CV === +x[0] ? ' class="on"' : '') + '>' + x[1] + '</button>'; }).join('') + '</div>';
    if (CV === 1) {
      var mb = new Date(C.d.getFullYear(), C.d.getMonth() + MO, 1);
      return logoBar(C, 'Öğretmen ekranı') + '<div class="tz d">Takvim</div>' + cvh + '<div class="mn"><button type="button" data-mo="-1" aria-label="Önceki ay">' + IK_ONC + '</button><div class="mm"><b class="d">' + AY[mb.getMonth()] + ' ' + mb.getFullYear() + '</b>' + (MO ? '<button type="button" class="bg" data-mo="0">Bugün</button>' : '') + '</div><button type="button" data-mo="1" aria-label="Sonraki ay">' + IK_SON + '</button></div>';
    }
    if (CV === 2) return logoBar(C, 'Öğretmen ekranı') + '<div class="tz d">Takvim</div>' + cvh;
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
  const SK_KEYS=[[-18,'#050a1c','#0b1534','#1c2a5e'],[-10,'#0e1a40','#1a3560','#3a7384'],[-5,'#1c3068','#46709a','#8cc0c4'],[-1,'#2d4088','#8a84b6','#e9bd98'],[2,'#3a5aa6','#a9a6cc','#f3d0a0'],[7,'#4472b8','#b9c0da','#f6e0a8'],[18,'#2f6fba','#7fb2e5','#ffe6a8'],[90,'#2a68b4','#86bbea','#fff0c0']];
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
    const q=(s)=>root.querySelector(s); const set=(s,t)=>{ const n=q(s); if(n && n.textContent!==t) n.textContent=t; }; const sa=(n,k,v)=>{ v=String(v); if(n.getAttribute(k)!==v) n.setAttribute(k,v); };
    const sk=q('.sk'); if(!sk) return;
    sk.classList.toggle('sk-ink', !!v.ink);
    q('.sk-bg').style.background='radial-gradient(ellipse 52% 120% at '+v.sunX.toFixed(1)+'% '+Math.min(130,v.sunY).toFixed(1)+'%, '+v.glow+(v.e>-4?'dd':'66')+' 0%, transparent 70%), linear-gradient(180deg,'+v.top+' 0%,'+v.hor+' 100%)';
    q('.sk-stars').style.opacity=v.starOp.toFixed(2);
    q('.sk-clouds').style.opacity=(v.e>-6?0.5:0.18); q('.sk-clouds').style.setProperty('--cc', v.e>0?'#fff':'#9fb0d8');
    sa(q('.sk-arc'),'d', v.arc);
    const hz=q('.sk-hz'); sa(hz,'x1',(v.ax0-2).toFixed(1)); sa(hz,'x2',(v.ax1+2).toFixed(1));
    const sun=q('.sk-sun'); sun.style.display=v.sunOn?'block':'none'; sun.style.left=v.sunX.toFixed(2)+'%'; sun.style.top=v.sunY.toFixed(2)+'%';
    sun.style.setProperty('--gl', v.glow); sun.style.setProperty('--g1', skRgba(v.glow,.28)); sun.style.setProperty('--g2', skRgba(v.glow,.17)); sun.style.setProperty('--core', v.e>6?'#fff2b8':'#ffd27a');
    const mo=q('.sk-moon'); mo.style.opacity=v.moonOp.toFixed(2); mo.style.display=v.moonOp>0.01?'block':'none'; mo.style.left=v.moonX.toFixed(2)+'%'; mo.style.top=v.moonY.toFixed(2)+'%';
    sa(q('.sk-mp'),'d', skMoonPath(v.moon));
    set('.sk-tag', v.tag); set('.sk-g', v.g); set('.sk-s', v.sub); set('.sk-t', v.time); set('.sk-d', v.date);
    const inf=v.info.split('|'); set('.sk-inf .i1 em', inf[0]); set('.sk-inf .i2 em', inf[1]); set('.sk-inf .i3', 'Gün '+inf[2]);
  }



  // ================= ÇİZİM =================
  var CTX = null, seenTimer = null;
  function gorunurMu(C) { return !yayinKapali(C); }
  // ---- 0.14.1: Ayarlar'dayken geri tuşu uygulamadan çıkarmaz, geldiğin ekrana döner (yalnız Ayarlar)
  var AYG = { da: false, onc: { t: 0, ps: 0, pr: 0 }, son: { t: 0, ps: 0, pr: 0 } };
  function aygGecis() {
    var ayDa = (TAB === 4 && PR === 1);
    if (ayDa && !AYG.da) {
      AYG.da = true; AYG.onc = { t: AYG.son.t, ps: AYG.son.ps, pr: AYG.son.pr };
      try { history.pushState({ ay: 1 }, ''); } catch (e) {}
    } else if (!ayDa && AYG.da) {
      AYG.da = false;
      try { if (history.state && history.state.ay) history.back(); } catch (e2) {}
    }
    if (!ayDa) AYG.son = { t: TAB, ps: PS, pr: PR };
  }
  window.addEventListener('popstate', function () {
    if (DT.acik || !AYG.da) return;
    AYG.da = false; TAB = AYG.onc.t; PS = AYG.onc.ps; PR = AYG.onc.pr; WK = 0;
    var sc = $('scr'); if (sc) sc.scrollTop = 0; render();
  });
  function render() {
    if (kilit) return;
    var C = baglam(); CTX = C;
    var gor = gorunurMu(C), nvw = $('nvw'), nvp = $('nvp');
    nvw.style.display = gor ? '' : 'none';
    nvp.style.display = (gor && (haberListe(C.y).length || baglantiListe(C.y).length || duyuruListe(C.y).length || belirliListe(C.y).length)) ? '' : 'none';
    if ((TAB === 2 && nvw.style.display === 'none') || (TAB === 3 && nvp.style.display === 'none')) TAB = 0;
    aygGecis();
    [].forEach.call(document.querySelectorAll('nav button'), function (b) { b.classList.toggle('on', +b.getAttribute('data-t') === TAB); });
    var top = $('top'), hh = topHTML(C); top.innerHTML = hh; top.dataset.h = hh; top.dataset.kk = hh.replace(/\d+/g, '#');
    ['t0', 't1', 't2', 't3', 't4'].forEach(function (id, i) { $(id).hidden = i !== TAB; });
    if (TAB === 0) { $('t0').innerHTML = t0HTML(C); uygulaGizle(); }
    else if (TAB === 1) $('t1').innerHTML = t1HTML(C);
    else if (TAB === 2) $('t2').innerHTML = t2HTML(C);
    else if (TAB === 4) $('t4').innerHTML = t4HTML(C);
    else $('t3').innerHTML = t3HTML(C);
    bolgeRenk();
    if (TAB === 4) okFiltre();
    ipucuKontrol();
    $('scr').dataset.tab = TAB;
    yaz(K.son, JSON.stringify([TAB, PS]));
    tick(true);
    var gs = document.getElementById('gs'); if (gs && TAB === 0) { var nk = gs.querySelector('.gk.now') || gs.querySelector('.gk:not(.past)'); if (nk) gs.scrollLeft = Math.max(0, nk.offsetLeft - (gs.clientWidth - nk.offsetWidth) / 2); }
    if (seenTimer) clearTimeout(seenTimer);
    seenTimer = setTimeout(function () {
      if (document.hidden || kilit || !CTX || !CTX.y || yayinKapali(CTX)) return;
      if (TAB === 0) gorulduYaz(duyuruListe(CTX.y).map(duyuruAnahtar).concat(haberListe(CTX.y).map(haberAnahtar)));
      else if (TAB === 3) gorulduYaz(haberListe(CTX.y).map(haberAnahtar).concat(duyuruListe(CTX.y).map(duyuruAnahtar)));
    }, 5000);
  }
  var BR = { gunum: 'var(--c-gunum)', yarin: 'var(--c-yarin)', yaklasan: 'var(--c-yaklasan)', neler: 'var(--c-neler)', nobet: 'var(--c-nobet)', pano: 'var(--c-pano)', not: 'var(--c-not)' };
  function bolgeAdi(e) {
    var t = (e.textContent || '').slice(0, 48).toLocaleLowerCase('tr'), k = e.getAttribute('data-k');
    if (k === 'dolt') return 'nobet';
    if (t.indexOf('okuldan duyurular') === 0) return 'neler';
    if (t.indexOf('belirli gün') === 0) return 'yaklasan';
    if (t.indexOf('haberler') === 0) return 'pano';
    if (t.indexOf('sık kullanılan') === 0) return 'not';
    if (t.indexOf('derslerim') === 0) return 'yarin';
    if (t.indexOf('günüm') === 0) { var on = document.querySelector('#gv button.on'); return on && on.getAttribute('data-v') !== 'b' ? 'yarin' : 'gunum'; }
    if (k === 'akis' || k === 'cov' || t.indexOf('ders doldurma') === 0 || t.indexOf('bugünkü program') === 0 || t.indexOf('gün akışı') === 0) return 'gunum';
    if (t.indexOf('yaklaşan') === 0 || t.indexOf('kayıtları') > 0) return 'yaklasan';
    if (t.indexOf('okulda neler') === 0) return 'neler';
    if (t.indexOf('nöbet') >= 0 || t.indexOf('yeni nöbet') === 0) return 'nobet';
    if (t.indexOf('notların') === 0 || t.indexOf('hatırlatma') >= 0) return 'not';
    return 'pano';
  }
  function kartla() {
    ['t0', 't1', 't2', 't3'].forEach(function (id) {
      var el = $(id); if (!el) return;
      [].forEach.call(el.children, function (e) {
        if (!e.classList.contains('sec') || !e.hasAttribute('data-r') && !e.firstElementChild) return;
        if (e.firstElementChild && e.firstElementChild.classList.contains('kart')) return;
        var k = document.createElement('div'); k.className = 'kart'; while (e.firstChild) k.appendChild(e.firstChild); e.appendChild(k);
      });
    });
  }
  function bolgeRenk() {
    kartla();
    ['t0', 't1', 't2', 't3'].forEach(function (id) {
      var el = $(id); if (!el) return;
      var l = [].filter.call(el.children, function (e) { return e.classList.contains('sec') && e.style.display !== 'none'; });
      [].forEach.call(el.children, function (e) { if (e.classList.contains('sec') && e.style.display === 'none') e.removeAttribute('data-r'); });
      var r = l.map(bolgeAdi);
      l.forEach(function (e, i) {
        e.setAttribute('data-r', r[i]); e.style.setProperty('--sc', BR[r[i]]);
        if (i > 0) e.style.setProperty('--scp', BR[r[i - 1]]); else e.style.removeProperty('--scp');
        if (i < l.length - 1) e.style.setProperty('--scn', BR[r[i + 1]]); else e.style.removeProperty('--scn');
        // 0.14.5: bandın üst ucu, üstündeki bölge cam kart (zeminsiz) ya da ilk bölge ise; alt ucu son bölge ise sayfa zeminine iner (sert yatay çizgi olmasın)
        if (i === 0 || l[i - 1].getAttribute('data-k') === 'akis') e.style.setProperty('--g0', 'var(--paper)'); else e.style.removeProperty('--g0');
        if (i === l.length - 1) e.style.setProperty('--g1', 'var(--paper)'); else e.style.removeProperty('--g1');
      });
    });
  }
  function ayrintiRenk(kod) {
    var p = String(kod).split(':'), t = p[0], r = 'pano';
    if (t === 'ak' || t === 'dn' || t === 'so') r = 'gunum';
    else if (t === 'gun') r = p[1] === iso(simdi()) ? 'gunum' : 'yarin';
    else if (t === 'nb' || t === 'nbd') r = 'nobet';
    else if (t === 'du') r = 'neler';
    else if (t === 'ol' || t === 'bg' || t === 'sv' || t === 'st') r = 'yaklasan';
    else if (t === 'eh') r = 'neler';
    else if (t === 'hs') r = 'yarin';
    var d = $('dt'); d.setAttribute('data-r', r); d.style.setProperty('--sc', BR[r]);
  }
  function uygulaGizle() { [].forEach.call(document.querySelectorAll('#t0 [data-k]'), function (e) { e.style.display = GIZLE[e.dataset.k] ? 'none' : ''; }); bolgeRenk(); }
  function kaymaDurumu() {
    var s = $('scr'); if (!s) return;
    $('mini').classList.toggle('on', TAB === 0 && !!document.querySelector('#top .hr') && s.scrollTop > 230);
  }
  // 0.14.5: her saniye yeniden çizilen parçalarda yalnız değişen öznitelik/metin yazılır (düğümler yeniden kurulmaz; titreme olmaz).
  function morf(o, n) {
    var i;
    if (o.nodeType !== n.nodeType || o.nodeName !== n.nodeName) { o.parentNode.replaceChild(n.cloneNode(true), o); return; }
    if (o.nodeType === 3 || o.nodeType === 8) { if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue; return; }
    if (o.nodeType !== 1) return;
    var oa = o.attributes, na = n.attributes;
    for (i = oa.length - 1; i >= 0; i--) if (!n.hasAttribute(oa[i].name)) o.removeAttribute(oa[i].name);
    for (i = 0; i < na.length; i++) if (o.getAttribute(na[i].name) !== na[i].value) o.setAttribute(na[i].name, na[i].value);
    morfIc(o, n);
  }
  function morfIc(o, n) {
    var oc = o.childNodes, nc = n.childNodes, i;
    if (oc.length !== nc.length) { o.innerHTML = n.innerHTML; return; }
    for (i = 0; i < oc.length; i++) morf(oc[i], nc[i]);
  }
  function yT(e, t) { if (e && e.textContent !== t) e.textContent = t; }
  function tick(zorla) {
    if (kilit || document.hidden || !CTX) return;
    var C = baglam();
    if (C.gb.ds !== CTX.gb.ds && !zorla) { render(); return; }
    CTX = C;
    okulTick(C);
    if (TAB === 0 || (TAB === 1 && PS === 0)) {
      var tp = $('top'), hh = topHTML(C), k1 = hh.replace(/-?\d+\.\d+s/g, ''), k0 = (tp.dataset.h || '').replace(/-?\d+\.\d+s/g, '');
      // Geçiş animasyonu sınıfları (fx/fxs/fxr) yalnız ilk çizimde bulunur; sonraki turda yok diye ekran yeniden çizilip animasyon yarıda kesilmesin.
      var fxSil = function (x) { return x.replace(/(class="sl(?: one)?)(?: fx(?: fx[sr])?)?"/g, '$1"'); };
      k1 = fxSil(k1); k0 = fxSil(k0);
      var b1 = skyBol(k1), b0 = skyBol(k0), skyAyni = !!$('skyc') && hh.indexOf('id="skyc"') >= 0 && b1[0] === b0[0] && b1[1] === b0[1];
      if (!skyAyni && fxSil(tp.dataset.h || '') !== fxSil(hh)) {
        var kk = hh.replace(/\d+/g, '#');
        if (tp.dataset.kk === kk && tp.querySelector('[data-lv]')) {
          var tmp = document.createElement('div'); tmp.innerHTML = hh;
          [].forEach.call(tmp.querySelectorAll('[data-lv]'), function (nd) { var o = tp.querySelector('[data-lv="' + nd.getAttribute('data-lv') + '"]'); if (o && o.innerHTML !== nd.innerHTML) morfIc(o, nd); });
        } else { tp.innerHTML = hh; tp.dataset.kk = kk; }
        tp.dataset.h = hh;
      }
    }
    var skc = $('skyc'); if (skc && typeof skApply === 'function') skApply(skc, skCompute(simdi(), true));
    var g = guncel(C), c = g[0];
    yT($('mb'), c ? f2(Math.floor((mdk(c[3]) * 60 - C.T) / 60)) + ':' + f2((mdk(c[3]) * 60 - C.T) % 60) : '');
    yT($('ms'), c ? c[1] : '');
    [].forEach.call(document.querySelectorAll('.flow'), function (el) {
      var rows = [].slice.call(el.querySelectorAll('.fr')), yy = null;
      rows.forEach(function (r) { var s = +r.dataset.s, e = +r.dataset.e; r.classList.toggle('past', C.T >= e); r.classList.toggle('now', C.T >= s && C.T < e); if (C.T >= s && C.T < e) r.setAttribute('data-k', 'kalan ' + sureTxt(e - C.T)); else r.removeAttribute('data-k'); if (C.T >= s && C.T < e) yy = r.offsetTop + (C.T - s) / (e - s) * r.offsetHeight; });
      if (yy == null && rows.length) yy = C.T < +rows[0].dataset.s ? rows[0].offsetTop : rows[rows.length - 1].offsetTop + rows[rows.length - 1].offsetHeight;
      if (yy != null) { el.querySelector('.rail i').style.height = yy + 'px'; el.querySelector('.cur').style.top = yy + 'px'; }
    });
    [].forEach.call(document.querySelectorAll('.tl2'), function (el) {
      var rows = [].slice.call(el.querySelectorAll('.cr')), im = el.querySelector('.im'), rl = el.querySelector('.rl i'), yy = null, prev = null, next = null;
      if (!rows.length || !im || !rl) return;
      rows.forEach(function (r) {
        var s0 = +r.dataset.s, e0 = +r.dataset.e, now = C.T >= s0 && C.T < e0, kk = r.querySelector('.k');
        r.classList.toggle('past', C.T >= e0); r.classList.toggle('now', now);
        if (kk) yT(kk, now ? 'kalan ' + sureTxt(e0 - C.T) : '');
        if (now && yy == null) yy = r.offsetTop + (C.T - s0) / (e0 - s0) * r.offsetHeight;
        if (C.T >= e0) prev = r; else if (C.T < s0 && !next) next = r;
      });
      if (yy == null) {
        if (!prev) yy = rows[0].offsetTop;
        else if (!next) yy = prev.offsetTop + prev.offsetHeight;
        else { var pb = prev.offsetTop + prev.offsetHeight, f = (C.T - (+prev.dataset.e)) / Math.max(1, (+next.dataset.s) - (+prev.dataset.e)); yy = pb + f * Math.max(0, next.offsetTop - pb); }
      }
      im.style.top = yy.toFixed(1) + 'px'; rl.style.height = yy.toFixed(1) + 'px';
      var lb = im.querySelector('b'); if (lb) yT(lb, f2(Math.floor(C.T / 3600)) + ':' + f2(Math.floor(C.T % 3600 / 60)));
    });
    [].forEach.call(document.querySelectorAll('[data-bg="1"] .gk, [data-bg="1"] .gx'), function (k) {
      var s0 = +k.dataset.s, e0 = +k.dataset.e, now = C.T >= s0 && C.T < e0;
      k.classList.toggle('past', C.T >= e0); k.classList.toggle('now', now);
      if (k.classList.contains('ar')) return;
      var kk = k.querySelector('.k'); if (kk) yT(kk, now ? 'kalan ' + sureTxt(e0 - C.T) : (C.T >= e0 ? 'bitti' : '')); var u = k.querySelector('.pb u'); if (u) u.style.width = now ? ((C.T - s0) / (e0 - s0) * 100).toFixed(1) + '%' : '0';
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
    [].forEach.call(document.querySelectorAll('.gzh'), hatBoyut);
    var dx = document.querySelector('.dial.kdy[data-bg="0"] .mkt');
    if (dx) { var xh = Math.floor(C.T / 3600) % 24, xm = Math.floor(C.T % 3600 / 60); dx.innerHTML = (xh < 10 ? '0' : '') + xh + '<tspan class="mkc">:</tspan>' + (xm < 10 ? '0' : '') + xm; }
    var dl = document.querySelector('.dial[data-bg="1"]');
    if (dl) {
      var nd = dl.querySelector('.nd'), a0 = +nd.dataset.a0, z0 = +nd.dataset.z0, ang = Math.max(0, Math.min(1, (C.T - a0) / (z0 - a0))) * 360;
      nd.style.display = ''; nd.setAttribute('transform', 'translate(150 150) rotate(' + ang.toFixed(2) + ')');
      var cur = null, nxt = null;
      [].forEach.call(dl.querySelectorAll('.ar'), function (a) { var s0 = +a.dataset.s, e0 = +a.dataset.e; a.classList.toggle('past', C.T >= e0); a.classList.toggle('now', C.T >= s0 && C.T < e0); [].forEach.call(dl.querySelectorAll('[data-i="' + a.getAttribute('data-i') + '"]:not(.ar)'), function (t) { t.classList.toggle('pt', C.T >= e0); t.classList.toggle('nw', C.T >= s0 && C.T < e0); }); if (C.T >= s0 && C.T < e0) cur = a; else if (C.T < s0 && !nxt) nxt = a; });
      var dk = dl.querySelector('.dk'), dn = dl.querySelector('.dn'), dd = dl.querySelector('.dd');
      if (cur) { dk.textContent = 'Şu an'; dn.textContent = cur.dataset.no + '. ders'; dd.textContent = (cur.dataset.c ? cur.dataset.c + ' · ' : '') + 'kalan ' + sureTxt(+cur.dataset.e - C.T); }
      else if (nxt) { var onc = C.T < a0; dk.textContent = onc ? 'Ders başlamadan' : 'Teneffüs'; dn.textContent = sureTxt(+nxt.dataset.s - C.T); dd.textContent = (onc ? '1. ders ' : 'Sıradaki ' + nxt.dataset.no + '. ders · ') + (onc ? nxt.dataset.t.slice(0, 5) : nxt.dataset.t.slice(0, 5)) + (nxt.dataset.c ? ' · ' + nxt.dataset.c : ''); }
      else { dk.textContent = 'Bugün'; dn.textContent = 'Bitti'; dd.textContent = ''; }
      var l2 = dl.querySelector('.mkl2'), bp = dl.querySelector('.mkbp'), mw = dl.querySelector('.mkw'), mt = dl.querySelector('.mkt'), fr2 = 0, t2 = '', hal2 = 'b', ks = -1;
      if (cur) { ks = +cur.dataset.e - C.T; hal2 = 'd'; fr2 = (C.T - (+cur.dataset.s)) / ((+cur.dataset.e) - (+cur.dataset.s)); }
      else if (nxt && C.T >= a0) { var arc = [].slice.call(dl.querySelectorAll('.ar')), ix = arc.indexOf(nxt), pe = ix > 0 ? +arc[ix - 1].dataset.e : a0; ks = +nxt.dataset.s - C.T; hal2 = 't'; fr2 = (C.T - pe) / Math.max(1, (+nxt.dataset.s) - pe); }
      else if (nxt) { ks = +nxt.dataset.s - C.T; hal2 = 'b'; }
      else { hal2 = 'k'; fr2 = 1; }
      if (ks >= 0) { ks = Math.ceil(ks); var kh = Math.floor(ks / 3600), km = Math.floor(ks % 3600 / 60), kss = ks % 60; t2 = (kh ? kh + ':' + (km < 10 ? '0' : '') + km : (km < 10 ? '0' : '') + km) + ':' + (kss < 10 ? '0' : '') + kss; }
      if (l2) l2.textContent = t2; if (bp) bp.setAttribute('width', (52 * Math.max(0, Math.min(1, fr2))).toFixed(1)); if (mw) mw.setAttribute('class', 'mkw ' + hal2); nd.classList.toggle('sol', hal2 === 'b' || hal2 === 'k');
      if (mt) { var hh = Math.floor(C.T / 3600) % 24, mm = Math.floor(C.T % 3600 / 60); mt.innerHTML = (hh < 10 ? '0' : '') + hh + '<tspan class="mkc">:</tspan>' + (mm < 10 ? '0' : '') + mm; }
      var pg = dl.querySelector('.apg');
      if (pg) { if (cur) { var g0 = +cur.dataset.g0, g1 = +cur.dataset.g1, fr = (C.T - (+cur.dataset.s)) / ((+cur.dataset.e) - (+cur.dataset.s)); pg.setAttribute('d', kdSek(g0, g0 + (g1 - g0) * Math.max(0, Math.min(1, fr)), KD.R + KD.W / 2 + 2, KD.R + KD.W / 2 + 6)); pg.style.display = ''; } else pg.style.display = 'none'; }
    }
    [].forEach.call(document.querySelectorAll('.gzr[data-bg="1"]'), function (rt) { gzGuncelle(rt, C); });
    nxGuncelle(C);
    cetvelHizala();
    kaymaDurumu();
  }
  // Sayaç kartı cetvelinin saat etiketi imleçle birlikte kayar; başta/sonda kartın dışına taşmasın diye cetvel genişliği içinde tutulur.
  function cetvelHizala() {
    [].forEach.call(document.querySelectorAll('.rule em'), function (em) {
      var r = em.parentNode, W = r ? r.clientWidth : 0; if (!W) return;
      var cs = window.getComputedStyle(em, '::after'), w = parseFloat(cs.width) || 0, x = em.offsetLeft, sh = 0;
      if (cs.boxSizing !== 'border-box') w += (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
      if (x - w / 2 < 0) sh = w / 2 - x; else if (x + w / 2 > W) sh = W - x - w / 2;
      em.style.setProperty('--sh', sh.toFixed(1) + 'px');
    });
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
    if (t.closest('[data-gvay]')) { gvAyarAc(); return; }
    if (t.closest('[data-tut]')) { tutAc(); return; }
    if (t.closest('[data-gvtm]')) { TAB = 0; PS = 0; PR = 0; WK = 0; $('scr').scrollTop = 0; render(); setTimeout(function () { var e = document.querySelector('[data-k=akis]'); if (e && e.scrollIntoView) e.scrollIntoView(true); }, 60); return; }
    if (t.closest('#tb')) { temaDegis(); return; }
    if (t.closest('#ob')) { cekAc(); return; }
    if (t.closest('#cov')) { cekKapat(); return; }
    if ((b = t.closest('[data-cg]'))) { var cg = b.getAttribute('data-cg').split(','); cekKapat(); TAB = +cg[0]; PS = TAB === 1 ? +cg[1] : 0; PR = TAB === 4 ? +cg[1] : 0; OK.s = -1; OK.o = -1; OK.q = ''; OK.bh = 0; SO.s = -1; if (cg[2] === 'hesap') AYOP.hes = true; WK = 0; $('scr').scrollTop = 0; render(); return; }
    if ((b = t.closest('#pf button'))) { PR = +b.dataset.p; SO.s = -1; OK.s = -1; OK.o = -1; OK.q = ''; OK.bh = 0; render(); return; }
    if ((b = t.closest('[data-oc]'))) { okHucreAc(b.getAttribute('data-oc')); return; }
    if ((b = t.closest('[data-go^="s:"],[data-go^="o:"]'))) { okGit(b.getAttribute('data-go')); return; }
    if (t.closest('[data-ogit]')) { okSimdiyeGit(); return; }
    if ((b = t.closest('[data-pay]'))) { payHazirla(b.getAttribute('data-pay')); return; }
    if (t.closest('#paygo')) { payGonder(); return; }
    if (t.closest('#paysave')) { payKaydet(); return; }
    if (t.closest('#ipuok')) { ipucuKapat(); return; }
    if ((b = t.closest('[data-sbo]'))) { var sv = b.getAttribute('data-sbo'); SO.s = sv === 'b' ? -1 : +sv; $('scr').scrollTop = 0; render(); return; }
    if ((b = t.closest('[data-ok]'))) { okulTikla(b); return; }
    if ((b = t.closest('[data-gck]'))) { var gk = b.getAttribute('data-gck'); GAC[gk] = !GAC[gk]; var gp = b.parentElement; gp.classList.toggle('open', !!GAC[gk]); b.setAttribute('aria-expanded', !!GAC[gk]); return; }
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
    if ((b = t.closest('[data-hafta]'))) { WK = +b.dataset.hafta; $('scr').scrollTop = 0; render(); return; }
    if ((b = t.closest('#t1 [data-c]'))) { dtHucre(b.dataset.c); return; }
    if ((b = t.closest('#t1 [data-n]'))) { notAc(null, b.dataset.n); return; }
    if (t.closest('#addn')) { notAc(null, null, 1); return; }
    if (t.closest('#bk')) { yedekPaylas('bkm'); return; }
    if (t.closest('#nall')) { tumNotlariGonder(); return; }
    if (t.closest('#vgit')) { AYOP.ver = true; ayarAc(); return; }
    if (t.closest('#shd')) { kapat(); return; }
  });
  $('scr').addEventListener('scroll', kaymaDurumu, { passive: true });
  document.addEventListener('scroll', function (e) { var p = e.target; if (p && p.id === 'pano') { var i = Math.round(p.scrollLeft / (p.firstElementChild ? p.firstElementChild.offsetWidth : 1)); [].forEach.call(document.querySelectorAll('#seg i'), function (d, j) { d.classList.toggle('on', j === i); }); } }, true);

  // ---- sekmeler arası kaydırma
  (function () {
    var x0 = 0, y0 = 0, t0 = 0, ok = false, sc = $('scr');
    sc.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; t0 = Date.now(); ok = !e.target.closest('.pano,.chips,input,textarea,.sh,.lock,.tt,.hcar,.gstrip,.ystrip,.mg'); }, { passive: true });
    sc.addEventListener('touchend', function (e) {
      if (!ok) return; var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0;
      if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.6 || Date.now() - t0 > 700 || TAB === 4) return;
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
    if (t === 'hf') return dtHafta();
    if (t === 'du') return dtDuyuru(+p[1]);
    if (t === 'hb') return dtHaber(+p[1]);
    if (t === 'bg') return dtBelirli();
    if (t === 'ol') return dtOlay(+p[1]);
    if (t === 'sv') return dtSinavlar();
    if (t === 'eh') return dtEgitimYili();
    if (t === 'st') return dtTatil(p[1]);
    if (t === 'hs') return dtHaftaSonu();
    if (t === 'dr') return dtDers(+p[1]);
    if (t === 'dl') return dtDersListe(p[1]);
    if (t === 'kv') return dtKurul(+p[1]);
    if (t === 'so') return dtSubeOgr(decodeURIComponent(p[1]), decodeURIComponent(p[2]));
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
    return { a: a, s: g, f: (g === 6 && (a === 'ahlk' || a === 'afet')) ? a + '2.json' : (KZ_DOSYA[a] || (a + g + '.json')), yedekAd: true };
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
      if (pl.not) { KZ_TANI.dosya = 'kazanim/' + pl.f + ' henüz yok (not)'; kzNot(ds, pl.not); return; }
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
    var h = '<div class="dbig d">' + esc(r[2]) + ' – ' + esc(r[3]) + '</div><div class="dsub">' + esc(GUN[d.getDay()] + ', ' + gunAy(ds)) + (du ? ' · ' + esc(du) : '') + '</div>' + (cv ? '<div class="chp" style="margin-top:12px"><span class="cvlbl2">Ders doldurma</span></div>' : '') + '<div class="kvs">';
    if (les) {
      if (my) h += kvH('Sınıf', my.sinif) + (my.ders ? kvH('Ders', my.ders) : '');
      if (cv) { var cy = cvYerine(G.y, ds, no, cv); if (cv.sinif) h += kvH('Sınıf', cv.sinif); h += kvH((cy ? cy + ' yerine' : 'Gelmeyen öğretmen yerine'), 'sen'); }
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
    if (my) h += subeOgrBolumu(G.y ? { y: G.y, ben: norm(G.y.kisi && G.y.kisi.ad) } : {}, my.sinif);
    if (my && kzEsle(my)) h += '<div class="kzw" id="kzw" data-ds="' + ds + '"><div class="kzn">Kazanımlar yükleniyor…</div></div>';
    dtGoster(les ? r[1] : r[1], h);
    if (my && kzEsle(my)) kzDoldur(my, ds);
  }
  function dtGun(ds) {
    var d = tarihCoz(ds), G = gunBaglam(d), y = G.y, gb = G.gb, bugun = ds === iso(simdi());
    var h = '';
    if (gb.tip === 'hs') h += '<div class="empty" style="margin-top:6px"><b>Hafta sonu</b>Ders yok.</div>';
    else if (gb.tip === 'tatil') h += '<div class="empty" style="margin-top:6px"><b>Okul tatil</b>' + esc(gb.ad || '') + '</div>';
    else if (gb.tip === 'yok') h += '<div class="empty" style="margin-top:6px"><b>Ders saatleri henüz yayımlanmadı</b></div>';
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
    var C = CTX || baglam(), nb = { liste: nobetListe(C.y, C.gb.ds) }; if (!nb.liste[i]) return;
    var k = nb.liste[i];
    var h = '<div class="dbig d">' + esc(k.yer || '') + '</div><div class="dsub">' + esc(k.ad) + (C.ben && norm(k.ad) === C.ben ? ' · sen' : '') + '</div><div class="sec" style="margin-top:22px">' + secH('Bugün nöbetçi', nb.liste.length + ' kişi') + '<div class="rows">';
    nb.liste.forEach(function (x, j) { h += dtSatir('nb:' + j, '', x.ad, '', x.yer || '', (j === i ? 'sel' : '')); });
    dtGoster('Nöbetçi', h + '</div></div>');
  }
  function dtKurul(i) {
    var C = CTX || baglam(), k = kurulListe(C.y, C.gb.ds)[i]; if (!k) return;
    var ben = C.ben, u = Array.isArray(k.uyeler) ? k.uyeler.slice(0, 60) : [], gad = '';
    GKAT.forEach(function (g) { if (g[0] === k.kat) gad = g[1]; });
    var h = '<div class="dbig d">' + esc(k.ad) + '</div><div class="dsub">' + esc(gad) + ' · Görevin: ' + esc(k.gorev || 'Üye') + (k.bas ? ' · ' + esc(aralik(k.bas, k.bit || k.bas)) : '') + '</div><div class="rows">';
    u.forEach(function (x) {
      if (!x || !x.ad) return;
      var sen = !x.dis && ben && norm(x.ad) === ben;
      h += '<div class="rw"><div class="a"><b>' + esc(x.ad) + (sen ? ' (sen)' : '') + '</b></div><span class="z">' + esc(x.gorev || 'Üye') + '</span></div>';
    });
    h += '</div>';
    dtGoster(gad || 'Görev', h);
  }
  function dtNbd() { var C = CTX || baglam(); dtGoster('Nöbet düzenin', nobetSekmesi(C)); }
  function dtDers(i) {
    var C = CTX || baglam(), g = dersGruplari(C.y)[i]; if (!g) return;
    var y = C.y, sl = g.slots.slice().sort(function (a, b) { return a.wd - b.wd || a.no - b.no; }), ilk = null;
    var h = '<div class="dbig d">' + esc(g.sinif) + '</div><div class="dsub">' + esc(g.tam) + ' · haftada ' + sl.length + ' saat</div><div class="rows">';
    sl.forEach(function (x) {
      var ds = sonrakiGun(x.wd), G = gunBilgi(y, tarihCoz(ds)), r = G.ders && G.ders[x.no - 1]; if (!ilk) ilk = ds;
      h += dtSatir('dn:' + ds + ':' + x.no, GKISA[x.wd % 7], GUN[x.wd % 7] + ', ' + x.no + '. ders', r ? r[1] + ' – ' + r[2] : '', '');
    });
    h += '</div>';
    var my = { sinif: g.sinif, ders: g.ders };
    h += subeOgrBolumu(C, g.sinif);
    if (kzEsle(my)) h += '<div class="kzw" id="kzw" data-ds="' + ilk + '"><div class="kzn">Kazanımlar yükleniyor…</div></div>';
    dtGoster('Ders', h);
    if (kzEsle(my)) kzDoldur(my, ilk);
  }
  function dtDersListe(k) {
    var C = CTX || baglam(), l = dersGruplari(C.y).filter(function (x) { return kzAd(x.tam) === k; }); if (!l.length) return;
    dtGoster(l[0].tam, '<div class="dsub">' + l.length + ' şube · haftada ' + l.reduce(function (a, x) { return a + x.slots.length; }, 0) + ' saat</div><div class="rows">' + l.map(function (x) { return dtSatir('dr:' + x.i, '', x.sinif, 'haftada ' + x.slots.length + ' saat', ''); }).join('') + '</div>');
  }
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

  // ================= ÇEKMECE (sol üstteki isim) =================
  function cekHTML(C) {
    var y = C.y, ad = (y && y.kisi && y.kisi.ad) || '', kim = kisisel(y, 'kimlik'), dz = dersiz(y), ns = nobetsiz(y), gv = kurulListe(y, C.gb.ds).length > 0 && !yayinKapali(C);
    var gor = gorunurMu(C), pano = $('nvp').style.display !== 'none';
    var IK = {
      ana: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>', bug: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
      prg: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 4v3M16 4v3M8 13h2M12 13h2M8 17h2"/>', nob: '<path d="M12 3l8 3v6c0 4.5-3.2 7.8-8 9-4.8-1.2-8-4.5-8-9V6z"/>',
      tak: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>', pan: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>',
      gor: '<path d="M9 11l2 2 4-4"/><rect x="4" y="4" width="16" height="17" rx="2"/>', not: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>',
      ayr: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
      tut: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h4"/>',
      hes: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.4 3.6-5 7-5s6.2 1.6 7 5"/>',
      sub: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c.6-3.2 3-4.8 6-4.8s5.4 1.6 6 4.8M15.5 15.5c2.6-.3 4.6 1.1 5.5 4"/>'
    };
    function it(ik, et, t, p, ok, ek) { if (ok === false) return ''; var on = (TAB === t && (t === 1 ? PS === p : t === 4 ? PR === p : true)) && !ek; return '<button type="button" data-cg="' + t + ',' + p + (ek ? ',' + ek : '') + '"' + (on ? ' class="on"' : '') + '><svg viewBox="0 0 24 24">' + IK[ik] + '</svg>' + et + '</button>'; }
    var gun = it('ana', 'Ana ekran', 0, 0) + it('bug', dz ? 'Okulun bugünü' : 'Bugünkü derslerim', 1, 0) + it('prg', 'Programım', 1, 1, !dz) + it('nob', 'Nöbetlerim', 1, 2, !ns) + it('tak', 'Takvim', 2, 0, gor) + it('pan', 'Pano', 3, 0, gor && pano);
    var okOk = !!okulVeri(y);
    var kis = it('gor', 'Görevlerim', 4, 0, gv) + it('not', 'Notlarım', 1, 3);
    var tutBtn = '<button type="button" data-tut="1"><svg viewBox="0 0 24 24">' + IK.tut + '</svg>Tutanak</button>';
    var okl = '<div class="cgr">OKUL</div>' + (okOk ? it('prg', 'Şube programları', 4, 2) + it('hes', 'Öğretmenler', 4, 3) : '') + it('sub', 'Şube öğretmenleri', 4, 4, !!subeVeri(y)) + tutBtn;
    return '<div class="cpr"><div class="av">' + esc(ilkHarfler(ad)) + '</div><b>' + esc(ad || 'Öğretmen') + '</b><span>' + esc((kim && kim.brans) || (y && y.okul) || '') + '</span></div>'
      + '<div class="clst"><div class="cgr">GÜNLÜK</div>' + gun + '<div class="cgr">KİŞİSEL</div>' + kis + okl + '<div class="cbt">' + it('ayr', 'Ayarlar', 4, 1) + it('hes', 'Hesap', 4, 1, true, 'hesap') + '</div></div>';
  }
  // ---- Tutanak: öğretmenin kendi kodlu bağlantısını ayrı sayfada açar (kod panelden yayımlanır; yoksa açılmaz) ----
  function tutBildir(m) {
    var e = $('tutm');
    if (!e) { e = document.createElement('div'); e.id = 'tutm'; e.setAttribute('role', 'status'); e.setAttribute('aria-live', 'polite'); document.body.appendChild(e); }
    e.textContent = m; e.className = 'on';
    if (e._t) clearTimeout(e._t);
    e._t = setTimeout(function () { e.className = ''; }, 5000);
  }
  function tutLink(y) {
    var d = kisisel(y, 'tutanak'), kod = d && String(d.kod || '').replace(/^\s+|\s+$/g, '');
    if (!kod || kod.length > 40 || /[\s<>"']/.test(kod)) return null;
    var g = guvenliLink(d.url); if (!g) return null;
    var b = g.href.split('#')[0];
    return b + (b.indexOf('?') < 0 ? '?' : '&') + 'k=' + encodeURIComponent(kod);
  }
  function tutAc() {
    cekKapat();
    var u = tutLink((CTX || baglam()).y);
    if (!u) { tutBildir('Tutanak kodun henüz tanımlı değil. Okul yönetimine başvur.'); return; }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { tutBildir('Tutanak sayfası için internet bağlantısı gerekir.'); return; }
    var w = null;
    try { w = window.open(u, '_blank'); } catch (e) {}
    if (w) { try { w.opener = null; } catch (e2) {} } else { tutBildir('Sayfa açılamadı. Açılır pencere engelini kontrol et.'); }
  }
  function cekAc() { ipucuKapat(); var C = CTX || baglam(); $('cek').innerHTML = cekHTML(C); $('cek').classList.add('on'); $('cov').classList.add('on'); }
  function cekKapat() { $('cek').classList.remove('on'); $('cov').classList.remove('on'); }
  (function () {
    var x0 = 0, y0 = 0, ce = $('cek');
    ce.addEventListener('touchstart', function (e) { var t = e.changedTouches[0]; x0 = t.clientX; y0 = t.clientY; }, { passive: true });
    ce.addEventListener('touchend', function (e) { var t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; if (dx < -50 && Math.abs(dx) > Math.abs(dy) * 1.5) cekKapat(); }, { passive: true });
  })();

  // ================= AYARLAR =================
  var TOG = [['pano', 'Slaytta yarın ve belirli günler'], ['notes', 'Okulda neler var'], ['yk', 'Yaklaşanlar'], ['board', 'Panoda yeni'], ['nobet', 'Nöbetçiler'], ['dolt', 'Bugün ders doldurma listesi'], ['akis', 'Günüm']];
  function secenek(id, deger, liste) { return '<div class="opts" id="' + id + '">' + liste.map(function (x) { return '<button type="button" data-v="' + esc(x[0]) + '"' + (deger === x[0] ? ' class="on"' : '') + '>' + esc(x[1]) + '</button>'; }).join('') + '</div>'; }

  var GVO = [['a', 'Izgara', '<span class="th tha"><i></i><i></i><i class="on"></i><i></i><i></i><i></i><i></i><i></i></span>'], ['b', 'Liste', '<span class="th thb"><i></i><i></i><i class="on"></i><i></i><i></i></span>'], ['v', 'Akış', '<span class="th thv"><i></i><i></i><i class="on"></i><i></i></span>'], ['d', 'Kadran', '<span class="th thd"><svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="14" class="g0"/><path d="M20 6a14 14 0 0 1 12.1 7" class="g1"/><path d="M33 16a14 14 0 0 1 0 8" class="g1"/><path d="M31 27a14 14 0 0 1-9 7.5" class="g2"/><path d="M17 34.4a14 14 0 0 1-9-6" class="g1"/><path d="M6.7 23a14 14 0 0 1 0-6" class="g1"/></svg></span>'], ['e', 'Şerit', '<span class="th thn"><svg viewBox="0 0 62 50"><rect class="gq1" x="2" y="8" width="10" height="14" rx="3"/><rect class="gq1" x="14" y="8" width="10" height="14" rx="3"/><rect class="gq2" x="26" y="8" width="12" height="14" rx="3"/><rect class="gq0" x="40" y="8" width="9" height="14" rx="3"/><rect class="gq0" x="51" y="8" width="9" height="14" rx="3"/><rect class="gq0" x="2" y="28" width="58" height="18" rx="4"/></svg></span>'], ['f', 'Hat', '<span class="th thn"><svg viewBox="0 0 62 50"><path class="gl0" d="M6 25h50"/><circle class="gq1" cx="8" cy="25" r="5"/><circle class="gq1" cx="22" cy="25" r="5"/><circle class="gq2" cx="36" cy="25" r="7"/><circle class="gq0" cx="50" cy="25" r="5"/></svg></span>'], ['g', 'Gün takvimi', '<span class="th thn"><svg viewBox="0 0 62 50"><path class="gl0" d="M4 6h54M4 24h54M4 42h54"/><rect class="gq1" x="14" y="8" width="44" height="10" rx="3"/><rect class="gq2" x="14" y="21" width="44" height="12" rx="3"/><rect class="gq0" x="14" y="36" width="44" height="10" rx="3"/></svg></span>'], ['h', 'Odak', '<span class="th thn"><svg viewBox="0 0 62 50"><circle class="gl0" cx="31" cy="20" r="14"/><path class="gl2" d="M31 6a14 14 0 0 1 14 14"/><rect class="gq0" x="3" y="38" width="26" height="10" rx="3"/><rect class="gq0" x="33" y="38" width="26" height="10" rx="3"/></svg></span>']];
  function gvSecim() {
    var v = gvDeger();
    return '<div class="gvp" id="o_gv">' + GVO.map(function (x) { return '<button type="button" data-v="' + x[0] + '"' + (v === x[0] ? ' class="on"' : '') + '>' + x[2] + '<b>' + x[1] + '</b></button>'; }).join('') + '</div>';
  }
  var TEMA_SEG = [['acik', 'Gündüz'], ['koyu', 'Gece'], ['siyah', 'Siyah'], ['oto', 'Otomatik']];
  function ayAc(key, baslik, ic) { var o = !!AYOP[key]; return '<div class="acd' + (o ? ' open' : '') + '"><button type="button" class="ach" data-acd="' + key + '" aria-expanded="' + o + '"><b>' + baslik + '</b><span class="chv">›</span></button><div class="acn">' + ic + '</div></div>'; }
  function ayarHTML() {
    var y = Y(), o = onbellek(), th = oku(K.tema) || 'oto', ac = oku(K.ac) || '', fs = oku(K.fs) || '1';
    var renkler = [['', '#C8932B'], ['mavi', '#3D8FE0'], ['yesil', '#2E9E73'], ['mor', '#7F62E0'], ['kirmizi', '#D8584A']];
    var tema = '<h4>Gece / gündüz</h4><div class="thseg" id="o_th">' + TEMA_SEG.map(function (x) { return '<button type="button" data-v="' + x[0] + '"' + (th === x[0] ? ' class="on"' : '') + '><svg viewBox="0 0 24 24">' + TEMA_IK[x[0]] + '</svg>' + x[1] + '</button>'; }).join('') + '</div>'
      + '<h4>Vurgu rengi</h4><div class="sw2" id="o_ac">' + renkler.map(function (r) { return '<button type="button" aria-label="' + esc(r[0] || 'altın') + '" data-v="' + r[0] + '"' + (ac === r[0] ? ' class="on"' : '') + ' style="background:' + r[1] + '"></button>'; }).join('') + '</div>'
      + '<h4>Yazı boyutu</h4><div class="opts fsz" id="o_fs">' + [['0.92', 'Küçük', 14], ['1', 'Normal', 17], ['1.12', 'Büyük', 21]].map(function (x) { return '<button type="button" data-v="' + x[0] + '"' + (fs === x[0] ? ' class="on"' : '') + '><span style="font-size:' + x[2] + 'px">Aa</span><small>' + x[1] + '</small></button>'; }).join('') + '</div>'
      + '<h4>Şube renkleri</h4><div class="tg' + (kdAyar() ? ' on' : '') + '" data-kdtg="1" aria-pressed="' + (kdAyar() ? 'true' : 'false') + '"><span>Şubenin yanında kademe noktası</span><i></i></div><div class="kdlg"><span data-kd="5">5. sınıf</span><span data-kd="6">6. sınıf</span><span data-kd="7">7. sınıf</span><span data-kd="8">8. sınıf</span></div>'
      + '<h4>Ana ekranda günün dersleri</h4>' + gvSecim() + '<button type="button" class="gvtm" data-gvtm="1">Tamam</button>';
    var ana = '<h4>Açılış sayfası</h4>' + secenek('o_ap', oku(K.acilis) || '0', [['0', 'Ana ekran'], ['1', 'Programım'], ['1p', 'Program'], ['1n', 'Nöbet'], ['2', 'Takvim'], ['3', 'Pano'], ['son', 'Son baktığım']])
      + '<h4>Ana ekranda göster</h4>' + TOG.map(function (x) { return '<div class="tg' + (GIZLE[x[0]] ? '' : ' on') + '" data-k="' + x[0] + '"><span>' + x[1] + '</span><i></i></div>'; }).join('');
    var hesap = '<div class="kv"><span>Öğretmen</span><b>' + esc((y && y.kisi && y.kisi.ad) || '—') + '</b></div><div class="kv"><span>Okul</span><b>' + esc((y && y.okul) || '—') + '</b></div><div class="kv"><span>Son güncelleme</span><b>' + (o ? esc(saatStr(o.t)) : '—') + '</b></div><div class="kv"><span>Sürüm</span><b>' + esc(A.SURUM) + '</b></div>'
      + '<button class="fin2" id="forget" type="button">Bu cihazdan çık</button>';
    return '<div class="ayw">' + ayAc('gor', 'Görünüm', tema) + ayAc('ana', 'Ana ekran', ana) + ayAc('hes', 'Hesap', hesap) + ayAc('ver', 'Verilerim', verilerimHTML()) + ayAc('tan', 'Tanılama', tanilama()) + ayAc('hak', 'Hakkında', hakkindaHTML()) + '</div>';
  }
  function ayarAc() {
    if (TAB === 4 && PR === 1) { render(); return; }
    TAB = 4; PR = 1; WK = 0; $('scr').scrollTop = 0; render();
  }
  // Sorun olduğunda öğretmenin okuyup bildirebileceği kısa durum özeti (kişisel veri içermez)
  function sorunBildir() {
    var y = Y(), ad = (y && y.kisi && y.kisi.ad) || '—', o = onbellek();
    var satir = [['Öğretmen', ad], ['Uygulama kodu', APP_SURUM], ['Son güncelleme', o ? saatStr(o.t) : '—'], ['Çalışma biçimi', (window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) ? 'ana ekran uygulaması' : 'tarayıcı'], ['Cihaz', (navigator.userAgent.match(/\(([^)]*)\)/) || [0, '—'])[1]], ['Program', programVar(y) ? (dersiz(y) ? 'boş' : 'var') : 'gelmedi']];
    var metin = 'Yaşar Doğu Öğretmen · sorun bildirimi\n' + satir.map(function (x) { return x[0] + ': ' + x[1]; }).join('\n') + '\n\nSorun: ';
    var m = $('sblm'); function bilgi(t) { if (m) m.textContent = t; }
    if (navigator.share) { navigator.share({ text: metin }).then(function () {}, function () {}); return; }
    try { navigator.clipboard.writeText(metin).then(function () { bilgi('Mesaj kopyalandı. İdareye gönderirken sorunu sonuna yaz.'); }, function () { bilgi('Kopyalanamadı.'); }); } catch (e) { bilgi('Kopyalanamadı.'); }
  }
  function tanilama() {
    var sw = ('serviceWorker' in navigator) ? (navigator.serviceWorker.controller ? 'etkin' : 'yok') : 'desteklenmiyor';
    var st = (window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches)) ? 'ana ekran uygulaması' : 'tarayıcı';
    var satir = [['Uygulama kodu', APP_SURUM + (APP_SURUM !== A.SURUM ? ' (ayar dosyası ' + A.SURUM + ': eşleşmiyor)' : '')], ['Kazanım listesi', KZ_TANI.idx || 'henüz denenmedi'], ['Kazanım dosyası', KZ_TANI.dosya || 'henüz denenmedi'], ['Son ders eşleme', KZ_TANI.son || 'henüz denenmedi'], ['Çevrimdışı hizmet', sw], ['Çalışma biçimi', st]];
    return '<details class="kzo"><summary>Tanılama (sorun olursa göster)</summary>' + satir.map(function (x) { return '<div class="kv"><span>' + esc(x[0]) + '</span><b style="font-size:13px;font-weight:600;text-align:right">' + esc(x[1]) + '</b></div>'; }).join('') + '<button class="sbl" id="sbl" type="button">Sorun bildir (mesajı kopyala / paylaş)</button><div class="mut" id="sblm" style="font-size:12.5px;margin-top:6px"></div></details>';
  }
  function ayarTikla(ev) {
    var t = ev.target, b;
    if (ev.currentTarget === $('sh') && !t.closest('button, input, textarea, select, a, label') && $('sh').scrollTop < 8 && ev.clientY - $('sh').getBoundingClientRect().top < 64) { kapat(); return; }
    if ((b = t.closest('[data-acd]'))) { var ak = b.getAttribute('data-acd'); AYOP[ak] = !AYOP[ak]; var par = b.parentElement; par.classList.toggle('open', !!AYOP[ak]); b.setAttribute('aria-expanded', !!AYOP[ak]); return; }
    if ((b = t.closest('#sbl'))) { sorunBildir(); return; }
    if (t.closest('#klvac')) { klvAyardan(); return; }
    if (t.closest('#vpay')) { yedekPaylas('vmsg'); return; }
    if (t.closest('#vkop')) { yedekKopyala('vmsg'); return; }
    if (t.closest('#vger')) { yedektenYukle(); return; }
    if ((b = t.closest('#o_th button'))) { if (b.dataset.v === 'oto') sil(K.tema); else yaz(K.tema, b.dataset.v); tercihUygula(); ayarAc(); return; }
    if ((b = t.closest('#o_ac button'))) { if (b.dataset.v) yaz(K.ac, b.dataset.v); else sil(K.ac); tercihUygula(); ayarAc(); return; }
    if ((b = t.closest('#o_gv button'))) { yaz(K.gun, b.dataset.v); ayarAc(); render(); return; }
    if ((b = t.closest('#o_ap button'))) { yaz(K.acilis, b.dataset.v); ayarAc(); return; }
    if ((b = t.closest('#o_fs button'))) { yaz(K.fs, b.dataset.v); tercihUygula(); ayarAc(); setTimeout(tick, 50); return; }
    if ((b = t.closest('[data-kdtg]'))) { if (kdAyar()) yaz(K.kd, '0'); else sil(K.kd); ayarAc(); render(); return; }
    if ((b = t.closest('.tg'))) { var k = b.dataset.k; GIZLE[k] = !GIZLE[k]; yaz(K.gizle, JSON.stringify(GIZLE)); b.classList.toggle('on', !GIZLE[k]); uygulaGizle(); return; }
    if (t.closest('#fin')) { kapat(); return; }
    if ((b = t.closest('#forget'))) {
      if (b.getAttribute('data-onay') !== '1') { b.setAttribute('data-onay', '1'); b.textContent = 'Emin misin? Tekrar dokun'; return; }
      sil(K.okul); sil(K.kod); sil(K.onb); kapat(); TAB = 0; PS = 0; PR = 0; kilitGoster('okul');
    }
  }
  $('sh').addEventListener('click', ayarTikla); $('t4').addEventListener('click', ayarTikla);

  // ================= NOTLAR (yalnız bu telefonda) =================
  function notAc(k, id, gen) {
    var ed = id ? NT.filter(function (n) { return String(n.id) === String(id); })[0] : { k: gen ? null : k, t: '', d: '', tm: '', w: false };
    if (!ed) return;
    var ex = !!id, C = CTX || baglam();
    $('sh').classList.remove('on');
    $('ns').innerHTML = '<h3>' + (ex ? 'Notu düzenle' : 'Yeni not') + '</h3><div class="stamp" style="margin-top:0" id="nad"></div><textarea id="nt" placeholder="Notunu yaz" maxlength="400"></textarea><h4>Hatırlatma (isteğe bağlı)</h4><div class="dtr"><input type="date" id="nd"><input type="time" id="ntm"></div>'
      + (ed.k ? '<div class="tg' + (ed.w ? ' on' : '') + '" id="nw"><span>Her hafta bu derste</span><i></i></div>' : '')
      + '<div class="nerr" id="nerr"></div><button class="fin" id="nsave" type="button">Kaydet</button><button class="fin3" id="ncal" type="button">Takvime ekle</button><button class="fin3" id="nshare" type="button">Notlara gönder</button>' + (ex ? '<button class="fin2" id="ndel" type="button">Sil</button>' : '') + '<div class="stamp"><i></i>Yalnız bu telefonda saklanır</div>';
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
    $('nshare').onclick = function () {
      var n = oku2(); if (!n.t) { $('nerr').textContent = 'Önce notunu yaz.'; return; }
      $('nerr').style.color = 'var(--teal)'; metniGonder(notMetni(n, C), 'Not', 'nerr', 'Not kopyalandı. Telefonundaki not uygulamasına yapıştırabilirsin.');
    };
    $('ns').classList.add('on'); $('shd').classList.add('on');
  }

  // ================= BAŞLARKEN, BİLGİLENDİRME, VERİLERİM =================
  // Bilgilendirme metni değişirse BILGI_SURUM artırılır; öğretmen yeni metni bir kez daha onaylar.
  var BILGI_SURUM = 'b1';
  var BILGI_PILOT = 'Yaşar Doğu Öğretmen, öğretmenlerimizin günlük işlerini kolaylaştırmak ve eğitim-öğretim ortamının kalitesine katkı sağlamak amacıyla hazırlanmış bir pilot uygulamadır. Kusursuzluk iddiası taşımaz; sade ve öğretmen dostu bir yardımcı olmayı hedefler. Henüz eksikleri var ve senin geri bildirimlerinle gelişmeye devam edecek. Hiçbir kâr amacı gütmez, ücretsizdir ve yalnızca okulumuzun öğretmenleri için hazırlanmıştır.';
  var BILGI_PILOT2 = 'Karşılaştığın sorunları ve önerilerini Ayarlar › Tanılama › Sorun bildir bölümünden iletebilirsin.';
  var BILGI_MADDE = [
    'Yalnızca okul yönetiminin yayımladığı bilgiler gösterilir: ad-soyad, ders programı, nöbet ve görevlendirmeler, duyurular. Bu bilgiler okulun kendi Google hesabında tutulur ve okul kodu ile kişisel kodunla açılır.',
    'Kodların sunucuda düz metin olarak değil, geri döndürülemeyen şifrelenmiş (karma) biçimde saklanır.',
    'Notların ve “işlendi” işaretlerin yalnızca bu telefonda saklanır; okul yönetimi dahil kimseye gönderilmez.',
    'Uygulamada reklam, takip ya da istatistik aracı bulunmaz. Bilgilerin üçüncü kişilerle paylaşılmaz.',
    'Yanlış kod denemelerini sınırlamak için telefonuna ait rastgele bir numara kullanılır. Bu numara kimliğini göstermez ve sunucuda yalnızca kısa süre (yaklaşık 10 dakika) tutulur.',
    'Bağlantı sırasında uygulamayı ve bilgileri sunan hizmetler (GitHub, Google) olağan teknik kayıtları (örneğin IP adresi) tutabilir.'
  ];
  function bilgiHTML() {
    return '<div class="bl"><h2>Pilot uygulama</h2><p>' + esc(BILGI_PILOT) + '</p><p>' + esc(BILGI_PILOT2) + '</p><h2>Gizlilik ve verilerin</h2><ul>' + BILGI_MADDE.map(function (m) { return '<li>' + esc(m) + '</li>'; }).join('') + '</ul></div>';
  }
  function okudumKaydi() { var o = okuJ(K.okudum, null); return (o && typeof o === 'object' && o.s) ? o : null; }
  function hakkindaHTML() {
    var o = okudumKaydi(), tr = o && o.t ? gunAy(String(o.t).slice(0, 10)) + ' ' + String(o.t).slice(0, 4) : '—';
    return bilgiHTML() + '<div class="kv"><span>Okuduğun tarih</span><b>' + esc(tr) + '</b></div><div class="kv"><span>Sürüm</span><b>' + esc(A.SURUM) + '</b></div>'
      + '<button class="fin3" id="klvac" type="button">Ana ekrana ekleme kılavuzunu aç</button>';
  }

  // Açılış kapısı: (1) Başlarken kılavuzu (yalnız ilk kurulumda, tarayıcı modunda, bir kez), (2) bilgilendirme ve “Okudum” (bir kez). Sonra uygulama başlar.
  function kapiKapat() { var kp = $('kap'); kp.className = 'lock kap'; kp.textContent = ''; }
  function kapiGec(devam) {
    var adim = [], girisli = !!(oku(K.okul) && oku(K.kod)), klv = window.OGR_KLV;
    if (klv && !girisli && !oku(K.basla) && !klv.anaEkran()) adim.push('klv');
    var ok = okudumKaydi(); if (!ok || ok.s !== BILGI_SURUM) adim.push('bilgi');
    if (!adim.length) return devam();
    kilit = { adim: 'kapi', okul: '', deger: '', mesaj: '', mesgul: true }; // kapı açıkken arka plan çalışmaz, tuşlar yutulur
    function sonraki() {
      var a = adim.shift();
      if (!a) { kapiKapat(); kilit = null; return devam(); }
      if (a === 'klv') klvIlk(sonraki); else bilgiIlk(sonraki);
    }
    sonraki();
  }
  function klvIlk(sonraki) {
    var kp = $('kap'); kp.className = 'lock kap on';
    function git() { yaz(K.basla, '1'); sonraki(); }
    OGR_KLV.ciz(kp, { logo: LOGO, birincil: 'Anladım, devam et', atla: 'Şimdilik atla', bitti: git, atlandi: git });
    kp.scrollTop = 0;
  }
  function klvAyardan() {
    var kp = $('kap'); kp.className = 'lock kap on';
    OGR_KLV.ciz(kp, { logo: LOGO, birincil: 'Kapat', bitti: kapiKapat }); kp.scrollTop = 0;
  }
  function bilgiIlk(sonraki) {
    var kp = $('kap'); kp.className = 'lock kap on';
    kp.innerHTML = '<div class="kw"><img src="' + esc(LOGO) + '" alt=""><h1>Başlamadan önce</h1><p class="sub">Kısa bilgilendirmeyi lütfen oku.</p>' + bilgiHTML()
      + '<button type="button" class="okuk" id="okuk" aria-pressed="false"><i></i><span>Bilgilendirmeyi okudum, anladım.</span></button><button type="button" class="bt2" id="okd" disabled>Devam</button></div>';
    var r = $('okuk'), d = $('okd');
    r.onclick = function () { var on = r.classList.toggle('on'); r.setAttribute('aria-pressed', on ? 'true' : 'false'); d.disabled = !on; };
    d.onclick = function () { if (d.disabled) return; yaz(K.okudum, JSON.stringify({ s: BILGI_SURUM, t: new Date().toISOString() })); sonraki(); };
    kp.scrollTop = 0;
  }

  // ---- kalıcı depolama isteği (yalnız tarayıcıya “bu verileri silme” ricasıdır; uygulamanın çalışmasını etkilemez)
  var KALICI = '';
  function kalicilikIste(cb) {
    function bit(d) { KALICI = d; if (typeof cb === 'function') cb(); var e = $('vkal'); if (e) e.textContent = kalicilikYazi(); }
    try {
      if (!(navigator.storage && navigator.storage.persist && navigator.storage.persisted)) return bit('desteklenmiyor');
      navigator.storage.persisted().then(function (p) {
        if (p) return bit('etkin');
        return navigator.storage.persist().then(function (g) { bit(g ? 'etkin' : 'verilmedi'); });
      }).then(function () {}, function () { bit('desteklenmiyor'); });
    } catch (e) { bit('desteklenmiyor'); }
  }
  function kalicilikYazi() { return { etkin: 'Etkin', verilmedi: 'Tarayıcı vermedi', desteklenmiyor: 'Bu telefonda yok' }[KALICI] || 'Kontrol ediliyor…'; }

  // ---- yedek / geri yükleme / gönderme
  function mesajYaz(id, t, ok) { var m = $(id); if (!m) return; m.style.color = ok ? 'var(--teal)' : '#B3392C'; m.textContent = t; }
  function kopyala(metin, msgId, tamamMetni) {
    try { navigator.clipboard.writeText(metin).then(function () { mesajYaz(msgId, tamamMetni, 1); }, function () { mesajYaz(msgId, 'Kopyalanamadı.', 0); }); } catch (e) { mesajYaz(msgId, 'Kopyalanamadı.', 0); }
  }
  function metniGonder(metin, baslik, msgId, kopyaMetni) {
    if (navigator.share) { navigator.share({ title: baslik, text: metin }).then(function () {}, function (e) { if (e && e.name === 'AbortError') return; kopyala(metin, msgId, kopyaMetni); }); return; }
    kopyala(metin, msgId, kopyaMetni);
  }
  function notMetni(n, C) {
    var s = n.t; if (n.k) s += '\n(' + hucreAdi(C.y, n.k) + ')'; if (n.d) s += '\n' + gunAy(n.d) + (n.tm ? ', ' + n.tm : ''); return s;
  }
  function tumNotlariGonder() {
    var C = CTX || baglam(), l = NT.slice().sort(function (a, b) { return ((a.d || '9') + (a.tm || '')) > ((b.d || '9') + (b.tm || '')) ? 1 : -1; });
    if (!l.length) return;
    metniGonder('Notlarım\n\n' + l.map(function (n) { return '• ' + notMetni(n, C).replace(/\n/g, ' · '); }).join('\n'), 'Notlarım', 'bkm', 'Notların kopyalandı. Telefonundaki not uygulamasına yapıştırabilirsin.');
  }
  function yedekMetni() { return JSON.stringify({ uyg: 'ydo-ogretmen', v: 1, t: new Date().toISOString(), notlar: NT, islendi: okuJ(K.isl, {}) }); }
  function yedekPaylas(msgId) {
    metniGonder(yedekMetni(), 'Yaşar Doğu Öğretmen yedeği', msgId, 'Yedek kopyalandı. Bir yere yapıştırıp sakla (örneğin WhatsApp’ta kendine gönder).');
  }
  function yedekKopyala(msgId) { kopyala(yedekMetni(), msgId, 'Yedek kopyalandı. Bir yere yapıştırıp sakla (örneğin WhatsApp’ta kendine gönder).'); }
  function yedektenYukle() {
    var ta = $('vyap'), s = (ta && ta.value) || '', a = s.indexOf('{'), b = s.lastIndexOf('}'), o = null;
    if (!s.trim()) return mesajYaz('vmsg', 'Önce yedeği kutuya yapıştır.', 0);
    try { if (a < 0 || b <= a) throw 0; o = JSON.parse(s.slice(a, b + 1)); } catch (e) { return mesajYaz('vmsg', 'Yedek okunamadı. Yedeğin tamamını yapıştırdığından emin ol.', 0); }
    if (!o || o.uyg !== 'ydo-ogretmen' || !Array.isArray(o.notlar)) return mesajYaz('vmsg', 'Bu metin bir yedek gibi görünmüyor.', 0);
    var var0 = {}, eklenen = 0, vardi = 0;
    NT.forEach(function (n) { var0[String(n.id)] = 1; });
    o.notlar.slice(0, 1000).forEach(function (n) {
      if (!n || typeof n !== 'object' || typeof n.t !== 'string' || !n.t.trim() || (typeof n.id !== 'number' && typeof n.id !== 'string')) return;
      if (var0[String(n.id)]) { vardi++; return; }
      NT.push({ id: n.id, k: (typeof n.k === 'string' && /^\d,\d{1,2}$/.test(n.k)) ? n.k : null, t: n.t.slice(0, 400), d: /^\d{4}-\d{2}-\d{2}$/.test(n.d || '') ? n.d : '', tm: /^\d{2}:\d{2}$/.test(n.tm || '') ? n.tm : '', w: !!n.w });
      var0[String(n.id)] = 1; eklenen++;
    });
    var isl = okuJ(K.isl, {}), ie = 0;
    if (o.islendi && typeof o.islendi === 'object' && !Array.isArray(o.islendi)) {
      Object.keys(o.islendi).slice(0, 5000).forEach(function (k) { if (k.length <= 200 && o.islendi[k] && !isl[k]) { isl[k] = 1; ie++; } });
    }
    notKaydet(); yaz(K.isl, JSON.stringify(isl));
    var ozet = eklenen + ' not ve ' + ie + ' işaret geri yüklendi' + (vardi ? ' (' + vardi + ' not zaten vardı)' : '') + '.';
    ayarAc(); mesajYaz('vmsg', ozet, 1); if (ta) ta.value = '';
  }
  function verilerimHTML() {
    var ni = Object.keys(okuJ(K.isl, {})).length;
    setTimeout(function () { kalicilikIste(); }, 0);
    return '<p class="mut" style="font-size:14px;line-height:1.5;margin:0 0 6px">Notların ve “işlendi” işaretlerin yalnızca bu telefonda saklanır. Telefonu değiştirirsen, tarayıcı verilerini temizlersen ya da uygulamayı kaldırırsan kaybolur.</p>'
      + '<div class="kv"><span>Notlar</span><b>' + NT.length + '</b></div><div class="kv"><span>“İşlendi” işaretleri</span><b>' + ni + '</b></div><div class="kv"><span>Kalıcı depolama</span><b id="vkal">' + esc(kalicilikYazi()) + '</b></div>'
      + '<p class="mut" style="font-size:13px;line-height:1.5;margin:8px 0 0">Kalıcı depolama etkinse tarayıcı bu verileri kendiliğinden silmez. Yine de ara sıra yedek almanı öneririz.</p>'
      + '<button class="fin3" id="vpay" type="button">Yedeği gönder / paylaş</button><button class="fin3" id="vkop" type="button">Yedeği kopyala</button>'
      + '<textarea class="vta" id="vyap" placeholder="Geri yüklemek için yedeği buraya yapıştır" rows="3"></textarea><button class="fin3" id="vger" type="button">Yedekten geri yükle</button><div class="nerr" id="vmsg" style="min-height:18px"></div>';
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
    var im = e('img'); im.src = LOGO; im.alt = ''; var lw = e('div', 'logo3d'); lw.appendChild(im); L.appendChild(lw);
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
        kilit = null; $('lock').className = 'lock'; $('lock').textContent = ''; TAB = 0; PS = 0; WK = 0; setTimeout(kalicilikIste, 1500); return render();
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
    slaytGecis(function () { HLAST = n; HI++; HFX = true; HYON = 1; tick(true); HYON = 0; }, 1);
  }, 1000);
  setInterval(function () { if (!document.hidden && !kilit) tick(); }, 1000);
  setInterval(function () { if (!document.hidden && !kilit && Date.now() - sonYenileme > A.YENILE_DK * 60000) yenile(false); }, 60000);
  // Uygulamaya yarım dakikadan uzun bir aradan sonra dönülünce karşılama yeniden ilk slayttan (gökyüzü) başlar.
  var GIZLENDI = 0;
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { GIZLENDI = Date.now(); return; }
    if (GIZLENDI && Date.now() - GIZLENDI > 30000) { HI = 0; HSON = HLAST = Date.now(); HFX = false; }
    GIZLENDI = 0;
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden && !kilit) { render(); if (Date.now() - sonYenileme > 60000) yenile(false); } });
  window.addEventListener('online', function () { if (!kilit) yenile(false); });
  window.addEventListener('offline', function () { durum.ag = 'cevrimdisi'; if (!kilit) render(); });

  // ================= BAŞLAT =================
  tercihUygula(); kzIndeks();
  function basla() { if (oku(K.okul) && oku(K.kod)) { acilisUygula(); render(); yenile(false); setTimeout(kalicilikIste, 4000); } else kilitGoster('okul'); }
  kapiGec(basla);
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
