#!/bin/bash

# Check if required arguments are provided
if [ "$#" -lt 6 ]; then
    echo "Usage: $0 <aws-profile> <user-pool-id> <username> <new-password> <email> <phone-number>"
    echo "Phone number should be in the format: +[country code][area code][phone number]"
    echo "Example: +14155552671"
    echo "Press any key to exit..."
    read -n 1 -s
    exit 1
fi

# Set variables from command line arguments
AWS_PROFILE="$1"
USER_POOL_ID="$2"
USERNAME="$3"
NEW_PASSWORD="$4"
EMAIL="$5"
PHONE_NUMBER="$6"

# Function to check command status
check_status() {
    if [ $? -eq 0 ]; then
        echo "Success: $1"
    else
        echo "Error: $1 failed"
        echo "Press any key to exit..."
        read -n 1 -s
        exit 1
    fi
}

# Function to validate phone number format
validate_phone_number() {
    if [[ $1 =~ ^\+[1-9][0-9]{10,14}$ ]]; then
        return 0
    else
        echo "Invalid phone number format. It should be in E.164 format: +[country code][area code][phone number]"
        echo "Example: +14155552671"
        return 1
    fi
}

# 1. Update and verify user's email
echo "Updating and verifying email..."
aws cognito-idp admin-update-user-attributes \
    --profile "$AWS_PROFILE" \
    --user-pool-id "$USER_POOL_ID" \
    --username "$USERNAME" \
    --user-attributes Name="email",Value="$EMAIL" Name="email_verified",Value="true"
check_status "Email update and verification"

# 2. Update and verify user's phone number if provided
if [ -n "$PHONE_NUMBER" ]; then
    if validate_phone_number "$PHONE_NUMBER"; then
        echo "Updating and verifying phone number..."
        aws cognito-idp admin-update-user-attributes \
            --profile "$AWS_PROFILE" \
            --user-pool-id "$USER_POOL_ID" \
            --username "$USERNAME" \
            --user-attributes Name="phone_number",Value="$PHONE_NUMBER" Name="phone_number_verified",Value="true"
        check_status "Phone number update and verification"
    else
        echo "Skipping phone number update due to invalid format."
    fi
else
    echo "No phone number provided. Skipping phone number update and verification."
fi

# 3. Set user's password (admin override)
echo "Setting new password..."
aws cognito-idp admin-set-user-password \
    --profile "$AWS_PROFILE" \
    --user-pool-id "$USER_POOL_ID" \
    --username "$USERNAME" \
    --password "$NEW_PASSWORD" \
    --permanent
check_status "Password set"

echo "All operations completed successfully."
echo "Press any key to exit..."
read -n 1 -s