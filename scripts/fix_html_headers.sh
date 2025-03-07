#!/bin/bash

# Script to fix headers in HTML files
# Usage: ./fix_html_headers.sh

PROJECT_ROOT="/home/corey/Infrastructure/src/orb-integration-hub"
HTML_TEMPLATE="$PROJECT_ROOT/templates/html_header.txt"

echo "Finding HTML files with incorrect headers..."

# Find HTML files with incorrect headers (containing // style comments)
find "$PROJECT_ROOT/frontend/src" -type f -name "*.html" | while read -r file; do
    if grep -q "// file:" "$file"; then
        echo "Fixing header in $file"
        
        # Get the current header content
        old_file_path=$(grep -m 1 "// file:" "$file" | sed 's/\/\/ file: //')
        old_date=$(grep -m 1 "// date:" "$file" | sed 's/\/\/ date: //')
        old_description=$(grep -m 1 "// description:" "$file" | sed 's/\/\/ description: //')
        
        # Get relative path from project root
        RELATIVE_PATH=$(echo "$file" | sed "s|$PROJECT_ROOT/||")
        
        # Create new header
        NEW_HEADER=$(cat "$HTML_TEMPLATE" | sed "s|\$FILE_PATH|$RELATIVE_PATH|g" | sed "s|\$DATE|$old_date|g" | sed "s|\$DESCRIPTION|$old_description|g")
        
        # Create temp file with new content
        TEMP_FILE=$(mktemp)
        echo "$NEW_HEADER" > "$TEMP_FILE"
        
        # Skip the old header (4 lines) and append the rest of the file
        tail -n +5 "$file" >> "$TEMP_FILE"
        
        # Replace original file
        mv "$TEMP_FILE" "$file"
    fi
done

echo "All HTML headers fixed!"