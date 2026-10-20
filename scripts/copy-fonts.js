// ينسخ خطوط Amiri و Cairo (العربية) من node_modules إلى www/fonts
const fs = require('fs'), path = require('path');
const out = path.join(__dirname, '..', 'www', 'fonts');
fs.mkdirSync(out, { recursive: true });

function find(pkg, weight) {
  const dir = path.join(__dirname, '..', 'node_modules', '@fontsource', pkg, 'files');
  if (!fs.existsSync(dir)) return null;
  const re = new RegExp('^' + pkg + '-arabic-' + weight + '-normal\\.woff2$');
  const f = fs.readdirSync(dir).find((n) => re.test(n));
  return f ? path.join(dir, f) : null;
}

let missing = 0;
[['amiri', 400], ['amiri', 700], ['amiri-quran', 400], ['cairo', 400], ['cairo', 600], ['cairo', 700]].forEach(([pkg, w]) => {
  const src = find(pkg, w);
  if (!src) { console.warn('! لم أجد الخط ' + pkg + ' ' + w + ' — سيُستخدم خط النظام بدلًا منه'); missing++; return; }
  fs.copyFileSync(src, path.join(out, pkg + '-' + w + '.woff2'));
  console.log('✓ ' + pkg + '-' + w + '.woff2');
});
if (missing) console.warn('تنبيه: ' + missing + ' خط/خطوط ناقصة (التطبيق سيعمل بخط النظام).');
