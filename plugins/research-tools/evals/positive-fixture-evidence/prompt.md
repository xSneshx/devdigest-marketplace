---
max_turns: 10
timeout_seconds: 300
tags: [positive]
allowed_tools: [Read, Glob, Grep]
---

Use the researcher agent (research-tools:researcher). Question about the fixture repo at `evals/fixtures/sample-repo` (relative to the research-tools plugin directory): how many times is a failing call retried, and what is the delay between attempts? Answer with the researcher's structured report.
