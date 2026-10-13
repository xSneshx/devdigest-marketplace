#!/bin/sh
# Entry point for the PreToolUse hook. Fails closed for guarded agents when node
# is missing, too old, or the guard itself crashes (AC-58); never blocks anyone
# else. Keep GUARDED in step with GUARDED_AGENTS in guard.mjs.
GUARDED='sdd-engineering:spec-creator sdd-engineering:plan-verifier'
DIR=${0%/*}

# Read all of stdin with shell builtins only: every external process costs
# measurable start-up time on each tool call.
input=
while IFS= read -r line || [ -n "$line" ]; do
  input="$input$line
"
done

# Print a refusal and exit 2 when the raw hook text names a guarded agent.
fail_closed() {
  for id in $GUARDED; do
    if printf '%s' "$input" | grep -Eq "\"agent_type\"[[:space:]]*:[[:space:]]*\"$id\""; then
      printf 'sdd-engineering-guard: Blocked: the guard could not run (%s). Guarded agent "%s" is refused; report this instead of retrying.\n' "$1" "$id" >&2
      exit 2
    fi
  done
  exit 0
}

# Fast path: a call with no agent identifier at all (the main session) is never
# guarded, so skip starting node. Anything that mentions one goes to the guard.
case $input in
  *agent_type*) ;;
  *) exit 0 ;;
esac

command -v node >/dev/null 2>&1 || fail_closed "node is not installed; Node.js >= 22 is required"

# --jitless --no-expose-wasm: the guard is a few ms of work, and skipping JIT and
# WebAssembly setup cuts the node start-up and module-load cost roughly in half
# (measured). If this node rejects a flag (exit 9), run it plain.
printf '%s' "$input" | node --jitless --no-expose-wasm "$DIR/guard.mjs"
code=$?
if [ "$code" -ne 0 ] && [ "$code" -ne 2 ]; then
  printf '%s' "$input" | node "$DIR/guard.mjs"
  code=$?
fi
# guard.mjs answers 0 (allow) or 2 (refuse); anything else is a crash (3 = old node).
case $code in
  0|2) exit "$code" ;;
  *) fail_closed "guard exited with status $code" ;;
esac
