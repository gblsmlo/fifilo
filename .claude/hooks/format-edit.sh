#!/bin/sh
# PostToolUse(Edit|Write): Biome formatting and safe fixes always happen.
# Silent by design: a remaining error belongs to the Stop gate, not to noise in
# the middle of an edit.
exec bun -e '
const { tool_input } = await Bun.stdin.json()
const f = tool_input?.file_path
if (!f || !/\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|css)$/.test(f)) process.exit(0)
if (!(await Bun.file(f).exists())) process.exit(0)
Bun.spawnSync(["bunx", "biome", "check", "--write", "--no-errors-on-unmatched", f], {
  cwd: process.env.CLAUDE_PROJECT_DIR ?? ".",
  stdout: "ignore",
  stderr: "ignore",
})
'
