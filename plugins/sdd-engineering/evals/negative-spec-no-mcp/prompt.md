---
max_turns: 25
timeout_seconds: 600
tags: [negative]
allowed_tools: [Read, Write, Glob, Grep, Skill, Agent]
plugins: ["../..", "../../../engineering-paved-path", "../../../research-tools", "../../../architecture-review", "../../../code-agents"]
---

Use the spec-creator agent (sdd-engineering:spec-creator) to write a spec for: "Show the Jira ticket status on the dashboard header." No Jira, Atlassian or other MCP server is configured in this session. Write the spec under `specs/`.
