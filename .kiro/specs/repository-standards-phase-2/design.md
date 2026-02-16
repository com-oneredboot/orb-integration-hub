# Design Document: Repository Standards Phase 2

## Overview

This design document outlines the approach for implementing Phase 2 of repository standardization for orb-integration-hub. This phase focuses on code quality automation through pre-commit hooks, release management with CHANGELOG, and alignment with the latest orb-templates standards.

## Architecture

### Pre-commit Hook Architecture

```
Developer Workflow
─────────────────────────────────────────────────────────────
                                                              
  git commit ──► .git/hooks/pre-commit ──► pre-commit framework
                        │                         │
                        │                         ▼
                        │              ┌─────────────────────┐
                        │              │ .pre-commit-config  │
                        │              │ ─────────────────── │
                        │              │ • ruff (lint/fmt)   │
                        │              │ • black (format)    │
                        │              │ • mypy (types)      │
                        │              │ • file hygiene      │
                        │              └─────────────────────┘
                        │                         │
                        ▼                         ▼
                 Custom wrapper          Run on ALL files
                 (not just staged)       (catch cross-file issues)
```

### File Changes Overview

```
orb-integration-hub/
├── .pre-commit-config.yaml          # NEW - Pre-commit configuration
├── .kiro/steering/
│   └── spec-standards.md            # NEW - Spec quality standards
├── CHANGELOG.md                     # NEW - Release tracking
├── .gitignore                       # MODIFIED - Modernized structure
├── apps/api/
│   └── Pipfile                      # MODIFIED - Add orb-common, pre-commit
└── .github/workflows/
    └── *.yml                        # MODIFIED - Input ordering, timeouts
```

## Components and Interfaces

### 1. Pre-commit Configuration

The `.pre-commit-config.yaml` will include:

```yaml
repos:
  # Ruff - Fast Python linter and formatter
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.3.4
    hooks:
      - id: ruff
        args: [--fix, --exit-non-zero-on-fix]
      - id: ruff-format

  # Black - Code formatting
  - repo: https://github.com/psf/black
    rev: 24.3.0
    hooks:
      - id: black

  # MyPy - Static type checking
  - repo: https://github.com/pre-commit/mirrors-mypy
    rev: v1.9.0
    hooks:
      - id: mypy
        additional_dependencies:
          - types-requests
          - pydantic
        args: [--strict]

  # File hygiene
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
      - id: end-of-file-fixer
      - id: check-yaml
      - id: check-json
      - id: check-toml
      - id: check-added-large-files
        args: ['--maxkb=1000']
      - id: check-merge-conflict
      - id: detect-private-key
```

### 2. Spec Standards Steering File

The `.kiro/steering/spec-standards.md` will include:

- Front-matter with `inclusion: always`
- Reference to orb-templates spec standards
- Quick checklist for spec completion
- Issue response template
- "Never Do" list for common mistakes

### 3. CHANGELOG Format

Following Keep a Changelog format:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added
- Pre-commit hooks for automated code quality

## [1.0.0] - 2026-01-08

### Added
- Nx-style directory structure (apps/api, apps/web, packages)
- orb-schema-generator integration
- Kiro steering files for AI-assisted development
- GitHub issue templates from orb-infrastructure
- Cross-team issue tracking in .github/ISSUES/

### Changed
- Migrated backend/ to apps/api/
- Migrated frontend/ to apps/web/
- Updated all import paths for new structure
```

### 4. Environment Designator Integration

```python
# Before (custom definition)
ENVIRONMENT = "dev"

# After (using orb-common)
from orb_common import EnvironmentDesignator

