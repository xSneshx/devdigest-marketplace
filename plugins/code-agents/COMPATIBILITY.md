# Compatibility

| Requirement | Version | Notes |
|---|---|---|
| Claude Code | >= 2.1.269 | Minimum to run the shipped evals (`claude plugin eval`). Validated on 2.1.296. |
| Node.js | >= 22 | Required by the guard hooks. If it is missing or older, the guarded agents are denied; other agents are unaffected. |
| POSIX shell (`sh`) | any | The guard hooks run via `sh "${CLAUDE_PLUGIN_ROOT}/hooks/run-guard.sh"`. Supported on macOS, Linux and WSL. Native Windows without a POSIX `sh` is unsupported for guards: the hook fails with a non-blocking error and guarded agents would run unguarded. |
| git | any recent version | Marketplace install. |

Guard latency budget: p95 <= 150 ms (the floor is Node process spawn; the guard's own work is tens of ms). Measured at about 102-112 ms on a loaded, sandboxed macOS machine.
