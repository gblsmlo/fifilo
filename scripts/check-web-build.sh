#!/bin/sh
# The web build must not depend on an ambient NODE_ENV.
#
# `.env` sets NODE_ENV=development and Bun loads it for every `bun run`, so a
# build that reads the ambient value emits the development JSX runtime. The
# server bundle then throws `jsxDEV is not a function` on every render while
# still answering 200, which is how BUG-005 shipped unnoticed: the build job
# checked that the build did not fail, never that its output could render.
set -eu

bundle_dir="apps/web/dist/server"

if [ ! -d "$bundle_dir" ]; then
  echo "check-web-build: $bundle_dir is missing. Run 'bun run build:web' first." >&2
  exit 1
fi

if grep -rl "jsxDEV" "$bundle_dir" >/dev/null 2>&1; then
  echo "check-web-build: the server bundle carries the development JSX runtime." >&2
  echo "check-web-build: every server render will throw 'jsxDEV is not a function'." >&2
  grep -rl "jsxDEV" "$bundle_dir" >&2
  exit 1
fi

echo "check-web-build: the server bundle uses the production JSX runtime."
