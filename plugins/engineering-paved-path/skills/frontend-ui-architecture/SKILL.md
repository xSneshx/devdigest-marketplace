---
name: frontend-ui-architecture
description: "Frontend UI architecture: where each piece of code belongs in the project tree and what the boundaries between modules are. Use this skill whenever you decide where to put a component, hook, constant, type, utility or business logic; when you create a new feature, folder or file; when you split an oversized component or file; when the question sounds like 'where does this go', 'what do I call it', 'should this move to shared', 'what may import what', 'how do I structure a feature'. Trigger even when the words 'architecture' or 'structure' are never said — creating any new file in UI code is a placement decision."
version: 1.3.0
---

# Frontend UI architecture

This skill is about **where code lives and what the boundaries between modules
are**: which folder, which layer, what may import what.

## Scope: what is here and what is not

This skill answers **"where does this belong"**. Questions about *how the code
is written* belong to other skills — do not duplicate them:

| Question | Skill |
|----------|-------|
| Which file, which layer, what may import what | **this one** |
| How to write components, hooks, state, memoization, a11y | `react-best-practices` |
| How Next.js works: RSC, caching, routing, metadata | `next-best-practices` |
| How to type it | `typescript-expert` |
| How to test it | `react-testing-library` |

When a decision touches both placement and the code inside, load both skills.

## Navigation

The core below covers most questions. Go to a reference for the details:

| File | When to read it |
|------|-----------------|
| [references/placement.md](references/placement.md) | You need a criterion, not an address: `utils` or `lib`, where business logic actually goes, how to name things, the shape of a component folder |
| [references/boundaries.md](references/boundaries.md) | Review or refactor: public API, barrel files, anti-patterns, enforcing boundaries with a linter |
| [references/nextjs-architecture.md](references/nextjs-architecture.md) | Any work in a Next.js app: the server/client and static/dynamic seams, the route tree, Route Handlers and Server Actions |

---

## The placement algorithm

Ask these in order and stop at the first "yes". The order is not arbitrary: it
runs from the cheapest decision to the most expensive, and every step down
increases the number of people who now have to know about this code.

1. **Needed by one component?** → next to it, in the same file or folder.
2. **By one route?** → `app/<route>/_components/` and the route's sibling files.
3. **By one feature?** → `features/<feature>/<segment>/`.
4. **By two or more?** → lift it to the top level (`components/`, `lib/`, `hooks/`).
5. **A UI primitive with no domain knowledge?** → the design system.

**Do not lift ahead of demand.** Code lifted into shared space for a single
consumer costs more than a duplicate: it acquires an imagined contract nobody
has checked, and the next person has to design around consumers that do not
exist. The rule for moving up is **a second real consumer, not a hypothetical
one**.

Moving back down is equally legitimate: if only one consumer is left in shared
space, return the code to it.

---

## Layers and the direction of dependencies

The frame is bulletproof-react. Four layers; dependencies flow **downward only**:

```
app/        routing, providers, page composition
   ↓
features/   domain modules; a feature knows nothing of other features
   ↓
shared/     components/ hooks/ lib/ types/
   ↓
vendor/     internal packages: the design system, shared contracts
```

- `app/` may import from `features/`, `shared/`, `vendor/`.
- `features/` may import from `shared/`, `vendor/`. **A feature never imports another feature.**
- `shared/` may import only from `vendor/`.
- `vendor/` imports nothing from application code.

**Why the cross-feature ban matters here in particular:** the moment feature A
imports from feature B they stop being separate units — you can no longer
delete, move or hand off either one on its own. If two features genuinely need
the same code, that is the signal the code belongs a layer down. Push it down,
do not reach sideways.

The same rule applies between routes: `app/agents/_components/` is not a library
for `app/repos/`.

---

## Quick placement table

| What | Where |
|------|-------|
| Component used by one route | `app/<route>/_components/<Name>/` |
| Shared domain component | `components/<Name>/` |
| UI primitive with no domain | design system (the project's UI package) |
| Hook for one component | next to it |
| Shared hook | `lib/hooks/` |
| Business logic | a pure function nearby (`helpers.ts`) or in the feature; **never** in the component body |
| Backend request | a hook over the project's typed API client; never a raw `fetch` |
| Screen-level constants | `constants.ts` alongside |
| Generic, domain-free utility | `lib/` (a top-level `utils/` only if the project already has one) |
| Type from the backend | the shared contracts package; **never** redeclared |
| View type for the UI | next to the component, or `lib/types.ts` |
| Test | next to the file it tests |

For the criteria behind the table, see
[references/placement.md](references/placement.md).

Three rules that get broken most often:

- **A domain name means it is not generic.** `formatSeverityLabel` does not
  belong in `lib/` next to `clamp`: the name carries a domain, so the function
  belongs to the feature.
- **A route is composition.** `page.tsx` assembles components; screen logic, URL
  state and loading/error branches live in a component below it.
- **Server data is never copied into `useState`.** The copy stops receiving
  background refetches and silently drifts from its source.

---

## Applying this to a project

This skill is project-agnostic. The folder names above (`app/`, `features/`,
`shared/`, `components/`, `lib/`) are the reference shape, not a claim about
your tree.

- **Obtain the mapping from the consumer project's own docs** (its `AGENTS.md`,
  `CLAUDE.md`, `README` or architecture notes): which directory plays `app/`,
  `features/`, `shared/` and `vendor/`, where the typed API client lives, and
  where the design system is imported from. Do not assume it.
- If the project has no `features/` directory yet, create new domain modules as
  `features/<name>/` and do not bulk-migrate existing code without a dedicated
  task.
- An internal package aliased as `vendor/` or `packages/` is first-party code:
  it may be edited, subject to the project's own rules.
- Where server data comes from decides the Next.js data-access approach; see
  [references/nextjs-architecture.md](references/nextjs-architecture.md).
