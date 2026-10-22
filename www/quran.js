/* TAMY — قسم القرآن الكريم: فهرس السور والأجزاء وقارئ المصحف */
(function () {
  'use strict';

  var T = window.TAMY, SU = window.TAMY_SURAHS;
  if (!T || !SU) return;
  var ar = T.ar, esc = T.esc, I = T.I, S = T.S;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- تحميل النص ---------- */
  var Q = null, loading = null;
  function loadQuran() {
    if (Q) return Promise.resolve(Q);
    if (loading) return loading;
    loading = fetch('quran.json').then(function (r) {
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function (j) {
      if (!j || !j.s || j.s.length !== 114) throw new Error('bad data');
      Q = j.s; return Q;
    }).catch(function (e) { loading = null; throw e; });
    return loading;
  }
  function errorView() {
    T.view('<div class="empty">' + I.quran + '<h3>تعذّر تحميل المصحف</h3><p>ملف المصحف غير موجود في هذه النسخة أو تالف. أعد بناء التطبيق وتأكد أن خطوة تجهيز المصحف نجحت.</p><a class="btn gold" href="#/">الرئيسية</a></div>', 'page');
  }

  /* ---------- أدوات ---------- */
  function norm(t) {
    return String(t).replace(/[ؐ-ًؚ-ٰٟۖ-ۭـ]/g, '')
      .replace(/[آأإٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); }).trim();
  }
  function medal(n) {
    var pts = [], i, a, r;
    for (i = 0; i < 32; i++) { a = (i * Math.PI) / 16 - Math.PI / 2; r = i % 2 ? 16.5 : 21; pts.push((24 + r * Math.cos(a)).toFixed(1) + ',' + (24 + r * Math.sin(a)).toFixed(1)); }
    return '<svg class="medal" viewBox="0 0 48 48" aria-hidden="true"><polygon points="' + pts.join(' ') + '"/><text x="24" y="29.500" text-anchor="middle">' + ar(n) + '</text></svg>';
  }
  function juzOf(s, a) {
    var j = 0, k;
    for (k = 0; k < SU.juz.length; k++) { if (SU.juz[k][0] < s || (SU.juz[k][0] === s && SU.juz[k][1] <= a)) j = k; else break; }
    return j + 1;
  }
  function hasBism(first) {
    return /^[ؐ-ًؚ-ٰٟۖ-ۭ\s]*ب[ؐ-ًؚ-ٰٟۖ-ۭ]*س[ؐ-ًؚ-ٰٟۖ-ۭ]*م/.test(first);
  }
  var BISM = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';

  var SEP = '<i class="sep"></i>';
  var tab = 'surah';


  /* ---------- إذاعة القرآن الكريم من القاهرة (بث مباشر) ---------- */
  var RADIO_URL = 'https://stream.radiojar.com/8s5u5tpdtwzuv';
  var rd = { a: null, code: null, want: false, state: 'off', tries: 0, timer: 0 };
  function rdText() {
    if (rd.state === 'off' && rd.code != null) return 'تعذّر الاتصال (رمز ' + rd.code + ')';
    return rd.state === 'on' ? 'بث مباشر الآن' : rd.state === 'loading' ? (rd.tries ? 'إعادة الاتصال…' : 'جارٍ الاتصال…') : 'بث مباشر · يحتاج إنترنت';
  }
  function rdPaint() {
    var c = $('#rdCard'); if (!c) return;
    c.className = 'rad2 ' + rd.state;
    $('#rdToggle').textContent = rd.state === 'off' ? 'استمع الآن' : 'إيقاف';
    $('#rdSub').textContent = rdText();
  }
  function rdClear() {
    clearTimeout(rd.timer);
    var a = rd.a; rd.a = null;
    if (a) { a.onplaying = a.onwaiting = a.onerror = a.onended = a.onstalled = null; try { a.pause(); a.removeAttribute('src'); a.load(); } catch (e) { /* لا شيء */ } }
  }
  function rdStop() { rd.want = false; rd.tries = 0; rdClear(); rd.state = 'off'; rdPaint(); }
  // البث المباشر قد ينقطع مع ضعف الشبكة: نعيد الاتصال تلقائيًا بدل أن يتوقف
  function rdRetry() {
    if (!rd.want) return;
    rdClear();
    if (rd.tries >= 6) { if (T.toast) T.toast('تعذّر تشغيل الإذاعة. تأكد من الإنترنت ثم أعد المحاولة'); rdStop(); return; }
    rd.tries++; rd.state = 'loading'; rdPaint();
    rd.timer = setTimeout(rdOpen, Math.min(1000 * rd.tries, 4000));
  }
  function rdOpen() {
    if (!rd.want) return;
    rdClear();
    var a = new Audio(RADIO_URL);
    rd.a = a; rd.state = 'loading'; rdPaint();
    a.onplaying = function () { if (rd.a === a) { rd.state = 'on'; rd.tries = 0; rd.code = null; clearTimeout(rd.timer); rdPaint(); } };
    a.onwaiting = function () { if (rd.a === a && rd.state === 'on') { rd.state = 'loading'; rdPaint(); clearTimeout(rd.timer); rd.timer = setTimeout(function () { if (rd.a === a && rd.state === 'loading') rdRetry(); }, 12000); } };
    a.onerror = function () { if (rd.a === a) { rd.code = a.error ? a.error.code : 0; rdRetry(); } };
    a.onended = function () { if (rd.a === a) rdRetry(); };
    clearTimeout(rd.timer);
    rd.timer = setTimeout(function () { if (rd.a === a && rd.state === 'loading') rdRetry(); }, 15000);   // لم يبدأ البث
    var pr = a.play();
    if (pr && pr.catch) pr.catch(function () { if (rd.a === a) rdRetry(); });
  }
  function rdStart() { rdClear(); rd.code = null; rd.want = true; rd.tries = 0; rdOpen(); }
  function radioCard() {
    return '<section class="rad2" id="rdCard"><div class="rad2-ic">♫</div>' +
      '<div class="rad2-tx"><b>إذاعة القرآن الكريم من القاهرة</b><small>بث مباشر · يفتح في المتصفح</small></div>' +
      '<a class="rad2-btn" href="' + RADIO_URL + '" target="_blank" rel="noopener">استمع الآن</a></section>';
  }
  window.TAMYRadio = { stop: rdStop };
  window.addEventListener('online', function () { if (rd.want && rd.state !== 'on') { rd.tries = 0; rdOpen(); } });
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#rdToggle');
    if (b) { if (rd.state === 'off') rdStart(); else rdStop(); }
  });

  /* ---------- الفهرس ---------- */
  function index() {
    var last = S.quran.last, marks = S.quran.marks;
    var resume = last && SU.list[last.s - 1]
      ? '<a class="q-resume" href="#/quran/read/' + last.s + '/' + last.a + '"><span class="qr-ic">' + I.bookmarkFill + '</span><span class="qr-tx"><small>متابعة القراءة</small><b>سورة ' + SU.list[last.s - 1].name + ' — آية ' + ar(last.a) + '</b></span><span class="qc-go">' + I.back + '</span></a>'
      : '';
    T.view(
      '<div class="page">' +
        '<div class="pg-head"><h1>القرآن الكريم</h1><a class="rd-btn" href="#/quran/read/1" aria-label="ابدأ من الفاتحة">' + I.quran + '</a></div>' +
        resume +
        radioCard() + (window.TAMYListenCard ? window.TAMYListenCard() : '') +
        '<div class="q-search">' + I.search + '<input id="qSearch" type="search" inputmode="search" placeholder="ابحث باسم السورة أو رقمها" autocomplete="off"></div>' +
        '<div class="chips tabs" id="qTabs">' +
          '<button class="chip' + (tab === 'surah' ? ' on' : '') + '" data-t="surah">السور</button>' +
          '<button class="chip' + (tab === 'juz' ? ' on' : '') + '" data-t="juz">الأجزاء</button>' +
          '<button class="chip' + (tab === 'marks' ? ' on' : '') + '" data-t="marks">علاماتي' + (marks.length ? ' (' + ar(marks.length) + ')' : '') + '</button>' +
        '</div>' +
        '<div id="qList"></div><p class="note q-source">مصدر النص القرآني: <a href="https://tanzil.net" target="_blank" rel="noopener noreferrer">مشروع Tanzil</a></p>' +
      '</div>', 'page');

    function draw() {
      var q = norm($('#qSearch').value), html = '';
      if (tab === 'surah') {
        var qn = q.replace(/^ال/, '');
        html = SU.list.filter(function (s) {
          if (!q) return true;
          var nm = norm(s.name);
          return String(s.n) === q || nm.indexOf(q) > -1 || nm.replace(/^ال/, '').indexOf(qn) > -1;
        }).map(function (s) {
          return '<a class="srow" href="#/quran/read/' + s.n + '">' + medal(s.n) +
            '<span class="sr-tx"><b class="mush">سورة ' + s.name + '</b><small>' + (s.medinan ? 'مدنية' : 'مكية') + SEP + ar(s.ayahs) + ' آية</small></span>' +
            '<span class="sr-j">الجزء ' + ar(juzOf(s.n, 1)) + '</span></a>';
        }).join('') || '<p class="note">لا توجد سورة بهذا الاسم.</p>';
      } else if (tab === 'juz') {
        html = SU.juz.map(function (j, i) {
          var s = SU.list[j[0] - 1];
          if (q && norm('الجزء ' + SU.juzNames[i]).indexOf(q) < 0 && String(i + 1) !== q && norm(s.name).indexOf(q) < 0) return '';
          return '<a class="srow" href="#/quran/read/' + j[0] + '/' + j[1] + '">' + medal(i + 1) +
            '<span class="sr-tx"><b class="mush">الجزء ' + SU.juzNames[i] + '</b><small>يبدأ من سورة ' + s.name + ' — آية ' + ar(j[1]) + '</small></span></a>';
        }).join('') || '<p class="note">لا توجد نتيجة.</p>';
      } else {
        html = marks.length ? marks.map(function (m, i) {
          var s = SU.list[m.s - 1];
          return '<div class="srow mk"><a class="mk-l" href="#/quran/read/' + m.s + '/' + m.a + '">' + medal(m.a) +
            '<span class="sr-tx"><b class="mush">سورة ' + s.name + '</b><small>آية ' + ar(m.a) + SEP + 'الجزء ' + ar(juzOf(m.s, m.a)) + '</small></span></a>' +
            '<button class="rd-btn mk-d" data-i="' + i + '" aria-label="حذف العلامة">' + I.minus + '</button></div>';
        }).join('') : '<p class="note">لا توجد علامات بعد. اضغط على أي آية أثناء القراءة واختر «وضع علامة هنا».</p>';
      }
      $('#qList').innerHTML = html;
      $$('.mk-d').forEach(function (b) {
        b.onclick = function () { marks.splice(+b.getAttribute('data-i'), 1); T.save(); index(); };
      });
      T.bindRipples();
    }
    $('#qSearch').addEventListener('input', draw);
    $$('#qTabs .chip').forEach(function (c) {
      c.onclick = function () { tab = c.getAttribute('data-t'); $$('#qTabs .chip').forEach(function (x) { x.classList.toggle('on', x === c); }); draw(); };
    });
    draw();
  }

  /* ---------- قارئ المصحف ---------- */
  function reader(sn, an) {
    var n = Math.max(1, Math.min(114, parseInt(sn, 10) || 1));
    var startAyah = parseInt(an, 10) || 0;
    var info = SU.list[n - 1];
    T.view('<div class="q-loading">جارٍ تحميل السورة…</div>', 'reading');
    loadQuran().then(function (all) {
      if (location.hash.indexOf('#/quran/read/' + n) !== 0) return;       // انتقل المستخدم لمكان آخر
      draw(all[n - 1]);
    }).catch(errorView);

    function go(dir) {
      var m = n + dir; if (m < 1 || m > 114) return;
      location.replace(location.pathname + location.search + '#/quran/read/' + m);
    }

    function draw(verses) {
      var showBism = n !== 9 && !(n === 1 && hasBism(verses[0]));
      var size = S.quran.size || 30;
      var body = verses.map(function (t, i) {
        return '<span class="ay" data-a="' + (i + 1) + '">' + esc(t) + ' <i class="ae">﴿' + ar(i + 1) + '﴾</i></span> ';
      }).join('');
      var next = n < 114 ? SU.list[n] : null;
      T.view(
        '<div class="qr">' +
          '<div class="qr-bar" id="qrBar">' +
            '<button class="rd-btn" id="qrBack" aria-label="رجوع">' + I.back + '</button>' +
            '<div class="qr-t"><b class="mush">سورة ' + info.name + '</b><small id="qrSub">الجزء ' + ar(juzOf(n, 1)) + '</small></div>' +
            '<button class="rd-btn" id="qrMinus" aria-label="تصغير الخط">' + I.minus + '</button>' +
            '<button class="rd-btn" id="qrPlus" aria-label="تكبير الخط">' + I.plus + '</button>' +
          '</div>' +
          '<div class="surah-banner"><span class="sb-o"></span><div><div class="sb-n mush">سورة ' + info.name + '</div><div class="sb-m">' + (info.medinan ? 'مدنية' : 'مكية') + SEP + ar(info.ayahs) + ' آية' + SEP + 'رقمها ' + ar(n) + '</div></div><span class="sb-o"></span></div>' +
          (showBism ? '<div class="bism mush">' + BISM + '</div>' : '') +
          '<div class="mushaf" id="mushaf" style="font-size:' + size + 'px">' + body + '</div>' +
          '<div class="qr-end"><span class="sb-o"></span><span>صدق الله العظيم</span><span class="sb-o"></span></div>' +
          '<div class="qr-nav">' +
            (n > 1 ? '<button class="btn ghost sm" id="qrPrev">' + I.fwd + 'السابقة</button>' : '<span></span>') +
            (next ? '<button class="btn gold sm" id="qrNext">سورة ' + next.name + I.back + '</button>' : '<span></span>') +
          '</div>' +
        '</div>', 'reading');

      var app = $('#app'), bar = $('#qrBar');
      $('#qrBack').onclick = function () { history.length > 1 ? history.back() : (location.hash = '#/quran'); };
      if ($('#qrPrev')) $('#qrPrev').onclick = function () { go(-1); };
      if ($('#qrNext')) $('#qrNext').onclick = function () { go(1); };
      function setSize(d) {
        S.quran.size = Math.max(22, Math.min(48, (S.quran.size || 30) + d)); T.save();
        $('#mushaf').style.fontSize = S.quran.size + 'px';
      }
      $('#qrMinus').onclick = function () { setSize(-2); };
      $('#qrPlus').onclick = function () { setSize(2); };

      /* تتبّع موضع القراءة */
      var spans = $$('.ay'), timer = null;
      function current() {
        var top = bar.getBoundingClientRect().bottom + 6, k;
        for (k = 0; k < spans.length; k++) {
          var rc = spans[k].getBoundingClientRect();
          if (rc.bottom > top + 4) return k + 1;
        }
        return spans.length;
      }
      function remember() {
        var a = current();
        S.quran.last = { s: n, a: a }; T.save();
        var sub = $('#qrSub'); if (sub) sub.innerHTML = 'الجزء ' + ar(juzOf(n, a)) + SEP + 'آية ' + ar(a);
      }
      function onScroll() { clearTimeout(timer); timer = setTimeout(remember, 350); }
      app.addEventListener('scroll', onScroll, { passive: true });
      T.onCleanup(function () { app.removeEventListener('scroll', onScroll); clearTimeout(timer); });

      /* الضغط على آية */
      $('#mushaf').addEventListener('click', function (e) {
        var sp = e.target.closest && e.target.closest('.ay'); if (!sp) return;
        var a = +sp.getAttribute('data-a');
        $$('.ay.sel').forEach(function (x) { x.classList.remove('sel'); });
        sp.classList.add('sel');
        verseSheet(a, verses[a - 1], sp);
      });

      if (startAyah > 1 && startAyah <= verses.length) {
        var el = spans[startAyah - 1];
        if (el) { app.scrollTop = Math.max(0, el.offsetTop - bar.offsetHeight - 12); el.classList.add('flash'); setTimeout(function () { el.classList.remove('flash'); }, 2400); }
        remember();
      } else if (S.quran.last && S.quran.last.s !== n) {
        /* لا نغيّر موضع المتابعة بمجرد فتح سورة أخرى حتى يبدأ المستخدم القراءة فيها */
      }
      T.bindRipples();
    }

    function verseSheet(a, text, sp) {
      var marks = S.quran.marks;
      function idx() { for (var i = 0; i < marks.length; i++) if (marks[i].s === n && marks[i].a === a) return i; return -1; }
      var has = idx() > -1;
      T.sheet(
        '<h3>سورة ' + info.name + ' — آية ' + ar(a) + '</h3>' +
        '<div class="vs-btns">' +
          '<button class="btn ghost" id="vsMark">' + (has ? I.bookmarkFill + 'إزالة العلامة' : I.bookmark + 'وضع علامة هنا') + '</button>' +
          '<button class="btn ghost" id="vsCopy">' + I.copy + 'نسخ الآية</button>' +
          '<button class="btn ghost" id="vsShare">' + I.share + 'مشاركة</button>' +
        '</div>', function (root) {
          function close() { T.closeSheet(); if (sp) sp.classList.remove('sel'); }
          $('#vsMark', root).onclick = function () {
            var i = idx();
            if (i > -1) { marks.splice(i, 1); T.toast('أُزيلت العلامة'); } else { marks.unshift({ s: n, a: a }); T.toast('وُضعت العلامة'); }
            T.save(); close();
          };
          function verseTxt() { return text + ' ﴿' + ar(a) + '﴾\n— سورة ' + info.name + '، من تطبيق TAMY'; }
          $('#vsCopy', root).onclick = function () { T.copyText(verseTxt()); close(); };
          $('#vsShare', root).onclick = function () {
            try { if (navigator.share) { navigator.share({ text: verseTxt() }).catch(function () { }); close(); return; } } catch (e) { /* لا شيء */ }
            T.copyText(verseTxt()); close();
          };
          $('.sh-back', root).addEventListener('click', function () { if (sp) sp.classList.remove('sel'); });
        });
    }
  }

  T.addRoute(/^#\/quran\/read\/(\d+)(?:\/(\d+))?$/, reader);
  T.addRoute(/^#\/quran$/, index);

  // الفهرس لا يحتاج النص نفسه؛ نبدأ التحميل مبكرًا لتسريع فتح السور
  setTimeout(function () { loadQuran().catch(function () { }); }, 1500);
})();
