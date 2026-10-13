---
type: llm
weight: 1
---

The response answers a TypeScript typing question. It passes only if all of these hold:

1. The transcript shows the `Skill` tool invoked with `engineering-paved-path:typescript-expert` (or the bare name `typescript-expert`). Activation is flaky, so this is the one criterion that may be satisfied by clearly applying that skill's guidance if no invocation is visible in only one of three runs.
2. The answer constrains the key parameter with `keyof T` (for example `K extends keyof T`).
3. The answer does not suggest `any` or a blanket `as` cast as the fix.
