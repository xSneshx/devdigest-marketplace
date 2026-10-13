---
description: 'Run a retrospective over past workflow sessions using the bundled workflow-retro procedure (manual only)'
argument-hint: '<optional scope or journal path>'
disable-model-invocation: true
---
Read `${CLAUDE_PLUGIN_ROOT}/skills/workflow-retro/SKILL.md` and follow its procedure exactly, with this input:

$ARGUMENTS

Wherever that file says `${CLAUDE_SKILL_DIR}`, use `${CLAUDE_PLUGIN_ROOT}/skills/workflow-retro` instead, for example `python3 "${CLAUDE_PLUGIN_ROOT}/skills/workflow-retro/scripts/analyze_journals.py"`.

Do not call the Skill tool; the skill is manual-only and is read directly.
