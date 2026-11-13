#!/usr/bin/env bash
# PostToolUse hook — runs ESLint on the just-edited TS/TSX file with
# auto-fix, so prettier-only changes never reach the model and the
# 0/0/0 lint baseline is preserved without manual intervention.
#
# Wired via .claude/settings.json -> hooks.PostToolUse[] matcher
# "Edit|Write|NotebookEdit". Input on stdin: { tool_input: { file_path } }.
# Exit codes: 0 = allow, 2 = block with stderr surfaced to the model.

set -u

REPO="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
LOG="$(mktemp -t iiq_eslint.XXXXXX)"
trap 'rm -f "$LOG"' EXIT

input="$(cat)"
file_path="$(printf '%s' "$input" | python3 -c '
import sys, json
d = json.load(sys.stdin)
ti = d.get("tool_input", {})
print(ti.get("file_path") or ti.get("notebook_path") or "")
' 2>/dev/null)"

[ -z "$file_path" ] && exit 0
[ ! -f "$file_path" ] && exit 0

# Only react to TS / TSX inside the repo. Tests count too.
case "$file_path" in
  "$REPO"/src/*.ts|"$REPO"/src/*.tsx|"$REPO"/src/**/*.ts|"$REPO"/src/**/*.tsx) ;;
  "$REPO"/tests/*.ts|"$REPO"/tests/*.tsx|"$REPO"/tests/**/*.ts|"$REPO"/tests/**/*.tsx) ;;
  *) exit 0 ;;
esac

cd "$REPO" || exit 0
# No local eslint (fresh worktree without npm ci): skip instead of failing every edit.
[ -x node_modules/.bin/eslint ] || exit 0

# Fast path: file-scoped eslint with --fix. Hook fails the tool call
# only if eslint surfaces something non-fixable (real errors / warnings).
if ! node_modules/.bin/eslint --no-error-on-unmatched-pattern --fix \
      "$file_path" >"$LOG" 2>&1; then
  {
    echo "post-edit-lint: eslint flagged $file_path"
    echo "--- log tail ---"
    tail -n 40 "$LOG"
  } >&2
  exit 2
fi

exit 0
