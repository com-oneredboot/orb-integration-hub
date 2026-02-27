#!/usr/bin/env python3
"""Merge design-additions.md into design.md"""

# Read the current design.md
with open('design.md', 'r') as f:
    design_content = f.read()

# Read the design-additions.md
with open('design-additions.md', 'r') as f:
    additions_content = f.read()

# Extract the component designs section (skip the architecture diagrams since we already added those)
# Find where "## Component Designs for Requirements 6-9" starts
component_start = additions_content.find('## Component Designs for Requirements 6-9')

# Extract everything from that point onwards
additions_to_merge = additions_content[component_start:]

# Append to design.md
merged_content = design_content + '\n\n' + additions_to_merge

# Write the merged content
with open('design.md', 'w') as f:
    f.write(merged_content)

print("Successfully merged design-additions.md into design.md")
