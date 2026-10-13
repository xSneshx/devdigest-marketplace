---
max_turns: 12
timeout_seconds: 300
tags: [positive]
allowed_tools: [Read, Glob, Grep, Skill, Task]
---

Use the architecture-reviewer agent (architecture-review:architecture-reviewer) to audit the diff below. The project's documented rules are pasted in the first block and count as the project's AGENTS.md. Report the agent's review output.

## Project rules (contents of AGENTS.md at the project root)

- **domain-purity**: Files under `src/orders/domain/` are pure. They must not import the web framework (`express`) or anything from `src/orders/infra/`.
- **di-composition-root**: Concrete repositories and adapters are constructed only in `src/composition.ts`. A service receives its dependencies through its constructor as interfaces.

## Diff to audit

```diff
diff --git a/src/orders/domain/order.ts b/src/orders/domain/order.ts
--- a/src/orders/domain/order.ts
+++ b/src/orders/domain/order.ts
@@ -1,5 +1,6 @@
+import type { Response } from "express";
 export interface Order {
   id: string;
   total: number;
 }

-export function priceOrder(order: Order): number {
+export function priceOrder(order: Order, res?: Response): number {
   return order.total;
 }
diff --git a/src/orders/service.ts b/src/orders/service.ts
--- a/src/orders/service.ts
+++ b/src/orders/service.ts
@@ -1,10 +1,14 @@
 import { priceOrder } from "./domain/order.js";
+import { SqlOrderRepository } from "./infra/sql-order-repository.js";

 export class OrderService {
+  private repo = new SqlOrderRepository();
+
   async place(order: { id: string; total: number }) {
     const price = priceOrder(order);
+    await this.repo.save(order.id, price);
     return { price };
   }
 }
```
