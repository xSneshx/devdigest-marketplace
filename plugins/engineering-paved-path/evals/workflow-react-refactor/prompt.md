---
max_turns: 10
timeout_seconds: 300
tags: [workflow]
allowed_tools: [Read, Glob, Grep, Skill]
plugins: ["../.."]
---

Refactor the React component below in a Next.js App Router project (`client/src/`). It is used only by the route `app/agents/page.tsx`. Use the relevant engineering skills from the loaded plugins. Do not write files; show the refactored result and say where each file goes.

```tsx
// client/src/components/AgentList.tsx
"use client";
import { useEffect, useState } from "react";

export function AgentList() {
  const [agents, setAgents] = useState<{ id: string; name: string }[]>([]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetch("/api/agents").then((r) => r.json()).then((a) => setAgents(a));
  }, []);
  useEffect(() => setCount(agents.length), [agents]);

  return (
    <div>
      {count && <p>{count} agents</p>}
      {agents.map((a, i) => (
        <div key={i}>{a.name}</div>
      ))}
    </div>
  );
}
```
