/* TAMY — تنبيه الصلاة على النبي ﷺ بصوت، كل مدة تختارها */
(function () {
  'use strict';
  var T = window.TAMY;
  if (!T) return;
  var ar = T.ar, I = T.I;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var KEY = 'tamy_salawat', BASE = 7000, MAX = 120, HORIZON_H = 72;
  var DEF = { on: false, every: 60, from: '08:00', to: '22:00' };
  var feat = { salawat: false, salawatFile: '' };
  function load() { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { return Object.assign({}, DEF); } }
  function saveCfg(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) { /* لا شيء */ } }
  var cfg = load();
  fetch('features.json').then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) { feat.salawat = !!j.salawat; feat.salawatFile = j.salawatFile || ''; }).catch(function () { /* لا شيء */ });

  function LN() {
    try { return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications; } catch (e) { return null; }
  }
  function perm(ln) {
    return ln.checkPermissions().then(function (p) {
      if (p.display === 'granted') return true;
      return ln.requestPermissions().then(function (r) { return r.display === 'granted'; });
    }).catch(function () { return false; });
  }
  function mins(s) { var p = String(s || '0:0').split(':'); return (parseInt(p[0], 10) || 0) * 60 + (parseInt(p[1], 10) || 0); }
  function times() {
    var out = [], now = new Date(), every = Math.max(5, +cfg.every || 60), a = mins(cfg.from), b = mins(cfg.to);
    var t = new Date(now.getTime() + 20000); t.setSeconds(0, 0);
    t.setMinutes(Math.ceil((t.getHours() * 60 + t.getMinutes()) / every) * every - t.getHours() * 60);
    var end = now.getTime() + HORIZON_H * 3600 * 1000;
    while (t.getTime() <= end && out.length < MAX) {
      var m = t.getHours() * 60 + t.getMinutes();
      var inside = a <= b ? (m >= a && m <= b) : (m >= a || m <= b);
      if (inside && t.getTime() > now.getTime() + 5000) out.push(new Date(t.getTime()));
      t = new Date(t.getTime() + every * 60000);
    }
    return out;
  }
  function schedule() {
    var ln = LN(); if (!ln) return Promise.resolve(false);
    return perm(ln).then(function (ok) {
      if (!ok) return false;
      var ch = { id: 'salawat2', name: 'الصلاة على النبي', description: 'تذكير بالصلاة على النبي ﷺ', importance: 4, visibility: 1, vibration: true };
      if (feat.salawat) ch.sound = 'salawat.mp3';
      return ln.createChannel(ch).catch(function () { }).then(function () { return ln.getPending(); }).then(function (pend) {
        var old = (pend.notifications || []).filter(function (n) { return n.id >= BASE && n.id < BASE + 1000; }).map(function (n) { return { id: n.id }; });
        return old.length ? ln.cancel({ notifications: old }) : null;
      }).then(function () {
        if (!cfg.on) return true;
        var list = times().map(function (at, i) {
          var n = { id: BASE + i, title: 'صلِّ على سيدنا محمد ﷺ', body: 'اللهم صلِّ وسلِّم وبارك على سيدنا محمد', schedule: { at: at, allowWhileIdle: true }, channelId: 'salawat2' };
          if (feat.salawat) n.sound = 'salawat.mp3';
          return n;
        });
        return list.length ? ln.schedule({ notifications: list }).then(function () { return true; }) : true;
      });
    }).catch(function () { return false; });
  }
  var timer = 0;
  function later(ms) { clearTimeout(timer); timer = setTimeout(schedule, ms); }
  later(6000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) later(4000); });

  function everyLabel(m) { return m < 60 ? ar(m) + ' دقيقة' : (m === 60 ? 'ساعة' : m === 120 ? 'ساعتين' : ar(m / 60) + ' ساعات'); }
  function page() {
    var EV = [15, 30, 60, 120, 180];
    cfg = load();
    T.view('<div class="page">' +
      '<div class="pg-head"><h1>الصلاة على النبي ﷺ</h1><a class="rd-btn" href="#/settings" aria-label="رجوع">' + I.back + '</a></div>' +
      '<div class="card">' +
        '<label class="row"><span class="rt">تفعيل التنبيه<small>إشعار بصوت كل مدة تختارها</small></span><input type="checkbox" class="sw" id="slOn"' + (cfg.on ? ' checked' : '') + '><i class="sw-i"></i></label>' +
        '<div class="row col"><span class="rt">كل كم</span><div class="presets" id="slEvery">' + EV.map(function (m) { return '<button type="button" class="chip' + (m === +cfg.every ? ' on' : '') + '" data-m="' + m + '">' + everyLabel(m) + '</button>'; }).join('') + '</div></div>' +
        '<label class="row"><span class="rt">من الساعة</span><input type="time" class="tin" id="slFrom" value="' + cfg.from + '"></label>' +
        '<label class="row"><span class="rt">إلى الساعة</span><input type="time" class="tin" id="slTo" value="' + cfg.to + '"></label>' +
        '<div class="row btns"><button type="button" class="btn ghost sm" id="slTest">تنبيه تجريبي</button>' + (feat.salawatFile ? '<button type="button" class="btn ghost sm" id="slPlay">' + I.play + 'سماع الصوت</button>' : '') + '</div>' +
      '</div>' +
      '<p class="note">' + (feat.salawat ? 'التنبيه سيصلك بصوت الصلاة على النبي.' : 'لم يُضف ملف الصوت بعد، فسيصلك التنبيه بنغمة الإشعار العادية.') + ' يعمل التنبيه والتطبيق مغلق، ويُجدَّد في كل مرة تفتح فيها التطبيق (يغطي الأيام الثلاثة القادمة).</p>' +
      '</div>', 'page');
    function commit() { saveCfg(cfg); later(800); }
    $('#slOn').onchange = function (e) { cfg.on = e.target.checked; commit(); T.toast(cfg.on ? 'تم تفعيل التنبيه' : 'تم إيقاف التنبيه'); };
    $$('#slEvery .chip').forEach(function (c) { c.onclick = function () { cfg.every = +c.getAttribute('data-m'); $$('#slEvery .chip').forEach(function (x) { x.classList.toggle('on', x === c); }); commit(); }; });
    $('#slFrom').onchange = function (e) { cfg.from = e.target.value || '08:00'; commit(); };
    $('#slTo').onchange = function (e) { cfg.to = e.target.value || '22:00'; commit(); };
    $('#slTest').onclick = function () {
      var ln = LN(); if (!ln) { T.toast('التنبيهات تعمل داخل تطبيق الأندرويد فقط'); return; }
      schedule().then(function () { return perm(ln); }).then(function (ok) {
        if (!ok) { T.toast('فعّل إذن الإشعارات للتطبيق من إعدادات الهاتف'); return; }
        var n = { id: 9997, title: 'صلِّ على سيدنا محمد ﷺ', body: 'اللهم صلِّ وسلِّم وبارك على سيدنا محمد', schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }, channelId: 'salawat2' };
        if (feat.salawat) n.sound = 'salawat.mp3';
        ln.schedule({ notifications: [n] }).then(function () { T.toast('سيصلك التنبيه بعد ٥ ثوانٍ'); });
      });
    };
    if ($('#slPlay')) $('#slPlay').onclick = function () { try { var a = new Audio(feat.salawatFile); a.play().catch(function () { T.toast('تعذّر تشغيل الصوت'); }); } catch (e) { /* لا شيء */ } };
    T.bindRipples && T.bindRipples();
  }
  T.addRoute(/^#\/salawat$/, page);
})();
