#!/bin/sh
# PreToolUse(Bash): this repository's package manager is Bun. A deterministic
# rule in place of a line in AGENTS.md the model may skip.
exec bun -e '
const { tool_input } = await Bun.stdin.json()
const cmd = tool_input?.command ?? ""
if (/(^|[;&|(]|&&|\|\|)\s*(npm|npx|yarn|pnpm)\s/.test(cmd)) {
  console.error("Blocked: this repository uses Bun. Use `bun`, `bun run` or `bunx` instead of npm/npx/yarn/pnpm.")
  process.exit(2)
}
'
