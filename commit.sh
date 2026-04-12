#!/bin/bash
# ── Life OS — auto commit + push ─────────────────────────────────
# Použití: ./commit.sh          (claude vygeneruje zprávu)
#          ./commit.sh "zpráva" (použije zadanou zprávu)

set -e
REPO="/Users/ojeej/Desktop/Applikace - Claude/Zační Žít/Life OS"
cd "$REPO"

# Zkontroluj jestli jsou vůbec nějaké změny
if git diff --quiet && git diff --staged --quiet; then
  echo "✅ Žádné změny k commitování."
  exit 0
fi

git add -A

if [ -n "$1" ]; then
  # Zpráva zadána jako argument
  MSG="$1"
else
  echo "🤖 Generuji commit message pomocí claude..."
  DIFF=$(git diff --staged | head -c 8000)
  MSG=$(echo "$DIFF" | claude -p "
Jsi git commit message generátor. Na základě tohoto git diffu napiš POUZE stručnou commit message v češtině nebo angličtině (max 72 znaků). Bez uvozovek, bez vysvětlení, jen samotná zpráva.

Formát: typ: popis
Typy: feat / fix / refactor / style / docs / chore

Diff:
$DIFF
" 2>/dev/null | head -1 | tr -d '"')

  if [ -z "$MSG" ]; then
    MSG="chore: auto-commit $(date '+%Y-%m-%d %H:%M')"
  fi
fi

echo "📝 Commit: $MSG"
git commit -m "$MSG

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"

echo "🚀 Pushuju..."
git push

echo "✅ Hotovo!"
