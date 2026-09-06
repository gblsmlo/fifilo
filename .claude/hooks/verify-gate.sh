#!/bin/sh
# Stop: no delivery ends without the repository's structural gate having run.
# `typecheck` stays in pre-push, where it already is; this gate is the cheap one.
set -u
payload="$(cat)"
case "$payload" in *'"stop_hook_active": true'*|*'"stop_hook_active":true'*) exit 0 ;; esac
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
git diff --quiet && git diff --cached --quiet && exit 0

fail() {
  printf 'Repository gate failed: %s\n\n%s\n' "$1" "$2" >&2
  printf '\nFix before finishing. Do not report the delivery as validated.\n' >&2
  exit 2
}

out="$(git diff --check 2>&1)" || fail 'git diff --check (whitespace)' "$out"
out="$(bun run lint:ci 2>&1)" || fail 'bun run lint:ci' "$(printf '%s' "$out" | tail -40)"
exit 0
