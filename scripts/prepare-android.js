// يضبط مشروع الأندرويد بعد `cap add android` / `cap sync`:
// الصلاحيات، اتجاه الشاشة، ألوان شريط الحالة، أيقونة الإشعار، والتوقيع الثابت.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const A = path.join(root, 'android');
if (!fs.existsSync(A)) { console.error('مجلد android غير موجود — شغّل: npx cap add android'); process.exit(1); }

function rw(file, fn) {
  if (!fs.existsSync(file)) { console.warn('! غير موجود: ' + path.relative(root, file)); return; }
  const a = fs.readFileSync(file, 'utf8'), b = fn(a);
  if (a !== b) { fs.writeFileSync(file, b); console.log('✓ عُدّل: ' + path.relative(root, file)); }
}

/* 1) AndroidManifest */
const man = path.join(A, 'app', 'src', 'main', 'AndroidManifest.xml');
rw(man, (s) => {
  const perms = [
    'android.permission.INTERNET',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.VIBRATE',
    'android.permission.RECEIVE_BOOT_COMPLETED',
    'android.permission.SCHEDULE_EXACT_ALARM',
    'android.permission.USE_EXACT_ALARM',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.ACCESS_FINE_LOCATION'
  ];
  perms.forEach((p) => {
    if (s.indexOf('"' + p + '"') === -1) s = s.replace('</manifest>', '    <uses-permission android:name="' + p + '" />\n</manifest>');
  });
  if (s.indexOf('android:screenOrientation') === -1) s = s.replace(/<activity\b/, '<activity\n            android:screenOrientation="portrait"');
  return s;
});

/* 2) ألوان شريط الحالة */
const colors = path.join(A, 'app', 'src', 'main', 'res', 'values', 'colors.xml');
fs.mkdirSync(path.dirname(colors), { recursive: true });
const want = { colorPrimary: '#062B24', colorPrimaryDark: '#062B24', colorAccent: '#E6BF63' };
if (fs.existsSync(colors)) {
  rw(colors, (s) => {
    Object.keys(want).forEach((k) => {
      const re = new RegExp('(<color name="' + k + '">)[^<]*(</color>)');
      if (re.test(s)) s = s.replace(re, '$1' + want[k] + '$2');
      else s = s.replace('</resources>', '    <color name="' + k + '">' + want[k] + '</color>\n</resources>');
    });
    return s;
  });
} else {
  fs.writeFileSync(colors, '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n' + Object.keys(want).map((k) => '    <color name="' + k + '">' + want[k] + '</color>\n').join('') + '</resources>\n');
  console.log('✓ كُتب: colors.xml');
}

/* ثيم: شريط حالة وتنقّل بلون التطبيق */
const styles = path.join(A, 'app', 'src', 'main', 'res', 'values', 'styles.xml');
rw(styles, (s) => {
  if (s.indexOf('android:statusBarColor') > -1) return s;
  return s.replace(/(<style name="AppTheme\.NoActionBar"[^>]*>)/, '$1\n        <item name="android:statusBarColor">#062B24</item>\n        <item name="android:navigationBarColor">#041F1A</item>');
});

/* 3) أيقونة الإشعار الصغيرة */
['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'].forEach((d) => {
  const src = path.join(root, 'assets', 'notif', 'ic_stat_tamy-' + d + '.png');
  const dstDir = path.join(A, 'app', 'src', 'main', 'res', 'drawable-' + d);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dstDir, { recursive: true });
  fs.copyFileSync(src, path.join(dstDir, 'ic_stat_tamy.png'));
});
console.log('✓ أيقونة الإشعار');

/* 4) توقيع ثابت (ليُحدَّث التطبيق فوق النسخة القديمة بدون حذف) */
const gradle = path.join(A, 'app', 'build.gradle');
rw(gradle, (s) => {
  if (s.indexOf('tamy.keystore') > -1) return s;
  const block =
    '    signingConfigs {\n' +
    '        debug {\n' +
    '            storeFile file("$rootDir/../tamy.keystore")\n' +
    '            storePassword "tamy1234"\n' +
    '            keyAlias "tamy"\n' +
    '            keyPassword "tamy1234"\n' +
    '        }\n' +
    '    }\n';
  return s.replace(/(\n\s*android\s*\{\n)/, '$1' + block);
});
/* 5) رقم النسخة (يزيد مع كل بناء ليقبله أندرويد كتحديث) */
if (process.env.VERSION_CODE) {
  rw(gradle, (s) => s
    .replace(/versionCode\s*=?\s*\d+/, 'versionCode ' + parseInt(process.env.VERSION_CODE, 10))
    .replace(/versionName\s*=?\s*"[^"]*"/, 'versionName "' + (process.env.VERSION_NAME || '1.0') + '"'));
}
console.log('تم تجهيز مشروع الأندرويد.');
