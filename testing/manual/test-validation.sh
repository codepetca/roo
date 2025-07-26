#!/bin/bash

# Test script for Zod validation

BASE_URL="https://us-central1-roo-app-3d24e.cloudfunctions.net/api"

echo "Testing Zod Validation..."
echo "========================="

echo -e "\n1. Test invalid JSON (should fail):"
curl -s -X POST "$BASE_URL/test-write" \
  -H "Content-Type: application/json" \
  -d '{"test": "Hello Firestore!"}' | jq '.'

echo -e "\n\n2. Test valid data:"
curl -s -X POST "$BASE_URL/test-write" \
  -H "Content-Type: application/json" \
  -d '{"test": "Hello with Zod!", "step": 3}' | jq '.'

echo -e "\n\n3. Test assignment with missing fields (should fail):"
curl -s -X POST "$BASE_URL/assignments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Missing description"}' | jq '.'

echo -e "\n\n4. Test assignment with invalid maxPoints (should fail):"
curl -s -X POST "$BASE_URL/assignments" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Assignment",
    "description": "Testing validation",
    "maxPoints": -50
  }' | jq '.'

echo -e "\n\n5. Test valid assignment:"
curl -s -X POST "$BASE_URL/assignments" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Valid Assignment with Zod",
    "description": "This assignment passes all validation checks",
    "maxPoints": 100
  }' | jq '.'

echo -e "\n\nValidation test complete!"