# Lambda Layer to Python Package Migration

## Overview

This document describes the migration from Lambda layers to Python packages that was completed in the ORB Integration Hub project. This architectural change eliminates layer-to-layer dependencies and improves code organization.

## Background

### Previous Architecture (Lambda Layers)
- **Common Layer**: Contained shared utilities, exceptions, and security modules
- **Lambda Functions**: Imported directly from layers using `from exceptions import ...`
- **Problem**: Lambda layers cannot depend on other layers, limiting code reuse

### New Architecture (Python Packages)
- **orb-common**: Python package for shared utilities and exceptions
- **orb-models**: Python package for auto-generated data models
- **Lambda Functions**: Install packages via Pipfile and import as `from orb_common.exceptions import ...`

## Migration Benefits

1. **Proper Dependency Management**: Packages can depend on other packages
2. **Better Code Organization**: Clear separation of concerns
3. **Type Safety**: Full type hints and IDE support
4. **Easier Testing**: Packages can be tested independently
5. **Version Control**: Packages can be versioned (though we use editable installs)

## Package Structure

### orb-common Package
```
backend/packages/orb-common/
├── pyproject.toml           # Package configuration
├── setup.py                 # Setup script
├── orb_common/
│   ├── __init__.py
│   ├── exceptions.py        # Custom exceptions
│   ├── security_exceptions.py
│   ├── utils.py
│   └── security/
│       ├── __init__.py
│       └── audit.py
└── tests/
    └── test_exceptions.py
```

### orb-models Package
```
backend/packages/orb-models/
├── pyproject.toml           # Package configuration
├── setup.py                 # Setup script
├── orb_models/
│   ├── __init__.py
│   ├── models/              # Generated models
│   │   ├── __init__.py
│   │   ├── applications.py
│   │   ├── users.py
│   │   └── ...
│   └── enums/               # Generated enums
│       ├── __init__.py
│       └── ...
└── tests/
    └── test_models.py
```

## Lambda Function Updates

### Before Migration
```python
# Lambda function importing from layer
from exceptions import CustomException
from security_exceptions import AuthenticationError
```

### After Migration
```python
# Lambda function importing from package
from orb_common.exceptions import CustomException
from orb_common.security_exceptions import AuthenticationError
from orb_models.models.users import Users
```

### Pipfile Updates
Each Lambda function's Pipfile now includes:
```toml
[packages]
orb-common = {path = "../../../packages/orb-common", editable = true}
orb-models = {path = "../../../packages/orb-models", editable = true}
```

## Installation Process

### Local Development
```bash
# Install packages in editable mode
cd backend/packages/orb-common
pip install -e .
cd ../orb-models
pip install -e .

# Install Lambda dependencies
cd ../../src/lambdas/users
pipenv install
```

### CI/CD Pipeline
The build process:
1. Packages orb-common and orb-models
2. Installs them in each Lambda's virtual environment
3. Bundles everything for deployment

## Code Generation Updates

The `schemas/generate.py` script was updated to output generated models to the orb-models package:

```python
# Old path
output_path = os.path.join('backend', 'src', 'core', 'models', file_name)

# New path
output_path = os.path.join('backend', 'packages', 'orb-models', 'orb_models', 'models', file_name)
```

## Migration Steps Performed

1. **Created Package Structure**: Set up orb-common and orb-models packages
2. **Moved Code**: Transferred files from layers to packages
3. **Updated Imports**: Changed all Lambda function imports
4. **Updated Pipfiles**: Added package dependencies
5. **Updated Build Process**: Modified CI/CD to handle packages
6. **Removed Common Layer**: Deleted the now-unused common layer
7. **Updated Code Generation**: Modified generate.py output paths

## Best Practices

1. **Always Use Editable Installs**: For local packages, use `{path = "...", editable = true}`
2. **Keep Packages Internal**: These are not published to PyPI
3. **Version Together**: Since packages are in the monorepo, they version together
4. **Test Packages**: Each package has its own test suite
5. **Clear Dependencies**: orb-common has no dependencies on orb-models

## Troubleshooting

### Import Errors
If you see `ModuleNotFoundError: No module named 'orb_common'`:
1. Ensure the package is installed: `pip install -e /path/to/orb-common`
2. Check the Pipfile includes the package
3. Run `pipenv install` in the Lambda directory

### Build Failures
If the Lambda build fails:
1. Check that packages are properly structured with `__init__.py` files
2. Verify pyproject.toml and setup.py are correct
3. Ensure the build process copies packages before installing

## Future Considerations

1. **Package Versioning**: Consider semantic versioning if packages become more complex
2. **Package Registry**: Could use AWS CodeArtifact for private package hosting
3. **Additional Packages**: Consider splitting more functionality into packages
4. **Type Stubs**: Generate .pyi files for better type support