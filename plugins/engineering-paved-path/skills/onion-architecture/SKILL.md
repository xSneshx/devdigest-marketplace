---
name: onion-architecture
description: "Onion architecture for backend modules: which layers a module has, which way dependencies point, and what is allowed to cross a boundary. Use this skill whenever you create or change a backend module or service; when deciding where business logic, a database query, or a GitHub/LLM/git call belongs; when the question sounds like 'can I query the DB here', 'where do I declare an adapter interface', 'what does the repository return', 'do I need a service for this', 'how do I test this without a database'; when a route grows logic, or a service starts importing Fastify or Drizzle. Trigger even if the words 'architecture' or 'layer' were never used — every new backend file is a layer decision."
version: 1.0.0
---

# Onion architecture (backend)

This skill is about **dependency direction**: what is inside, what is outside,
and what may cross a boundary. The layer-to-directory map lives in
[references/layer-map.md](references/layer-map.md).

## Scope: what is here and what is not

This skill answers **"which layer does this live in, and what is it allowed to
know"**. "How is it written" is covered by other skills — do not duplicate them:

| Question | Skill |
|----------|-------|
| Which layer, what imports what, what crosses a boundary | **this one** |
| How to write Fastify routes, plugins, hooks, serialization | `fastify-best-practices` |
| How to write Drizzle queries, schemas, migrations | `drizzle-orm-patterns` |
| How to design tables, indexes, constraints | `postgresql-table-design` |
| How to write validation schemas | `zod` |
| Typing, generics, inference | `typescript-expert` |
| AuthZ, secrets, input as an attack vector | `security` |
| The same question, but for the frontend | `frontend-ui-architecture` |

---

## The one rule

> All code can depend on layers more central, but code cannot depend on layers
> further out from the core. — Jeffrey Palermo

Everything else in this skill follows from that sentence. Practical test: **if
domain code knows the words `Fastify`, `drizzle`, `octokit`, or `process.env`,
a boundary has been crossed.**

```
                    ┌──────────────────────────────────────────┐
                    │  infrastructure / transport              │
                    │  routes.ts, repository.ts, adapters/,    │
                    │  db/, composition root                   │
                    │   ┌──────────────────────────────────┐   │
                    │   │  application (use cases)         │   │
                    │   │  service.ts — orchestration      │   │
                    │   │   ┌──────────────────────────┐   │   │
                    │   │   │  domain                  │   │   │
                    │   │   │  types, rules, pure      │   │   │
                    │   │   │  functions. Zero         │   │   │
                    │   │   │  outward imports.        │   │   │
                    │   │   └──────────────────────────┘   │   │
                    │   └──────────────────────────────────┘   │
                    └──────────────────────────────────────────┘
              ports (interfaces) declared by the core ──► implemented by adapters
```

The outer rings hold what changes often: HTTP, the database, provider SDKs. The
centre holds the reason the product exists. The database **is not the centre, it
is external** — a storage service the core talks to through an interface, not a
foundation the system is built on.

---

## Algorithm: where does this code go

Ask the questions in order and stop at the first "yes".

