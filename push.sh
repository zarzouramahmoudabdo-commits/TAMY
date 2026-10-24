#!/usr/bin/env bash
# الاستخدام:  ./push.sh "وصف التعديل"
set -e
cd "$(dirname "$0")"
MSG="${1:-تحديث المحتوى}"
V="$(date +%Y.%m.%d.%H%M)"
SAFE_MSG="${MSG//\\/}"; SAFE_MSG="${SAFE_MSG//\"/}"
echo "const TAMY_VERSION = \"$V\";" > www/version.js
printf '{"version":"%s","notes":"%s"}\n' "$V" "$SAFE_MSG" > www/version.json
git add -A
git commit -m "$MSG ($V)" || echo "لا توجد تغييرات جديدة"
git push
echo ""
echo "✅ تم الرفع — الإصدار $V"
