---
inclusion: always
---

# Spec Standards

All specs in this repository MUST follow the [orb-templates Spec Standards](../../repositories/orb-templates/docs/kiro-steering/templates/spec-standards.md).

## Quick Checklist

When completing any spec:

1. **Git Commits**: Reference issue numbers in commit messages
2. **Issue Comments**: Summarize changes, invite creator to verify and close
3. **Documentation**: Ensure content is relevant, concise, no duplication
4. **Versions**: Bump version and update CHANGELOG if applicable
5. **Consistency**: Verify versions, terminology, commands are consistent
6. **Final Check**: Run verification, confirm no errors, push

## Git Commit Standards

Commit messages MUST follow conventional commits format:

```bash
# Single issue
feat: add user authentication #42

# Multiple issues
fix: resolve validation errors #20, #21

# No issue (internal work)
chore: update dependencies
```

## Issue Response Template

When fixing an issue, post this comment:

```markdown
[Summary] has been [added/fixed] in commit [hash]:

**Changes:**
- [File]: [Description]

Please verify the changes meet your needs and close when satisfied.
```

## Documentation Quality Checklist

Before completing a spec, verify:

- [ ] Is this information already documented elsewhere? (If yes, reference it)
- [ ] Is all content still accurate and relevant?
- [ ] Is the documentation concise without unnecessary verbosity?
- [ ] Are cross-references included to related documentation?
- [ ] Is terminology consistent with other documentation?

## Never Do

- ❌ Close issues created by other teams
- ❌ Skip issue comments after fixing
- ❌ Duplicate existing documentation
- ❌ Leave outdated information
- ❌ Forget version/changelog updates
- ❌ Use `git commit --amend` on pushed commits