environment = EnvironmentDesignator.DEV
```

## Data Models

No new data models are introduced in this phase.



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: No Obsolete Gitignore Entries

*For any* entry in the .gitignore file, there shall be no references to the old directory paths (`backend/`, `frontend/` as standalone paths that no longer exist).

**Validates: Requirements 5.4**

### Property 2: Environment Designator Import Consistency

*For any* Python file that uses environment designators, the import shall come from `orb_common` rather than custom local definitions.

**Validates: Requirements 4.2**

### Property 3: Workflow Timeout Configuration

*For any* GitHub workflow job definition, there shall be a `timeout-minutes` configuration to prevent runaway jobs.

**Validates: Requirements 6.2**

### Property 4: Workflow Trigger Specificity

*For any* GitHub workflow, the trigger configuration shall specify explicit branches rather than using broad triggers like `on: [push, pull_request]`.

**Validates: Requirements 6.3**

## Error Handling

### Pre-commit Hook Failures

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| Hook fails on commit | Developer fixes issues before commit proceeds |
| mypy type errors | Fix type annotations or add type: ignore with justification |
| ruff lint errors | Auto-fix where possible, manual fix otherwise |
| Large file detected | Review if file should be committed or added to .gitignore |

### Dependency Installation Failures

| Error Scenario | Handling Strategy |
|----------------|-------------------|
| orb-common not found | Ensure CodeArtifact login is configured |
| pre-commit not installed | Run `pipenv install --dev` |
| Hook version mismatch | Run `pre-commit autoupdate` |

## Testing Strategy

### Dual Testing Approach

This phase uses primarily unit tests (specific examples) since most requirements are configuration-based.

#### Unit Tests (Examples)

| Test | Purpose | Validates |
|------|---------|-----------|
| Pre-commit config exists | Verify file at expected path | Req 1.1 |
| Pre-commit has ruff | Verify ruff hook configured | Req 1.2 |
| Pre-commit has black | Verify black hook configured | Req 1.3 |
| Pre-commit has mypy | Verify mypy hook configured | Req 1.4 |
| Spec-standards exists | Verify steering file created | Req 2.1 |
| CHANGELOG exists | Verify file at expected path | Req 3.1 |
| CHANGELOG has sections | Verify Keep a Changelog format | Req 3.2, 3.3 |
| Pipfile has orb-common | Verify dependency added | Req 4.1 |
| Gitignore has sections | Verify organized structure | Req 5.1 |

#### Property-Based Tests

| Property | Test Strategy | Tool |
|----------|---------------|------|
| No obsolete gitignore | Grep for old paths | Shell script |
| Workflow timeouts | Parse YAML, check jobs | Shell script |
| Workflow triggers | Parse YAML, check on: section | Shell script |

### Verification Commands

```bash
# Verify pre-commit config
test -f .pre-commit-config.yaml && echo "PASS" || echo "FAIL"
grep -q "ruff" .pre-commit-config.yaml && echo "PASS: ruff" || echo "FAIL: ruff"
grep -q "black" .pre-commit-config.yaml && echo "PASS: black" || echo "FAIL: black"
grep -q "mypy" .pre-commit-config.yaml && echo "PASS: mypy" || echo "FAIL: mypy"

# Verify spec-standards
test -f .kiro/steering/spec-standards.md && echo "PASS" || echo "FAIL"

# Verify CHANGELOG
test -f CHANGELOG.md && echo "PASS" || echo "FAIL"
grep -q "## \[" CHANGELOG.md && echo "PASS: version sections" || echo "FAIL"

# Verify no obsolete gitignore entries
grep -E "^backend/" .gitignore && echo "FAIL: obsolete backend" || echo "PASS"
grep -E "^frontend/" .gitignore && echo "FAIL: obsolete frontend" || echo "PASS"

# Verify workflow timeouts
for f in .github/workflows/*.yml; do
  grep -q "timeout-minutes" "$f" && echo "PASS: $f" || echo "WARN: $f missing timeout"
done
```

## Implementation Phases

### Phase 1: Pre-commit Setup (High Priority)
- Create `.pre-commit-config.yaml`
- Add pre-commit to Pipfile dev dependencies
- Document setup in README
- Create git hook wrapper for all-files checking

### Phase 2: Steering and Documentation (Medium Priority)
- Create `.kiro/steering/spec-standards.md`
- Create `CHANGELOG.md`
- Update README with pre-commit instructions

### Phase 3: Dependency and Config Updates (Medium Priority)
- Add orb-common to Pipfile
- Modernize .gitignore structure
- Review and update GitHub workflows

## Dependencies

### External Dependencies

| Dependency | Purpose | Installation |
|------------|---------|--------------|
| pre-commit | Git hook framework | `pipenv install --dev pre-commit` |
| orb-common | Shared types/utilities | `pipenv install orb-common` (from CodeArtifact) |
| ruff | Python linting | Via pre-commit |
| black | Python formatting | Via pre-commit |
| mypy | Type checking | Via pre-commit |

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Pre-commit slows commits | Low | Configure to run only essential hooks |
| orb-common not available | Medium | Ensure CodeArtifact access is configured |
| Existing code fails mypy | Medium | Start with non-strict mode, gradually increase |
| Workflow changes break CI | High | Test workflow changes in feature branch first |
