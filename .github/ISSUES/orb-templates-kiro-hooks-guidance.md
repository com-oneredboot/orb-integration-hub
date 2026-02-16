# Add Kiro Hooks Guidance to orb-templates

## Summary

Add comprehensive documentation for Kiro hooks to orb-templates, including best practices, common patterns, and recommended hooks for all orb projects. Kiro hooks provide event-driven automation similar to GitHub hooks but for IDE events, enabling teams to enforce standards and automate repetitive tasks in real-time during development.

## Background

While working on the orb-integration-hub project, we discovered that Kiro hooks are an extremely powerful tool for enforcing standards and automating repetitive tasks. However, there's no guidance in orb-templates about:
- What Kiro hooks are and how they work
- When and how to use them
- Recommended hooks for orb projects
- Best practices and patterns

This led to missed opportunities for automation and standards enforcement.

## Problem

Without Kiro hooks guidance in orb-templates:
1. Teams don't know hooks exist or how to use them
2. Each project reinvents hook patterns independently
3. Common automation opportunities are missed
4. Standards enforcement happens manually instead of automatically
5. No consistency across orb projects

## Proposed Solution

Add comprehensive Kiro hooks documentation to orb-templates with:

### 1. Core Documentation

Create `docs/kiro-steering/kiro-hooks.md` with:

- **What Are Kiro Hooks?** - Explanation and comparison to GitHub hooks
- **Hook Structure** - JSON schema and required fields
- **Event Types** - All available event types with use cases
- **Action Types** - askAgent vs runCommand with examples
- **File Patterns** - Glob pattern syntax and examples
- **Best Practices** - When to use hooks, performance considerations

### 2. Recommended Hooks Library

Create `docs/kiro-steering/recommended-hooks/` with ready-to-use hooks:

#### Standards Enforcement Hooks

**`check-standards-new-files.json`**
```json
{
  "name": "Check Standards for New Files",
  "version": "1.0.0",
  "description": "Validates new source files follow orb naming conventions",
  "when": {
    "type": "fileCreated",
    "patterns": ["apps/**/*.py", "apps/**/*.ts", "infrastructure/**/*.py"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "A new source file was created. Use search_standards_tool to verify the file follows orb naming conventions and coding standards for this file type. Check: file naming, directory placement, and any boilerplate requirements."
  }
}
```

**`validate-aws-naming.json`**
```json
{
  "name": "Validate AWS Resource Naming",
  "version": "1.0.0",
  "description": "Validates AWS resource names against orb conventions",
  "when": {
    "type": "fileEdited",
    "patterns": ["infrastructure/**/*.py"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "Check this infrastructure file for AWS resource names (SSM parameters, secrets, log groups, physical resources). Use validate_naming_tool to validate each resource name against orb conventions. Report any violations and suggest corrections."
  }
}
```

**`check-workflow-standards.json`**
```json
{
  "name": "Check GitHub Workflow Standards",
  "version": "1.0.0",
  "description": "Validates GitHub Actions workflows follow orb standards",
  "when": {
    "type": "fileEdited",
    "patterns": [".github/workflows/*.yml"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "A GitHub Actions workflow was edited. Use search_standards_tool to verify it follows orb GitHub Actions standards. Check: input ordering, timeout settings, security practices, and naming conventions."
  }
}
```

**`validate-spec-requirements.json`**
```json
{
  "name": "Validate Spec Requirements",
  "version": "1.0.0",
  "description": "Ensures spec requirements include all standard requirements",
  "when": {
    "type": "fileEdited",
    "patterns": [".kiro/specs/*/requirements.md"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "A spec requirements.md file was edited. Validate it includes ALL 4 standard requirements from orb-templates spec standards:\n\n1. Documentation Updates requirement\n2. Version and Changelog Management requirement\n3. Git Commit Standards requirement\n4. Final Verification requirement\n\nIf any are missing, add them immediately. Use search_standards_tool('spec standards') to get the exact format if needed."
  }
}
```

#### Code Quality Hooks

**`validate-schema-changes.json`**
```json
{
  "name": "Validate Schema Changes",
  "version": "1.0.0",
  "description": "Runs schema validation when YAML schemas are modified",
  "when": {
    "type": "fileEdited",
    "patterns": ["schemas/**/*.yml"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "A schema file was modified. Run 'orb-schema-generator validate' to check for errors. If validation passes, consider running 'orb-schema-generator generate' to update generated code."
  }
}
```

**`run-tests-on-change.json`**
```json
{
  "name": "Run Tests on Code Change",
  "version": "1.0.0",
  "description": "Runs related tests when source files are modified",
  "when": {
    "type": "fileEdited",
    "patterns": ["apps/api/**/*.py", "!apps/api/**/test_*.py"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "Source code was modified. Identify and run the related unit tests for this file. Report test results and any failures."
  }
}
```

**`check-import-standards.json`**
```json
{
  "name": "Check Import Standards",
  "version": "1.0.0",
  "description": "Validates import statements follow orb conventions",
  "when": {
    "type": "fileEdited",
    "patterns": ["apps/**/*.py", "infrastructure/**/*.py"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "Check import statements in this file. Verify they follow orb standards: 1) Standard library imports first, 2) Third-party imports second, 3) Local imports last, 4) Each group alphabetically sorted, 5) No wildcard imports."
  }
}
```

#### Documentation Hooks

