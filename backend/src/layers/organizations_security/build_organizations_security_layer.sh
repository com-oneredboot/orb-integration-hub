#!/bin/bash
set -e

# Define the packages path variable
layer_path="./python/lib/python3.12/site-packages"

# Step 1: Create the directory structure
echo "Creating directory structure"
mkdir -p $layer_path

# Step 2: Install dependencies in a virtual environment and generate requirements.txt
echo "Installing dependencies and generating requirements.txt"
pipenv install
pipenv run pip freeze > requirements.txt

# Step 3: Fetch the required libraries using the generated requirements.txt
echo "Fetching libraries"
pipenv run pip install -r requirements.txt --target $layer_path

# Step 4: Copy layer source code to the site-packages directory
echo "Copying layer source code..."
cp *.py $layer_path/

# Step 5: List the contents of the site-packages directory
echo "Contents of the site-packages directory:"
ls -ltrh $layer_path

echo "Organizations Security Layer build complete!"