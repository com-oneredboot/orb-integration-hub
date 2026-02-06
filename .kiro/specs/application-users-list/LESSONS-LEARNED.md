# Lessons Learned: Application Users List Spec

## Issue: Missing Standard Requirements

### What Happened

When creating the initial requirements document for the application-users-list spec, we missed the 4 standard requirements that should be included in EVERY spec according to orb-templates spec standards:

1. Documentation Updates
2. Version and Changelog Management
3. Git Commit Standards
4. Final Verification

### Root Cause

1. **No proactive MCP consultation** - Neither the orchestrator nor the requirements-first-workflow subagent consulted the orb-templates MCP server before creating requirements
2. **No automated validation** - There was no hook or check to ensure standard requirements were included
3. **Process gap** - The spec creation process didn't explicitly require MCP consultation as a first step

### Impact

- Requirements document was incomplete
- Would have missed documentation updates, changelog entries, and proper git commits
- Discovered only when user asked about MCP consultation

### Resolution

Implemented three fixes:

1. **Updated `.kiro/steering/project-standards.md`**
   - Added "Spec Creation Process" section
   - Explicit 3-step process: Consult MCP → Include Standards → Validate
   - Lists all 4 required standard requirements
   - References orb-templates spec standards document

2. **Created Kiro Hook** (`.kiro/hooks/validate-spec-requirements.json`)
   - Triggers when any `requirements.md` file is edited
   - Validates presence of all 4 standard requirements
   - Automatically prompts agent to add missing requirements

3. **Documented Lesson** (this file)
   - Captures what went wrong and why
   - Documents the fixes implemented
   - Provides reference for future specs

### Prevention

Going forward, when creating ANY spec:

1. **ALWAYS** search orb-templates MCP first: `search_standards_tool("spec standards")`
2. **ALWAYS** include the 4 standard requirements
3. **ALWAYS** validate completeness before proceeding to design phase
4. The hook will catch any missed requirements automatically

### References

- orb-templates spec standards: `repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md`
- Project standards: `.kiro/steering/project-standards.md`
- Validation hook: `.kiro/hooks/validate-spec-requirements.json`

### Date

2026-02-06

### Reported By

User (fishbeak)

### Fixed By

Kiro (with user guidance)
