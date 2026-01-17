# Bug: Generated Python files fail black and ruff linting

## Summary

Generated Python files (enums and models) do not pass `black` formatting checks or `ruff` linting, causing CI failures in downstream projects.

## Environment

- orb-schema-generator version: 0.16.1
- Python version: 3.12
- black version: latest
- ruff version: latest

## Current Behavior

When running `black --check` or `ruff check` on generated Python files:

1. **Black formatting issues**: All generated enum and model files would be reformatted (82 files)
2. **Ruff linting issues**: Unused imports in model files

```bash
$ pipenv run black --check --line-length=100 apps/api/
would reformat apps/api/enums/__init__.py
would reformat apps/api/enums/application_role_status_enum.py
... (82 files total)

$ pipenv run ruff check apps/api/
F401 [*] `pydantic.field_validator` imported but unused
 --> apps/api/models/AuthErrorModel.py:7:52
F401 [*] `pydantic.field_validator` imported but unused
 --> apps/api/models/MfaSetupDetailsModel.py:7:52
F401 [*] `pydantic.field_validator` imported but unused
 --> apps/api/models/OwnershipTransferRequestsModel.py:7:52
```

## Expected Behavior

Generated Python files should:
1. Be formatted according to `black` with `--line-length=100`
2. Not have unused imports (only import what's actually used)

## Impact

- CI pipelines fail on linting checks
- Developers cannot commit without bypassing pre-commit hooks
- Generated files should be "ready to use" without manual formatting

## Suggested Fix

1. Run `black --line-length=100` on generated Python files as part of the generation process
2. Only import `field_validator` in models that actually use it (conditional import based on schema)

## Affected Files

- `apps/api/enums/*.py` - All enum files need black formatting
- `apps/api/models/*.py` - All model files need black formatting + some have unused imports

## Workaround

Currently none - excluding generated files from linting is not acceptable as it hides real issues.
