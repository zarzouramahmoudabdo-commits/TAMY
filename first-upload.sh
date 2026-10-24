#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
read -rp "اسمك: " GNAME
read -rp "إيميل GitHub: " GMAIL
git config --global user.name "$GNAME"
git config --global user.email "$GMAIL"
if ! gh auth status >/dev/null 2>&1; then
  gh auth login -s repo,workflow
else
  gh auth refresh -s repo,workflow || true
fi
read -rp "اسم المستودع [tamy]: " REPO
REPO="${REPO:-tamy}"
OWNER="$(gh api user -q .login)"
[ -d .git ] || git init -b main
git add -A
git commit -m "TAMY: first version" || true
gh repo create "$REPO" --public --source=. --remote=origin
gh api -X POST "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
  || gh api -X PUT "repos/$OWNER/$REPO/pages" -f build_type=workflow >/dev/null 2>&1 \
  || echo "فعّل Pages يدويًا: Settings > Pages > Source: GitHub Actions"
git push -u origin main
echo ""
echo "✅ تم! بعد 5-8 دقائق:"
echo "الموقع:  https://$OWNER.github.io/$REPO/"
echo "الـ APK: https://github.com/$OWNER/$REPO/releases/tag/apk-latest"
