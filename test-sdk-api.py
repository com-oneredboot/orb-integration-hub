#!/usr/bin/env python3
"""
Quick test script to verify SDK API endpoint and Lambda authorizer.
"""

import json
import requests

# SDK API configuration
SDK_API_URL = "https://gywdksf7yzaopjdr3e5wv22sw4.appsync-api.us-east-1.amazonaws.com/graphql"
API_KEY = "orb_dev_frontend_7a6016017035101444f7be27901064e3a3ffe56673ca7f57632067ddcb71e6d8"

# GraphQL query
query = """
query CheckEmailExists($input: CheckEmailExistsInput!) {
  CheckEmailExists(input: $input) {
    email
    exists
    cognitoStatus
    cognitoSub
  }
}
"""

variables = {
    "input": {
        "email": "test@example.com"
    }
}

# Make the request
headers = {
    "Authorization": API_KEY,
    "Content-Type": "application/json"
}

payload = {
    "query": query,
    "variables": variables
}

print("Testing SDK API endpoint...")
print(f"URL: {SDK_API_URL}")
print(f"API Key: {API_KEY[:20]}...")
print()

try:
    response = requests.post(SDK_API_URL, json=payload, headers=headers, timeout=10)
    
    print(f"Status Code: {response.status_code}")
    print(f"Response Headers: {dict(response.headers)}")
    print()
    print("Response Body:")
    print(json.dumps(response.json(), indent=2))
    
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")
except Exception as e:
    print(f"Error: {e}")
