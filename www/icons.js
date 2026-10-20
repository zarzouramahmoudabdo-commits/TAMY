/* TAMY — أيقونات إسلامية (SVG) بخطوط ذهبية وكريمية */
(function () {
  'use strict';

  function wrap(body, vb) {
    return '<svg class="ic" viewBox="' + (vb || '0 0 48 48') + '" aria-hidden="true" focusable="false">' + body + '</svg>';
  }

  // نجمة ثمانية الرؤوس (روزيت)
  function star(cx, cy, ro, ri, n) {
    var pts = [], i, a, r;
    for (i = 0; i < n * 2; i++) {
      a = (i * Math.PI) / n - Math.PI / 2;
      r = i % 2 === 0 ? ro : ri;
      pts.push((cx + r * Math.cos(a)).toFixed(2) + ',' + (cy + r * Math.sin(a)).toFixed(2));
    }
    return pts.join(' ');
  }

  function beads() {
    var s = '', n = 10, cx = 24, cy = 20, r = 13, i, a;
    for (i = 0; i < n; i++) {
      a = (i / n) * 2 * Math.PI - Math.PI / 2;
      s += '<circle class="g" cx="' + (cx + r * Math.cos(a)).toFixed(1) + '" cy="' + (cy + r * Math.sin(a)).toFixed(1) + '" r="2.7"/>';
    }
    return wrap(s + '<path d="M24 33v4"/><ellipse class="g" cx="24" cy="40" rx="2.8" ry="3.4"/>');
  }

  var ICONS = {
    /* ----- أقسام الأذكار ----- */
    sunrise: wrap('<path class="gs" d="M5 35h38"/><path class="g" d="M14 35a10 10 0 0 1 20 0z"/><path d="M24 10v6M11 17.5l3.8 3.8M37 17.5l-3.8 3.8M4.5 28.5H9M39 28.5h4.5M15 41h18"/>'),
    sunset: wrap('<path class="gs" d="M5 35h38"/><path class="g" d="M15 35a9 9 0 0 1 18 0z"/><path d="M24 8v9M20 13.5l4 4 4-4M10 21l3.5 3.5M38 21l-3.5 3.5M15 41h18"/>'),
    moon: wrap('<path class="g" d="M29 7a17 17 0 1 0 12 25 14 14 0 0 1-12-25z"/><path d="M35 9v6M32 12h6M40 21v4M38 23h4"/>'),
    sun: wrap('<circle class="g" cx="24" cy="24" r="8"/><path d="M24 5v6M24 37v6M5 24h6M37 24h6M10.5 10.5l4.2 4.2M33.3 33.3l4.2 4.2M10.5 37.5l4.2-4.2M33.3 14.7l4.2-4.2"/>'),
    rug: wrap('<rect x="9" y="5" width="30" height="38" rx="3.5"/><path class="gs" d="M16 36V23a8 8 0 0 1 16 0v13"/><path class="g" d="M24 12l1.6 2.6 3-.5-1.3 2.8 2.2 2H24.8L24 19.8l-.8-1.9h-4.1l2.2-2-1.3-2.8 3 .5z" opacity=".0"/><path d="M13 9h22M13 39h22"/><circle class="g" cx="24" cy="25" r="2.4"/>'),
    mosque: wrap('<path class="g" d="M13 25a11 11 0 0 1 22 0z"/><path d="M24 8v6M22 10h4"/><path d="M8 40V18l3-5 3 5v22M34 40V18l3-5 3 5v22"/><path d="M8 40h32M13 40V25M35 40V25"/><path d="M21 40v-6a3 3 0 0 1 6 0v6"/>'),
    food: wrap('<path class="g" d="M7 22h34c0 9-7 16-17 16S7 31 7 22z"/><path d="M5 22h38M18 14c0-3 3-3 3-6M26 14c0-3 3-3 3-6M34 14c0-3 3-3 3-6" /><path d="M16 42h16"/>'),
    home: wrap('<path d="M6 23 24 8l18 15"/><path d="M10 20v22h28V20"/><path class="g" d="M20 42V30a4 4 0 0 1 8 0v12z"/><path d="M33 12V8h4v8"/>'),
    travel: wrap('<path class="g" d="M24 43S11 29 11 19a13 13 0 0 1 26 0c0 10-13 24-13 24z"/><circle cx="24" cy="19" r="5" style="fill:var(--deep);stroke:none"/><path d="M9 44h30" />'),
    cloud: wrap('<path class="g" d="M14 37a8.5 8.5 0 0 1-1.2-16.9 11.5 11.5 0 0 1 22 2.9A7 7 0 0 1 34 37z"/><path d="M17 42v2M24 42v3M31 42v2"/>'),
    shield: wrap('<path class="g" d="M24 5l15 5.5V22c0 9.5-6.2 17-15 21-8.8-4-15-11.500-15-21V10.500z"/><path d="m17 23 5 5 9-10" style="stroke:var(--deep)"/>'),
    heart: wrap('<path class="g" d="M24 41S6 30 6 17.500A9.500 9.500 0 0 1 24 13a9.500 9.500 0 0 1 18 4.500C42 30 24 41 24 41z"/><path d="M24 20v10M19 25h10" style="stroke:var(--deep)"/>'),
    quran: wrap('<path d="M24 12c-5-3.500-12-4-17-2.500V37c5-1.500 12-1 17 2.500 5-3.500 12-4 17-2.500V9.500C36 8 29 8.500 24 12z"/><path d="M24 12v27"/><path class="g" d="M15 20h4M15 25h4M29 20h4M29 25h4"/><polygon class="g" points="24,2 25.200,5 28,5.400 26,7.400 26.600,10.400 24,9 21.400,10.400 22,7.400 20,5.400 22.800,5"/>'),
    lantern: wrap('<path d="M21 4h6M24 4v5"/><path d="M16 12h16l-2 5H18z"/><path class="g" d="M18 17h12c3 6 3 14 0 20H18c-3-6-3-14 0-20z"/><path d="M16 37h16l-2 5H18z"/><path d="M24 17v20" style="stroke:var(--deep)"/>'),
    dua: wrap('<path class="g" d="M5 24c4-1 8 1 12 5l7 7 7-7c4-4 8-6 12-5-1 10-8 17-19 18C13 41 6 34 5 24z"/><path d="M24 36V14M19 18l5-7 5 7"/>'),

    /* ----- أدوات ----- */
    beads: beads(),
    clock: wrap('<circle cx="24" cy="25" r="17"/><path d="M24 14v11l7 5" class="gs"/><path d="M24 8V6M41 25h2M5 25h2M24 42v2"/><path class="g" d="M36 6.500a5 5 0 1 0 4.500 6.500 4 4 0 0 1-4.500-6.500z"/>'),
    qibla: wrap('<circle cx="24" cy="26" r="16"/><path class="g" d="M24 12l4 14-4 12-4-12z"/><rect x="20" y="3" width="8" height="8" rx="1.200" style="fill:#0b0b0b;stroke:var(--gold)"/><path d="M20 6.500h8" class="gs"/>'),
    names: wrap('<polygon class="g" points="' + star(24, 24, 20, 12.500, 8) + '"/><text x="24" y="29" text-anchor="middle" font-size="13" font-weight="800" style="fill:var(--deep);stroke:none;font-family:inherit">٩٩</text>'),
    fav: wrap('<polygon class="g" points="' + star(24, 25, 19, 8, 5) + '"/>'),
    gear: wrap('<path d="M7 14h20M35 14h6M7 24h8M23 24h18M7 34h24M39 34h2"/><circle class="g" cx="31" cy="14" r="4"/><circle class="g" cx="19" cy="24" r="4"/><circle class="g" cx="35" cy="34" r="4"/>'),
    home_nav: wrap('<path d="M6 22 24 7l18 15"/><path d="M11 19v22h26V19"/><path class="g" d="M20 41V30a4 4 0 0 1 8 0v11z"/>'),
    bell: wrap('<path class="g" d="M10 34c3-3 4-6 4-12a10 10 0 0 1 20 0c0 6 1 9 4 12z"/><path d="M20 38a4 4 0 0 0 8 0"/><path d="M24 7V4"/>'),
    kaaba: wrap('<path d="M7 17 24 9l17 8v22L24 45 7 39z" style="fill:#0d0d0d;stroke:var(--gold)"/><path d="M7 17 24 25l17-8M24 25v20" style="stroke:var(--gold)"/><path class="gs" d="M7 24l17 8 17-8" style="stroke-width:3"/>'),

    /* ----- أزرار صغيرة ----- */
    back: wrap('<path d="M18 9l15 15-15 15"/>'),
    fwd: wrap('<path d="M30 9 15 24l15 15"/>'),
    list: wrap('<path d="M16 12h24M16 24h24M16 36h24"/><circle class="g" cx="8" cy="12" r="2"/><circle class="g" cx="8" cy="24" r="2"/><circle class="g" cx="8" cy="36" r="2"/>'),
    copy: wrap('<rect x="15" y="15" width="25" height="27" rx="4"/><path d="M33 9H11a3 3 0 0 0-3 3v24"/>'),
    share: wrap('<circle cx="35" cy="11" r="5"/><circle cx="12" cy="24" r="5"/><circle cx="35" cy="37" r="5"/><path d="m16.500 21.500 14-8M16.500 26.500l14 8"/>'),
    star: wrap('<polygon points="' + star(24, 25, 19, 8, 5) + '"/>'),
    starFill: wrap('<polygon class="g" points="' + star(24, 25, 19, 8, 5) + '"/>'),
    reset: wrap('<path d="M9 22a15 15 0 1 1 3 12"/><path d="M8 11v11h11"/>'),
    check: wrap('<path d="m10 25 9 9 19-20"/>'),
    plus: wrap('<path d="M24 10v28M10 24h28"/>'),
    minus: wrap('<path d="M10 24h28"/>'),
    pin: wrap('<path d="M24 43S11 29 11 19a13 13 0 0 1 26 0c0 10-13 24-13 24z"/><circle class="g" cx="24" cy="19" r="4.500"/>'),
    text: wrap('<path d="M7 38 17 10l10 28M10 30h14M31 38l6-16 6 16M33 33h8"/>'),
    play: wrap('<path class="g" d="M14 8v32l27-16z"/>'),
    stop: wrap('<rect class="g" x="11" y="11" width="26" height="26" rx="4"/>'),
    bookmark: wrap('<path d="M12 6h24v37L24 33 12 43z"/>'),
    bookmarkFill: wrap('<path class="g" d="M12 6h24v37L24 33 12 43z"/>'),
    search: wrap('<circle cx="21" cy="21" r="13"/><path d="m31 31 12 12"/>'),
    vibrate: wrap('<rect x="16" y="6" width="16" height="36" rx="4"/><path d="M8 16v16M4 20v8M40 16v16M44 20v8"/>')
  };

  window.ICONS = ICONS;
})();
