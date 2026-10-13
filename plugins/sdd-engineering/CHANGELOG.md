# Changelog

## 1.0.0

- Initial release.
- Agents `spec-creator`, `implementation-planner`, `plan-verifier`; skills `run-plan` and `workflow-retro`.
- Commands `spec`, `plan`, `execute-plan`, `verify`, `sdd-retro`.
- Guard hooks for `spec-creator` and `plan-verifier`.
- The execute command is named `execute-plan` (not `run-plan`), so it no longer shadows the `run-plan` skill.
