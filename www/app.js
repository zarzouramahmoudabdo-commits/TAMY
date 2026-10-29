/* TAMY — التطبيق الرئيسي */
(function () {
  'use strict';

  var D = window.TAMY_DATA, I = window.ICONS, P = window.PrayerTimes;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- أدوات مساعدة ---------- */
  var AR_DIGITS = '٠١٢٣٤٥٦٧٨٩';
  function ar(n) { return String(n).replace(/\d/g, function (d) { return AR_DIGITS[+d]; }); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function dayKey(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function fmtTime(d) {
    if (!d) return '—';
    var h = d.getHours(), m = d.getMinutes(), s = h >= 12 ? 'م' : 'ص';
    h = h % 12; if (h === 0) h = 12;
    return ar(h + ':' + pad(m)) + ' ' + s;
  }
  function fmtCountdown(ms) {
    if (ms < 0) ms = 0;
    var t = Math.floor(ms / 1000), h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return ar(pad(h) + ':' + pad(m) + ':' + pad(s));
  }

  /* ---------- الحالة المحفوظة ---------- */
  var KEY = 'tamy_v1';
  var DEFAULTS = {
    fav: [],
    done: {},
    prog: { d: '', c: {} },
    tasbeeh: { dhikr: 0, target: 33, count: 0, total: 0, today: { d: '', c: 0 } },
    quran: { last: null, marks: [], size: 30 },
    settings: {
      vibrate: true,
      fontSize: 28,
      method: 'EGYPT',
      asr: 'standard',
      adjust: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      city: { name: 'القاهرة', lat: 30.0444, lng: 31.2357 },
      hijriOffset: 0,
      nPrayer: true,
      nMorning: true, tMorning: '06:00',
      nEvening: true, tEvening: '17:30',
      nSleep: true, tSleep: '22:30',
      nKahf: true,
      adhan: true,
      theme: { bg: '', fg: '' },
      lastSchedule: 0,
      schedVer: 0
    }
  };
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function merge(base, over) {
    var out = clone(base);
    (function rec(a, b) {
      if (!b || typeof b !== 'object') return;
      Object.keys(b).forEach(function (k) {
        if (a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && typeof b[k] === 'object' && b[k] !== null) rec(a[k], b[k]);
        else a[k] = b[k];
      });
    })(out, over);
    return out;
  }
  var FEATURES = { adhan: false, adhanFajr: false };
  var SCHED_VER = 5;   // يُرفع عند تغيير شكل التنبيهات ليُعاد جدولتها بعد التحديث
  var S;
  try { S = merge(DEFAULTS, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = clone(DEFAULTS); }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* التخزين غير متاح */ } }

  /* ---------- تأثيرات ---------- */
  function vib(p) { try { if (S.settings.vibrate && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* لا شيء */ } }
  var toastTimer;
  function toast(msg) {
    var t = $('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.classList.remove('show'); }, 2200);
  }
  function ripple(e, el) {
    try {
      var r = el.getBoundingClientRect(), s = document.createElement('span');
      var size = Math.max(r.width, r.height) * 1.2;
      s.className = 'rip';
      s.style.width = s.style.height = size + 'px';
      var x = (e && e.clientX != null ? e.clientX : r.left + r.width / 2) - r.left - size / 2;
      var y = (e && e.clientY != null ? e.clientY : r.top + r.height / 2) - r.top - size / 2;
      s.style.left = x + 'px'; s.style.top = y + 'px';
      el.appendChild(s); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 650);
    } catch (err) { /* لا شيء */ }
  }
  function copyText(txt) {
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) { /* لا شيء */ }
      document.body.removeChild(ta);
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).catch(fallback); else fallback();
    } catch (e) { fallback(); }
    toast('تم النسخ');
  }

  /* ---------- التقويم الهجري ---------- */
  function hijri(d) {
    try {
      var x = new Date(d.getTime() + (S.settings.hijriOffset || 0) * 86400000);
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' }).format(x).replace(/\s?هـ$/, '') + ' هـ';
    } catch (e) { return ''; }
  }
  function gregorian(d) {
    try { return new Intl.DateTimeFormat('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' }).format(d); } catch (e) { return ''; }
  }

  /* ---------- المواقيت ---------- */
  var tcache = { k: '', v: null };
  function opts() { return { method: S.settings.method, asr: S.settings.asr, adjust: S.settings.adjust }; }
  function timesFor(date) {
    var c = S.settings.city;
    var k = [dayKey(date), c.lat, c.lng, S.settings.method, S.settings.asr, JSON.stringify(S.settings.adjust)].join('|');
    if (tcache.k === k) return tcache.v;
    var v = P.compute(date, c.lat, c.lng, opts());
    tcache = { k: k, v: v };
    return v;
  }
  function nextPrayer(now) { var c = S.settings.city; return P.next(now, c.lat, c.lng, opts()); }
  function prayerLabel(key, date) {
    if (key === 'dhuhr' && date && date.getDay() === 5) return 'الجمعة';
    return D.prayerNames[key];
  }

  /* ---------- التنبيهات (Capacitor Local Notifications) ---------- */
  // أي قناة تُستخدم لتنبيه الصلاة: قناة الأذان إن كان مفعّلًا ومتوفرًا، وإلا القناة العادية
  function adhanSelOf(key) {
    var L = FEATURES.adhans || [], i, want, hasFajr = false;
    if (!L.length) return null;
    for (i = 0; i < L.length; i++) if (L[i].id === 'adhan_fajr') hasFajr = true;
    want = key === 'fajr' ? (S.settings.fajrSel || (hasFajr ? 'adhan_fajr' : (S.settings.adhanSel || 'adhan'))) : (S.settings.adhanSel || 'adhan');
    for (i = 0; i < L.length; i++) if (L[i].id === want) return L[i];
    return L[0];
  }
  function testSound() { var a = adhanSelOf('dhuhr'); return a ? { ch: a.ch, snd: a.ch + '.mp3' } : { ch: 'adhan2', snd: 'adhan.mp3' }; }
  function cleanupChans(chans) {
    var LN = Notif.plugin();
    if (!LN || !LN.listChannels) return null;
    var keep = chans.map(function (c) { return c.id; });
    return LN.listChannels().then(function (r) {
      return Promise.all((r.channels || []).filter(function (c) { return /^adh_/.test(c.id) && keep.indexOf(c.id) < 0; }).map(function (c) { return LN.deleteChannel({ id: c.id }).catch(function () { }); }));
    }).catch(function () { });
  }
  function adhanPicker() {
    var L = FEATURES.adhans || [];
    function grp(title, cur, attr) {
      return '<div class="row ad-row"><span class="rt">' + title + '</span><select class="ad-sel" data-adh="' + attr + '">' +
        L.map(function (a) { return '<option value="' + esc(a.id) + '"' + (cur && cur.id === a.id ? ' selected' : '') + '>' + esc(a.label) + '</option>'; }).join('') + '</select></div>';
    }
    return grp('أذان الصلوات', adhanSelOf('dhuhr'), 'adhanSel') + grp('أذان الفجر', adhanSelOf('fajr'), 'fajrSel') +
      '<div class="row"><small>عند الاختيار تسمع جزءًا من الأذان</small></div>';
  }
  var prevAudio = null, prevTimer = null;
  function stopPrev() { try { if (prevAudio) prevAudio.pause(); } catch (e) { /* لا شيء */ } prevAudio = null; clearTimeout(prevTimer); }
  function bindAdhanPick() {
    Array.prototype.forEach.call(document.querySelectorAll('select[data-adh]'), function (sel) {
      sel.onchange = function () {
        var attr = sel.getAttribute('data-adh'), id = sel.value;
        S.settings[attr] = id; save();
        stopPrev();
        var a = (FEATURES.adhans || []).filter(function (x) { return x.id === id; })[0]; if (!a) return;
        try { prevAudio = new Audio(a.file); var pr = prevAudio.play(); if (pr && pr.catch) pr.catch(function () { /* لا شيء */ }); prevTimer = setTimeout(stopPrev, 12000); } catch (e) { /* لا شيء */ }
        reschedule();
      };
    });
  }
  function adhanChannel(key) {
    if (!S.settings.adhan) return 'prayer';
    var sel = adhanSelOf(key); if (sel) return sel.ch;
    if (!FEATURES.adhan) return 'prayer';
    return (key === 'fajr' && FEATURES.adhanFajr) ? 'adhan_fajr2' : 'adhan2';
  }
  var Notif = {
    plugin: function () {
      try { return window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform() && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications; } catch (e) { return null; }
    },
    available: function () { return !!Notif.plugin(); },
    ensurePermission: function () {
      var LN = Notif.plugin(); if (!LN) return Promise.resolve(false);
      return LN.checkPermissions().then(function (p) {
        if (p.display === 'granted') return true;
        return LN.requestPermissions().then(function (r) { return r.display === 'granted'; });
      }).catch(function () { return false; });
    },
    schedule: function (force) {
      var LN = Notif.plugin(); if (!LN) return Promise.resolve(false);
      var st = S.settings;
      if (!force && st.schedVer === SCHED_VER && Date.now() - (st.lastSchedule || 0) < 6 * 3600 * 1000) return Promise.resolve(true);
      return Notif.ensurePermission().then(function (ok) {
        if (!ok) return false;
        var chans = [
          { id: 'prayer', name: 'مواقيت الصلاة', description: 'تنبيه عند دخول وقت الصلاة', importance: 5, visibility: 1, vibration: true },
          { id: 'azkar', name: 'تذكير الأذكار', description: 'أذكار الصباح والمساء والنوم', importance: 4, visibility: 1, vibration: true }
        ];
        if (FEATURES.adhan) chans.push({ id: 'adhan2', name: 'الأذان', description: 'صوت الأذان عند دخول وقت الصلاة', importance: 5, visibility: 1, vibration: true, sound: 'adhan.mp3' });
        if (FEATURES.adhanFajr) chans.push({ id: 'adhan_fajr2', name: 'أذان الفجر', description: 'أذان الفجر', importance: 5, visibility: 1, vibration: true, sound: 'adhan_fajr.mp3' });
        (FEATURES.adhans || []).forEach(function (a) { chans.push({ id: a.ch, name: 'الأذان — ' + a.label, description: 'صوت الأذان', importance: 5, visibility: 1, vibration: true, sound: a.ch + '.mp3' }); });
        return Promise.all(chans.map(function (c) { return LN.createChannel(c).catch(function () { }); })).then(function () {
          return cleanupChans(chans);
        }).then(function () {
          return LN.getPending();
        }).then(function (pend) {
          var old = (pend.notifications || []).filter(function (n) { return n.id < 7000; }).map(function (n) { return { id: n.id }; });
          return old.length ? LN.cancel({ notifications: old }) : null;
        }).then(function () {
          var list = [], now = new Date(), c = st.city;
          if (st.nPrayer) {
            for (var i = 0; i < 14; i++) {
              var day = P.addDays(now, i), t = P.compute(day, c.lat, c.lng, opts());
              ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].forEach(function (k, idx) {
                var at = t[k];
                if (!at || at.getTime() <= now.getTime() + 5000) return;
                var ch = adhanChannel(k);
                var n = {
                  id: 1000 + i * 10 + idx,
                  title: 'حان الآن موعد صلاة ' + prayerLabel(k, at),
                  body: 'حيّ على الصلاة — ' + c.name,
                  schedule: { at: at, allowWhileIdle: true },
                  channelId: ch
                };
                if (ch !== 'prayer') n.sound = ch + '.mp3';
                list.push(n);
              });
              (function () {
                if (localStorage.getItem('tamy_prem') === '0') return;
                var pk; try { pk = JSON.parse(localStorage.getItem('tamy_pray') || '{}') || {}; } catch (e) { pk = {}; }
                var dk = day.getFullYear() + '-' + ('0' + (day.getMonth() + 1)).slice(-2) + '-' + ('0' + day.getDate()).slice(-2);
                var dn = Math.floor((new Date(day.getFullYear(), day.getMonth(), day.getDate()) - new Date(2020, 0, 1)) / 864e5);
                var mk = pk[dk] || {}, keys = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
                var ends = [t.sunrise, t.asr, t.maghrib, t.isha, null], nl = ['الشروق', 'العصر', 'المغرب', 'العشاء', ''];
                keys.forEach(function (k, idx) {
                  var s = t[k], e = ends[idx], at;
                  if (!s || mk[k]) return;
                  if (e) at = new Date(Math.max(s.getTime() + 20 * 60000, e.getTime() - 60 * 60000));
                  else at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 0, 0);
                  if (at.getTime() <= now.getTime() + 5000) return;
                  if (e && at.getTime() >= e.getTime()) return;
                  var rem = e ? Math.round((e.getTime() - at.getTime()) / 60000) : 0;
                  list.push({
                    id: 5000 + (dn % 300) * 5 + idx,
                    title: 'هل صليت ' + prayerLabel(k, s) + '؟',
                    body: e ? ('باقي ' + (rem === 60 ? 'نحو ساعة' : rem + ' دقيقة') + ' على ' + nl[idx] + ' — اضغط لتعليمها في صلواتي') : 'لا تنسَ صلاة العشاء — اضغط لتعليمها في صلواتي',
                    schedule: { at: at, allowWhileIdle: true },
                    channelId: 'pcheck',
                    extra: { route: '#/prayers', key: k }
                  });
                });
              })();
            }
          }
          function hm(s) { var p = String(s || '06:00').split(':'); return { hour: parseInt(p[0], 10) || 0, minute: parseInt(p[1], 10) || 0 }; }
          if (st.nMorning) list.push({ id: 1, title: 'أذكار الصباح', body: 'ابدأ يومك بذكر الله — حصّن نفسك بأذكار الصباح', schedule: { on: hm(st.tMorning), allowWhileIdle: true }, channelId: 'azkar' });
          if (st.nEvening) list.push({ id: 2, title: 'أذكار المساء', body: 'حان وقت أذكار المساء — اختم نهارك بذكر الله', schedule: { on: hm(st.tEvening), allowWhileIdle: true }, channelId: 'azkar' });
          if (st.nSleep) list.push({ id: 3, title: 'أذكار النوم', body: 'قبل أن تنام: آية الكرسي والمعوّذات وأذكار النوم', schedule: { on: hm(st.tSleep), allowWhileIdle: true }, channelId: 'azkar' });
          if (st.nKahf) list.push({ id: 4, title: 'يوم الجمعة', body: 'لا تنسَ سورة الكهف والإكثار من الصلاة على النبي ﷺ', schedule: { on: { weekday: 6, hour: 9, minute: 0 }, allowWhileIdle: true }, channelId: 'azkar' });
          if (!list.length) return true;
          return LN.schedule({ notifications: list }).then(function () { st.lastSchedule = Date.now(); st.schedVer = SCHED_VER; save(); return true; });
        });
      }).catch(function (e) { try { console.warn('schedule failed', e); } catch (x) { /* لا شيء */ } return false; });
    },
    test: function () {
      var LN = Notif.plugin();
      if (!LN) { toast('التنبيهات تعمل داخل تطبيق الأندرويد فقط'); return; }
      Notif.ensurePermission().then(function (ok) {
        if (!ok) { toast('من فضلك فعّل إذن الإشعارات للتطبيق من إعدادات الهاتف'); return; }
        LN.schedule({ notifications: [{ id: 9999, title: 'TAMY', body: 'هذا تنبيه تجريبي — تقبّل الله طاعتكم', schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }, channelId: 'azkar' }] })
          .then(function () { toast('سيصلك تنبيه تجريبي بعد ٥ ثوانٍ'); });
      });
    },
    testAdhan: function () {
      var LN = Notif.plugin();
      if (!LN) { toast('التنبيهات تعمل داخل تطبيق الأندرويد فقط'); return; }
      if (!FEATURES.adhan) { toast('لم يُضف ملف الأذان إلى هذه النسخة'); return; }
      Notif.schedule(true).then(function () { return Notif.ensurePermission(); }).then(function (ok) {
        if (!ok) { toast('فعّل إذن الإشعارات للتطبيق من إعدادات الهاتف'); return; }
        LN.schedule({ notifications: [{ id: 9998, title: 'تجربة الأذان', body: 'هكذا سيصلك تنبيه الصلاة', schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true }, channelId: testSound().ch, sound: testSound().snd }] })
          .then(function () { toast('سيصلك الأذان بعد ٥ ثوانٍ'); });
      });
    },
    exact: function () {
      var LN = Notif.plugin();
      if (!LN || !LN.changeExactNotificationSetting) { toast('غير متاح على هذا الجهاز'); return; }
      LN.changeExactNotificationSetting().catch(function () { });
    }
  };

  window.TAMYNotif = Notif;

  /* ---------- الأذان داخل التطبيق ---------- */
  var player = { audio: null };
  function adhanFile(key) { var a = adhanSelOf(key); if (a) return a.file; return (key === 'fajr' && FEATURES.adhanFajr) ? FEATURES.adhanFajrFile : FEATURES.adhanFile; }
  function stopAdhan() {
    try { if (player.audio) { player.audio.pause(); player.audio = null; } } catch (e) { /* لا شيء */ }
    var b = $('#adhanBar'); if (b) b.remove();
  }
  function barHtml(title, playing) {
    return '<span class="ab-t">' + esc(title) + '</span>' +
      (playing ? '' : '<button class="ab-b" data-a="play">' + I.play + 'تشغيل الأذان</button>') +
      '<button class="ab-b" data-a="stop">' + (playing ? I.stop + 'إيقاف' : 'إغلاق') + '</button>';
  }
  function showBar(title, playing, key) {
    var b = $('#adhanBar');
    if (!b) { b = document.createElement('div'); b.id = 'adhanBar'; document.body.appendChild(b); }
    b.innerHTML = barHtml(title, playing);
    $$('button', b).forEach(function (btn) {
      btn.onclick = function () {
        if (btn.getAttribute('data-a') === 'stop') { stopAdhan(); return; }
        playAdhan(key, title);
      };
    });
  }
  function playAdhan(key, title) {
    if (window.TAMYRadio) window.TAMYRadio.stop();
    var f = adhanFile(key);
    if (!FEATURES.adhan || !f) { toast('لم يُضف ملف الأذان إلى هذه النسخة'); return; }
    try { if (player.audio) player.audio.pause(); } catch (e) { /* لا شيء */ }
    var a = new Audio(f); player.audio = a;
    a.onended = stopAdhan;
    a.onerror = function () { toast('تعذّر تشغيل ملف الأذان'); stopAdhan(); };
    var pr = a.play();
    showBar(title || 'الأذان', true, key);
    if (pr && pr.catch) pr.catch(function () { toast('تعذّر تشغيل الصوت'); stopAdhan(); });
  }
  // عند دخول الوقت والتطبيق مفتوح: شريط بزر لتشغيل الأذان كاملًا (إشعار النظام يعمل بصوته القصير)
  var lastFired = '';
  function adhanWatch() {
    if (document.hidden) return;
    var now = new Date(), t = timesFor(now);
    P.ORDER.forEach(function (k) {
      var at = t[k]; if (!at) return;
      var d = now.getTime() - at.getTime();
      var id = dayKey(now) + k;
      if (d >= 0 && d < 4000 && lastFired !== id) {
        lastFired = id;
        if (S.settings.nPrayer) showBar('حان الآن موعد صلاة ' + prayerLabel(k, at), false, k);
      }
    });
  }

  /* ---------- الموجّه (Router) ---------- */
  var timers = [], cleaners = [];
  function every(fn, ms) { var id = setInterval(fn, ms); timers.push(id); return id; }
  function onCleanup(fn) { cleaners.push(fn); }
  function cleanup() {
    timers.forEach(clearInterval); timers = [];
    cleaners.forEach(function (f) { try { f(); } catch (e) { /* لا شيء */ } }); cleaners = [];
  }
  function view(html, cls) {
    var app = $('#app');
    app.className = cls || '';
    app.innerHTML = html;
    app.scrollTop = 0;
    document.body.classList.toggle('reading', cls === 'reading');
    app.classList.remove('enter'); void app.offsetWidth; app.classList.add('enter');
  }

  var ROUTES = [
    [/^#\/?$/, home],
    [/^#\/read\/([\w-]+)(?:\/(\d+))?$/, reader],
    [/^#\/tasbeeh$/, tasbeeh],
    [/^#\/times$/, times],
    [/^#\/qibla$/, qibla],
    [/^#\/names$/, names],
    [/^#\/settings$/, settings]
  ];
  function render() {
    cleanup();
    var h = location.hash || '#/';
    for (var i = 0; i < ROUTES.length; i++) {
      var m = h.match(ROUTES[i][0]);
      if (m) { ROUTES[i][1].apply(null, m.slice(1)); updateNav(h); return; }
    }
    home(); updateNav('#/');
  }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }

  /* ---------- الشريط السفلي ---------- */
  var NAV = [
    ['#/', 'الرئيسية', 'home_nav'],
    ['#/quran', 'القرآن', 'quran'],
    ['#/tasbeeh', 'المسبحة', 'beads'],
    ['#/times', 'المواقيت', 'clock'],
    ['#/settings', 'الإعدادات', 'gear']
  ];
  function buildNav() {
    $('#nav').innerHTML = NAV.map(function (n) {
      return '<a href="' + n[0] + '" data-h="' + n[0] + '">' + I[n[2]] + '<span>' + n[1] + '</span></a>';
    }).join('');
  }
  function updateNav(h) {
    h = h || '#/';
    $$('#nav a').forEach(function (a) {
      var t = a.getAttribute('data-h');
      a.classList.toggle('on', t === '#/' ? h === '#/' : h === t || h.indexOf(t + '/') === 0);
    });
  }

  /* ---------- الصفحة الرئيسية ---------- */
  function greeting(now) {
    var h = now.getHours();
    if (h >= 4 && h < 12) return 'صباح الخير';
    if (h >= 12 && h < 17) return 'طاب يومك';
    if (h >= 17 && h < 21) return 'مساء الخير';
    return 'ليلة مباركة';
  }
  function suggested(now) {
    var h = now.getHours();
    if (h >= 4 && h < 11) return 'morning';
    if (h >= 15 && h < 20) return 'evening';
    if (h >= 21 || h < 3) return 'sleep';
    return '';
  }
  function tileHtml(c, sug, today) {
    var done = S.done[today] && S.done[today][c.id];
    var badge = done ? '<span class="badge ok">' + I.check + '</span>' : (sug === c.id ? '<span class="badge now">الآن</span>' : '');
    return '<a class="tile tone-' + c.tone + (sug === c.id ? ' sug' : '') + '" href="#/read/' + c.id + '">' +
      '<span class="t-ic">' + I[c.icon] + '</span>' +
      '<span class="t-tt">' + esc(c.title) + '</span>' +
      '<span class="t-sub">' + esc(c.sub) + '</span>' + badge + '</a>';
  }

  function home() {
    var now = new Date(), today = dayKey(now), sug = suggested(now);
    var favCount = S.fav.length;
    var groups = D.groups.map(function (g) {
      var cats = D.categories.filter(function (c) { return c.group === g.id; });
      var isRail = cats.length > 1;
      if (isRail && sug) cats = cats.filter(function (c) { return c.id === sug; }).concat(cats.filter(function (c) { return c.id !== sug; }));
      var tiles = cats.map(function (c) {
        if (!isRail) return tileHtml(c, sug, today);
        var dn = S.done[today] && S.done[today][c.id];
        return '<a class="azk-card tone-' + c.tone + (sug === c.id ? ' sug on' : '') + '" href="#/read/' + c.id + '">' +
          '<span class="azk-ic">' + I[c.icon] + '</span>' +
          (dn ? '<span class="azk-bd ok">' + I.check + '</span>' : (sug === c.id ? '<span class="azk-bd">الآن</span>' : '')) +
          '<span class="azk-tt">' + esc(c.title) + '</span><span class="azk-sub">' + esc(c.sub) + '</span></a>';
      }).join('');
      return '<section class="sec"><h2><span class="orn"></span>' + g.title + '<span class="orn"></span></h2>' + (isRail ? '<div class="azk-rail">' : '<div class="grid">') + tiles + '</div></section>';
    }).join('');

    var tools = [
      ['#/tasbeeh', 'المسبحة', 'beads', 3],
      ['#/times', 'المواقيت', 'clock', 2],
      ['#/qibla', 'القبلة', 'qibla', 0],
      ['#/names', 'أسماء الله', 'names', 5],
      ['#/read/fav', 'المفضلة' + (favCount ? ' (' + ar(favCount) + ')' : ''), 'fav', 6],
      ['#/settings', 'الإعدادات', 'gear', 7]
    ].map(function (t) {
      return '<a class="tool tone-' + t[3] + '" href="' + t[0] + '"><span class="tl-ic">' + I[t[2]] + '</span><span>' + t[1] + '</span></a>';
    }).join('');

    var QS = window.TAMY_SURAHS, ql = S.quran.last;
    var quranCard = '<a class="quran-card" href="#/quran"><span class="qc-ic">' + I.quran + '</span><span class="qc-tx"><b>القرآن الكريم</b><small>' +
      (ql && QS && QS.list[ql.s - 1] ? 'متابعة القراءة: سورة ' + QS.list[ql.s - 1].name + ' — آية ' + ar(ql.a) : 'المصحف كاملًا بالترتيب — ١١٤ سورة') +
      '</small></span><span class="qc-go">' + I.back + '</span></a>';
    view(
      '<header class="hero">' +
        '<div class="hero-top">' +
          '<div><div class="salam">السلام عليكم ورحمة الله</div><div class="greet">' + greeting(now) + '</div></div>' +
          '<div class="dates"><b>' + esc(hijri(now)) + '</b><small>' + esc(gregorian(now)) + '</small><span class="cr"><i>تم عمل التطبيق بواسطة</i><b>Mahmoud A Zarzoura</b></span></div>' +
        '</div>' +
        '<div class="next-card" id="nextCard"></div>' +
      '</header>' + quranCard + (window.TAMYExtras ? window.TAMYExtras() : '') +
      groups +
      '<section class="sec"><h2><span class="orn"></span>الأدوات<span class="orn"></span></h2><div class="tools">' + tools + '</div></section>' +
      '<div class="upd-end">' + (window.TAMYUpdateCard ? window.TAMYUpdateCard() : '') + '</div>' +
      '<div class="home-signature"><p class="foot">﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾</p></div>'
    );
    (function () {
      Array.prototype.forEach.call(document.querySelectorAll('.azk-rail'), function (rail) {
      var cs = rail.querySelectorAll('.azk-card'), raf = 0;
      function mark() {
        raf = 0; var r = rail.getBoundingClientRect(), mid = r.left + r.width / 2, best = null, bd = 1e9;
        for (var i = 0; i < cs.length; i++) { var b = cs[i].getBoundingClientRect(), d = Math.abs(b.left + b.width / 2 - mid); if (d < bd) { bd = d; best = cs[i]; } }
        for (var j = 0; j < cs.length; j++) cs[j].classList.toggle('on', cs[j] === best);
      }
      rail.addEventListener('scroll', function () { if (!raf) raf = requestAnimationFrame(mark); }, { passive: true });
      mark();
      });
    })();

    function tick() {
      var n = new Date(), nx = nextPrayer(n), t = nx.today;
      var cur = P.current(n, t);
      var pills = P.ORDER.map(function (k) {
        return '<div class="pill' + (k === nx.key && !nx.tomorrow ? ' next' : '') + (k === cur ? ' cur' : '') + '"><span>' + prayerLabel(k, t[k]) + '</span><b>' + fmtTime(t[k]) + '</b></div>';
      }).join('');
      var el = $('#nextCard'); if (!el) return;
      el.innerHTML =
        '<div class="nc-row"><div><div class="nc-lbl">الصلاة القادمة</div><div class="nc-name">' + prayerLabel(nx.key, nx.time) + '</div></div>' +
        '<div class="nc-time"><b>' + fmtTime(nx.time) + '</b><small>بعد ' + fmtCountdown(nx.time.getTime() - n.getTime()) + '</small></div></div>' +
        '<div class="pills">' + pills + '</div>' +
        '<div class="nc-loc">' + I.pin + esc(S.settings.city.name) + '</div>';
    }
    tick(); every(tick, 1000);
    bindRipples();
  }

  function bindRipples() {
    $$('.tile, .tool, .btn, .rd-btn').forEach(function (el) {
      el.addEventListener('pointerdown', function (e) { ripple(e, el); });
    });
  }

  /* ---------- قارئ الأذكار ---------- */
  function favCategory() {
    var items = [];
    S.fav.forEach(function (key) {
      var p = key.split(':'), c = D.byId[p[0]];
      if (c && c.items[+p[1]]) { var it = c.items[+p[1]]; items.push({ h: it.h, t: it.t, n: it.n, s: it.s, key: key }); }
    });
    return { id: 'fav', title: 'المفضلة', icon: 'fav', tone: 6, items: items };
  }
  function progFor(cat) {
    var today = dayKey();
    if (S.prog.d !== today) { S.prog = { d: today, c: {} }; }
    var arr = S.prog.c[cat.id];
    if (!arr || arr.length !== cat.items.length) {
      arr = cat.items.map(function (i) { return i.n || 1; });
      S.prog.c[cat.id] = arr;
    }
    return arr;
  }

  function reader(id, start) {
    var cat = id === 'fav' ? favCategory() : D.byId[id];
    if (!cat) { go('#/'); return; }
    if (!cat.items.length) {
      view('<div class="empty">' + I.fav + '<h3>لا توجد أذكار في المفضلة بعد</h3><p>اضغط على النجمة أثناء قراءة أي ذكر لإضافته هنا.</p><a class="btn gold" href="#/">العودة للرئيسية</a></div>', 'page');
      bindRipples(); return;
    }
    var rem = progFor(cat);
    var idx = Math.min(+start || 0, cat.items.length - 1);
    var sizes = [22, 25, 28, 32, 36];

    function keyOf(i) { return cat.items[i].key || (cat.id + ':' + i); }
    function isFav(i) { return S.fav.indexOf(keyOf(i)) > -1; }
    function doneAll() { return rem.every(function (r) { return r === 0; }); }
    function doneCount() { return rem.filter(function (r) { return r === 0; }).length; }
    function firstOpen(from) {
      var n = rem.length, k;
      for (k = 1; k <= n; k++) { var j = (from + k) % n; if (rem[j] > 0) return j; }
      return -1;
    }

    function ring(i) {
      var total = cat.items[i].n || 1, r = rem[i], frac = (total - r) / total;
      var C = 2 * Math.PI * 52, off = C * (1 - frac);
      var center = r === 0 ? I.check : '<b>' + ar(r) + '</b>' + (total > 1 ? '<small>من ' + ar(total) + '</small>' : '<small>اضغط</small>');
      return '<svg class="ring" viewBox="0 0 120 120"><circle class="rg-bg" cx="60" cy="60" r="52"/><circle class="rg-fg" cx="60" cy="60" r="52" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg><span class="rg-c">' + center + '</span>';
    }

    function draw() {
      if (doneAll()) { drawFinish(); return; }
      var it = cat.items[idx], pct = Math.round(doneCount() / rem.length * 100);
      view(
        '<div class="rd">' +
          '<div class="rd-bar">' +
            '<button class="rd-btn" id="rdBack" aria-label="رجوع">' + I.back + '</button>' +
            '<div class="rd-title">' + esc(cat.title) + '</div>' +
            '<button class="rd-btn" id="rdList" aria-label="القائمة">' + I.list + '</button>' +
          '</div>' +
          '<div class="rd-prog"><i style="width:' + pct + '%"></i></div>' +
          '<div class="rd-meta"><span>' + ar(idx + 1) + ' / ' + ar(cat.items.length) + '</span><span>' + ar(pct) + '٪ مكتمل</span></div>' +
          '<div class="rd-card' + (rem[idx] === 0 ? ' done' : '') + '" id="rdCard">' +
            (it.h ? '<div class="rd-h">' + esc(it.h) + '</div>' : '') +
            '<div class="ztxt" style="font-size:' + S.settings.fontSize + 'px">' + esc(it.t) + '</div>' +
            (it.s ? '<div class="zs">' + esc(it.s) + '</div>' : '') +
          '</div>' +
          '<div class="rd-ctrl">' +
            '<button class="rd-btn big" id="rdPrev" aria-label="السابق">' + I.back + '</button>' +
            '<button class="cnt" id="rdCnt" aria-label="عدّاد">' + ring(idx) + '</button>' +
            '<button class="rd-btn big" id="rdNext" aria-label="التالي">' + I.fwd + '</button>' +
          '</div>' +
          '<div class="rd-tools">' +
            '<button class="rd-btn" id="rdFav" aria-label="المفضلة">' + (isFav(idx) ? I.starFill : I.star) + '</button>' +
            '<button class="rd-btn" id="rdCopy" aria-label="نسخ">' + I.copy + '</button>' +
            '<button class="rd-btn" id="rdShare" aria-label="مشاركة">' + I.share + '</button>' +
            '<button class="rd-btn" id="rdSize" aria-label="حجم الخط">' + I.text + '</button>' +
            '<button class="rd-btn" id="rdReset" aria-label="إعادة العدّ">' + I.reset + '</button>' +
          '</div>' +
        '</div>', 'reading');
      wire();
    }

    function tap(e) {
      if (rem[idx] <= 0) { move(1); return; }
      rem[idx]--; save();
      vib(rem[idx] === 0 ? [30, 40, 30] : 12);
      var cnt = $('#rdCnt'); if (cnt) { cnt.innerHTML = ring(idx); cnt.classList.remove('pop'); void cnt.offsetWidth; cnt.classList.add('pop'); }
      var card = $('#rdCard'); if (card) { ripple(e, card); card.classList.toggle('done', rem[idx] === 0); }
      var bar = $('.rd-prog i'); if (bar) bar.style.width = Math.round(doneCount() / rem.length * 100) + '%';
      var meta = $('.rd-meta span:last-child'); if (meta) meta.textContent = ar(Math.round(doneCount() / rem.length * 100)) + '٪ مكتمل';
      if (rem[idx] === 0) {
        setTimeout(function () {
          if (doneAll()) { markDone(); draw(); return; }
          var n = firstOpen(idx); if (n >= 0) { idx = n; draw(); }
        }, 450);
      }
    }
    function markDone() {
      var t = dayKey(); S.done[t] = S.done[t] || {}; S.done[t][cat.id] = true;
      Object.keys(S.done).forEach(function (k) { if (k !== t) delete S.done[k]; });
      save(); vib([60, 60, 120]);
    }
    function move(dir) {
      var n = cat.items.length; idx = (idx + dir + n) % n; draw();
    }

    function wire() {
      $('#rdBack').onclick = function () { history.length > 1 ? history.back() : go('#/'); };
      $('#rdCard').addEventListener('click', tap);
      $('#rdCnt').addEventListener('click', tap);
      $('#rdPrev').onclick = function () { move(-1); };
      $('#rdNext').onclick = function () { move(1); };
      $('#rdFav').onclick = function () {
        var k = keyOf(idx), p = S.fav.indexOf(k);
        if (p > -1) { S.fav.splice(p, 1); toast('أُزيل من المفضلة'); } else { S.fav.push(k); toast('أُضيف إلى المفضلة'); }
        save(); $('#rdFav').innerHTML = isFav(idx) ? I.starFill : I.star;
      };
      $('#rdCopy').onclick = function () { copyText(textOf(idx)); };
      $('#rdShare').onclick = function () {
        var txt = textOf(idx);
        try { if (navigator.share) { navigator.share({ text: txt }).catch(function () { }); return; } } catch (e) { /* لا شيء */ }
        copyText(txt);
      };
      $('#rdSize').onclick = function () {
        var cur = sizes.indexOf(S.settings.fontSize); S.settings.fontSize = sizes[(cur + 1) % sizes.length]; save();
        var z = $('.ztxt'); if (z) z.style.fontSize = S.settings.fontSize + 'px';
      };
      $('#rdReset').onclick = function () {
        rem[idx] = cat.items[idx].n || 1; save(); draw();
      };
      $('#rdList').onclick = openList;
      // السحب للتنقل
      var x0 = null, y0 = null, card = $('#rdCard');
      card.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      card.addEventListener('touchend', function (e) {
        if (x0 === null) return;
        var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { e.preventDefault(); move(dx > 0 ? 1 : -1); }
      });
      bindRipples();
    }

    function textOf(i) {
      var it = cat.items[i];
      return (it.h ? it.h + '\n' : '') + it.t + (it.n > 1 ? '\n(' + ar(it.n) + ' مرات)' : '') + '\n\n— من تطبيق TAMY';
    }

    function openList() {
      var rows = cat.items.map(function (it, i) {
        var label = (it.h ? it.h + ' — ' : '') + it.t;
        return '<button class="li' + (rem[i] === 0 ? ' ok' : '') + (i === idx ? ' cur' : '') + '" data-i="' + i + '"><span class="num">' + ar(i + 1) + '</span><span class="lt">' + esc(label.length > 70 ? label.slice(0, 70) + '…' : label) + '</span>' + (rem[i] === 0 ? '<span class="ck">' + I.check + '</span>' : '<span class="rm">' + ar(rem[i]) + '×</span>') + '</button>';
      }).join('');
      sheet('<h3>' + esc(cat.title) + '</h3><div class="list">' + rows + '</div>', function (root) {
        $$('.li', root).forEach(function (b) { b.onclick = function () { idx = +b.getAttribute('data-i'); closeSheet(); draw(); }; });
      });
    }

    function drawFinish() {
      view(
        '<div class="finish">' +
          '<div class="fin-ic">' + I.check + '</div>' +
          '<h2>تقبّل الله منك</h2>' +
          '<p>أتممتَ «' + esc(cat.title) + '»<br>اللهم اجعله خالصًا لوجهك الكريم</p>' +
          '<button class="btn gold" id="finHome">الرئيسية</button>' +
          '<button class="btn ghost" id="finAgain">إعادة القراءة</button>' +
        '</div>', 'reading');
      vib([40, 60, 40]);
      $('#finHome').onclick = function () { go('#/'); };
      $('#finAgain').onclick = function () {
        for (var i = 0; i < rem.length; i++) rem[i] = cat.items[i].n || 1;
        save(); idx = 0; draw();
      };
      bindRipples();
    }

    draw();
  }

  /* ---------- نافذة سفلية ---------- */
  function sheet(html, after) {
    var root = $('#sheet'); if (!root) return;
    root.innerHTML = '<div class="sh-back"></div><div class="sh-body"><div class="sh-grip"></div>' + html + '</div>';
    root.classList.add('open');
    $('.sh-back', root).onclick = closeSheet;
    if (after) after(root);
  }
  function closeSheet() { var r = $('#sheet'); if (r) { r.classList.remove('open'); r.innerHTML = ''; } }

  /* ---------- المسبحة ---------- */
  function tasbeeh() {
    var T = S.tasbeeh;
    var targets = [33, 99, 100, 1000, 0];
    function fix() {
      var t = dayKey();
      if (T.today.d !== t) T.today = { d: t, c: 0 };
    }
    fix();
    function html() {
      var target = T.target, frac = target ? Math.min(T.count / target, 1) : 0;
      var C = 2 * Math.PI * 118, off = C * (1 - frac);
      return '<div class="page tsb">' +
        '<div class="pg-head"><h1>المسبحة</h1><button class="rd-btn" id="tsReset" aria-label="تصفير">' + I.reset + '</button></div>' +
        '<div class="tsb-sel"><select id="tsDhikr" aria-label="الذكر">' + D.tasbeeh.map(function (t, i) { return '<option value="' + i + '"' + (i === T.dhikr ? ' selected' : '') + '>' + esc(t) + '</option>'; }).join('') + '</select></div>' +
        '<div class="tsb-zk" id="tsZk">' + esc(D.tasbeeh[T.dhikr]) + '</div>' +
        '<div class="tsb-wrap"><svg class="tsb-ring" viewBox="0 0 260 260"><circle class="tr-bg" cx="130" cy="130" r="118"/><circle class="tr-fg" id="tsFg" cx="130" cy="130" r="118" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '"/></svg>' +
        '<button class="tsb-btn" id="tsBtn" aria-label="سبّح"><span class="tsb-n" id="tsN">' + ar(T.count) + '</span><span class="tsb-t">' + (target ? 'من ' + ar(target) : 'بلا حدّ') + '</span></button></div>' +
        '<div class="chips" id="tsTargets">' + targets.map(function (t) { return '<button class="chip' + (T.target === t ? ' on' : '') + '" data-t="' + t + '">' + (t ? ar(t) : '∞') + '</button>'; }).join('') + '</div>' +
        '<div class="stats"><div><b id="tsToday">' + ar(T.today.c) + '</b><span>اليوم</span></div><div><b id="tsTotal">' + ar(T.total) + '</b><span>الإجمالي</span></div></div>' +
        '</div>';
    }
    view(html(), 'page');

    function update() {
      var target = T.target, frac = target ? Math.min(T.count / target, 1) : 0, C = 2 * Math.PI * 118;
      $('#tsN').textContent = ar(T.count);
      $('#tsFg').setAttribute('stroke-dashoffset', (C * (1 - frac)).toFixed(1));
      $('#tsToday').textContent = ar(T.today.c);
      $('#tsTotal').textContent = ar(T.total);
    }
    var btn = $('#tsBtn');
    btn.addEventListener('click', function (e) {
      fix(); T.count++; T.total++; T.today.c++;
      if (T.target && T.count >= T.target) { vib([80, 60, 80]); toast('ما شاء الله! أتممتَ ' + ar(T.target)); T.count = 0; }
      else vib(10);
      save(); update(); ripple(e, btn);
      btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
    });
    $('#tsReset').onclick = function () { T.count = 0; save(); update(); vib(20); };
    $('#tsDhikr').onchange = function (e) { T.dhikr = +e.target.value; T.count = 0; save(); $('#tsZk').textContent = D.tasbeeh[T.dhikr]; update(); };
    $$('#tsTargets .chip').forEach(function (c) {
      c.onclick = function () { T.target = +c.getAttribute('data-t'); T.count = 0; save(); vib(8); tasbeeh(); };
    });
    bindRipples();
  }

  /* ---------- المواقيت ---------- */
  function times() {
    var rows = [['fajr', 'sunrise'], ['sunrise', 'sunrise'], ['dhuhr', 'sun'], ['asr', 'sunset'], ['maghrib', 'sunset'], ['isha', 'moon']];
    function draw() {
      var now = new Date(), nx = nextPrayer(now), t = nx.today, cur = P.current(now, t);
      var tomorrow = nx.tomorrow || timesFor(P.addDays(now, 1));
      var third = (t.maghrib && tomorrow.fajr) ? P.lastThird(t, tomorrow) : null;
      var list = rows.map(function (r) {
        var k = r[0];
        return '<div class="row-t' + (k === nx.key && !nx.tomorrow ? ' next' : '') + (k === cur ? ' cur' : '') + '"><span class="ri">' + I[r[1]] + '</span><span class="rn">' + prayerLabel(k, t[k]) + '</span><b>' + fmtTime(t[k]) + '</b></div>';
      }).join('');
      var el = $('#timesList'); if (!el) return;
      el.innerHTML = list +
        (third ? '<div class="row-t extra"><span class="ri">' + I.moon + '</span><span class="rn">الثلث الأخير من الليل</span><b>' + fmtTime(third) + '</b></div>' : '');
      $('#tmNext').innerHTML = '<small>الصلاة القادمة</small><b>' + prayerLabel(nx.key, nx.time) + '</b><span>بعد ' + fmtCountdown(nx.time.getTime() - now.getTime()) + '</span>';
    }
    view(
      '<div class="page">' +
        '<div class="pg-head"><h1>مواقيت الصلاة</h1></div>' +
        '<div class="loc-card"><div>' + I.pin + '<b>' + esc(S.settings.city.name) + '</b><small>' + esc((P.METHODS[S.settings.method] || {}).name || '') + '</small></div><button class="btn gold sm" id="tmGps">تحديد موقعي</button></div>' +
        '<div class="tm-next" id="tmNext"></div>' +
        '<div class="dates-line"><b>' + esc(hijri(new Date())) + '</b><span>' + esc(gregorian(new Date())) + '</span></div>' +
        '<div class="tlist" id="timesList"></div>' +
        '<p class="note">المواقيت محسوبة على جهازك بدون إنترنت، وتُعرض بتوقيت الجهاز. يمكنك تغيير طريقة الحساب وضبط الدقائق من الإعدادات.</p>' +
      '</div>', 'page');
    draw(); every(draw, 1000);
    $('#tmGps').onclick = function () { locate(function () { render(); }); };
    bindRipples();
  }

  function locate(done) {
    if (!navigator.geolocation) { toast('تحديد الموقع غير متاح'); return; }
    toast('جارٍ تحديد موقعك…');
    navigator.geolocation.getCurrentPosition(function (pos) {
      var la = pos.coords.latitude, ln = pos.coords.longitude;
      // أقرب مدينة معروفة (للاسم فقط)
      var best = null, bd = 1e9;
      D.cities.forEach(function (c) { var d = Math.hypot(c.lat - la, (c.lng - ln) * Math.cos(la * Math.PI / 180)); if (d < bd) { bd = d; best = c; } });
      var name = best && bd < 0.5 ? 'قرب ' + best.name : 'موقعي الحالي';
      S.settings.city = { name: name, lat: +la.toFixed(4), lng: +ln.toFixed(4) };
      S.settings.lastSchedule = 0; save(); toast('تم تحديث الموقع'); Notif.schedule(true);
      if (done) done();
    }, function () { toast('تعذّر تحديد الموقع — اختر مدينتك من الإعدادات'); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  }

  /* ---------- القبلة ---------- */
  function qibla() {
    var c = S.settings.city, q = P.qibla(c.lat, c.lng), dist = Math.round(P.distance(c.lat, c.lng));
    var ticks = '';
    for (var i = 0; i < 72; i++) { ticks += '<i style="transform:rotate(' + (i * 5) + 'deg)" class="' + (i % 9 === 0 ? 'big' : '') + '"></i>'; }
    view(
      '<div class="page">' +
        '<div class="pg-head"><h1>اتجاه القبلة</h1></div>' +
        '<div class="compass" id="cmp">' +
          '<div class="c-top"></div>' +
          '<div class="dial" id="dial">' + ticks +
            '<span class="dn n">ش</span><span class="dn e">شر</span><span class="dn s">ج</span><span class="dn w">غ</span>' +
            '<div class="kmark" style="transform:rotate(' + q.toFixed(1) + 'deg)"><span class="kb">' + I.kaaba + '</span><span class="kl"></span></div>' +
          '</div>' +
          '<div class="c-center"></div>' +
        '</div>' +
        '<div class="q-info"><b id="qDeg">' + ar(Math.round(q)) + ' درجة</b><span>من الشمال باتجاه عقارب الساعة</span></div>' +
        '<div class="q-sub" id="qMsg">ضع الهاتف أفقيًا وحرّكه ببطء حتى تتحاذى الكعبة مع الأعلى</div>' +
        '<div class="q-meta"><span>' + I.pin + esc(c.name) + '</span><span>المسافة إلى الكعبة: ' + ar(dist) + ' كم</span></div>' +
      '</div>', 'page');

    var dial = $('#dial'), cmp = $('#cmp'), cur = 0, got = false, abs = false, aligned = false;
    function setHeading(h) {
      if (!got) cur = h;
      got = true;
      var d = ((h - cur + 540) % 360) - 180; cur = (cur + d * 0.25 + 360) % 360;
      dial.style.transform = 'rotate(' + (-cur).toFixed(1) + 'deg)';
      var diff = Math.abs(((q - cur + 540) % 360) - 180);
      var al = diff < 4;
      if (al !== aligned) { aligned = al; cmp.classList.toggle('ok', al); if (al) { vib([30, 40, 30]); $('#qMsg').textContent = 'أنت الآن في اتجاه القبلة ✓'; } else { $('#qMsg').textContent = 'حرّك الهاتف حتى تتحاذى الكعبة مع الأعلى'; } }
    }
    function onAbs(e) { if (e.alpha == null) return; abs = true; setHeading(e.webkitCompassHeading != null ? e.webkitCompassHeading : 360 - e.alpha); }
    function onRel(e) {
      if (abs) return;
      var h = e.webkitCompassHeading != null ? e.webkitCompassHeading : (e.alpha != null ? 360 - e.alpha : null);
      if (h != null) setHeading(h);
    }
    window.addEventListener('deviceorientationabsolute', onAbs, true);
    window.addEventListener('deviceorientation', onRel, true);
    onCleanup(function () { window.removeEventListener('deviceorientationabsolute', onAbs, true); window.removeEventListener('deviceorientation', onRel, true); });
    // بدون حسّاس: نعرض الاتجاه ثابتًا بالنسبة للشمال
    setTimeout(function () {
      if (!got) { var m = $('#qMsg'); if (m) m.textContent = 'لا يتوفر حسّاس بوصلة — الكعبة على زاوية ' + ar(Math.round(q)) + '° من الشمال'; }
    }, 1800);
  }

  /* ---------- أسماء الله الحسنى ---------- */
  function names() {
    view(
      '<div class="page">' +
        '<div class="pg-head"><h1>أسماء الله الحسنى</h1></div>' +
        '<p class="ayah">﴿ وَلِلَّهِ الْأَسْمَاءُ الْحُسْنَىٰ فَادْعُوهُ بِهَا ﴾</p>' +
        '<div class="ngrid">' + D.names.map(function (n, i) {
          return '<button class="nm tone-' + (i % 8) + '"><em>' + ar(i + 1) + '</em><span>' + esc(n) + '</span></button>';
        }).join('') + '</div>' +
      '</div>', 'page');
    $$('.nm').forEach(function (b) {
      b.addEventListener('click', function (e) { ripple(e, b); vib(8); b.classList.toggle('lit'); });
    });
  }

  /* ---------- الإعدادات ---------- */
  function settings() {
    var st = S.settings;
    function sw(k, title, sub) {
      return '<label class="row"><span class="rt">' + title + (sub ? '<small>' + sub + '</small>' : '') + '</span><input type="checkbox" class="sw" data-k="' + k + '"' + (st[k] ? ' checked' : '') + '><i class="sw-i"></i></label>';
    }
    function tm(k, title) {
      return '<label class="row"><span class="rt">' + title + '</span><input type="time" class="tin" data-k="' + k + '" value="' + st[k] + '"></label>';
    }
    var cityOpts = D.cities.map(function (c, i) { return '<option value="' + i + '"' + (c.name === st.city.name ? ' selected' : '') + '>' + c.name + '</option>'; }).join('');
    var methodOpts = Object.keys(P.METHODS).map(function (k) { return '<option value="' + k + '"' + (k === st.method ? ' selected' : '') + '>' + P.METHODS[k].name + '</option>'; }).join('');
    var adj = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'].map(function (k) {
      return '<div class="adj"><span>' + D.prayerNames[k] + '</span><div class="stp"><button data-a="' + k + '" data-d="-1">' + I.minus + '</button><b id="adj-' + k + '">' + ar(st.adjust[k]) + '</b><button data-a="' + k + '" data-d="1">' + I.plus + '</button></div></div>';
    }).join('');

    view(
      '<div class="page">' +
        '<div class="pg-head"><h1>الإعدادات</h1></div>' +

        '<h3 class="sh">التنبيهات</h3>' +
        '<div class="card">' +
          sw('nPrayer', 'تنبيه أوقات الصلاة', 'عند دخول وقت كل صلاة') +
          (FEATURES.adhan
            ? sw('adhan', 'الأذان بصوت المؤذن', 'يُسمع صوت الأذان عند دخول الوقت بدل النغمة العادية')
            : '<div class="row"><span class="rt">الأذان<small>لم يُضف ملف الأذان إلى هذه النسخة بعد (اقرأ README)</small></span></div>') +
          sw('nMorning', 'تذكير أذكار الصباح') + tm('tMorning', 'وقت تذكير الصباح') +
          sw('nEvening', 'تذكير أذكار المساء') + tm('tEvening', 'وقت تذكير المساء') +
          sw('nSleep', 'تذكير أذكار النوم') + tm('tSleep', 'وقت تذكير النوم') +
          sw('nKahf', 'تذكير الجمعة', 'سورة الكهف والصلاة على النبي ﷺ') +
          '<div class="row btns"><button class="btn ghost sm" id="stTest">' + I.bell + 'تنبيه تجريبي</button><button class="btn ghost sm" id="stExact">تنبيهات دقيقة</button></div>' +
          (FEATURES.adhan ? '<div class="row btns"><button class="btn ghost sm" id="stAdhan">' + I.bell + 'تجربة الأذان كإشعار</button><button class="btn ghost sm" id="stAdhanPlay">' + I.play + 'تشغيل الأذان كاملًا</button></div>' : '') +
        (FEATURES.adhans && FEATURES.adhans.length > 1 ? adhanPicker() : '') +
        '</div>' +
        '<p class="note">إن لم تصلك التنبيهات في وقتها: اضغط «تنبيهات دقيقة» وفعّلها، واسمح للتطبيق بالعمل في الخلفية من إعدادات البطارية.</p>' +

        '<h3 class="sh">الموقع وطريقة الحساب</h3>' +
        '<div class="card">' +
          '<label class="row"><span class="rt">المدينة<small>' + esc(st.city.name) + '</small></span><select id="stCity"><option value="">اختر…</option>' + cityOpts + '</select></label>' +
          '<div class="row btns"><button class="btn gold sm" id="stGps">' + I.pin + 'تحديد موقعي تلقائيًا</button></div>' +
          '<label class="row"><span class="rt">طريقة الحساب</span><select id="stMethod">' + methodOpts + '</select></label>' +
          '<label class="row"><span class="rt">المذهب في العصر</span><select id="stAsr"><option value="standard"' + (st.asr === 'standard' ? ' selected' : '') + '>الجمهور (ظل المثل)</option><option value="hanafi"' + (st.asr === 'hanafi' ? ' selected' : '') + '>الحنفي (ظل المثلين)</option></select></label>' +
          '<div class="row col"><span class="rt">ضبط الدقائق<small>للاحتياط أو للموافقة على تقويم بلدك</small></span><div class="adjs">' + adj + '</div></div>' +
        '</div>' +

        '<h3 class="sh">الألوان</h3>' +
        '<div class="card">' +
          '<div class="row col"><span class="rt">ألوان جاهزة</span><div class="presets" id="thPresets">' + THEMES.map(function (t, i) { return '<button class="chip" data-i="' + i + '"><i style="background:' + (t.bg || '#07332b') + '"></i>' + t.n + '</button>'; }).join('') + '</div></div>' +
          '<div class="row theme-row"><span class="rt">لون الخلفية</span><input type="color" id="thBg" value="' + ((st.theme && st.theme.bg) || '#07332b') + '"></div>' +
          '<div class="row theme-row"><span class="rt">لون الخط</span><input type="color" id="thFg" value="' + ((st.theme && st.theme.fg) || '#fbf3dc') + '"></div>' +
          '<div class="row col"><div class="theme-prev" id="thPrev">﴿ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ ﴾</div></div>' +
          '<div class="row btns"><button class="btn ghost sm" id="thReset">إرجاع الألوان الأصلية</button></div>' +
        '</div>' +

        '<h3 class="sh">التحديثات</h3>' +
        '<div class="card"><a class="row" href="#/update"><span class="rt">تحديث التطبيق<small>تنزيل آخر إصدار وتثبيته من داخل التطبيق</small></span>' + I.back + '</a></div>' +

        '<h3 class="sh">الصلاة على النبي</h3>' +
        '<div class="card"><a class="row" href="#/salawat"><span class="rt">تنبيه الصلاة على النبي ﷺ<small>اختر كل كم دقيقة وصوت التنبيه</small></span>' + I.back + '</a></div>' +
        '<div class="card"><label class="row"><span class="rt">تذكير «هل صليت؟»<small>إشعار قبل نهاية وقت الصلاة لو لم تعلّمها في صلواتي</small></span><input type="checkbox" id="stPrem"' + (window.TAMYPremOn && window.TAMYPremOn() === false ? '' : ' checked') + '></label></div>' +

        '<h3 class="sh">العرض</h3>' +
        '<div class="card">' +
          '<div class="row col"><span class="rt">حجم خط الأذكار</span><input type="range" id="stFont" min="20" max="40" step="2" value="' + st.fontSize + '"><div class="ztxt prev" id="stPrev" style="font-size:' + st.fontSize + 'px">سُبْحَانَ اللَّهِ وَبِحَمْدِهِ</div></div>' +
          sw('vibrate', 'الاهتزاز', 'عند العدّ والإتمام') +
          '<div class="row"><span class="rt">تعديل التاريخ الهجري<small>إن اختلف عن بلدك</small></span><div class="stp"><button data-hj="-1">' + I.minus + '</button><b id="hjOff">' + ar(st.hijriOffset) + '</b><button data-hj="1">' + I.plus + '</button></div></div>' +
        '</div>' +

        '<div class="about"><div class="ab-logo">' + I.mosque + '</div><b>TAMY</b><span>الإصدار ١٫٠</span><p>اللهم اجعل هذا العمل خالصًا لوجهك الكريم، وانفع به كاتبه وقارئه.</p></div>' +
      '</div>', 'page');

    function reschedule() { S.settings.lastSchedule = 0; save(); Notif.schedule(true); }

    $$('.sw').forEach(function (el) {
      el.onchange = function () {
        var k = el.getAttribute('data-k'); st[k] = el.checked; save();
        if (/^n/.test(k) || k === 'adhan') reschedule();
      };
    });
    $$('.tin').forEach(function (el) {
      el.onchange = function () { st[el.getAttribute('data-k')] = el.value || '06:00'; save(); reschedule(); };
    });
    $('#stTest').onclick = Notif.test;
    if ($('#stAdhan')) { $('#stAdhan').onclick = Notif.testAdhan; $('#stAdhanPlay').onclick = function () { playAdhan('dhuhr', 'الأذان'); }; }
    bindAdhanPick();
    $('#stExact').onclick = Notif.exact;
    $('#stCity').onchange = function (e) {
      if (e.target.value === '') return;
      var c = D.cities[+e.target.value]; st.city = { name: c.name, lat: c.lat, lng: c.lng }; save(); reschedule(); toast('تم اختيار ' + c.name); settings();
    };
    $('#stGps').onclick = function () { locate(function () { settings(); }); };
    $('#stMethod').onchange = function (e) { st.method = e.target.value; save(); reschedule(); toast('تم تغيير طريقة الحساب'); };
    $('#stAsr').onchange = function (e) { st.asr = e.target.value; save(); reschedule(); };
    $$('.adj .stp button').forEach(function (b) {
      b.onclick = function () {
        var k = b.getAttribute('data-a'), d = +b.getAttribute('data-d');
        st.adjust[k] = Math.max(-30, Math.min(30, (st.adjust[k] || 0) + d)); save();
        $('#adj-' + k).textContent = ar(st.adjust[k]); vib(6);
        clearTimeout(settings.__t); settings.__t = setTimeout(reschedule, 800);
      };
    });
    $('#stFont').oninput = function (e) { st.fontSize = +e.target.value; save(); $('#stPrev').style.fontSize = st.fontSize + 'px'; };
    function paintPrev() { var p = $('#thPrev'); if (p) { p.style.background = 'var(--card)'; p.style.color = 'var(--cream)'; } }
    function setTheme(bg, fg, redraw) { st.theme = { bg: bg, fg: fg }; save(); applyTheme(); if (redraw) settings(); else paintPrev(); }
    paintPrev();
    $$('#thPresets .chip').forEach(function (c) { c.onclick = function () { var t = THEMES[+c.getAttribute('data-i')]; setTheme(t.bg, t.fg, true); }; });
    $('#thBg').oninput = function (e) { setTheme(e.target.value, (st.theme && st.theme.fg) || '', false); };
    $('#thFg').oninput = function (e) { setTheme((st.theme && st.theme.bg) || '', e.target.value, false); };
    $('#thReset').onclick = function () { setTheme('', '', true); toast('رجعت الألوان الأصلية'); };
    $$('[data-hj]').forEach(function (b) {
      b.onclick = function () { st.hijriOffset = Math.max(-2, Math.min(2, (st.hijriOffset || 0) + (+b.getAttribute('data-hj')))); save(); $('#hjOff').textContent = ar(st.hijriOffset); };
    });
    bindRipples();
  }

  /* ---------- الألوان: خلفية وخط من اختيار المستخدم ---------- */
  var THEMES = [
    { n: 'الزمردي', bg: '', fg: '' },
    { n: 'ليلي', bg: '#0d0f14', fg: '#f1f1f1' },
    { n: 'أزرق', bg: '#0b2545', fg: '#eef4ff' },
    { n: 'بنفسجي', bg: '#2a1745', fg: '#f6efff' },
    { n: 'بني', bg: '#3b2616', fg: '#fff1de' },
    { n: 'فاتح', bg: '#f6f0df', fg: '#1d2b26' }
  ];
  function hex2rgb(h) { h = String(h).replace('#', ''); if (h.length === 3) h = h.replace(/./g, '$&$&'); var n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { return '#' + a.map(function (v, i) { var x = Math.round(v + (b[i] - v) * t); return ('0' + Math.max(0, Math.min(255, x)).toString(16)).slice(-2); }).join(''); }
  function lum(c) { return (0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]) / 255; }
  function applyTheme() {
    var th = S.settings.theme || {}, r = document.documentElement.style;
    var keys = ['--deep', '--bg', '--bg2', '--card', '--card2', '--cream', '--mute', '--t0', '--t1', '--t2', '--t3', '--t4', '--t5', '--navTop', '--glow', '--gold2'];
    keys.forEach(function (k) { r.removeProperty(k); });
    var bgc = null, fgc = null;
    try { if (th.bg) bgc = hex2rgb(th.bg); if (th.fg) fgc = hex2rgb(th.fg); } catch (e) { bgc = fgc = null; }
    if (bgc) {
      var light = lum(bgc) > 0.55, K = [0, 0, 0], W = [255, 255, 255], up = light ? K : W, dn = light ? W : K;
      var set = function (k, v) { r.setProperty(k, v); };
      set('--bg', th.bg); set('--deep', mix(bgc, dn, .14)); set('--bg2', mix(bgc, up, .07)); set('--card', mix(bgc, up, .12)); set('--card2', mix(bgc, up, .2));
      set('--t0', mix(bgc, dn, .5)); set('--t1', mix(bgc, up, .26)); set('--t2', mix(bgc, up, .1)); set('--t3', mix(bgc, dn, .1)); set('--t4', mix(bgc, up, .17)); set('--t5', mix(bgc, up, .34));
      if (light) set('--gold2', '#7a5800');
      set('--navTop', mix(bgc, dn, .1)); set('--glow', mix(bgc, up, .18));
      if (!fgc) fgc = light ? [29, 43, 38] : [251, 243, 220];
    }
    if (fgc) {
      var fh = '#' + fgc.map(function (v) { return ('0' + v.toString(16)).slice(-2); }).join('');
      r.setProperty('--cream', fh); r.setProperty('--mute', mix(fgc, bgc || [7, 51, 43], .32));
    }
  }

  /* ---------- الإقلاع ---------- */
  window.TAMY = {
    view: view, ar: ar, esc: esc, vib: vib, toast: toast, ripple: ripple, copyText: copyText,
    S: S, save: save, go: go, I: I, every: every, onCleanup: onCleanup, bindRipples: bindRipples,
    sheet: sheet, closeSheet: closeSheet,
    addRoute: function (re, fn) { ROUTES.unshift([re, fn]); }
  };

  function loadFeatures() {
    return fetch('features.json').then(function (r) { return r.ok ? r.json() : {}; }).then(function (j) {
      Object.keys(j || {}).forEach(function (k) { FEATURES[k] = j[k]; });
    }).catch(function () { /* بدون ملف: الأذان غير متوفر */ });
  }

  function boot() {
    applyTheme();
    buildNav();
    window.addEventListener('hashchange', render);
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a) vib(6);
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) Notif.schedule(false); });
    loadFeatures().then(function () {
      // every() يُصفَّر مع كل شاشة، لذا نشغّل المراقب بمؤقت مستقل
      render();
      Notif.schedule(false);
    });
    setInterval(adhanWatch, 1000);
    setTimeout(function () { var s = $('#splash'); if (s) { s.classList.add('hide'); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 600); } }, 1100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
