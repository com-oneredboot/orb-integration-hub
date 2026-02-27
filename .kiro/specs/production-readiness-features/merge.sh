#!/bin/bash
# Merge design-additions.md into design.md

cd "$(dirname "$0")"

# Extract component designs section from design-additions.md (skip architecture diagrams)
# Start from line 260 where "## Component Designs for Requirements 6-9" begins
tail -n +260 design-additions.md >> design.md

echo "Successfully merged design-additions.md into design.md"
