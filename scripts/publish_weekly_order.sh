#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

today="$(date +%F)"
message="${1:-Publish weekly order for ${today}}"

if [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" && -n "${SUPABASE_SECRET_KEY:-}" ]]; then
  npm run seed:recipes
  npm run seed:weekly-plan
else
  echo "Skipping Supabase sync because NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is not set."
fi

git add docs/index.html data/current_weekly_plan.json data/weekly_plan_*.md data/next_order_draft_*.md data/recipes.json data/recipes.md

if git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi

git commit -m "$message"
git push
