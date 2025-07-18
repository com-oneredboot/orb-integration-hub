#!/bin/bash
# Script to remove old individual build scripts after migration to unified build_layer.sh
# This is a one-time migration script that will remove itself after completion

echo "This script will remove the old individual build scripts."
echo "Make sure you've tested the new unified build_layer.sh before running this!"
echo ""
read -p "Are you sure you want to remove the old build scripts? (y/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Removing old build scripts..."
    
    # Remove individual build scripts
    rm -f organizations_security/build_organizations_security_layer.sh
    rm -f stripe/build_stripe_layer.sh
    rm -f users_security/build_users_security_layer.sh
    
    echo "Old build scripts removed successfully!"
    echo ""
    echo "Remember to use the new unified build script:"
    echo "  ./build_layer.sh <layer_name>"
    echo ""
    echo "Examples:"
    echo "  ./build_layer.sh organizations_security"
    echo "  ./build_layer.sh stripe"
    echo "  ./build_layer.sh users_security"
    echo ""
    
    # Self-destruct - remove this cleanup script
    echo "Removing this cleanup script..."
    rm -f "$0"
    echo "Migration complete! This cleanup script has been removed."
else
    echo "Cleanup cancelled."
    echo "Run this script again when you're ready to complete the migration."
fi