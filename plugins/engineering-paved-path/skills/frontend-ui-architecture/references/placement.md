# Placement: the detailed rules

A reference for [SKILL.md](../SKILL.md). Read it when the quick table in the
core is not enough — when you need the criterion behind a choice, or the reason,
rather than just an address.

## Contents

- [Components](#components)
- [Hooks](#hooks)
- [Business logic](#business-logic)
- [Working with data](#working-with-data)
- [Constants](#constants)
- [utils / helpers / lib / services](#utils--helpers--lib--services)
- [Types](#types)
- [Tests](#tests)
- [Naming](#naming)

---

## Components

| Component | Where |
|-----------|-------|
| Used by one route/page | next to the route (in Next: `app/<route>/_components/`) |
| Belongs to one feature | `features/<feature>/components/` |
| Shared, but knows the domain | `components/<Name>/` |
| UI primitive with no domain (Button, Modal) | the design system |

One component per file, PascalCase. Small internal subcomponents that nothing
outside renders may live in the same file: they are an implementation detail,
and a separate file only blurs that boundary.

The established shape of a component folder in the consumer project — if it has no established shape, use this one:

```
<Name>/
├── <Name>.tsx       the component
├── constants.ts     constants for this component
├── helpers.ts       its private pure functions
├── styles.ts        style object (`satisfies CSSProperties`)
├── index.ts         named re-export
└── <Name>.test.tsx
```

Create only the files you actually need: an empty `helpers.ts` is worse than no
`helpers.ts`.

When a component grows, split it **along the seams of the domain and the data**,
not by size: each part should carry one responsibility and have its own reason
to change. "File over 200 lines" is a reason to look, not an order to cut.

## Hooks

- A hook for one component lives next to it.
- A feature's hook goes in `features/<feature>/hooks/`.
- A shared hook goes in `lib/hooks/` (or the project's equivalent).

The `use` prefix belongs **only** to functions that call other hooks inside. A
function with no hooks is a plain function and belongs in `lib/`, not `hooks/`.
A false prefix breaks the linter's checks and promises the reader a reactivity
that is not there.

## Business logic

Business logic does not live in the component body. A component describes **what
to show**; the logic answers **what it means**. In order of preference:

1. **A pure function** in `features/<feature>/lib/` — when the logic does not
   depend on React state. This is the best home: it can be tested without
   rendering anything.
2. **A custom hook** in `features/<feature>/hooks/` — when it needs state, a
   subscription or a query cache.
3. **A service** in `features/<feature>/api/` — when it is network work.

The container/presentational pattern is obsolete — do not create a wrapper
component just to separate logic. The pattern's own author retracted it
publicly: hooks do the same thing without an arbitrary split in the tree.
Separate logic from markup with **modules**, not with component levels.

## Working with data

- A request goes into its own hook (`useRepoList`), not into a component body.
- All backend calls go through the project's typed API client, never a raw
  `fetch` inside a feature.
- Server state is not copied into `useState`. The copy stops receiving
  background refetches and silently drifts from its source.
- Client state (filters, open modals, drafts) stays separate from server state.
- State that must survive a reload and be shareable in a link (filters,
  pagination, search) lives in the URL, not in a component.

## Constants

| What | Where |
|------|-------|
| A value used by one module | a module-level `const` in the same file |
| Screen or component constants | `constants.ts` alongside (a common convention) |
| Feature constants | `features/<feature>/constants.ts` |
| Genuinely global (routes, keys) | `lib/` — there is no top-level `config/` here, and adding one for two values is lifting ahead of demand |
| Visual tokens | the design system |

If the backend enforces a limit, the frontend constant is a mirror of the server
value. Take it from the contract rather than keeping two truths.

Format: `SCREAMING_SNAKE_CASE` for values known before the program runs;
camelCase for anything initialized at runtime. File names are camelCase
(`apiEndpoints.ts`).

Magic numbers and strings become a named constant when the number **means**
something (`MAX_RETRY_ATTEMPTS`), not as a blanket rule. `const ZERO = 0` is
noise.

## utils / helpers / lib / services

Four similar names, easily turned into a dumping ground. The criterion is not
size but **what the code depends on**:

| Folder | Criterion | Example |
|--------|-----------|---------|
| `utils/` | Pure function with no domain knowledge; portable to another project | `formatBytes`, `clamp` |
| `lib/` | Knows the domain, or wraps a third-party library | `api.ts`, a `dateFormatter` with the project's formats |
| `api/` (inside a feature) | Network: requests, response mapping | `fetchFindings` |

**If the project has no top-level `utils/`** — generic functions live in
`lib/` as topic-named files (`url-parsing.ts`, `format-label.ts`). Do not
add `utils/` for a single function: the distinction from `lib/` rarely pays for
itself.

**Do not create a shared `helpers/` folder** — it is a synonym for `utils/` that
only adds one more place to hesitate. A `helpers.ts` file **next to a
component** is a different thing and is already established here: those are one
component's private functions, not a shared layer.

If a function wants to be in `utils/` but carries a domain word in its name
(`formatFindingSeverity`), it is not generic — it belongs to the feature.
**`utils/` as the folder for "things I don't know where to put" is an
anti-pattern:** such code cannot be found by searching for the domain.

## Types

- A component's types live in its file, next to the component.
- A feature's types go in `features/<feature>/types.ts`.
- Backend contracts live in the shared contracts package, declared **once**.

Never redeclare a server type locally. Two declarations of one contract drift
apart silently, and the compiler will not say a word.

## Tests

A test lives next to the file it tests. Then a change to the code shows the test
in the same editor pane, and it is harder to forget to update. Keep a separate
directory for e2e and integration tests that do not map to a single module.

---

## Naming

| Thing | Format | Example |
|-------|--------|---------|
| Component (file and symbol) | PascalCase | `FindingCard.tsx` |
| Hook | camelCase with `use` | `useRepoList.ts` |
| Utility, config, service | camelCase | `apiEndpoints.ts` |
| Feature folder | kebab-case | `pr-review/` |
| Constant value | SCREAMING_SNAKE_CASE | `MAX_UPLOAD_MB` |

A folder name should speak about the domain, not the technology. `pr-review/`
tells the reader what the product does; `containers/` only tells them which
library you used.
