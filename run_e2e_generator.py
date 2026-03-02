#!/usr/bin/env python3
"""
Temporary runner script for E2E generator testing.
This adds the tools directory to sys.path and runs the generator.
"""
import sys
from pathlib import Path

# Add tools directory to Python path
tools_dir = Path(__file__).parent / "tools"
sys.path.insert(0, str(tools_dir))

# Now import and run the generator
from e2e_generator.__main__ import main

if __name__ == "__main__":
    sys.exit(main())
