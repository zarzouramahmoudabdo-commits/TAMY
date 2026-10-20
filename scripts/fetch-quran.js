const https = require('https');
const fs = require('fs');
const path = require('path');

const expected = [
  7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,
  98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,
  75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,
  13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,
  29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,
  9,5,4,7,3,6,3,5,4,5,6
];

function getSurah(n) {
  return new Promise((resolve, reject) => {
    const req = https.get(
      `https://quran-json.risanb.com/text/uthmani/chapters/${n}.json`,
      res => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              throw new Error(`HTTP ${res.statusCode} عند السورة ${n}`);
            }
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.setTimeout(20000, () => req.destroy(new Error('انتهت مهلة الاتصال')));
    req.on('error', reject);
  });
}

async function main() {
  const surahs = [];
  let notice = '';
  let total = 0;

  for (let n = 1; n <= 114; n++) {
    const chapter = await getSurah(n);

    if (
      chapter.id !== n ||
      !Array.isArray(chapter.verses) ||
      chapter.verses.length !== expected[n - 1]
    ) {
      throw new Error(`فشل التحقق من السورة ${n}`);
    }

    if (chapter.verses.some((verse, i) =>
      verse.id !== i + 1 ||
      typeof verse.text !== 'string' ||
      !verse.text.trim()
    )) {
      throw new Error(`نص آيات غير مكتمل في السورة ${n}`);
    }

    if (chapter.notice) {
      if (!chapter.notice.includes('Tanzil')) {
        throw new Error('إشعار مصدر النص غير متوقع');
      }
      if (!notice) notice = chapter.notice;
    }

    // حفظ النصوص كما وردت من المصدر، دون تعديلها.
    surahs.push(chapter.verses.map(verse => verse.text));
    total += chapter.verses.length;

    if (n % 20 === 0 || n === 114) {
      console.log(`تم تجهيز ${n} سورة`);
    }
  }

  if (total !== 6236 || !notice) {
    throw new Error('فشل التحقق النهائي من الآيات أو إشعار المصدر');
  }

  const webDir = path.join(__dirname, '..', 'www');
  fs.mkdirSync(webDir, { recursive: true });

  fs.writeFileSync(
    path.join(webDir, 'quran.json'),
    JSON.stringify({ v: 1, s: surahs, notice }, null, 0) + '\n',
    'utf8'
  );

  fs.writeFileSync(
    path.join(webDir, 'quran-license.txt'),
    notice + '\n\nSource: https://tanzil.net\n',
    'utf8'
  );

  const saved = JSON.parse(
    fs.readFileSync(path.join(webDir, 'quran.json'), 'utf8')
  );

  if (
    saved.s.length !== 114 ||
    saved.s.reduce((sum, surah) => sum + surah.length, 0) !== 6236
  ) {
    throw new Error('فشل التحقق من الملف المحفوظ');
  }

  console.log('نجاح: تم إنشاء www/quran.json');
  console.log('السور: 114 | الآيات: 6236');
  console.log('تم حفظ إشعار المصدر في www/quran-license.txt');
}

main().catch(err => {
  console.error('فشل تجهيز المصحف:', err.message);
  process.exit(1);
});
