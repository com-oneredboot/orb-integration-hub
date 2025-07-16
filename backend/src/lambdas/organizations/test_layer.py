#!/usr/bin/env python3
# Quick test to debug layer import issues

import sys
import os

print("Python version:", sys.version)
print("Python path:", sys.path)
print("\nChecking /opt directory:")
if os.path.exists('/opt'):
    for item in os.listdir('/opt'):
        print(f"  - {item}")
        if item == 'python' and os.path.isdir(f'/opt/{item}'):
            print(f"    Contents of /opt/{item}:")
            for file in os.listdir(f'/opt/{item}'):
                print(f"      - {file}")
else:
    print("  /opt directory does not exist")

print("\nAttempting to import security_manager...")
try:
    sys.path.append('/opt/python')
    import security_manager
    print("SUCCESS: security_manager imported")
except ImportError as e:
    print(f"FAILED: {e}")