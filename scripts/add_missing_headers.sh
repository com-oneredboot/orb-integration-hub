#!/bin/bash

# Script to add headers to all files missing them
# Usage: ./add_missing_headers.sh [frontend|backend|all]

TARGET=${1:-all}

PROJECT_ROOT="/home/corey/Infrastructure/src/orb-integration-hub"
HEADER_SCRIPT="$PROJECT_ROOT/scripts/add_headers.sh"

# Map of file extensions to descriptions
declare -A DESCRIPTIONS
DESCRIPTIONS["ts"]="TypeScript file"
DESCRIPTIONS["tsx"]="TypeScript React component"
DESCRIPTIONS["scss"]="SCSS style file"
DESCRIPTIONS["html"]="HTML template file"
DESCRIPTIONS["py"]="Python file"

# Function to process a file
process_file() {
    local file=$1
    local extension="${file##*.}"
    local description="${DESCRIPTIONS[$extension]}"
    
    # Skip generated files
    if grep -q "GENERATED CODE" "$file"; then
        echo "Skipping generated file: $file"
        return
    fi
    
    # Add header
    "$HEADER_SCRIPT" "$file" "$(date +"%Y-%m-%d")" "$description"
}

# Process frontend files
process_frontend() {
    echo "Processing frontend files..."
    find "$PROJECT_ROOT/frontend/src" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.scss" -o -name "*.html" \) | while read -r file; do
        process_file "$file"
    done
}

# Process backend files
process_backend() {
    echo "Processing backend files..."
    find "$PROJECT_ROOT/backend/src" -type f -name "*.py" | while read -r file; do
        process_file "$file"
    done
}

# Main logic
case "$TARGET" in
    frontend)
        process_frontend
        ;;
    backend)
        process_backend
        ;;
    all)
        process_frontend
        process_backend
        ;;
    *)
        echo "Invalid target: $TARGET"
        echo "Usage: ./add_missing_headers.sh [frontend|backend|all]"
        exit 1
        ;;
esac

echo "Header addition complete!"