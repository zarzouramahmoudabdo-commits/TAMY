/* TAMY — استماع القرآن الكريم بأصوات القرّاء (بث من mp3quran.net) */
(function () {
  'use strict';
  var T = window.TAMY, SU = window.TAMY_SURAHS;
  if (!T || !SU) return;
  var ar = T.ar, esc = T.esc, I = T.I;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var API = 'https://mp3quran.net/api/v3/reciters?language=ar';
  var FALLBACK = [
    { id: 123, name: 'مشاري العفاسي', moshaf: [{ name: 'حفص عن عاصم - مرتل', server: 'https://cdn.mp3quran.net/audio/mishary-alafasy/r1/', list: null }] },
    { id: 102, name: 'ماهر المعيقلي', moshaf: [{ name: 'حفص عن عاصم - مرتل', server: 'https://cdn.mp3quran.net/audio/maher-muaiqly/r1/', list: null }] },
    { id: 112, name: 'محمد صديق المنشاوي', moshaf: [{ name: 'حفص عن عاصم - مرتل', server: 'https://cdn.mp3quran.net/audio/muhammad-minshawi/r1/', list: null }] },
    { id: 118, name: 'محمود خليل الحصري', moshaf: [{ name: 'حفص عن عاصم - مرتل', server: 'https://cdn.mp3quran.net/audio/mahmoud-husary/r1/', list: null }] }
  ];
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* لا شيء */ } }
  function norm(t) {
    return String(t || '').replace(/[\u064B-\u0652\u0670\u0640]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').trim();
  }
  function pad3(n) { return ('00' + n).slice(-3); }

  /* ---------- القرّاء ---------- */
  var reciters = null, loadingP = null, offline = false;
  function clean(r) {
    return {
      id: r.id, name: r.name,
      moshaf: (r.moshaf || []).filter(function (m) { return m.server; }).map(function (m) {
        return { name: m.name || '', server: /\/$/.test(m.server) ? m.server : m.server + '/', list: m.surah_list ? String(m.surah_list).split(',').map(Number).filter(Boolean) : null };
      })
    };
  }
  function load() {
    if (reciters) return Promise.resolve(reciters);
    if (loadingP) return loadingP;
    loadingP = fetch(API).then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); }).then(function (j) {
      var list = (j.reciters || []).map(clean).filter(function (r) { return r.moshaf.length; });
      if (!list.length) throw new Error('empty');
      reciters = list; offline = false; lsSet('tamy_reciters', list); return list;
    }).catch(function () {
      var c = lsGet('tamy_reciters');
      offline = !(c && c.length); reciters = offline ? FALLBACK : c; return reciters;
    }).then(function (r) { loadingP = null; return r; });
    return loadingP;
  }
  function byId(id) { for (var i = 0; reciters && i < reciters.length; i++) if (String(reciters[i].id) === String(id)) return reciters[i]; return null; }
  function surahsOf(m) { return m.list || SU.list.map(function (s) { return s.n; }); }

  /* ---------- المشغّل ---------- */
  var P = { rid: null, mi: 0, n: 0, a: null, state: 'off', err: null };
  var bar = null;
  function cur() { var r = byId(P.rid); return r ? { r: r, m: r.moshaf[P.mi] || r.moshaf[0] } : null; }
  function srcUrl() { var c = cur(); return c ? c.m.server + pad3(P.n) + '.mp3' : ''; }
  function ensureBar() {
    if (bar) return bar;
    bar = document.createElement('div'); bar.id = 'lsBar'; bar.hidden = true;
    bar.innerHTML = '<div class="ls-top"><span class="ls-t"><b id="lsTitle"></b><small id="lsSub"></small></span>' +
      '<button type="button" data-a="prev" class="ls-b" aria-label="السورة السابقة">السابقة</button>' +
      '<button type="button" data-a="toggle" class="ls-b ls-main" id="lsMain" aria-label="تشغيل أو إيقاف"></button>' +
      '<button type="button" data-a="next" class="ls-b" aria-label="السورة التالية">التالية</button>' +
      '<button type="button" data-a="close" class="ls-b ls-x" aria-label="إغلاق">×</button></div>' +
      '<div class="ls-seek"><span id="lsCur">٠:٠٠</span><input type="range" id="lsRange" min="0" max="1000" value="0" aria-label="موضع التشغيل"><span id="lsDur">٠:٠٠</span></div>' +
      '<a id="lsExt" class="ls-ext" target="_blank" rel="noopener" hidden>فتح في المتصفح</a>';
    document.body.appendChild(bar);
    bar.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button[data-a]'); if (!b) return;
      var k = b.getAttribute('data-a');
      if (k === 'toggle') toggle(); else if (k === 'next') step(1); else if (k === 'prev') step(-1); else if (k === 'close') closeAll();
    });
    $('#lsRange', bar).addEventListener('input', function (e) {
      if (P.a && isFinite(P.a.duration) && P.a.duration > 0) P.a.currentTime = P.a.duration * (+e.target.value) / 1000;
    });
    return bar;
  }
  function fmt(s) { if (!isFinite(s)) return '٠:٠٠'; s = Math.floor(s); return ar(Math.floor(s / 60)) + ':' + ar(('0' + (s % 60)).slice(-2)); }
  function paint() {
    if (!bar) return;
    var c = cur(); bar.hidden = !c; document.body.classList.toggle('ls-on', !!c);
    if (!c) return;
    $('#lsTitle', bar).textContent = 'سورة ' + SU.list[P.n - 1].name;
    $('#lsSub', bar).textContent = P.err ? ('تعذّر التشغيل (رمز ' + P.err + ')') : (P.state === 'loading' ? 'جارٍ التحميل… · ' : '') + c.r.name;
    $('#lsMain', bar).innerHTML = P.state === 'on' ? I.stop : I.play;
    var ext = $('#lsExt', bar); ext.hidden = !P.err; if (P.err) ext.href = srcUrl();
    $$('.ls-row').forEach(function (b) { b.classList.toggle('on', P.rid !== null && String(P.rid) === b.getAttribute('data-r') && +b.getAttribute('data-n') === P.n); });
  }
  function tick() {
    if (!bar || !P.a) return;
    var a = P.a;
    $('#lsCur', bar).textContent = fmt(a.currentTime); $('#lsDur', bar).textContent = fmt(a.duration);
    if (isFinite(a.duration) && a.duration > 0) $('#lsRange', bar).value = Math.round(a.currentTime / a.duration * 1000);
  }
  function release() {
    var a = P.a; P.a = null;
    if (a) { a.onplaying = a.onpause = a.onended = a.onerror = a.onwaiting = a.ontimeupdate = a.onloadedmetadata = null; try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) { /* لا شيء */ } }
  }
  function play(rid, mi, n) {
    ensureBar(); release();
    P.rid = rid; P.mi = mi; P.n = n; P.err = null; P.state = 'loading';
    lsSet('tamy_listen', { rid: rid, mi: mi, n: n });
    var a = new Audio(); P.a = a; a.preload = 'auto';
    a.onplaying = function () { if (P.a === a) { P.state = 'on'; P.err = null; paint(); } };
    a.onpause = function () { if (P.a === a && P.state === 'on' && !a.ended) { P.state = 'paused'; paint(); } };
    a.onwaiting = function () { if (P.a === a && P.state === 'on') { P.state = 'loading'; paint(); } };
    a.onended = function () { if (P.a === a) step(1, true); };
    a.onerror = function () { if (P.a === a) { P.err = a.error ? a.error.code : 0; P.state = 'paused'; paint(); T.toast('تعذّر تشغيل الصوت. تأكد من الإنترنت'); } };
    a.ontimeupdate = a.onloadedmetadata = tick;
    a.src = srcUrl();
    paint();
    var pr = a.play(); if (pr && pr.catch) pr.catch(function () { if (P.a === a && P.state === 'loading') { P.state = 'paused'; paint(); } });
    try {
      if ('mediaSession' in navigator) {
        var c = cur();
        navigator.mediaSession.metadata = new MediaMetadata({ title: 'سورة ' + SU.list[n - 1].name, artist: c.r.name, album: 'TAMY' });
        navigator.mediaSession.setActionHandler('play', toggle); navigator.mediaSession.setActionHandler('pause', toggle);
        navigator.mediaSession.setActionHandler('nexttrack', function () { step(1); }); navigator.mediaSession.setActionHandler('previoustrack', function () { step(-1); });
      }
    } catch (e) { /* لا شيء */ }
  }
  function toggle() {
    var a = P.a; if (!a) { if (P.rid !== null) play(P.rid, P.mi, P.n); return; }
    if (a.paused) { P.err = null; var pr = a.play(); if (pr && pr.catch) pr.catch(function () { /* لا شيء */ }); } else a.pause();
  }
  function step(d, auto) {
    var c = cur(); if (!c) return;
    var l = surahsOf(c.m), i = l.indexOf(P.n) + d;
    if (i < 0 || i >= l.length) { if (auto) { P.state = 'paused'; paint(); } return; }
    play(P.rid, P.mi, l[i]);
  }
  function closeAll() { release(); P.rid = null; P.state = 'off'; P.err = null; paint(); }
  var prevApi = window.TAMYRadio;     // الأذان داخل التطبيق يوقف الصوت
  window.TAMYRadio = { stop: function () { if (prevApi && prevApi.stop) prevApi.stop(); if (P.a) { try { P.a.pause(); } catch (e) { /* لا شيء */ } } } };

  /* ---------- الشاشات ---------- */
  function head(title, back) {
    return '<div class="pg-head"><h1>' + title + '</h1>' + (back ? '<a class="rd-btn" href="' + back + '" aria-label="رجوع">' + I.back + '</a>' : '') + '</div>';
  }
  function index() {
    T.view('<div class="page">' + head('استماع القرآن', '#/quran') + '<div class="q-loading">جارٍ تحميل القرّاء…</div></div>', 'page');
    load().then(function (list) {
      if (location.hash !== '#/listen') return;
      var last = lsGet('tamy_listen'), lr = last && byId(last.rid);
      var resume = (lr && SU.list[last.n - 1]) ? '<button type="button" class="q-resume ls-resume" data-r="' + last.rid + '" data-m="' + last.mi + '" data-n="' + last.n + '"><span class="qr-ic">' + I.play + '</span><span class="qr-tx"><small>تابع الاستماع</small><b>سورة ' + SU.list[last.n - 1].name + ' — ' + esc(lr.name) + '</b></span></button>' : '';
      T.view('<div class="page">' + head('استماع القرآن', '#/quran') + resume +
        (offline ? '<p class="note">تعذّر تحميل القائمة الكاملة، وهذه قائمة مختصرة. تأكد من الإنترنت وأعد فتح الصفحة.</p>' : '') +
        '<div class="q-search">' + I.search + '<input id="lsSearch" type="search" placeholder="ابحث باسم الشيخ" autocomplete="off"></div>' +
        '<div id="lsList"></div></div>', 'page');
      function draw() {
        var q = norm($('#lsSearch').value);
        $('#lsList').innerHTML = list.filter(function (r) { return !q || norm(r.name).indexOf(q) > -1; }).map(function (r) {
          return '<a class="srow" href="#/listen/' + r.id + '"><span class="sr-tx"><b>' + esc(r.name) + '</b><small>' + ar(r.moshaf.length) + (r.moshaf.length > 1 ? ' روايات وتسجيلات' : ' تسجيل') + '</small></span></a>';
        }).join('') || '<p class="note">لا يوجد شيخ بهذا الاسم.</p>';
      }
      draw(); $('#lsSearch').oninput = draw;
      var rb = $('.ls-resume'); if (rb) rb.onclick = function () { play(rb.getAttribute('data-r'), +rb.getAttribute('data-m'), +rb.getAttribute('data-n')); };
      paint();
    });
  }
  function reciter(id) {
    T.view('<div class="page">' + head('الشيخ', '#/listen') + '<div class="q-loading">جارٍ التحميل…</div></div>', 'page');
    load().then(function () {
      if (location.hash !== '#/listen/' + id) return;
      var r = byId(id); if (!r) { location.hash = '#/listen'; return; }
      var mi = (P.rid !== null && String(P.rid) === String(id)) ? P.mi : 0;
      function draw() {
        var m = r.moshaf[mi], l = surahsOf(m);
        T.view('<div class="page">' + head(esc(r.name), '#/listen') +
          (r.moshaf.length > 1 ? '<div class="chips tabs" id="lsMo">' + r.moshaf.map(function (x, i) { return '<button type="button" class="chip' + (i === mi ? ' on' : '') + '" data-i="' + i + '">' + esc(x.name || ('تسجيل ' + ar(i + 1))) + '</button>'; }).join('') + '</div>' : '') +
          '<div id="lsList">' + l.map(function (n) {
            var s = SU.list[n - 1]; if (!s) return '';
            return '<button type="button" class="srow ls-row" data-r="' + r.id + '" data-n="' + n + '"><span class="ls-n">' + ar(n) + '</span><span class="sr-tx"><b class="mush">سورة ' + s.name + '</b><small>' + ar(s.ayahs) + ' آية</small></span><span class="ls-pl">' + I.play + '</span></button>';
          }).join('') + '</div></div>', 'page');
        $$('.ls-row').forEach(function (b) { b.onclick = function () { play(r.id, mi, +b.getAttribute('data-n')); }; });
        $$('#lsMo .chip').forEach(function (c) { c.onclick = function () { mi = +c.getAttribute('data-i'); draw(); }; });
        paint();
      }
      draw();
    });
  }
  T.addRoute(/^#\/listen\/(\d+)$/, reciter);
  T.addRoute(/^#\/listen$/, index);
  window.TAMYListenCard = function () {
    return '<a class="rad2 ls-card" href="#/listen"><div class="rad2-ic">♪</div><div class="rad2-tx"><b>استماع القرآن الكريم</b><small>اختر الشيخ والسورة</small></div><span class="rad2-btn">افتح</span></a>';
  };
})();
