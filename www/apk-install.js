/* التحديث من داخل التطبيق: بدل فتح رابط الـ APK في المتصفح، ينزّله ويفتح شاشة التثبيت.
   يعمل مع بطاقة التحديث وشريط «تحديث» وصفحة التحديثات. لو المكوّن غير موجود (APK قديم) يبقى السلوك القديم. */
(function () {
  'use strict';
  var C = window.Capacitor, P = null;
  try {
    if (C) {
      P = (C.Plugins && C.Plugins.ApkInstaller) || null;
      if (!P && C.registerPlugin && (!C.isNativePlatform || C.isNativePlatform())) P = C.registerPlugin('ApkInstaller');
    }
  } catch (e) { P = null; }
  if (!P) return;
  var busy = false;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function modal(html) {
    var m = document.getElementById('apkM');
    if (!m) {
      m = document.createElement('div'); m.id = 'apkM';
      m.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.65);display:flex;align-items:center;justify-content:center;padding:20px;direction:rtl';
      document.body.appendChild(m);
    }
    m.innerHTML = '<div style="background:#0d2f27;color:#f3ead2;border:1px solid #e6bf6355;border-radius:18px;padding:18px;max-width:420px;width:100%;line-height:2;text-align:center;font-family:inherit">' + html + '</div>';
    return m;
  }
  function close() { var m = document.getElementById('apkM'); if (m) m.remove(); }
  function btn(id, label, alt) {
    return '<button type="button" id="' + id + '" style="margin:4px;padding:9px 20px;border-radius:12px;border:' + (alt ? '1px solid #e6bf63' : '0') + ';background:' + (alt ? 'transparent' : '#e6bf63') + ';color:' + (alt ? '#e6bf63' : '#1a1405') + ';font:inherit;font-weight:700">' + label + '</button>';
  }
  function fail(msg) {
    modal('<b>تعذّر التحديث</b><br><small>' + esc(msg) + '</small><br>' + btn('apkX', 'إغلاق', 1));
    document.getElementById('apkX').onclick = close;
    busy = false;
  }

  function run(url) {
    if (busy) return; busy = true;
    P.canInstall().then(function (r) { return r && r.value; }, function () { return true; }).then(function (ok) {
      if (!ok) {
        modal('<b>صلاحية التثبيت</b><br>اسمح للتطبيق بتثبيت التحديثات في الشاشة التالية، ثم ارجع واضغط تحديث مرة أخرى.<br>' + btn('apkS', 'فتح الإعدادات') + btn('apkN', 'إلغاء', 1));
        document.getElementById('apkN').onclick = function () { close(); busy = false; };
        document.getElementById('apkS').onclick = function () { close(); busy = false; P.openSettings().catch(function () {}); };
        return;
      }
      modal('<b>جارٍ تنزيل التحديث…</b><div id="apkP" style="margin-top:6px">0%</div>');
      return Promise.resolve(P.addListener('progress', function (p) {
        var el = document.getElementById('apkP');
        if (el) el.textContent = p.total > 0 ? Math.round(p.done / p.total * 100) + '%' : Math.round(p.done / 1048576) + ' MB';
      })).then(function (h) {
        return P.download({ url: url }).then(function () { try { h.remove(); } catch (e) {} }, function (e) { try { h.remove(); } catch (x) {} throw e; });
      }).then(function () {
        modal('<b>تم التنزيل</b><br>اضغط «تثبيت» في الشاشة التي ستظهر.');
        return P.install();
      }).then(function () { setTimeout(function () { close(); busy = false; }, 2500); });
    }).catch(function (e) { fail(e && e.message || e); });
  }

  window.TAMYApkInstall = run;
  // اعتراض الضغط على روابط الـ APK قبل أن يفتحها المتصفح
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('#updCard.has, #updBar .ub-go, #upGo');
    if (!a) return;
    var url = a.getAttribute('href');
    if (!url || !/^https?:/i.test(url)) return;
    e.preventDefault(); e.stopPropagation();
    run(url);
  }, true);
})();
