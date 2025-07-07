#!/bin/bash
set -e

echo "Building Organizations Security Layer..."

# Create build directory
mkdir -p build/python

# Install dependencies using pipenv
echo "Installing dependencies with pipenv..."
pipenv install --deploy --ignore-pipfile

# Copy dependencies to build directory
echo "Copying dependencies to build directory..."
VENV_PATH=$(pipenv --venv)
PYTHON_VERSION=$(pipenv run python --version | cut -d' ' -f2 | cut -d'.' -f1,2)
echo "Detected Python version: $PYTHON_VERSION"
cp -r "$VENV_PATH/lib/python$PYTHON_VERSION/site-packages/"* build/python/

# Copy layer source code
echo "Copying layer source code..."
cp *.py build/python/

# Create layer zip
echo "Creating layer zip file..."
cd build
zip -r ../organizations-security-layer.zip python/
cd ..

echo "Organizations Security Layer build complete!"
echo "Layer file: organizations-security-layer.zip"