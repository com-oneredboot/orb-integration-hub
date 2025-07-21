#!/bin/bash
set -e

# Check if layer name is provided
if [ $# -eq 0 ]; then
    echo "Error: No layer name provided"
    echo "Usage: $0 <layer_name>"
    echo "Example: $0 organizations_security"
    exit 1
fi

LAYER_NAME=$1
LAYER_DIR="./${LAYER_NAME}"

# Validate layer directory exists
if [ ! -d "$LAYER_DIR" ]; then
    echo "Error: Layer directory '${LAYER_DIR}' does not exist"
    exit 1
fi

# Define the packages path variable (relative to where we'll be after cd)
LAYER_PATH="./python/lib/python3.12/site-packages"

echo "=========================================="
echo "Building Lambda Layer: ${LAYER_NAME}"
echo "=========================================="

# Step 1: Create the directory structure
echo "Creating directory structure..."
mkdir -p "$LAYER_PATH"

# Step 2: Change to layer directory
cd "$LAYER_DIR"

# Step 3: Check if Pipfile exists (some layers might not have dependencies)
if [ -f "Pipfile" ]; then
    echo "Installing dependencies and generating requirements.txt..."
    pipenv install
    pipenv run pip freeze > requirements.txt
    
    # Step 4: Fetch the required libraries using the generated requirements.txt
    echo "Fetching libraries..."
    pipenv run pip install -r requirements.txt --target "python/lib/python3.12/site-packages"
else
    echo "No Pipfile found, skipping dependency installation"
fi

# Step 5: Move layer source code to the site-packages directory
echo "Moving layer source code..."

# First, clean any existing python directory to ensure fresh build
rm -rf python/

# Recreate the directory structure
mkdir -p "$LAYER_PATH"

# Move .py files to site-packages
if ls *.py 1> /dev/null 2>&1; then
    mv *.py "$LAYER_PATH/"
    echo "Python files moved successfully"
else
    echo "No Python files to move"
fi

# Move subdirectories if any exist (excluding python/)
# Note: We're already inside the layer directory, so only move actual subdirectories
echo "Current directory: $(pwd)"
echo "Looking for subdirectories to move..."
for dir in */; do
    if [ -d "$dir" ] && [ "$dir" != "python/" ]; then
        echo "Found directory: $dir"
        echo "Moving directory: $dir"
        mv "$dir" "$LAYER_PATH/"
    fi
done

# Step 6: List the contents of the site-packages directory
echo "Contents of the site-packages directory:"
ls -ltrh "python/lib/python3.12/site-packages" | head -20

echo "=========================================="
echo "${LAYER_NAME} layer build complete!"
echo "Layer structure ready at: ${LAYER_DIR}/python"
echo "=========================================="