**`update-docs-on-api-change.json`**
```json
{
  "name": "Update Docs on API Change",
  "version": "1.0.0",
  "description": "Reminds to update documentation when API code changes",
  "when": {
    "type": "fileEdited",
    "patterns": ["apps/api/graphql/schema.graphql", "apps/api/models/*.py"]
  },
  "then": {
    "type": "askAgent",
    "prompt": "API code was modified. Check if documentation needs updating. Review docs/api.md and related documentation files. Update any outdated information."
  }
}
```

### 3. Template Integration

Update `docs/kiro-steering/templates/project-standards.md` to include:

```markdown
## Kiro Hooks

This project uses Kiro hooks for automated standards enforcement and quality checks.

### Installed Hooks

| Hook | Triggers On | Purpose |
|------|-------------|---------|
| check-standards-new-files | File creation | Validates naming conventions |
| validate-aws-naming | Infrastructure edits | Checks AWS resource names |
| check-workflow-standards | Workflow edits | Validates GitHub Actions |
| validate-spec-requirements | Spec edits | Ensures standard requirements |

### Hook Management

- **View hooks**: Check `.kiro/hooks/` directory or Agent Hooks panel
- **Add hooks**: Copy from orb-templates recommended hooks library
- **Disable hooks**: Rename `.json` to `.json.disabled`
- **Create custom hooks**: See [Kiro Hooks Guide](../kiro-hooks.md)

### Recommended Hooks

All orb projects should install these hooks:
- ✅ check-standards-new-files
- ✅ validate-aws-naming
- ✅ check-workflow-standards
- ✅ validate-spec-requirements

See `repositories/orb-templates/docs/kiro-steering/recommended-hooks/` for complete library.
```

### 4. MCP Integration

Update the orb-templates MCP server to include:

**New Tool: `get_recommended_hook`**
```python
@mcp.tool()
def get_recommended_hook(hook_name: str) -> str:
    """Get a recommended Kiro hook configuration by name.
    
    Args:
        hook_name: Name of the hook (e.g., 'check-standards-new-files')
    
    Returns:
        JSON configuration for the hook
    """
    # Return hook JSON from recommended-hooks library
```

**New Tool: `list_recommended_hooks`**
```python
@mcp.tool()
def list_recommended_hooks(category: str = None) -> list:
    """List all recommended Kiro hooks, optionally filtered by category.
    
    Args:
        category: Optional category filter (standards, quality, documentation)
    
    Returns:
        List of hook names with descriptions
    """
    # Return list of available hooks
```

### 5. Installation Script

Create `scripts/install-hooks.sh`:

```bash
#!/bin/bash
# Install recommended Kiro hooks for orb projects

HOOKS_DIR=".kiro/hooks"
TEMPLATES_DIR="repositories/orb-templates/docs/kiro-steering/recommended-hooks"

# Create hooks directory if it doesn't exist
mkdir -p "$HOOKS_DIR"

# Copy recommended hooks
echo "Installing recommended Kiro hooks..."

cp "$TEMPLATES_DIR/check-standards-new-files.json" "$HOOKS_DIR/"
cp "$TEMPLATES_DIR/validate-aws-naming.json" "$HOOKS_DIR/"
cp "$TEMPLATES_DIR/check-workflow-standards.json" "$HOOKS_DIR/"
cp "$TEMPLATES_DIR/validate-spec-requirements.json" "$HOOKS_DIR/"

echo "✅ Installed 4 recommended hooks"
echo "View hooks in .kiro/hooks/ or the Agent Hooks panel"
```

## Benefits

1. **Automated Standards Enforcement** - Hooks catch violations in real-time
2. **Consistent Quality** - All orb projects use the same automation
3. **Reduced Manual Work** - Repetitive checks happen automatically
4. **Better Onboarding** - New team members get instant feedback
5. **Proactive Validation** - Catch issues before commit/PR
6. **Customizable** - Teams can add project-specific hooks

## Implementation Checklist

- [ ] Create `docs/kiro-steering/kiro-hooks.md` with comprehensive guide
- [ ] Create `docs/kiro-steering/recommended-hooks/` directory
- [ ] Add 8 recommended hook JSON files
- [ ] Update `docs/kiro-steering/templates/project-standards.md`
- [ ] Add MCP tools: `get_recommended_hook`, `list_recommended_hooks`
- [ ] Create `scripts/install-hooks.sh` installation script
- [ ] Update main README.md to reference hooks documentation
- [ ] Add hooks section to getting-started guide
- [ ] Create example project with hooks pre-installed

## Success Criteria

- All orb projects can easily install recommended hooks
- Teams understand when and how to create custom hooks
- MCP server provides hook discovery and installation
- Documentation includes real-world examples and patterns
- Installation script works across all orb projects

## Related Issues

- Spec standards enforcement (this issue originated from missing standard requirements)
- AWS naming validation automation
- GitHub Actions standards compliance

## Example Usage

After implementation, teams can:

```bash
# Install recommended hooks
./repositories/orb-templates/scripts/install-hooks.sh

# Or use MCP
search_standards_tool("kiro hooks")
get_recommended_hook("validate-spec-requirements")
```

## References

- orb-integration-hub implementation: `.kiro/hooks/`
- Lesson learned: `.kiro/specs/application-users-list/LESSONS-LEARNED.md`
- Project standards: `.kiro/steering/project-standards.md`

## Priority

**High** - This enables automated standards enforcement across all orb projects and significantly improves code quality and consistency.

---

**Submitted by**: orb-integration-hub team  
**Date**: 2026-02-06  
**Category**: Documentation, Tooling, Standards
