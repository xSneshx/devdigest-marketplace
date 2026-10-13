---
type: llm
weight: 1
---

The response answers a TypeScript typing question. It passes only if all of these hold:

1. The answer constrains the key parameter with `keyof T` (for example `K extends keyof T`).
2. The answer does not suggest `any` or a blanket `as` cast as the fix.
