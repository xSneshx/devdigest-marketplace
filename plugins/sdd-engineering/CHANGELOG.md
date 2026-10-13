# Changelog

## 1.0.0

- Initial release.
- Agents `spec-creator`, `implementation-planner`, `plan-verifier`; skills `run-plan` and `workflow-retro`.
- Commands `spec`, `plan`, `execute-plan`, `verify`, `sdd-retro`.
- Guard hooks for `spec-creator` and `plan-verifier`.
- The execute command is named `execute-plan` (not `run-plan`), so it no longer shadows the `run-plan` skill.
- `/sdd-engineering:sdd-retro` now reads `skills/workflow-retro/SKILL.md` via `${CLAUDE_PLUGIN_ROOT}` instead of invoking the skill with the Skill tool, which `disable-model-invocation: true` blocks. The retro stays manual only (AC-65).
