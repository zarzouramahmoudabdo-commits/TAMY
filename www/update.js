/* TAMY — إشعار «يوجد تحديث جديد» من صفحة Releases على GitHub */
(function () {
  'use strict';
  var T = window.TAMY;
  if (!T) return;
  var ar = T.ar, I = T.I;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var REPO = 'zarzouramahmoudabdo-commits/TAMY';
  var DKEY = 'tamy_upd_dismiss', CKEY = 'tamy_upd_last', AKEY = 'tamy_upd_avail';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* لا شيء */ } }

  var cur = 0;
  function getAvail() {
    var a = null; try { a = JSON.parse(lsGet(AKEY) || 'null'); } catch (e) { a = null; }
    return (a && a.build && a.url && !(cur && a.build <= cur)) ? a : null;
  }
  function setAvail(info) { lsSet(AKEY, info ? JSON.stringify(info) : ''); }
  var ICON = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14"/></svg>';
  function cardHtml() {
    var a = getAvail();
    return '<a class="upd-card' + (a ? ' has' : '') + '" id="updCard" href="' + (a ? a.url : '#/update') + '"' + (a ? ' target="_blank" rel="noopener"' : '') + '>' +
      '<span class="uc-ic">' + ICON + (a ? '<i class="uc-dot"></i>' : '') + '</span>' +
      '<span class="uc-tx"><b>' + (a ? 'يوجد تحديث جديد' : 'التحديثات') + '</b><small>' + (a ? 'اضغط لتحميل أحدث نسخة' : 'تحقق من آخر نسخة للتطبيق') + '</small></span></a>';
  }
  function repaint() { var c = $('#updCard'); if (c) c.outerHTML = cardHtml(); }
  window.TAMYUpdateCard = cardHtml;

  function myBuild() {
    if (cur) return Promise.resolve(cur);
    return fetch('version.json').then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { cur = +j.build || 0; return cur; }).catch(function () { return 0; });
  }
  // يرجع { build, url } لآخر نسخة أو null
  function latest() {
    return fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        var m = /build-(\d+)/.exec(j.tag_name || ''), apk = (j.assets || []).filter(function (a) { return /\.apk$/i.test(a.name); })[0];
        return (m && apk) ? { build: +m[1], url: apk.browser_download_url } : null;
      });
  }
  function banner(info) {
    var b = $('#updBar'); if (b) b.remove();
    b = document.createElement('div'); b.id = 'updBar';
    b.innerHTML = '<span class="ub-t">يوجد تحديث جديد للتطبيق</span>' +
      '<a class="ub-go" href="' + info.url + '" target="_blank" rel="noopener">تحديث</a>' +
      '<button type="button" class="ub-x" aria-label="إغلاق">×</button>';
    document.body.appendChild(b);
    $('.ub-x', b).onclick = function () { lsSet(DKEY, String(info.build)); b.remove(); };
  }
  function auto() {
    var last = +lsGet(CKEY) || 0;
    if (Date.now() - last < 600 * 1000) return;            // مرة كل ١٠ دقائق على الأكثر
    myBuild().then(function (c) {
      if (!c) return;
      return latest().then(function (info) {
        lsSet(CKEY, String(Date.now()));
        setAvail(info && info.build > c ? info : null); repaint();
        if (info && info.build > c && String(info.build) !== lsGet(DKEY)) banner(info);
      });
    }).catch(function () { /* لا شيء: لا يظهر شيء بدون إنترنت */ });
  }
  myBuild().then(repaint);
  setTimeout(auto, 4000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) setTimeout(auto, 2500); });

  function page() {
    T.view('<div class="page">' +
      '<div class="pg-head"><h1>التحديثات</h1><a class="rd-btn" href="#/settings" aria-label="رجوع">' + I.back + '</a></div>' +
      '<div class="card"><div class="row col"><span class="rt">التحديثات<small>تحقق من وجود نسخة أحدث للتطبيق</small></span>' +
      '<button type="button" class="btn gold sm" id="upCheck">تحقق من وجود تحديث</button>' +
      '<p class="note" id="upMsg"></p><a class="btn ghost sm" id="upGo" target="_blank" rel="noopener" style="display:none">تحميل التحديث</a></div></div>' +
      '</div>', 'page');
    $('#upCheck').onclick = function () {
      var msg = $('#upMsg'), go = $('#upGo'); go.style.display = 'none'; msg.textContent = 'جارٍ التحقق…';
      myBuild().then(function (c) {
        return latest().then(function (info) {
          lsSet(CKEY, String(Date.now()));
          setAvail(info && c && info.build > c ? info : null); repaint();
          if (!info) msg.textContent = 'لم أجد نسخة منشورة.';
          else if (!c) { msg.textContent = 'يوجد تحديث جديد.'; go.href = info.url; go.style.display = ''; }
          else if (info.build > c) { msg.textContent = 'يوجد تحديث جديد. اضغط «تحميل التحديث» وسيبدأ التثبيت تلقائيًا.'; go.href = info.url; go.style.display = ''; }
          else msg.textContent = 'أنت على آخر نسخة.';
        });
      }).catch(function () { msg.textContent = 'تعذّر التحقق. تأكد من الإنترنت وأعد المحاولة.'; });
    };
    setTimeout(function () { var b = $('#upCheck'); if (b) b.click(); }, 300);
  }
  /* ===== تحميل وتثبيت التحديث من داخل التطبيق ===== */
  var installing = false;
  function startInstall(url) {
    var C = window.Capacitor, PL = C && C.Plugins, FS = PL && PL.Filesystem, FO = PL && PL.FileOpener;
    if (!FS || !FO) return false;                       // نسخة قديمة بلا الإضافة: يفتح الرابط كالسابق
    if (installing) return true;
    installing = true;
    var bar = $('#updBar'); if (!bar) { bar = document.createElement('div'); bar.id = 'updBar'; document.body.appendChild(bar); }
    function say(t) { bar.innerHTML = '<span class="ub-t">' + t + '</span>'; }
    function fail(m) { installing = false; bar.innerHTML = '<span class="ub-t">' + m + '</span><button type="button" class="ub-x" aria-label="إغلاق">×</button>'; var x = $('.ub-x', bar); if (x) x.onclick = function () { bar.remove(); }; }
    say('جارٍ تحميل التحديث… ' + ar(0) + '٪');
    var lis = null;
    try { lis = FS.addListener('progress', function (p) { if (p && p.contentLength) say('جارٍ تحميل التحديث… ' + ar(Math.round(p.bytes / p.contentLength * 100)) + '٪'); }); } catch (e) { /* لا شيء */ }
    function done() { try { if (lis && lis.then) lis.then(function (h) { h.remove(); }); else if (lis && lis.remove) lis.remove(); } catch (e) { /* لا شيء */ } }
    FS.deleteFile({ path: 'TAMY-update.apk', directory: 'CACHE' }).catch(function () { /* لا شيء */ }).then(function () {
      return FS.downloadFile({ url: url, path: 'TAMY-update.apk', directory: 'CACHE', progress: true, recursive: true });
    }).then(function () {
      return FS.getUri({ path: 'TAMY-update.apk', directory: 'CACHE' });
    }).then(function (r) {
      done(); say('تم التحميل. اضغط «تثبيت» في الشاشة التالية…');
      return FO.open({ filePath: r.uri, contentType: 'application/vnd.android.package-archive', openWithDefault: true });
    }).then(function () {
      installing = false; setTimeout(function () { if (bar.parentNode) bar.remove(); }, 4000);
    }).catch(function (e) {
      done(); fail('تعذّر التحديث: ' + String((e && (e.message || e.errorMessage)) || e).slice(0, 80) + '. فعّل «تثبيت التطبيقات من هذا المصدر» وأعد المحاولة');
    });
    return true;
  }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('.ub-go, #updCard, #upGo') : null;
    if (!t) return;
    var url = t.getAttribute('href') || '';
    if (!/^https?:/.test(url)) return;
    if (startInstall(url)) e.preventDefault();
  }, true);
  T.addRoute(/^#\/update$/, page);
})();
