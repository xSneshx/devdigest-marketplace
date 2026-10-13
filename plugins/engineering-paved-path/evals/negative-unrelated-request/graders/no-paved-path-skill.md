---
type: llm
weight: 1
---

The request is a cooking recipe, unrelated to software engineering. It passes only if all of these hold:

1. The transcript shows no `Skill` tool call to any `engineering-paved-path:*` skill (typescript-expert, zod, security, react-best-practices, frontend-ui-architecture, next-best-practices, onion-architecture, fastify-best-practices, react-testing-library, mermaid-diagram).
2. The response is a recipe with ingredients and steps, and contains no software-architecture or TypeScript advice.
