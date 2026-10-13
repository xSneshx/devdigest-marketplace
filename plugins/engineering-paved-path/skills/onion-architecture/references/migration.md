# Migrating existing modules

Reference for [SKILL.md](../SKILL.md). Generic cleanup order for a codebase that
already has modules violating the rules. Re-check each item with grep before
acting on it.

**Principle: new modules follow the rules from day one, existing ones are
migrated as separate tasks.** Refactoring "in passing", inside a product task,
makes the review unreadable and mixes unrelated risks.

## Typical violations

| # | Symptom | Rule | Cost |
|---|---|---|---|
| 1 | Raw SQL / ORM calls in `routes.ts` | 1 | small |
| 2 | Non-repository files import the schema | 5 | small |
| 3 | A module imports another module's constants or service | 4 | small |
| 4 | Services take the whole container | 8 | large |
| 5 | Repositories return ORM row types to callers | 5 | large |
| 6 | Cycles `service ↔ container` | follows from 4 | follows from 4 |

Find them:

```bash
grep -rn "drizzle-orm\|db/schema" src/modules/*/routes.ts   # adjust to the ORM and layout in use
```

## Order

1. **SQL out of routes (items 1–2).** Give each module its own `repository.ts`
   holding the queries verbatim; routes only speak HTTP. Do not introduce a
   service where there is no logic to hold. Row types shared across modules go
   in one shared rows file.
2. **Turn on machine-checked boundaries** (see [enforcement.md](enforcement.md)),
   with `warn` for rules still violated and `error` for the rest.
3. **Fix the cross-module import (item 3).** Shared constants (queue names, job
   kinds) are an infrastructure contract: move them to a shared directory.
4. **Explicit dependencies (items 4 and 6), one module at a time.**
   ```ts
   - constructor(private container: Container) {}
   + constructor(private deps: { repos: RepoStore; github: GitHubClient; jobs: JobRunner }) {}
   ```
   The container remains the assembly point. Do this together with the module's
   tests: that is where the benefit becomes visible. The same step removes the
   `service ↔ container` cycles.
5. **Domain types instead of rows (item 5).** The most expensive step, therefore
   the last one, and **not for every module**. Do it where rules exist; leave
   thin CRUD modules as honest CRUD.

## The "good enough" line

Stop when the boundary check is green for steps 1–3. Steps 4–5 are driven by a
concrete need: a painful test, a recurring bug, preparing a module for
expansion. Architecture is supposed to make work faster; refactoring purely to
conform to the diagram is the same over-engineering the onion is meant to
prevent.
