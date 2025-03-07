#!/bin/bash

# Script to add standardized headers to files
# Usage: ./add_headers.sh <file_path> [date] [description]

FILE_PATH=$1
DATE=${2:-$(date +"%Y-%m-%d")}
DESCRIPTION=${3:-""}

if [ -z "$FILE_PATH" ]; then
  echo "Error: File path is required"
  echo "Usage: ./add_headers.sh <file_path> [date] [description]"
  exit 1
fi

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
  echo "Error: File does not exist: $FILE_PATH"
  exit 1
fi

# Determine file type
FILE_EXT="${FILE_PATH##*.}"
TEMPLATE=""

case "$FILE_EXT" in
  ts|tsx|scss|html)
    TEMPLATE="/home/corey/Infrastructure/src/orb-integration-hub/templates/ts_header.txt"
    ;;
  py)
    TEMPLATE="/home/corey/Infrastructure/src/orb-integration-hub/templates/py_header.txt"
    ;;
  *)
    echo "Unsupported file type: $FILE_EXT"
    exit 1
    ;;
esac

# Check if file already has a header
if grep -q "file:" "$FILE_PATH"; then
  echo "File already has a header: $FILE_PATH"
  exit 0
fi

# Get relative path from project root
RELATIVE_PATH=$(echo "$FILE_PATH" | sed 's|/home/corey/Infrastructure/src/orb-integration-hub/||')

# Apply the template
HEADER=$(cat "$TEMPLATE" | sed "s|\$FILE_PATH|$RELATIVE_PATH|g" | sed "s|\$DATE|$DATE|g" | sed "s|\$DESCRIPTION|$DESCRIPTION|g")

# Prepend header to file
TEMP_FILE=$(mktemp)
echo "$HEADER" > "$TEMP_FILE"
echo "" >> "$TEMP_FILE"
cat "$FILE_PATH" >> "$TEMP_FILE"
mv "$TEMP_FILE" "$FILE_PATH"

echo "Header added to $FILE_PATH"