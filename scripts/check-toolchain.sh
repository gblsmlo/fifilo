#!/bin/sh
set -u

TIMEOUT_SECONDS="${TOOLCHAIN_TIMEOUT_SECONDS:-8}"
TEMP_FILES=""

cleanup() {
  for file in $TEMP_FILES; do
    rm -f "$file"
  done
}

trap cleanup EXIT INT TERM

make_temp_file() {
  file="$(mktemp)"
  TEMP_FILES="$TEMP_FILES $file"
  printf '%s\n' "$file"
}

fail() {
  printf '%s\n' "toolchain check failed: $*" >&2
  exit 1
}

case "$TIMEOUT_SECONDS" in
  "" | *[!0-9]*)
    fail "TOOLCHAIN_TIMEOUT_SECONDS must be a positive integer"
    ;;
esac

if [ "$TIMEOUT_SECONDS" -lt 1 ]; then
  fail "TOOLCHAIN_TIMEOUT_SECONDS must be at least 1"
fi

# $0 is not reliable here: .husky/pre-commit and pre-push source this
# script, and a sourced file inherits the caller's $0 instead of
# its own path.
repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" ||
  fail "could not resolve repository root (not inside a git work tree?)"

timeout_cmd=""
command -v timeout >/dev/null 2>&1 && timeout_cmd="timeout"
command -v gtimeout >/dev/null 2>&1 && timeout_cmd="gtimeout"

run_with_timeout() {
  label="$1"
  shift
  output_file="$1"
  shift

  if [ -n "$timeout_cmd" ]; then
    run_with_timeout_native "$label" "$output_file" "$@"
    return
  fi

  run_with_timeout_fallback "$label" "$output_file" "$@"
}

run_with_timeout_native() {
  label="$1"
  shift
  output_file="$1"
  shift

  tmp_stderr="$(make_temp_file)"

  "$timeout_cmd" "$TIMEOUT_SECONDS" "$@" >"$output_file" 2>"$tmp_stderr"
  status="$?"

  if [ "$status" -eq 124 ]; then
    fail "$label did not finish within ${TIMEOUT_SECONDS}s"
  fi

  stderr="$(cat "$tmp_stderr")"
  if [ "$status" -ne 0 ]; then
    fail "$label exited with status $status${stderr:+: $stderr}"
  fi
}

run_with_timeout_fallback() {
  label="$1"
  shift
  output_file="$1"
  shift

  tmp_stderr="$(make_temp_file)"
  tmp_status="$(make_temp_file)"
  rm -f "$tmp_status"

  (
    "$@" >"$output_file" 2>"$tmp_stderr"
    printf '%s\n' "$?" >"$tmp_status"
  ) &
  pid="$!"

  elapsed=0
  while [ ! -f "$tmp_status" ] && kill -0 "$pid" 2>/dev/null; do
    if [ "$elapsed" -ge "$TIMEOUT_SECONDS" ]; then
      kill -TERM "$pid" 2>/dev/null || true
      sleep 1
      kill -KILL "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      fail "$label did not finish within ${TIMEOUT_SECONDS}s"
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done

  wait "$pid" 2>/dev/null || true
  status="$(cat "$tmp_status" 2>/dev/null || printf '%s' "$?")"
  stderr="$(cat "$tmp_stderr")"

  if [ "$status" -ne 0 ]; then
    fail "$label exited with status $status${stderr:+: $stderr}"
  fi
}

required_bun_version() {
  package_json="$repo_root/package.json"

  if [ ! -f "$package_json" ]; then
    fail "package.json was not found at $package_json"
  fi

  version="$(sed -n 's/.*"packageManager": "bun@\([^"]*\)".*/\1/p' "$package_json")"

  if [ -z "$version" ]; then
    fail "packageManager bun version was not found in $package_json"
  fi

  printf '%s\n' "$version"
}

required_node_version() {
  for version_file in "$repo_root/.node-version" "$repo_root/.nvmrc"; do
    if [ -f "$version_file" ]; then
      version="$(sed -n '1p' "$version_file" | tr -d '[:space:]')"
      version="${version#v}"

      case "$version" in
        "" | *[!0-9.]*)
          continue
          ;;
      esac

      printf '%s\n' "$version"
      return 0
    fi
  done

  fail "node version was not found in .node-version or .nvmrc"
}

require_command() {
  name="$1"
  command -v "$name" >/dev/null 2>&1 || fail "$name is not available in PATH"
}

node_matches() {
  command -v node >/dev/null 2>&1 || return 1
  current="$(node --version 2>/dev/null | tr -d '[:space:]')"
  [ "${current#v}" = "$1" ]
}

# nvm.fish keeps its versions as plain directories and ships no POSIX entrypoint
# to source, so the only way to reach one from /bin/sh is its bin directory.
nvm_data_dir() {
  printf '%s\n' "${nvm_data:-${XDG_DATA_HOME:-$HOME/.local/share}/nvm}"
}

installed_node_bin() {
  candidate="$(nvm_data_dir)/v$1/bin"
  [ -x "$candidate/node" ] && printf '%s\n' "$candidate"
}

# PATH resolution alone can't be trusted to carry the pinned Node into a shell
# that defaults elsewhere: activate it via whichever manager the
# machine has, sourced from the caller's hooks so the switch survives past
# this script's own process.
activate_pinned_node() {
  target="$1"

  node_matches "$target" && return 0

  if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env --shell bash)"
    fnm use "$target" >/dev/null 2>&1 && node_matches "$target" && return 0
  fi

  if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh"
    nvm use "$target" >/dev/null 2>&1 && node_matches "$target" && return 0
  fi

  target_bin="$(installed_node_bin "$target")"
  if [ -n "$target_bin" ]; then
    PATH="$target_bin:$PATH"
    export PATH
    node_matches "$target" && return 0
  fi

  return 1
}

node_install_hint() {
  target="$1"

  if command -v fnm >/dev/null 2>&1; then
    printf 'fnm install %s' "$target"
    return
  fi

  if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ] || [ -d "$(nvm_data_dir)" ]; then
    printf 'nvm install %s' "$target"
    return
  fi

  printf 'install fnm or nvm, then install Node %s' "$target"
}

require_command bun

bun_path="$(command -v bun)"
case "$bun_path" in
  *"/.nvm/"*)
    fail "bun resolves to $bun_path. Install the official Bun runtime and put ~/.bun/bin before NVM in PATH."
    ;;
esac

expected_bun="$(required_bun_version)"
bun_version_file="$(make_temp_file)"
run_with_timeout "bun --version" "$bun_version_file" bun --version
bun_version="$(cat "$bun_version_file")"

if [ -n "$expected_bun" ] && [ "$bun_version" != "$expected_bun" ]; then
  fail "expected Bun $expected_bun, got $bun_version from $bun_path"
fi

expected_node_version="$(required_node_version)"

activate_pinned_node "$expected_node_version" ||
  fail "Node $expected_node_version is not active and not installed in fnm or nvm. Run: $(node_install_hint "$expected_node_version")"

node_version_file="$(make_temp_file)"
run_with_timeout "node --version" "$node_version_file" node --version
node_version="$(cat "$node_version_file")"
node_version="${node_version#v}"

if [ "$node_version" != "$expected_node_version" ]; then
  fail "expected Node $expected_node_version LTS, got v$node_version"
fi

cleanup
trap - EXIT INT TERM
set +u
