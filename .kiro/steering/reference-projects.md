---
inclusion: manual
---
# Update Reference Projects

This steering file is triggered manually using `#reference-projects` in chat.

## Purpose

Update all reference repositories in `repositories/` and show what's changed since the last pull.

## Workflow

When triggered, execute this workflow for each repository in `repositories/`:

### 1. List Reference Repositories

```bash
ls -d repositories/*/
```

Expected repositories:
- `repositories/orb-templates/` - Documentation and standards
- `repositories/orb-infrastructure/` - Shared infrastructure, workflow templates
- `repositories/orb-geo-fence/` - Example standardized orb project

### 2. For Each Repository

Execute these steps for each repository found:

#### Record Current State
```bash
cd repositories/[repo-name]
git rev-parse HEAD
```
Save this as the "old HEAD" for comparison.

#### Pull Latest Changes
```bash
git pull
```

#### Show New Commits
```bash
git log [old-head]..HEAD --oneline --no-merges
```

If there are new commits, list them with:
- Commit hash (short)
- Commit message
- Author (if relevant)

#### Check Changelog
```bash
# If CHANGELOG.md exists, show changes
git diff [old-head]..HEAD -- CHANGELOG.md
```

### 3. Summary Report

After processing all repositories, provide a summary:

```
## Reference Projects Update Summary

### orb-templates
- Status: [Updated / No changes]
- New commits: [count]
- Notable changes: [list any significant updates]

### orb-infrastructure
- Status: [Updated / No changes]
- New commits: [count]
- Notable changes: [list any significant updates]

### orb-geo-fence
- Status: [Updated / No changes]
- New commits: [count]
- Notable changes: [list any significant updates]

### Action Items
- [List any changes that might affect this project]
- [Note any breaking changes or required updates]
```

## Adding New Reference Repositories

To add a new reference repository:

```bash
git clone https://github.com/com-oneredboot/[repo-name].git repositories/[repo-name]
```

## Troubleshooting

### Repository has local changes
```bash
cd repositories/[repo-name]
git stash
git pull
git stash pop  # Only if you need the changes
```

### Repository is in detached HEAD state
```bash
cd repositories/[repo-name]
git checkout main
git pull
```
