#!/bin/bash
# run-generator.sh
# Script to run the schema generator within the pipenv environment

# Get the directory of this script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Navigate to the project root
cd "$SCRIPT_DIR"

# Function to pause at the end
pause_at_end() {
  echo ""
  echo "Press any key to continue..."
  read -n 1 -s
}

# Trap to ensure we pause before exit
trap pause_at_end EXIT

# Ensure pipenv is installed
if ! command -v pipenv &> /dev/null; then
    echo "Error: pipenv is not installed. Please install it first."
    echo "You can install it using: pip install pipenv"
    exit 1
fi

# Check if the required packages are in Pipfile
echo "Checking dependencies..."
if ! grep -q "pyyaml" Pipfile 2>/dev/null || ! grep -q "jinja2" Pipfile 2>/dev/null; then
    echo "Installing required dependencies (pyyaml, jinja2)..."
    pipenv install pyyaml jinja2
    echo "Dependencies installed."
fi

# Run the generator script
echo "Running schema generator..."
pipenv run python generate.py
RESULT=$?

# Check the exit status
if [ $RESULT -eq 0 ]; then
    echo "Schema generation completed successfully!"
else
    echo "Schema generation failed. Check the logs for details."
    echo "Exit code: $RESULT"
fi

echo "Done!"
# The script will pause here due to the trap
