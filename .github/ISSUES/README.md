# Cross-Team Issue Tracking

This directory tracks issues filed with other teams that affect this project.

## Current Blockers

| Issue | Team | Status | Impact |
|-------|------|--------|--------|
<!-- Add entries as issues are filed -->
<!-- | [#28](https://github.com/com-oneredboot/orb-schema-generator/issues/28) | orb-schema-generator | Blocked | DynamoDB table naming | -->

## Resolved Issues

| Issue | Team | Resolution |
|-------|------|------------|
<!-- Move entries here when resolved -->
<!-- | [#5](https://github.com/com-oneredboot/orb-infrastructure/issues/5) | orb-infrastructure | Fixed in v1.2.0 | -->

## Usage

### Filing a New Issue

1. Create body file using the template:
   ```bash
   cp .github/ISSUES/issue-body-template.md .github/ISSUES/{team}-{number}.md
   ```

2. Fill in the template with issue details

3. File the issue:
   ```bash
   gh issue create --repo com-oneredboot/{team} \
     --title "[Title]" \
     --body-file .github/ISSUES/{team}-{number}.md
   ```

4. Add entry to Current Blockers table above

### When an Issue is Resolved

1. Verify the fix works in your project
2. Move entry from Current Blockers to Resolved Issues
3. Close the GitHub issue (you own it as the creator)
4. Optionally delete the body file or keep for reference

## File Naming Convention

- `{team}-{number}.md` - Body file for issue #{number} in {team}'s repository
- Example: `orb-schema-generator-28.md`

## Benefits

- **Visibility**: Team knows what's blocked and why
- **Traceability**: Links between local tracking and GitHub issues
- **Shell-safe**: Using `--body-file` avoids escaping issues with complex content
- **History**: Resolved issues stay documented for reference
