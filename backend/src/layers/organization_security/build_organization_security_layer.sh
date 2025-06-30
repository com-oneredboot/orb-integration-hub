#!/bin/bash
set -e

echo "Building Organization Security Layer..."

# Create build directory
mkdir -p build/python

# Install dependencies using pipenv
echo "Installing dependencies with pipenv..."
pipenv install --deploy --ignore-pipfile

# Copy dependencies to build directory
echo "Copying dependencies to build directory..."
VENV_PATH=$(pipenv --venv)
cp -r "$VENV_PATH/lib/python3.9/site-packages/"* build/python/

# Copy layer source code
echo "Copying layer source code..."
cp *.py build/python/

# Create layer zip
echo "Creating layer zip file..."
cd build
zip -r ../organization-security-layer.zip python/
cd ..

echo "Organization Security Layer build complete!"
echo "Layer file: organization-security-layer.zip"