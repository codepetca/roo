#!/bin/bash

# Test script for Roo Firebase Functions

BASE_URL="https://us-central1-roo-app-3d24e.cloudfunctions.net"

echo "Testing Roo Functions..."
echo "========================"

echo "1. Testing testRoo function:"
curl -s "$BASE_URL/testRoo" | jq '.'

echo -e "\n2. Testing testRoo with POST data:"
curl -s -X POST "$BASE_URL/testRoo" \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello from test script"}' | jq '.'

echo -e "\n3. Testing helloWorld function:"
curl -s "$BASE_URL/helloWorld" || echo "Function may have permissions issue"

echo -e "\nTest complete!"