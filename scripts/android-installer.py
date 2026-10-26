#!/usr/bin/env python3
"""يُشغَّل في GitHub Actions بعد sync: يضيف مكوّن تنزيل وتثبيت الـ APK من داخل التطبيق."""
import re, sys, glob, pathlib, json
root = pathlib.Path('.')
app = root / 'android' / 'app'
mains = glob.glob(str(app / 'src' / 'main' / 'java' / '**' / 'MainActivity.java'), recursive=True)
if not mains:
    print('خطأ: لا يوجد MainActivity.java'); sys.exit(1)
ma = pathlib.Path(mains[0])
t = ma.read_text(encoding='utf8')
pkg = re.search(r'^\s*package\s+([\w.]+)\s*;', t, re.M).group(1)

# المكوّن
src = pathlib.Path('scripts/ApkInstallerPlugin.java').read_text(encoding='utf8').replace('__PKG__', pkg)
(ma.parent / 'ApkInstallerPlugin.java').write_text(src, encoding='utf8')

# تسجيله في MainActivity
if 'ApkInstallerPlugin' not in t:
    if re.search(r'void\s+onCreate\s*\(', t):
        n = re.sub(r'(\n[ \t]*)(super\.onCreate\s*\()', r'\1registerPlugin(ApkInstallerPlugin.class);\1\2', t, count=1)
    else:
        n = re.sub(r'(public\s+class\s+MainActivity\s+extends\s+BridgeActivity\s*\{)',
                   r'\1\n    @Override\n    public void onCreate(android.os.Bundle savedInstanceState) {\n        registerPlugin(ApkInstallerPlugin.class);\n        super.onCreate(savedInstanceState);\n    }\n', t, count=1)
    if n == t:
        print('خطأ: لم أستطع تعديل MainActivity'); print(t); sys.exit(1)
    ma.write_text(n, encoding='utf8')

# الصلاحية
mp = app / 'src' / 'main' / 'AndroidManifest.xml'
m = mp.read_text(encoding='utf8')
if 'REQUEST_INSTALL_PACKAGES' not in m:
    m = m.replace('<application', '<uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />\n    <application', 1)
    mp.write_text(m, encoding='utf8')

# مسارات FileProvider
fp = app / 'src' / 'main' / 'res' / 'xml' / 'file_paths.xml'
fp.parent.mkdir(parents=True, exist_ok=True)
fp.write_text('<?xml version="1.0" encoding="utf-8"?>\n<paths xmlns:android="http://schemas.android.com/apk/res/android">\n'
              '    <external-path name="my_images" path="." />\n    <cache-path name="my_cache_images" path="." />\n'
              '    <files-path name="my_files" path="." />\n</paths>\n', encoding='utf8')
if 'fileprovider' not in m.lower():
    print('تنبيه: لا يوجد FileProvider في الـ manifest')
print('تم: حزمة=%s' % pkg)
