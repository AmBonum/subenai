#!/usr/bin/env bash
# PreToolUse hook — blocks irreversible / out-of-scope Bash before it runs.
# Wired in .claude/settings.json -> hooks.PreToolUse[] matcher "Bash".
# Input on stdin: { tool_input: { command: "..." } }.
# Exit codes: 0 = allow, 2 = block (stderr is surfaced to the model).

set -u

input="$(cat)"
cmd="$(printf '%s' "$input" | python3 -c '
import sys, json
print(json.load(sys.stdin).get("tool_input", {}).get("command", ""))
' 2>/dev/null)"

[ -z "$cmd" ] && exit 0

# Strip any heredoc body so we only inspect the actual command tokens.
# Anything from `<<EOF`, `<<'EOF'`, `<<"EOF"`, etc. up to a closing EOF
# at start of a line is heredoc content — passed as data, not a flag.
cmd_head="$(printf '%s\n' "$cmd" | awk '
  BEGIN { eof=""; in_heredoc=0 }
  {
    if (in_heredoc) {
      if ($0 == eof) { in_heredoc=0 }
      next
    }
    line = $0
    if (match(line, /<<-?[[:space:]]*['\''\"]?[A-Za-z_][A-Za-z0-9_]*['\''\"]?/)) {
      tag = substr(line, RSTART, RLENGTH)
      gsub(/^<<-?[[:space:]]*['\''\"]?/, "", tag)
      gsub(/['\''\"]?$/, "", tag)
      eof = tag
      in_heredoc = 1
      sub(/<<-?[[:space:]]*['\''\"]?[A-Za-z_][A-Za-z0-9_]*['\''\"]?.*$/, "", line)
    }
    print line
  }
')"

lc="$(printf '%s' "$cmd_head" | tr "[:upper:]" "[:lower:]")"

block() {
  echo "BLOCKED by .claude/pre-bash-guard: $1" >&2
  echo "If this is genuinely needed, ask the user first." >&2
  exit 2
}

# Hostile / destructive Postgres
case "$lc" in
  *"drop table"*|*"truncate table"*|*"drop database"*|*"drop schema"*)
    block "destructive DDL detected (drop/truncate)"
    ;;
esac

# DELETE FROM without a WHERE clause
if echo "$lc" | grep -qE "delete[[:space:]]+from[[:space:]]"; then
  if ! echo "$lc" | grep -qE "where[[:space:]]"; then
    block "DELETE FROM without a WHERE clause"
  fi
fi

# Force pushes / hard resets / branch deletes — always confirm first
case "$lc" in
  *"git push --force"*|*"git push -f "*|*"git push -f"*)
    block "git push --force"
    ;;
  *"git reset --hard"*)
    block "git reset --hard"
    ;;
  *"git branch -d"*|*"git branch --delete"*)
    block "git branch delete"
    ;;
  *"--no-verify"*|*"--no-gpg-sign"*)
    block "skipping commit hooks / signing"
    ;;
esac

# rm -rf outside of /tmp or repo build artifacts
if echo "$lc" | grep -qE "rm[[:space:]]+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r)"; then
  case "$lc" in
    *" /tmp/"*|*" /private/tmp/"*) ;;
    *" dist"*|*" .output"*|*" .vinxi"*|*" node_modules"*) ;;
    *) block "rm -rf outside /tmp / build dirs" ;;
  esac
fi

# Direct edits to .claude/settings.json or .github/** via Bash
case "$lc" in
  *".claude/settings.json"*)
    case "$lc" in
      *"cat "*|*"head "*|*"tail "*|*"grep "*|*"jq "*|*"less "*|*"more "*|*"git "*) ;;
      *) block "writing .claude/settings.json via Bash" ;;
    esac
    ;;
  *".github/"*)
    case "$lc" in
      *"cat "*|*"ls "*|*"grep "*|*"jq "*|*"git "*) ;;
      *) block "writing .github/** via Bash" ;;
    esac
    ;;
esac

exit 0
