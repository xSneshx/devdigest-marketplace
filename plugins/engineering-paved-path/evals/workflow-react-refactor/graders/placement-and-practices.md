---
type: llm
weight: 1
---

The response is a refactor of a React component in a Next.js App Router project. It passes only if all of these hold:

1. Placement: because the component has one consumer (the route `app/agents/page.tsx`), the refactored component lives next to that route (anywhere under `app/agents/`, for example `app/agents/_components/`) and is not left in the shared `components/` folder.
2. Data fetching is moved out of the component body: into a custom hook, or into a server-side data function used by a Server Component. A raw `fetch` + `useEffect` inside the component body does not pass.
3. The derived `count` is computed during render (`agents.length`) or dropped; there is no `useState` + `useEffect` sync for it.
4. The `{count && ...}` zero-render bug is fixed (`count > 0 &&`, a ternary, or an explicit empty state), and the list uses a stable key (`a.id` / `agent.id`), not the array index.
