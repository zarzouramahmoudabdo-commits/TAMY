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
    return (a && a.build && a.url && needs(a)) ? a : null;
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

  var INST = (function () { try { var q = new URLSearchParams(location.search); return { n: +q.get('apk') || 0, nh: q.get('nh') || '' }; } catch (e) { return { n: 0, nh: '' }; } })();
  function myBuild() { cur = INST.n; return Promise.resolve(cur); }
  function needs(info) { return !!(info && info.nh && INST.nh && info.nh !== INST.nh); }
  // يرجع { build, url } لآخر نسخة أو null
  function latest() {
    return fetch('https://api.github.com/repos/' + REPO + '/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
      .then(function (r) { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(function (j) {
        var m = /build-(\d+)/.exec(j.tag_name || ''), apk = (j.assets || []).filter(function (a) { return /\.apk$/i.test(a.name); })[0];
        return (m && apk) ? { build: +m[1], url: apk.browser_download_url, nh: ((/native\s+([0-9a-f]+)/.exec(j.body || '') || [])[1] || '') } : null;
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
        setAvail(needs(info) ? info : null); repaint();
        if (needs(info) && String(info.build) !== lsGet(DKEY)) banner(info);
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
  function startInstall(url) { if (window.TAMYApkInstall) { window.TAMYApkInstall(url); return true; } return false; }

  /* ===== نافذة «تحديث التطبيق» ===== */
  function showUpdateSheet() {
    if (!T.sheet) { location.hash = '#/update'; return; }
    T.sheet('<div class="upd-sheet"><p class="us-t" id="usMsg">جارٍ التحقق من التحديثات…</p><div class="us-b" id="usBtns"></div></div>');
    function close() { try { if (T.closeSheet) T.closeSheet(); } catch (e) { /* لا شيء */ } }
    function set(msg, btns) {
      var m = $('#usMsg'), b = $('#usBtns'); if (!m || !b) return;
      m.textContent = msg; b.innerHTML = '';
      btns.forEach(function (x) {
        var el = document.createElement('button'); el.type = 'button'; el.className = 'btn ' + (x.gold ? 'gold' : 'ghost') + ' sm'; el.textContent = x.t;
        el.onclick = x.f; b.appendChild(el);
      });
    }
    function run() {
      set('جارٍ التحقق من التحديثات…', []);
      myBuild().then(function (c) {
        return latest().then(function (info) {
          lsSet(CKEY, String(Date.now()));
          var has = needs(info);
          setAvail(has ? info : null); repaint();
          if (!info) set('لم أجد نسخة منشورة بعد', [{ t: 'إغلاق', f: close }]);
          else if (has) set('يوجد تحديث جديد للتطبيق', [
            { t: 'تحديث', gold: true, f: function () { close(); if (!startInstall(info.url)) window.open(info.url, '_blank'); } },
            { t: 'لاحقًا', f: close }]);
          else set('✓ أنت تستخدم أحدث إصدار من التطبيق', [{ t: 'إغلاق', f: close }]);
        });
      }).catch(function () { set('تعذّر التحقق. تأكد من الإنترنت', [{ t: 'إعادة المحاولة', gold: true, f: run }, { t: 'إغلاق', f: close }]); });
    }
    setTimeout(run, 0);
  }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('a[href="#/update"]') : null;
    if (!t) return;
    e.preventDefault(); showUpdateSheet();
  }, true);
  T.addRoute(/^#\/update$/, page);
})();
