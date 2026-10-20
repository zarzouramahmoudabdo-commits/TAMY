/* TAMY — حساب مواقيت الصلاة والقبلة (يعمل بدون إنترنت) */
(function () {
  'use strict';
  var D2R = Math.PI / 180, R2D = 180 / Math.PI;
  function sin(d) { return Math.sin(d * D2R); }
  function cos(d) { return Math.cos(d * D2R); }
  function tan(d) { return Math.tan(d * D2R); }
  function asin(x) { return Math.asin(x) * R2D; }
  function acos(x) { return Math.acos(x) * R2D; }
  function atan2(y, x) { return Math.atan2(y, x) * R2D; }
  function acot(x) { return Math.atan(1 / x) * R2D; }
  function fix(a, b) { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; }
  function fixAngle(a) { return fix(a, 360); }
  function fixHour(a) { return fix(a, 24); }

  var METHODS = {
    EGYPT: { name: 'الهيئة المصرية العامة للمساحة', fajr: 19.5, isha: 17.5 },
    MWL: { name: 'رابطة العالم الإسلامي', fajr: 18, isha: 17 },
    UMM: { name: 'أم القرى (مكة المكرمة)', fajr: 18.5, isha: 90 },
    KARACHI: { name: 'جامعة العلوم الإسلامية — كراتشي', fajr: 18, isha: 18 },
    ISNA: { name: 'أمريكا الشمالية (ISNA)', fajr: 15, isha: 15 },
    KUWAIT: { name: 'وزارة الأوقاف الكويتية', fajr: 18, isha: 17.5 }
  };
  // قيمة isha الرقمية الكبيرة (>=60) تعني "بعد المغرب بعدد دقائق" (أم القرى)
  function ishaIsMinutes(m) { return m.isha >= 60; }

  function julian(y, m, d) {
    if (m <= 2) { y -= 1; m += 12; }
    var A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
  }

  function sunPosition(jd) {
    var D = jd - 2451545.0;
    var g = fixAngle(357.529 + 0.98560028 * D);
    var q = fixAngle(280.459 + 0.98564736 * D);
    var L = fixAngle(q + 1.915 * sin(g) + 0.020 * sin(2 * g));
    var e = 23.439 - 0.00000036 * D;
    var RA = fixHour(atan2(cos(e) * sin(L), cos(L)) / 15);
    return { decl: asin(sin(e) * sin(L)), eq: q / 15 - RA };
  }

  /**
   * يحسب مواقيت يوم محدد.
   * @param {Date} date أي لحظة داخل اليوم المطلوب (بتوقيت الجهاز)
   * @returns {{fajr,sunrise,dhuhr,asr,sunset,maghrib,isha: Date}}
   */
  function compute(date, lat, lng, opt) {
    opt = opt || {};
    var m = METHODS[opt.method] || METHODS.EGYPT;
    var y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
    var noonLocal = new Date(y, mo, d, 12, 0, 0);
    var tz = -noonLocal.getTimezoneOffset() / 60;
    var jd = julian(y, mo + 1, d) - lng / (15 * 24);

    function midDay(t) { return fixHour(12 - sunPosition(jd + t).eq); }
    function angleTime(angle, t, ccw) {
      var decl = sunPosition(jd + t).decl;
      var noon = midDay(t);
      var v = (-sin(angle) - sin(decl) * sin(lat)) / (cos(decl) * cos(lat));
      var h = acos(v) / 15;
      return noon + (ccw ? -h : h);
    }
    function asrTime(factor, t) {
      var decl = sunPosition(jd + t).decl;
      var ang = -acot(factor + tan(Math.abs(lat - decl)));
      return angleTime(ang, t, false);
    }

    var raw = {
      fajr: angleTime(m.fajr, 5 / 24, true),
      sunrise: angleTime(0.833, 6 / 24, true),
      dhuhr: midDay(12 / 24),
      asr: asrTime(opt.asr === 'hanafi' ? 2 : 1, 13 / 24),
      sunset: angleTime(0.833, 18 / 24, false)
    };
    raw.maghrib = raw.sunset;
    raw.isha = ishaIsMinutes(m) ? raw.maghrib + m.isha / 60 : angleTime(m.isha, 18 / 24, false);

    // خطوط العرض العالية: إذا لم يصل الفجر/العشاء للزاوية المطلوبة نستخدم طريقة "جزء من الليل"
    if (!isNaN(raw.sunrise) && !isNaN(raw.sunset)) {
      var night = 24 - (raw.sunset - raw.sunrise);
      night = night < 0 ? night + 24 : night;
      if (isNaN(raw.fajr)) raw.fajr = raw.sunrise - night * Math.min(m.fajr, 60) / 60;
      if (isNaN(raw.isha)) raw.isha = raw.sunset + night * Math.min(ishaIsMinutes(m) ? 18 : m.isha, 60) / 60;
    }

    var adj = opt.adjust || {};
    var base = Date.UTC(y, mo, d);
    var out = {};
    Object.keys(raw).forEach(function (k) {
      var t = raw[k] + tz - lng / 15;           // الوقت المحلي بالساعات
      var ms = base + (t - tz) * 3600000 + (adj[k] || 0) * 60000;
      out[k] = isNaN(ms) ? null : new Date(ms);
    });
    return out;
  }

  var ORDER = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  function addDays(date, n) { var d = new Date(date.getTime()); d.setDate(d.getDate() + n); return d; }

  /** الصلاة القادمة بعد لحظة معينة */
  function next(now, lat, lng, opt) {
    var today = compute(now, lat, lng, opt);
    for (var i = 0; i < ORDER.length; i++) {
      var t = today[ORDER[i]];
      if (t && t.getTime() > now.getTime()) return { key: ORDER[i], time: t, today: today };
    }
    var tomorrow = compute(addDays(now, 1), lat, lng, opt);
    return { key: 'fajr', time: tomorrow.fajr, today: today, tomorrow: tomorrow };
  }

  /** الصلاة الحالية (آخر موعد مضى) */
  function current(now, today) {
    var cur = null;
    ORDER.forEach(function (k) { if (today[k] && today[k].getTime() <= now.getTime()) cur = k; });
    return cur;
  }

  /** بداية الثلث الأخير من الليل (وقت القيام) */
  function lastThird(today, tomorrow) {
    var a = today.maghrib.getTime(), b = tomorrow.fajr.getTime();
    return new Date(a + (b - a) * 2 / 3);
  }

  /** اتجاه القبلة بالدرجات من الشمال الحقيقي */
  function qibla(lat, lng) {
    var kLat = 21.4225, kLng = 39.8262;
    var dl = (kLng - lng) * D2R;
    var y = Math.sin(dl);
    var x = cos(lat) * tan(kLat) - sin(lat) * Math.cos(dl);
    return fixAngle(atan2(y, x));
  }

  /** المسافة إلى الكعبة بالكيلومتر */
  function distance(lat, lng) {
    var kLat = 21.4225, kLng = 39.8262, R = 6371;
    var dLat = (kLat - lat) * D2R, dLng = (kLng - lng) * D2R;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + cos(lat) * cos(kLat) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  window.PrayerTimes = {
    METHODS: METHODS, ORDER: ORDER,
    compute: compute, next: next, current: current, lastThird: lastThird,
    qibla: qibla, distance: distance, addDays: addDays
  };
})();
