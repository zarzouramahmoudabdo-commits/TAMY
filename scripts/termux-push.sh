#!/data/data/com.termux/files/usr/bin/bash
# رفع مشروع TAMY إلى GitHub من Termux ليبني GitHub الـ APK تلقائيًا
set -e
cd "$(dirname "$0")/.."

echo "== TAMY :: رفع المشروع إلى GitHub =="
pkg install -y git gh >/dev/null 2>&1 || true

if ! gh auth status >/dev/null 2>&1; then
  echo "سجّل الدخول إلى GitHub (اختر: GitHub.com ثم HTTPS ثم Login with a web browser)"
  gh auth login
fi

git config --global user.name  >/dev/null 2>&1 || git config --global user.name  "TAMY"
git config --global user.email >/dev/null 2>&1 || git config --global user.email "tamy@example.com"

[ -d .git ] || git init -b main
git add -A
git commit -m "TAMY app" >/dev/null 2>&1 || true

if ! git remote get-url origin >/dev/null 2>&1; then
  gh repo create tamy-app --private --source=. --remote=origin --push
else
  git push -u origin main
fi

echo
echo "تم الرفع. افتح المستودع على GitHub ← تبويب Actions ← انتظر ~6 دقائق"
echo "ثم من تبويب Releases حمّل الملف TAMY.apk"
