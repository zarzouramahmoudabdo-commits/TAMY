import json, os, re, subprocess, sys
bad = []; ok = []
def run(c): return subprocess.run(c, shell=True, capture_output=True, text=True)
def chk(cond, good, err):
    (ok if cond else bad).append(good if cond else err)

# 1) صحة الجافاسكربت
for d in ('www', 'scripts'):
    for f in sorted(os.listdir(d)):
        if f.endswith('.js'):
            r = run('node --check %s/%s' % (d, f))
            chk(r.returncode == 0, 'JS سليم: %s/%s' % (d, f), 'خطأ صياغة: %s/%s\n%s' % (d, f, r.stderr.strip()[:300]))
# 2) كل ملف مذكور في index.html موجود
html = open('www/index.html', encoding='utf8').read()
for ref in re.findall(r'(?:src|href)="([^"#?:]+)"', html):
    chk(os.path.exists('www/' + ref), 'موجود: ' + ref, 'مذكور في index.html وغير موجود: ' + ref)
# 3) JSON
for f in ('capacitor.config.json', 'package.json', 'assets/audio/adhans/labels.json'):
    if os.path.exists(f):
        try: json.load(open(f, encoding='utf8')); ok.append('JSON سليم: ' + f)
        except Exception as e: bad.append('JSON تالف: %s (%s)' % (f, e))
# 4) إعدادات الـ shell
cfg = json.load(open('capacitor.config.json', encoding='utf8'))
chk('github.io' in json.dumps(cfg.get('server', {})), 'server.url موجود', 'server.url غير مضبوط (التطبيق مش shell)')
sw = open('www/sw.js', encoding='utf8').read()
chk('no-store' in sw and '_capacitor_file_' in sw, 'sw.js سليم', 'sw.js ناقص no-store أو استثناء الملفات')
# 5) بقايا قديمة
for pat in ('liveupdate', 'capgo', 'file-opener'):
    r = run('grep -rIl "%s" www package.json .github scripts --exclude=precheck.py' % pat)
    chk(not r.stdout.strip(), 'لا بقايا: ' + pat, 'بقايا %s في: %s' % (pat, r.stdout.strip().replace('\n', ', ')))
# 6) ملفات الصوت
for f in ('assets/audio/adhan.mp3', 'assets/audio/adhan_fajr.mp3', 'assets/audio/salawat.mp3'):
    chk(os.path.exists(f) and os.path.getsize(f) > 10000, 'صوت موجود: ' + f, 'صوت ناقص أو فاضي: ' + f)
# 7) أسرار في الريبو
r = run('git ls-files | grep -iE "\\.jks$|password|\\.keystore$|\\.env$|token"')
chk(not r.stdout.strip(), 'لا أسرار في الريبو', 'ملفات حساسة داخل الريبو: ' + r.stdout.strip())
# 8) تحقق وظيفي بسيط
app = open('www/app.js', encoding='utf8').read()
chk('SCHED_VER' in app, 'SCHED_VER موجود', 'SCHED_VER مفقود')
chk(os.path.exists('www/apk-install.js') and 'TAMYApkInstall' in open('www/apk-install.js', encoding='utf8').read(), 'المثبّت متاح', 'window.TAMYApkInstall مفقود')
lis = open('www/listen.js', encoding='utf8').read()
chk('_capacitor_file_' in lis and 'https://localhost' in lis, 'مسار الصوت المحمّل محلي', 'dlLocal مش بيحوّل لـ https://localhost')
# 9) الـ workflows
for f in sorted(os.listdir('.github/workflows')):
    t = open('.github/workflows/' + f, encoding='utf8').read()
    chk('\t' not in t, 'workflow بدون tabs: ' + f, 'tab داخل workflow: ' + f)
for m in ok: print('✔', m)
for m in bad: print('✘', m)
print('\nالنتيجة: %d سليم / %d مشكلة' % (len(ok), len(bad)))
sys.exit(1 if bad else 0)
