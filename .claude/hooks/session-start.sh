#!/usr/bin/env bash
# SessionStart hook — surfaces the open story backlog and git status so a
# fresh session can pick up the next task without re-discovering tasks/.
#
# Stdout is prepended to the session as additional context.
# Repo root comes from $CLAUDE_PROJECT_DIR (set by Claude Code); falls back
# to the script's own location so worktrees under .claude/worktrees/ work.

set -u

if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  REPO="$CLAUDE_PROJECT_DIR"
else
  REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi

echo "=== subenai session context ==="
echo

# Newest dated PLAN index (tasks/PLAN-<yyyy-mm-dd>-*.md). Print rows whose
# status column is not "✅ Done".
PLAN="$(ls -1 "$REPO"/tasks/PLAN-20[0-9][0-9]-*.md 2>/dev/null | sort | tail -n 1)"
if [ -n "$PLAN" ] && [ -f "$PLAN" ]; then
  echo "--- Open stories (${PLAN#"$REPO"/}, status != Done) ---"
  grep -E "^\| \[E[0-9]+(\.[0-9]+)?\]" "$PLAN" \
    | grep -v "✅ Done" \
    | awk -F'|' '{ printf("  %s — %s [%s]\n", $2, $3, $6) }' \
    | sed 's/  *|//g' \
    | head -25
  echo
fi

if [ -f "$REPO/tasks/BACKLOG.md" ]; then
  echo "--- Backlog: $REPO/tasks/BACKLOG.md ---"
  echo
fi

echo "--- Git status (top 20 lines) ---"
git -C "$REPO" status --short 2>/dev/null | head -20 || true
echo

echo "=== end subenai context ==="
exit 0
