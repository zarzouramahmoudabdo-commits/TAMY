// يجهّز صوت الأذان:
//  - النسخة الكاملة تُنسخ إلى www/audio لتشغيلها داخل التطبيق
//  - نسخة قصيرة (40 ثانية بتلاشٍ تدريجي) تُوضع في android/.../res/raw لتكون صوت الإشعار
//  - يكتب www/features.json ليعرف التطبيق هل الأذان متوفر
// ضع الملفات في assets/audio/ :  adhan.mp3  (إلزامي لتفعيل الأذان)  و  adhan_fajr.mp3  (اختياري للفجر)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..');
const src = path.join(root, 'assets', 'audio');
const www = path.join(root, 'www');
const wwwAudio = path.join(www, 'audio');
const raw = path.join(root, 'android', 'app', 'src', 'main', 'res', 'raw');
const CLIP_SECONDS = 40;

function find(base) {
  if (!fs.existsSync(src)) return null;
  const f = fs.readdirSync(src).find((n) => new RegExp('^' + base + '\\.(mp3|ogg|wav|m4a)$', 'i').test(n));
  return f ? path.join(src, f) : null;
}
function hasFfmpeg() { try { cp.execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch (e) { return false; } }

fs.rmSync(wwwAudio, { recursive: true, force: true });
const features = { adhan: false, adhanFajr: false, salawat: false };
const ff = hasFfmpeg();
const haveAndroid = fs.existsSync(path.join(root, 'android'));
if (haveAndroid) {
  fs.mkdirSync(raw, { recursive: true });
  ['adhan', 'adhan_fajr', 'salawat'].forEach((n) => ['mp3', 'ogg', 'wav', 'm4a'].forEach((e) => fs.rmSync(path.join(raw, n + '.' + e), { force: true })));
}

[['adhan', 'adhan'], ['adhan_fajr', 'adhanFajr'], ['salawat', 'salawat']].forEach(([base, key]) => {
  const f = find(base);
  if (!f) { console.log('· لا يوجد ' + base + ' — سيُستخدم صوت الإشعار العادي لهذا الأذان'); return; }
  const ext = path.extname(f).toLowerCase();
  const mb = fs.statSync(f).size / 1048576;
  if (mb > 12) console.warn('! ملف ' + base + ' حجمه ' + mb.toFixed(1) + ' م.ب — يفضَّل أقل من 8 م.ب');
  fs.mkdirSync(wwwAudio, { recursive: true });
  fs.copyFileSync(f, path.join(wwwAudio, base + ext));
  features[key] = true;
  features[key + 'File'] = 'audio/' + base + ext;

  if (!haveAndroid) { console.warn('! مجلد android غير موجود بعد — لن يُجهَّز صوت الإشعار'); return; }
  const out = path.join(raw, base + '.mp3');
  if (ff) {
    try {
      cp.execFileSync('ffmpeg', ['-y', '-i', f, '-t', String(CLIP_SECONDS), '-af', 'afade=t=out:st=' + (CLIP_SECONDS - 5) + ':d=5', '-ac', '2', '-ar', '44100', '-c:a', 'libmp3lame', '-q:a', '5', out], { stdio: 'ignore' });
      console.log('✓ ' + base + ': نسخة الإشعار ' + CLIP_SECONDS + ' ثانية');
      return;
    } catch (e) { console.warn('! فشل القص بـ ffmpeg، سيُستخدم الملف كما هو'); }
  } else console.warn('! ffmpeg غير متوفر — سيُستخدم ' + base + ' كاملًا كصوت للإشعار');
  fs.copyFileSync(f, path.join(raw, base + (ext === '.m4a' ? '.mp3' : ext)));
});

/* ===== قائمة الأذانات المتعددة (assets/audio/adhans/*.mp3 + الأذانين القديمين) ===== */
const crypto = require('crypto');
const adhDir = path.join(src, 'adhans');
const LABELS = { adhan: 'الأذان الأول', adhan_fajr: 'أذان الفجر الأصلي' };
try { Object.assign(LABELS, JSON.parse(fs.readFileSync(path.join(adhDir, 'labels.json'), 'utf8'))); } catch (e) { /* لا شيء */ }
const cands = [];
['adhan', 'adhan_fajr'].forEach((b) => { const f = find(b); if (f) cands.push({ id: b, f }); });
if (fs.existsSync(adhDir)) fs.readdirSync(adhDir).sort().forEach((n) => {
  const m = /^(.+)\.(mp3|ogg|wav|m4a)$/i.exec(n); if (!m) return;
  const id = m[1].toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || ('a' + cands.length);
  if (cands.some((c) => c.id === id)) return;
  cands.push({ id, f: path.join(adhDir, n) });
});
fs.mkdirSync(wwwAudio, { recursive: true });
if (haveAndroid && fs.existsSync(raw)) fs.readdirSync(raw).filter((n) => /^adh_/.test(n)).forEach((n) => fs.rmSync(path.join(raw, n), { force: true }));
features.adhans = [];
cands.forEach((c) => {
  const h = crypto.createHash('sha1').update(fs.readFileSync(c.f)).digest('hex').slice(0, 6);
  const ch = 'adh_' + c.id + '_' + h, ext = path.extname(c.f).toLowerCase();
  fs.copyFileSync(c.f, path.join(wwwAudio, ch + ext));
  if (haveAndroid) {
    const out = path.join(raw, ch + '.mp3');
    let ok = false;
    if (ff) {
      try {
        cp.execFileSync('ffmpeg', ['-y', '-i', c.f, '-t', String(CLIP_SECONDS), '-af', 'afade=t=out:st=' + (CLIP_SECONDS - 5) + ':d=5', '-ac', '2', '-ar', '44100', '-c:a', 'libmp3lame', '-q:a', '5', out], { stdio: 'ignore' });
        ok = true;
      } catch (e) { /* لا شيء */ }
    }
    if (!ok) fs.copyFileSync(c.f, ext === '.m4a' ? out : path.join(raw, ch + ext));
  }
  features.adhans.push({ id: c.id, label: LABELS[c.id] || c.id, ch, file: 'audio/' + ch + ext });
  console.log('✓ أذان: ' + c.id + ' → ' + ch);
});
if (features.adhans.length) features.adhan = true;

fs.writeFileSync(path.join(www, 'features.json'), JSON.stringify(features));
console.log('features.json:', JSON.stringify(features));
