#!/usr/bin/env bash
# SessionStart hook — surfaces the unfinished story backlog to Claude
# so a fresh session can pick up the next logical task without a full
# re-discovery pass over tasks/.
#
# Stdout is prepended to the session as additional context.

set -u
REPO="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

echo "=== Internet IQ Test session context ==="
echo

PLAN="$REPO/tasks/PLAN-2026-04-25-rast-a-vzdelavanie.md"
if [ -f "$PLAN" ]; then
  echo "--- Open stories (from PLAN index, status != Done) ---"
  # Match table rows where status column is not ✅ Done. Print ID + title.
  grep -E "^\| \[E[0-9]+\.[0-9]+\]" "$PLAN" \
    | grep -v "✅ Done" \
    | awk -F'|' '{ printf("  %s — %s [%s]\n", $2, $3, $6) }' \
    | sed 's/  *|//g' \
    | head -25
  echo
fi

echo "--- Git status (top 20 lines) ---"
git -C "$REPO" status --short | head -20 || true
echo

echo "=== end Internet IQ Test context ==="
