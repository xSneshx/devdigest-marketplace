# Layer map

Reference for [SKILL.md](../SKILL.md): which kind of directory is which layer,
and what each may import. The names below are an **illustrative layout**. Before
applying the rules, map each ring to the consumer project's real directories and
write the mapping down; if the project already has its own convention, keep it
and only check the import directions.

## Layer table

| Ring | Typical location | May import | Must not import |
|---|---|---|---|
| **domain** | `modules/<m>/domain/*` | stdlib and other `domain/` files of the same module | everything else |
| **ports** | a shared ports file, `modules/<m>/ports.ts` | `domain` | adapters, the database layer, the web framework |
| **application** | `modules/<m>/service.ts`, `modules/<m>/usecases/*` | `domain`, ports, the error taxonomy | the web framework, the ORM, schema, concrete adapters |
| **infrastructure** | `adapters/<tech>/*`, the database layer, `modules/<m>/repository.ts` | anything inward | other modules |
| **transport** | `modules/<m>/routes.ts`, request-context helpers | application, ports, contracts | the ORM, schema |
| **composition** | app bootstrap, the container, the module registry | anything | — |
| **contracts** | the shared request/response schemas | nothing server-side | anything server-side |

A mixed `platform/`-style directory (errors, config, container, jobs, SSE) needs
splitting by ring in your head: the error taxonomy and config *types* are read by
the application layer, while the container, queue and SSE code are
infrastructure. From the application layer, import only the error taxonomy and
config types.

## Anatomy of a module

```
modules/<name>/
├── routes.ts        transport: HTTP schemas, status codes, delegation. No SQL.
├── service.ts       application: scenarios. No web framework, no ORM.
├── domain/          domain: types + pure rules. Appears when a rule appears.
│   ├── <entity>.ts
│   └── rules.ts
├── ports.ts         interfaces needed only by this module
├── repository.ts    infrastructure: the only place with the schema. Returns domain types.
├── mapper.ts        row → domain, domain → DTO
├── helpers.ts       pure transformations with no knowledge of the database
└── constants.ts     module literals (never exported to other modules)
```

A large module is split **within** a layer (`repository/` as a directory of
several files, `pipeline/` for multi-step processing), never across one. The one
thing you do not split is the layer — "a bit of SQL here, it is faster" breaks
the whole construction.

## Import direction as rules

```
routes.ts      →  service.ts, contracts, request context, error taxonomy
service.ts     →  domain/, ports, repository (through its interface), error taxonomy
repository.ts  →  schema, ORM, domain/ (for mapping)
domain/        →  ∅
adapters/      →  ports (implements), SDK
composition    →  everything
```

`repository.ts` importing `domain/` is not a violation: that dependency points
**inward**. The reverse — `domain/` knowing about the repository — is.

## Where shared code goes

| What | Where |
|---|---|
| Needed by one module | next to it, inside the module |
| Needed by two modules and technical in nature | a `modules/_shared/`-style directory |
| Needed by two modules and it is a conversation with the outside world | a port in the core |
| Needed application-wide (config, errors, queues) | the platform directory |
| A contract the frontend also sees | the shared contracts package |

The promotion rule is **a second real consumer, not a hypothetical one**. Code
pushed into shared space for a single module acquires an imagined contract that
nobody has verified.

## A shared contracts package is not a loophole

If client and server both import a shared package, it holds **only** port
interfaces and API contracts. Server-side domain rules do not belong there: they
would ship in the browser bundle and turn into a public contract nobody
declared.
