/* TAMY extras: ذكر اليوم، الورد والختمة، صلواتي، المناسبات، الزكاة */
(function () {
  'use strict';
  var T = window.TAMY; if (!T) return;
  var esc = T.esc, ar = T.ar, I = T.I || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* لا شيء */ } }
  function pad2(n) { return ('0' + n).slice(-2); }
  function dkey(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function head(title, back) {
    return '<div class="pg-head"><h1>' + title + '</h1>' + (back ? '<a class="rd-btn" href="' + back + '" aria-label="رجوع">' + I.back + '</a>' : '') + '</div>';
  }
  function fixBack() { $$('.page a[href="#/"]').forEach(function (a) { a.onclick = function (e) { if (history.length > 1) { e.preventDefault(); history.back(); } }; }); }
  function show(html) { T.view('<div class="page">' + html + '</div>', 'page'); fixBack(); }

  /* ===== ذكر اليوم ===== */
  var DAILY = [
    { t: 'ألا بذكر الله تطمئن القلوب', s: 'سورة الرعد ٢٨' },
    { t: 'فاذكروني أذكركم', s: 'سورة البقرة ١٥٢' },
    { t: 'فإن مع العسر يسرا، إن مع العسر يسرا', s: 'سورة الشرح ٥-٦' },
    { t: 'ومن يتق الله يجعل له مخرجا', s: 'سورة الطلاق ٢' },
    { t: 'وقل رب زدني علما', s: 'سورة طه ١١٤' },
    { t: 'ولسوف يعطيك ربك فترضى', s: 'سورة الضحى ٥' },
    { t: 'حسبنا الله ونعم الوكيل', s: 'سورة آل عمران ١٧٣' },
    { t: 'إن الله مع الصابرين', s: 'سورة البقرة ١٥٣' },
    { t: 'ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار', s: 'سورة البقرة ٢٠١' },
    { t: 'سبحان الله وبحمده، سبحان الله العظيم', s: 'كلمتان خفيفتان على اللسان ثقيلتان في الميزان (متفق عليه)' },
    { t: 'لا حول ولا قوة إلا بالله، كنز من كنوز الجنة', s: 'متفق عليه' },
    { t: 'أحب الكلام إلى الله أربع: سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر', s: 'رواه مسلم' },
    { t: 'الطهور شطر الإيمان', s: 'رواه مسلم' },
    { t: 'خيركم من تعلم القرآن وعلمه', s: 'رواه البخاري' },
    { t: 'الكلمة الطيبة صدقة', s: 'متفق عليه' },
    { t: 'تبسمك في وجه أخيك صدقة', s: 'رواه الترمذي' },
    { t: 'لا يؤمن أحدكم حتى يحب لأخيه ما يحب لنفسه', s: 'متفق عليه' },
    { t: 'ما نقصت صدقة من مال', s: 'رواه مسلم' },
    { t: 'ليس الشديد بالصرعة، إنما الشديد الذي يملك نفسه عند الغضب', s: 'متفق عليه' },
    { t: 'من سلك طريقا يلتمس فيه علما سهل الله له به طريقا إلى الجنة', s: 'رواه مسلم' },
    { t: 'اللهم إني أسألك العفو والعافية في الدنيا والآخرة', s: 'دعاء مأثور' }
  ];
  function dayNum() { var d = new Date(); return Math.floor((new Date(d.getFullYear(), d.getMonth(), d.getDate()) - new Date(2020, 0, 1)) / 864e5); }
  function daily() { var n = DAILY.length; return DAILY[((dayNum() % n) + n) % n]; }
  function dailyCard() {
    var d = daily();
    return '<a class="ex-card" href="#/daily"><small>ذكر اليوم</small><b class="mush">' + esc(d.t) + '</b><small>' + esc(d.s) + '</small></a>';
  }
  function dailyPage() {
    var d = daily();
    show(head('ذكر اليوم', '#/') + '<div class="ex-card ex-big"><b class="mush">' + esc(d.t) + '</b><small>' + esc(d.s) + '</small></div>' +
      '<div class="ex-bulk"><button type="button" class="chip" id="exCp">نسخ</button></div>');
    var b = $('#exCp'); if (b) b.onclick = function () {
      try { navigator.clipboard.writeText(d.t + '\n' + d.s); T.toast('تم النسخ'); } catch (e) { T.toast('تعذّر النسخ'); }
    };
  }

  /* ===== صلواتي ===== */
  var PR = [['fajr', 'الفجر'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء']];
  var WK = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  function pget() { return lsGet('tamy_pray') || {}; }
  function cnt(o) { var c = 0; o = o || {}; PR.forEach(function (p) { if (o[p[0]]) c++; }); return c; }
  function streak(m) {
    var d = new Date(), s = 0;
    if (cnt(m[dkey(d)]) < 5) d.setDate(d.getDate() - 1);
    while (cnt(m[dkey(d)]) === 5) { s++; d.setDate(d.getDate() - 1); }
    return s;
  }
  function prayers() {
    var m = pget(), k = dkey(new Date()), d = m[k] || {}, bars = '', tot = 0, i;
    for (i = 6; i >= 0; i--) {
      var dt = new Date(); dt.setDate(dt.getDate() - i);
      var c = cnt(m[dkey(dt)]); tot += c;
      bars += '<div class="ex-bar"><span><i style="height:' + (c * 20) + '%"></i></span><b>' + ar(c) + '</b><small>' + WK[dt.getDay()] + '</small></div>';
    }
    show(head('صلواتي', '#/') +
      '<div class="ex-sum"><b>' + ar(cnt(d)) + ' / ' + ar(5) + '</b><small>صلوات اليوم</small></div>' +
      '<div class="ex-sum"><b>' + ar(streak(m)) + '</b><small>أيام متتالية بدون تفويت</small></div>' +
      '<div id="exPr">' + PR.map(function (p) {
        return '<button type="button" class="srow ex-pr' + (d[p[0]] ? ' on' : '') + '" data-p="' + p[0] + '"><span class="sr-tx"><b class="mush">' + p[1] + '</b></span><span class="ex-ck">' + (d[p[0]] ? '✓' : '○') + '</span></button>';
      }).join('') + '</div>' +
      '<div class="ex-sum"><small>آخر ٧ أيام (' + ar(tot) + ' من ' + ar(35) + ')</small></div><div class="ex-bars">' + bars + '</div>');
    $$('.ex-pr').forEach(function (b) {
      b.onclick = function () {
        var mm = pget(), kk = dkey(new Date()), p = b.getAttribute('data-p');
        mm[kk] = mm[kk] || {}; mm[kk][p] = mm[kk][p] ? 0 : 1; lsSet('tamy_pray', mm); prayers();
      };
    });
  }

  /* ===== الورد والختمة ===== */
  var WKEY = 'tamy_wird', TOT = 604;
  function qHref() {
    var a = $$('a').filter(function (x) {
      var h = x.getAttribute('href') || '';
      return h.charAt(0) === '#' && (x.textContent || '').trim() === 'القرآن';
    })[0];
    return a ? a.getAttribute('href') : '#/';
  }
  function LN() { var C = window.Capacitor; return C && C.Plugins && C.Plugins.LocalNotifications; }
  function sched(w) {
    var ln = LN(); if (!ln) return;
    ln.cancel({ notifications: [{ id: 8500 }] }).catch(function () { /* لا شيء */ }).then(function () {
      if (!w || !w.rem || !w.rem.on) return;
      var t = (w.rem.t || '20:00').split(':'), hh = +t[0] || 20, mm = +t[1] || 0;
      return ln.requestPermissions().catch(function () { /* لا شيء */ }).then(function () {
        return ln.createChannel({ id: 'wird', name: 'الورد اليومي', importance: 4, vibration: true }).catch(function () { /* موجودة */ });
      }).then(function () {
        return ln.schedule({ notifications: [{ id: 8500, title: 'وردك اليومي', body: 'حان موعد وردك من القرآن الكريم', channelId: 'wird', schedule: { on: { hour: hh, minute: mm }, allowWhileIdle: true } }] });
      });
    }).catch(function () { T.toast('تعذّر ضبط التذكير'); });
  }
  function wird() {
    var w = lsGet(WKEY);
    if (!w) {
      show(head('الورد والختمة', '#/') + '<div class="ex-sum"><small>اختر مدة ختم القرآن</small></div><div class="chips tabs" id="exDays">' +
        [60, 30, 20, 15, 10, 7].map(function (n) { return '<button type="button" class="chip" data-d="' + n + '">' + ar(n) + ' يوم</button>'; }).join('') + '</div>');
      $$('#exDays .chip').forEach(function (c) { c.onclick = function () { lsSet(WKEY, { days: +c.getAttribute('data-d'), done: 0, last: '', khatmat: 0, rem: { on: false, t: '20:00' } }); wird(); }; });
      return;
    }
    var per = Math.ceil(TOT / w.days), tk = dkey(new Date()), doneToday = w.last === tk, fin = w.done >= TOT;
    var from = w.done + 1, to = Math.min(TOT, w.done + per), pct = Math.round(w.done / TOT * 100), left = Math.ceil((TOT - w.done) / per);
    var body = fin
      ? '<div class="ex-card ex-big"><b>ما شاء الله، ختمت القرآن 🎉</b><small>تقبّل الله منك</small></div><div class="ex-bulk"><button type="button" class="chip" id="exNew">ابدأ ختمة جديدة</button></div>'
      : '<div class="ex-card ex-big"><small>' + (doneToday ? 'أتممت ورد اليوم. ورد الغد' : 'ورد اليوم') + '</small><b class="mush">من صفحة ' + ar(from) + ' إلى صفحة ' + ar(to) + '</b><small>تقريبًا الجزء ' + ar(Math.min(30, Math.ceil(from / 20.13))) + '</small></div>' +
        '<div class="ex-bulk"><button type="button" class="chip" id="exOpen">فتح المصحف</button>' +
        (doneToday ? '' : '<button type="button" class="chip" id="exDone">✓ أتممت ورد اليوم</button>') + '</div>';
    show(head('الورد والختمة', '#/') + body +
      '<div class="ex-prog"><span><i style="width:' + pct + '%"></i></span><small>' + ar(pct) + '٪ — صفحة ' + ar(Math.min(w.done, TOT)) + ' من ' + ar(TOT) + (fin ? '' : ' — باقي ' + ar(left) + ' يوم') + '</small></div>' +
      '<div class="ex-sum"><small>عدد الختمات: ' + ar(w.khatmat || 0) + '</small></div>' +
      '<label class="ex-row"><span>تذكير يومي</span><input type="checkbox" id="exRon"' + (w.rem && w.rem.on ? ' checked' : '') + '></label>' +
      '<label class="ex-row"><span>الوقت</span><input type="time" id="exRt" class="ex-in" value="' + esc((w.rem && w.rem.t) || '20:00') + '"></label>' +
      '<div class="ex-bulk"><button type="button" class="chip" id="exReset">تغيير الخطة</button></div>');
    function persist() { lsSet(WKEY, w); }
    var o = $('#exOpen'); if (o) o.onclick = function () { location.hash = qHref(); };
    var d = $('#exDone'); if (d) d.onclick = function () {
      w.done = Math.min(TOT, w.done + per); w.last = tk;
      if (w.done >= TOT) { w.khatmat = (w.khatmat || 0) + 1; T.toast('ما شاء الله، ختمة مباركة'); } else T.toast('تقبّل الله');
      persist(); wird();
    };
    var nw = $('#exNew'); if (nw) nw.onclick = function () { w.done = 0; w.last = ''; persist(); wird(); };
    $('#exReset').onclick = function () { if (confirm('تغيير الخطة سيعيد التقدّم من الأول. متابعة؟')) { try { localStorage.removeItem(WKEY); } catch (e) { /* لا شيء */ } sched(null); wird(); } };
    function rem() { w.rem = { on: $('#exRon').checked, t: $('#exRt').value || '20:00' }; persist(); sched(w); }
    $('#exRon').onchange = rem; $('#exRt').onchange = rem;
  }

  /* ===== المناسبات ===== */
  var HM = ['محرم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
  function hj(d) {
    var f = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' }), o = {};
    f.formatToParts(d).forEach(function (x) { o[x.type] = +x.value; });
    return { d: o.day, m: o.month, y: o.year || o.relatedYear };
  }
  function until(m, d) {
    for (var i = 0; i < 400; i++) { var dt = new Date(); dt.setDate(dt.getDate() + i); var h = hj(dt); if (h.m === m && h.d === d) return i; }
    return -1;
  }
  function occasions() {
    var h, list;
    try {
      h = hj(new Date());
      list = [['رمضان', 9, 1], ['عيد الفطر', 10, 1], ['يوم عرفة', 12, 9], ['عيد الأضحى', 12, 10], ['رأس السنة الهجرية', 1, 1], ['عاشوراء', 1, 10]]
        .map(function (x) { return { n: x[0], k: until(x[1], x[2]) }; }).filter(function (x) { return x.k >= 0; }).sort(function (a, b) { return a.k - b.k; });
    } catch (e) { show(head('المناسبات', '#/') + '<div class="ex-sum"><small>تعذّر عرض التقويم الهجري على هذا الجهاز</small></div>'); return; }
    var tomorrow = new Date().getDay() + 1, tips = [];
    if (h.d >= 13 && h.d <= 15) tips.push('اليوم من الأيام البيض، يُسنّ صيامها');
    if (tomorrow % 7 === 1 || tomorrow % 7 === 4) tips.push('غدًا ' + WK[tomorrow % 7] + ': يُسنّ صيام الاثنين والخميس');
    show(head('المناسبات', '#/') +
      '<div class="ex-card ex-big"><small>التاريخ الهجري</small><b class="mush">' + ar(h.d) + ' ' + HM[h.m - 1] + ' ' + ar(h.y) + ' هـ</b>' + (tips.length ? '<small>' + esc(tips.join(' • ')) + '</small>' : '') + '</div>' +
      '<div id="exOc">' + list.map(function (x) {
        return '<div class="srow"><span class="sr-tx"><b class="mush">' + x.n + '</b></span><span class="ex-ck">' + (x.k === 0 ? 'اليوم' : 'بعد ' + ar(x.k) + ' يوم') + '</span></div>';
      }).join('') + '</div><div class="ex-sum"><small>التواريخ تقريبية بحسب تقويم أم القرى وقد تختلف بيوم حسب رؤية الهلال</small></div>');
  }

  /* ===== حاسبة الزكاة ===== */
  function zakat() {
    var z = lsGet('tamy_zakat') || {};
    function f(id, label, ph) { return '<label class="ex-f"><span>' + label + '</span><input class="ex-in" inputmode="decimal" type="number" id="' + id + '" placeholder="' + ph + '" value="' + esc(z[id] != null ? z[id] : '') + '"></label>'; }
    show(head('حاسبة الزكاة', '#/') +
      f('zC', 'النقد والمدخرات', '٠') + f('zG', 'الذهب الذي تملكه (جرام)', '٠') +
      '<label class="ex-f"><span>عيار الذهب</span><select class="ex-in" id="zK"><option value="24">٢٤</option><option value="21">٢١</option><option value="18">١٨</option></select></label>' +
      f('zP', 'سعر جرام الذهب عيار ٢٤ اليوم', 'اكتبه من السوق') + f('zT', 'عروض التجارة', '٠') + f('zR', 'ديون لك مضمونة السداد', '٠') + f('zD', 'ديون عليك', '٠') +
      '<div class="ex-card ex-big" id="zOut"></div>');
    var sel = $('#zK'); sel.value = z.zK || '21';
    function calc() {
      var g = function (id) { return parseFloat(($('#' + id) || {}).value) || 0; };
      var p = g('zP'), k = +sel.value, gv = g('zG') * p * k / 24, tot = g('zC') + gv + g('zT') + g('zR') - g('zD'), nis = 85 * p, o = {};
      ['zC', 'zG', 'zP', 'zT', 'zR', 'zD'].forEach(function (id) { o[id] = $('#' + id).value; }); o.zK = sel.value; lsSet('tamy_zakat', o);
      var out = $('#zOut');
      if (!p) { out.innerHTML = '<small>اكتب سعر جرام الذهب عيار ٢٤ ليتحدد النصاب (٨٥ جرام)</small>'; return; }
      var fmt = function (n) { return ar(Math.round(n).toLocaleString('en-US')); };
      out.innerHTML = '<small>النصاب: ' + fmt(nis) + ' — صافي مالك: ' + fmt(tot) + '</small>' +
        (tot >= nis ? '<b class="mush">الزكاة الواجبة: ' + fmt(tot * 0.025) + '</b><small>٢٫٥٪ بشرط مرور عام هجري كامل على المال</small>' : '<b class="mush">لا زكاة عليك الآن</b><small>المال لم يبلغ النصاب</small>');
    }
    $$('.ex-in').forEach(function (i) { i.oninput = calc; i.onchange = calc; }); calc();
  }

  /* ===== الرئيسية ===== */
  function tile(h, ic, t) { return '<a class="ex-tile" href="' + h + '"><span>' + ic + '</span><b>' + t + '</b></a>'; }
  window.TAMYExtras = function () {
    return dailyCard() + '<div class="ex-grid">' + tile('#/wird', '📖', 'الورد والختمة') + tile('#/prayers', '🕌', 'صلواتي') + tile('#/occasions', '🌙', 'المناسبات') + tile('#/zakat', '💰', 'حاسبة الزكاة') + '</div>';
  };
  T.addRoute(/^#\/daily$/, dailyPage);
  T.addRoute(/^#\/prayers$/, prayers);
  T.addRoute(/^#\/wird$/, wird);
  T.addRoute(/^#\/occasions$/, occasions);
  T.addRoute(/^#\/zakat$/, zakat);
})();
