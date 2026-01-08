---
inclusion: manual
---
# Troubleshooting Guide

Trigger this guide using `#troubleshooting-guide` in chat when investigating issues.

## Step 1: Update Reference Projects

Before investigating, ensure you have the latest upstream code and documentation.

```bash
# Pull all reference repositories
cd repositories/
for dir in */; do
  echo "Updating $dir..."
  git -C "$dir" pull
done
```

Or use the "get all reference projects" command phrase.

**Check for:**
- Recent fixes that might address your issue
- Version updates in CHANGELOG files
- New documentation or examples

## Step 2: Check Configuration

Verify your configuration against the official documentation.

**Common configuration issues:**
- [ ] Config file syntax is valid (YAML, JSON)
- [ ] Required fields are present
- [ ] Values match expected types and formats
- [ ] Paths are correct and files exist
- [ ] Environment variables are set

**Files to check:**
- `schema-generator.yml` - Schema generator configuration
- `infrastructure/cloudformation/*.yml` - CloudFormation templates
- `apps/api/Pipfile` - Python dependencies
- `apps/web/package.json` - TypeScript dependencies

## Step 3: Reproduce with Fresh State

Rule out stale state by starting fresh.

```bash
# Clean Python environment
cd apps/api
pipenv --rm
pipenv install --dev

# Clean Node environment
cd apps/web
rm -rf node_modules
npm install

# Clean generated files
rm -rf apps/api/generated/
rm -rf apps/web/src/generated/
orb-schema-generator generate
```

**Checklist:**
- [ ] Deleted all generated/cached files
- [ ] Reinstalled dependencies
- [ ] Regenerated from scratch
- [ ] Issue still reproduces

If the issue disappears, it was likely stale state. Document what fixed it.

## Step 4: Analyze and Find Root Cause

Trace the issue to its source.

**For generated code issues:**
1. Identify the exact error message
2. Find where the problematic code is generated
3. Trace back to the generator source code
4. Identify the logic causing the issue

**For runtime issues:**
1. Check CloudWatch logs for error details
2. Add debug logging if needed
3. Isolate the failing component
4. Create minimal reproduction case

**For infrastructure issues:**
1. Check CloudFormation stack events
2. Verify IAM permissions
3. Check resource limits
4. Review security group rules

**Document your findings:**
- Error message: [exact text]
- File/line: [location]
- Root cause: [what's wrong]
- Upstream code location: [if applicable]

## Step 5: Classify the Issue

Determine the appropriate action based on root cause.

### Configuration Error
Your configuration doesn't match what the tool expects.
- **Action:** Fix your configuration
- **Follow-up:** If docs were unclear, file a docs improvement request

### Bug in Upstream Tool
The tool has a defect that needs fixing.
- **Action:** File a bug report with the upstream team
- **Include:** Root cause analysis, code locations, suggested fix
- **Use:** "open bug with [team-name]" command phrase

### Documentation Gap
The tool works correctly but documentation is missing or unclear.
- **Action:** File a documentation improvement request
- **Include:** What was confusing, suggested improvements

### Feature Request
The tool doesn't support your use case.
- **Action:** File a feature request
- **Include:** Use case, proposed solution, workarounds tried

## Step 6: File Issue (if needed)

If you've identified a bug or gap in an upstream tool:

1. **Create body file:** `.github/ISSUES/[team]-[issue-number].md`
2. **Prepare issue body:** Use the issue body template
3. **File the issue:** `gh issue create --repo com-oneredboot/[team] --title "[Title]" --body-file .github/ISSUES/[team]-[number].md`
4. **Update tracking:** Add entry to `.github/ISSUES/README.md` Current Blockers table

## Common Issues

### Lambda Deployment Fails
```bash
# Check SAM build
sam build --template infrastructure/cloudformation/lambdas.yml

# Verify paths in template
grep -r "CodeUri" infrastructure/cloudformation/lambdas.yml
# Should reference ../../apps/api/lambdas/
```

### Schema Generation Fails
```bash
# Validate schemas first
orb-schema-generator validate

# Check schema-generator.yml exists and is valid
cat schema-generator.yml
```

### Tests Fail After Migration
```bash
# Check for old path references
grep -r "backend/" apps/ --include="*.py" --include="*.ts"
grep -r "frontend/" apps/ --include="*.py" --include="*.ts"

# Run property test
bash tests/property/test_import_path_migration.sh
```
