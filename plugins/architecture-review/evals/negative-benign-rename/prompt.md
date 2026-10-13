---
max_turns: 12
timeout_seconds: 300
tags: [negative]
allowed_tools: [Read, Glob, Grep, Skill, Task]
---

Use the architecture-reviewer agent (architecture-review:architecture-reviewer) to audit the diff below. The project's documented rules are pasted in the first block and count as the project's AGENTS.md. Report the agent's review output.

## Project rules (contents of AGENTS.md at the project root)

- **domain-purity**: Files under `src/orders/domain/` are pure. They must not import the web framework (`express`) or anything from `src/orders/infra/`.
- **di-composition-root**: Concrete repositories and adapters are constructed only in `src/composition.ts`. A service receives its dependencies through its constructor as interfaces.

## Diff to audit

```diff
diff --git a/src/orders/domain/summary.ts b/src/orders/domain/summary.ts
--- a/src/orders/domain/summary.ts
+++ b/src/orders/domain/summary.ts
@@ -1,10 +1,11 @@
 export interface OrderRow {
   id: string;
   total: number;
 }

-export function summarize(rows: OrderRow[]) {
-  return rows.map((r) => ({ id: r.id, total: r.total }));
+export function summarize(rows: OrderRow[]) {
+  return rows.map((row) => ({ id: row.id, total: row.total }));
 }
```