1. **Is it a domain rule — something that stays true without HTTP and without a
   database?** ("a review cannot run twice for the same `head_sha`", "token
   limit per model") → `modules/<m>/domain/`, a pure function or a type.
2. **Is it a scenario — a sequence of steps that reads like the task
   description?** ("add a repo: parse the URL, check for a duplicate, persist,
   enqueue the clone") → `modules/<m>/service.ts`.
3. **Is it a conversation with an external system?** → a port (interface) in the
   core plus an adapter in `adapters/<tech>/`.
4. **Is it SQL?** → `modules/<m>/repository.ts`, nowhere else.
5. **Is it HTTP: status codes, request parsing, response shape?** →
   `modules/<m>/routes.ts`.
6. **None of the above — just a pure transformation?** → `helpers.ts` next to
   the module (with no `db/schema` import — see rule 5).

If steps 1 and 2 come back empty (the module decides nothing, it only reads and
writes), do not invent layers: `routes.ts → repository.ts` is a valid shape. See
"When a layer is not needed".

---

## Rules

### Boundaries

| # | Rule |
|---|------|
| 1 | `routes.ts` does not import `drizzle-orm` or `db/schema` — no exceptions |
| 2 | `service.ts` does not import `fastify` (no `FastifyRequest`, no `reply`, no `app`) |
| 3 | `domain/` does not import from `adapters/`, `db/`, `platform/`, or any `routes.ts` |
| 4 | A module does not import from another module — not the service, not the constants, not the types |
| 5 | `routes.ts` never calls an adapter directly (`adapters/`, `platform/llm`, `octokit`, `simple-git`, `fetch` to a provider) — a route talks to its service, the service talks to the port, the adapter sits behind the port |

**Why 1 and 2.** A route with SQL inside cannot be reused from a job, a CLI, or
another route, and cannot be tested without booting HTTP. A service that knows
`FastifyRequest` drags transport into the scenario: running the same scenario
from a queue means writing it a second time.

**Why 4.** The moment module A imports from module B, neither can be deleted,
extracted, or handed to someone else on its own. If two modules genuinely need
the same thing, it belongs one level down: `modules/_shared/`, `platform/`, or a
port. Pushing code sideways is forbidden; pushing it inward is fine.

### What crosses a boundary

| # | Rule |
|---|------|
| 5 | A database row never leaves `repository.ts`. The repository returns a domain type |
| 6 | An HTTP DTO (Zod contract) is not a domain type. Mapping is explicit, one direction per boundary |
| 7 | Domain errors (`AppError` and subclasses) are thrown by the core; a single error handler at the app root turns them into HTTP status codes |

> Isolated, simple, data structures are passed across the boundaries. We don't
> want to cheat and pass Entities or Database rows. — Robert C. Martin

In practice: `typeof t.repos.$inferSelect` must not appear in a service
signature. Otherwise renaming a column becomes an API contract change — exactly
the coupling the onion exists to break. Details and the allowed exceptions (read
models, projections) are in
[references/persistence.md](references/persistence.md).

### Dependencies

| # | Rule |
|---|------|
| 8 | A service takes **explicit** dependencies in its constructor, not the whole `Container` |
| 9 | A port interface is declared by the **core**, not by the adapter; SDK versions live only in `adapters/` |
| 10 | Clock, randomness, `process.env`, and the filesystem are ports too when a domain decision depends on them |

```ts
// ✗ service locator: dependencies invisible in the signature, tests build the whole container
class RepoService {
  constructor(private container: Container) {}
}

// ✓ dependencies visible in the type; a test passes two stubs
class RepoService {
  constructor(private deps: { repos: RepoStore; github: GitHubClient }) {}
}
```

The container does not disappear — it stays the **single composition point**
(the composition root), but it stops being a channel through which anyone can
reach anything.

### Transactions

| # | Rule |
|---|------|
| 11 | The transaction boundary is the use case, not the repository |
| 12 | The transaction is passed down as an optional argument; the repository does `const exec = tx ?? this.db` |

If the repository opens the transaction, two repositories in one scenario can
never be atomic, and the system ends up in states like "review created, run not
created". Implementation:
[references/persistence.md](references/persistence.md).

---

## Ports and adapters

A port is a **purposeful conversation** with the outside world, named in the
language of the domain rather than the language of the technology:

| ✓ Port | ✗ Not a port |
|--------|--------------|
| `GitHubClient`, `LLMProvider`, `CodeIndex` | `OctokitWrapper`, `OpenAISdkService` |
| `SecretsProvider`, `Clock` | `EnvReader`, `DateUtil` |

A healthy layout declares ports in the core, their implementations in
`adapters/<tech>/`, and mocks next to them (for example `adapters/mocks.ts`).
That is a working onion: the service depends on the interface, the composition
root supplies the implementation, the test supplies a mock.

Fastify specifics (plugin encapsulation, `decorate`, DI via `@fastify/awilix`):
[references/adapters.md](references/adapters.md).

---

## When a layer is NOT needed

Read this section together with the rules above — without it the skill produces
boilerplate.

- **Thin CRUD** (settings, preferences) lives as `routes.ts → repository.ts`.
  A service that only forwards a call to a repository is a file with no reason
  to exist.
- **A domain appears when a rule appears.** No rule, no `domain/`. An anemic
  model (a bag of fields plus all logic in the service) is worse than no domain
  layer: it promises encapsulation that is not there.
- **Do not map for the sake of mapping.** If the domain type matches the row
  field for field and there is no rule, the mapper may be the identity — that is
  fine. The types still stay separate, because their reasons to change differ.
- **A repository must not re-create the ORM.**
  `findActiveByIdWithProductsAndOwner` is a sign that a read model is needed, not
  another method.

> Clean architecture is not that complex pattern. You have three, four layers…
> You're ensuring that layer from inside doesn't know about layer outside, and
> you're using interfaces to do inversion of control. That's it. — Three Dots Labs

Health check: if explaining the architecture to a new teammate takes more than
half an hour, something went wrong.

---

## Tests as an architecture check

Tests are the most honest indicator of whether the layers are real:

| What is tested | With what | Sign of health |
|---|---|---|
| `domain/` | vitest, no mocks at all | pure functions, nothing to boot |
| `service.ts` | vitest + port mocks (hand-written fakes) | **neither Fastify nor Postgres starts** |
| `repository.ts` | integration test + a real database (for example Testcontainers) | real database, real schema |
| `routes.ts` | `app.inject()`, smoke | checks status codes and the contract, not logic |

If testing a scenario requires a database, the scenario is coupled to
persistence — that is an architecture defect, not a testing inconvenience.

---

## Anti-patterns

| Anti-pattern | Why it hurts | Instead |
|--------------|--------------|---------|
| SQL in `routes.ts` | Logic cannot be reused from a job; the test needs HTTP | Move it to `repository.ts` |
| `service.ts` imports `fastify` | The scenario is coupled to transport | Pass prepared data from the route |
| Service takes `Container` | Dependencies invisible, tests build the whole graph | Explicit constructor dependencies |
| Drizzle row in a public signature | Renaming a column breaks the API | Domain type plus a mapper |
| Port interface declared in `adapters/` | The dependency points outward | Declare it in the core |
| Cross-module import | Modules fuse together | Push it to `_shared/` or behind a port |
| Anemic domain: a field bag plus logic in the service | Promises encapsulation that is not there | Either rules in the domain, or honest CRUD |
| Delegating use case (`create()` → `repo.create()`) | A file with no reason to exist | Call the repository directly |
| Transaction opened inside the repository | Two repositories will never be atomic | Open it in the use case, pass `tx` down |
| Port named after a technology (`OctokitClient`) | Swapping the technology changes the core | Name it after the conversation |

---

## Applying it to a project

The directory names in this skill (`modules/<m>/`, `adapters/<tech>/`, `db/`)
are an illustrative layout. Map each layer to the consumer project's own
directories first, using
[references/layer-map.md](references/layer-map.md), and state the mapping before
reviewing or writing code.

**New modules follow the rules from day one; existing ones are migrated as
separate tasks, never in passing.** The cleanup order is in
[references/migration.md](references/migration.md).

---

## Enforcement

A convention nobody checks survives exactly until the first deadline. Express
the rules above as import-boundary rules in whatever the project already uses
(an import-graph tool or lint rules) — see
[references/enforcement.md](references/enforcement.md).
