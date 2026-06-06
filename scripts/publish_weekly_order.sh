#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

today="$(date +%F)"
message="${1:-Update weekly order for ${today}}"

git add docs/index.html data/weekly_plan_*.md data/next_order_draft_*.md data/recipes.md

if git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi

git commit -m "$message"
git push
