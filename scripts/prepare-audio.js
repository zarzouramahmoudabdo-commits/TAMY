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
const features = { adhan: false, adhanFajr: false };
const ff = hasFfmpeg();
const haveAndroid = fs.existsSync(path.join(root, 'android'));
if (haveAndroid) {
  fs.mkdirSync(raw, { recursive: true });
  ['adhan', 'adhan_fajr'].forEach((n) => ['mp3', 'ogg', 'wav', 'm4a'].forEach((e) => fs.rmSync(path.join(raw, n + '.' + e), { force: true })));
}

[['adhan', 'adhan'], ['adhan_fajr', 'adhanFajr']].forEach(([base, key]) => {
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

fs.writeFileSync(path.join(www, 'features.json'), JSON.stringify(features));
console.log('features.json:', JSON.stringify(features));
