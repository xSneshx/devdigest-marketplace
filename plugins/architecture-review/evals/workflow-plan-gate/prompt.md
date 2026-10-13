---
max_turns: 15
timeout_seconds: 400
tags: [workflow]
allowed_tools: [Read, Glob, Grep, Skill, Task]
---

You are the review step of a plan run. Use the architecture-reviewer agent (architecture-review:architecture-reviewer) on the changed set of the plan below and report its review with the PASS/FAIL gate. The project's documented rules are pasted in the first block and count as the project's AGENTS.md.

## Project rules (contents of AGENTS.md at the project root)

- **domain-purity**: Files under `src/orders/domain/` are pure. They must not import the web framework (`express`) or anything from `src/orders/infra/`.
- **di-composition-root**: Concrete repositories and adapters are constructed only in `src/composition.ts`. A service receives its dependencies through its constructor as interfaces.

## Plan

Task T2: add cancellation to orders. Changed set (diff excerpts):

```diff
diff --git a/src/orders/domain/cancel.ts b/src/orders/domain/cancel.ts
--- /dev/null
+++ b/src/orders/domain/cancel.ts
@@ -0,0 +1,6 @@
+import { PgPool } from "../infra/pg-pool.js";
+
+export function canCancel(status: string): boolean {
+  return status === "placed";
+}
diff --git a/src/orders/service.ts b/src/orders/service.ts
--- a/src/orders/service.ts
+++ b/src/orders/service.ts
@@ -3,6 +3,8 @@
 export class OrderService {
   constructor(private readonly repo: OrderRepository) {}
+
+  async cancel(id: string) {
+    return this.repo.markCancelled(id);
+  }
 }
```
