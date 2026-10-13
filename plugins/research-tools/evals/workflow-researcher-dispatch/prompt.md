---
max_turns: 14
timeout_seconds: 400
tags: [workflow]
allowed_tools: [Read, Glob, Grep, Task]
---

You are a caller step in a larger workflow. Dispatch the `research-tools:researcher` agent (Task tool) with this prompt: "In the fixture repo at evals/fixtures/sample-repo, what does withRetry do when every attempt fails? Return your report." Then return the researcher's report to me unchanged.
