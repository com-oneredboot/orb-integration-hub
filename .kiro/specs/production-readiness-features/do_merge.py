#!/usr/bin/env python3
"""Merge design-additions.md into design.md"""
import os

os.chdir('/home/user/orb-integration-hub/.kiro/specs/production-readiness-features')

# Read design.md
with open('design.md', 'r') as f:
    design_content = f.read()

# Read design-additions.md
with open('design-additions.md', 'r') as f:
    additions_lines = f.readlines()

# Skip the first 259 lines (architecture diagrams already added)
# Start from line 260 where "## Component Designs for Requirements 6-9" begins
component_lines = additions_lines[259:]  # 0-indexed, so line 260 is index 259

# Append to design.md
with open('design.md', 'a') as f:
    f.write('\n\n')
    f.writelines(component_lines)

print("Successfully merged design-additions.md into design.md")
print(f"Added {len(component_lines)} lines from design-additions.md")
