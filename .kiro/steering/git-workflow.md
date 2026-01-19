---
inclusion: manual
---
# Git Workflow Standards

This steering file is triggered manually using `#git-workflow` in chat.

## Branch Naming

```
<type>/<ticket-id>-<short-description>
```

| Type | Purpose | Example |
|------|---------|---------|
| `feature/` | New features | `feature/123-user-authentication` |
| `fix/` | Bug fixes | `fix/456-login-redirect` |
| `docs/` | Documentation | `docs/789-api-reference` |
| `refactor/` | Code refactoring | `refactor/101-cleanup-handlers` |
| `chore/` | Maintenance tasks | `chore/102-update-dependencies` |

## Commit Message Format

```
<type>: <short description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, no code change |
| `refactor` | Code restructuring |
| `test` | Adding/updating tests |
| `chore` | Maintenance tasks |

### Examples

```
feat: add user authentication endpoint

Implements JWT-based authentication with refresh tokens.
Includes rate limiting and session management.

Closes #123
```

```
fix: resolve null pointer in coordinate validation

The validator was not handling empty coordinate arrays.
Added null check and appropriate error message.

Fixes #456
```

## Pull Request Guidelines

### PR Title
Same format as commit messages: `<type>: <description>`

### PR Description Template

```markdown
## Summary
[Brief description of changes]

## Changes
- [List of specific changes]

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Related Issues
Closes #[issue-number]
```

### PR Checklist

Before requesting review:
- [ ] All tests pass
- [ ] Code follows project standards
- [ ] Documentation updated if needed
- [ ] No merge conflicts
- [ ] Self-reviewed the diff

## Git Commands Reference

### Daily Workflow
```bash
# Start new feature
git checkout main
git pull
git checkout -b feature/123-new-feature

# Commit changes
git add .
git commit -m "feat: implement new feature"

# Push and create PR
git push -u origin feature/123-new-feature
gh pr create --fill
```

### Keeping Branch Updated
```bash
git fetch origin
git rebase origin/main
# Resolve conflicts if any
git push --force-with-lease
```

### Squashing Commits
```bash
git rebase -i HEAD~3  # Squash last 3 commits
# Change 'pick' to 'squash' for commits to combine
```

## Pre-Commit Hooks

**CRITICAL: NEVER use `--no-verify` flag**

The `--no-verify` flag bypasses pre-commit hooks and is strictly forbidden. Pre-commit hooks exist to catch issues before they reach CI.

### Forbidden Commands
```bash
# NEVER DO THIS
git commit --no-verify
git commit -n
git push --no-verify
```

### If Pre-Commit Fails
1. Read the error message carefully
2. Fix the issues in your code (formatting, linting, type errors)
3. Stage the fixed files with `git add`
4. Run commit again WITHOUT `--no-verify`

### Common Pre-Commit Fixes
```bash
# Format Python files (note: uses --line-length=100)
pipenv run black --line-length=100 <file>

# Fix linting issues
pipenv run ruff check <file> --fix

# Check types
pipenv run mypy <file>
```

## Protected Branches

- `main` - Production-ready code
  - Requires PR approval
  - Requires passing CI
  - No direct pushes
