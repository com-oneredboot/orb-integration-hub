# Cross-Team Issue Tracking

This directory contains body files for issues filed with other teams, and serves as our local record of cross-team dependencies.

## Current Blockers

| Issue | Team | Status | Impact |
|-------|------|--------|--------|
| [#57](https://github.com/com-oneredboot/orb-schema-generator/issues/57) | orb-schema-generator | 🟡 Open | Confusing repository configuration - package in wrong CodeArtifact repo |

## Resolved Issues

| Issue | Team | Resolution |
|-------|------|------------|
| [#56](https://github.com/com-oneredboot/orb-schema-generator/issues/56) | orb-schema-generator | ✅ Fixed in v0.13.3 - config validation added |
| [#55](https://github.com/com-oneredboot/orb-schema-generator/issues/55) | orb-schema-generator | ✅ Fixed in v0.13.2 |

## Usage

### Filing a New Issue

1. Create body file: `.github/ISSUES/{team}-{number}.md`
2. File issue: `gh issue create --repo com-oneredboot/{team} --title "..." --body-file .github/ISSUES/{team}-{number}.md`
3. Update this README with the new issue

### When Fixed

1. Update status in this README (move to Resolved Issues)
2. Keep body file for history

## File Naming

`{team}-{issue-number}.md` - e.g., `orb-schema-generator-57.md`
