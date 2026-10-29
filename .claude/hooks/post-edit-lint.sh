#!/usr/bin/env bash
# PostToolUse hook — runs ESLint --fix on the just-edited TS/TSX file so
# prettier-only noise never reaches the model and the 0/0 lint baseline
# is preserved without manual intervention.
#
# Wired via .claude/settings.json -> hooks.PostToolUse[] matcher
# "Edit|Write|NotebookEdit". Input on stdin: { tool_input: { file_path } }.
# Exit codes: 0 = allow, 2 = block with stderr surfaced to the model.
#
# Repo root comes from $CLAUDE_PROJECT_DIR (set by Claude Code for every
# hook); falls back to the script's own location so the hook also works
# from worktrees under .claude/worktrees/<name>/.

set -u

if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
  REPO="$CLAUDE_PROJECT_DIR"
else
  REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi
LOG="${TMPDIR:-/tmp}/subenai_eslint.log"

input="$(cat)"
file_path="$(printf '%s' "$input" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
ti = d.get("tool_input", {}) or {}
print(ti.get("file_path") or ti.get("notebook_path") or "")
' 2>/dev/null)"

[ -z "$file_path" ] && exit 0
case "$file_path" in
  /*) ;;
  *) file_path="$REPO/$file_path" ;;
esac
[ ! -f "$file_path" ] && exit 0

# Only react to TS / TSX inside src/, tests/, functions/ or e2e/ of this repo.
case "$file_path" in
  "$REPO"/src/*.ts|"$REPO"/src/*.tsx) ;;
  "$REPO"/tests/*.ts|"$REPO"/tests/*.tsx) ;;
  "$REPO"/functions/*.ts) ;;
  "$REPO"/e2e/*.ts) ;;
  *) exit 0 ;;
esac

cd "$REPO" || exit 0
[ -x node_modules/.bin/eslint ] || exit 0

# File-scoped eslint with --fix. Block the tool call only if eslint surfaces
# something non-fixable (real errors / warnings).
if ! npx --no-install eslint --no-error-on-unmatched-pattern --fix \
      "$file_path" >"$LOG" 2>&1; then
  {
    echo "post-edit-lint: eslint flagged $file_path"
    echo "--- log tail ---"
    tail -n 40 "$LOG"
  } >&2
  exit 2
fi

exit 0
