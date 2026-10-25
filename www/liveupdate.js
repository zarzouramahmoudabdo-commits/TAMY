/* التحديث المباشر: ينزّل حزمة www الجديدة من GitHub ويطبّقها بدون تثبيت APK */
(function () {
  'use strict';
  var C = window.Capacitor, U = C && C.Plugins && C.Plugins.CapacitorUpdater;
  if (!U) return;
  try { U.notifyAppReady(); } catch (e) { /* لا شيء */ }
  var API = 'https://api.github.com/repos/zarzouramahmoudabdo-commits/TAMY/releases/latest';
  var KD = 'tamy_ota_dl', KL = 'tamy_ota_last', busy = false, pending = null;
  function g(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function s(k, v) { try { localStorage.setItem(k, String(v)); } catch (e) { /* لا شيء */ } }
  function curBuild() { return fetch('version.json').then(function (r) { return r.json(); }).then(function (j) { return +j.build || 0; }).catch(function () { return 0; }); }
  function apkLevel() {
    return U.getBuiltinVersion().then(function (r) { return parseInt(String((r && r.version) || '').split('.')[2], 10) || 0; }).catch(function () { return -1; });
  }
  function cleanup(keepId) {
    try {
      Promise.all([U.list(), U.current()]).then(function (a) {
        var cur = a[1] && a[1].bundle && a[1].bundle.id;
        (a[0].bundles || []).forEach(function (b) { if (b.id !== 'builtin' && b.id !== keepId && b.id !== cur) U.delete({ id: b.id }).catch(function () { /* لا شيء */ }); });
      }).catch(function () { /* لا شيء */ });
    } catch (e) { /* لا شيء */ }
  }
  function check(force) {
    if (busy) return;
    if (!force && Date.now() - (+g(KL) || 0) < 600000) return;
    var cn = navigator.connection;
    if (cn && cn.type === 'cellular' && !force) return;      // لا ننزّل الحزمة على بيانات الموبايل
    busy = true; s(KL, Date.now());
    Promise.all([
      fetch(API, { headers: { Accept: 'application/vnd.github+json' } }).then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); }),
      curBuild(), apkLevel()
    ]).then(function (a) {
      var rel = a[0], cur = a[1], lvl = a[2], m = /^build-(\d+)$/.exec(rel.tag_name || '');
      if (!m) return;
      var n = +m[1];
      if (n <= cur || n <= (+g(KD) || 0)) return;
      var asset = (rel.assets || []).filter(function (x) { return /^www_l\d+\.zip$/.test(x.name); })[0];
      if (!asset) return;
      var L = +/^www_l(\d+)\.zip$/.exec(asset.name)[1];
      if (lvl < 0 || L !== lvl) return;                       // التحديث يحتاج APK جديد
      return U.download({ url: asset.browser_download_url, version: String(n) }).then(function (b) {
        return U.next({ id: b.id }).then(function () { s(KD, n); pending = b.id; cleanup(b.id); });
      });
    }).catch(function () { /* لا شيء */ }).then(function () { busy = false; });
  }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) return;
    if (pending) { var id = pending; pending = null; U.set({ id: id }).catch(function () { /* لا شيء */ }); return; }
    setTimeout(function () { check(false); }, 2500);
  });
  setTimeout(function () { check(false); }, 6000);
  window.TAMYLiveUpdate = { check: function () { check(true); } };
})();
