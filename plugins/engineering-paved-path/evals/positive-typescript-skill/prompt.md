---
max_turns: 6
timeout_seconds: 240
tags: [positive]
allowed_tools: [Read, Glob, Grep, Skill]
plugins: ["../.."]
---

I have a function `pick<T, K extends string>(obj: T, keys: K[])` that returns `Pick<T, K>`, and TypeScript reports "Type 'K' does not satisfy the constraint 'keyof T'". How should I type it so the keys are checked against the object? Use the relevant engineering skill from the loaded plugins, then answer briefly with a corrected signature.
