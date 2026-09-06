#!/bin/sh
# SessionStart: the declared toolchain is a precondition of every commit here.
# `.husky/{pre-commit,pre-push}` source `check-toolchain.sh`, which activates the
# pinned Node through fnm/nvm before checking, so this only speaks when neither
# manager has the required version installed. Silent otherwise.
set -u
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
out="$(sh scripts/check-toolchain.sh 2>&1)" && exit 0
printf 'Toolchain mismatch: %s\n' "$out"
exit 0
