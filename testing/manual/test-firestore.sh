#!/bin/bash

# Test script for Firestore functions

BASE_URL="https://us-central1-roo-app-3d24e.cloudfunctions.net/api"

echo "Testing Firestore Functions..."
echo "=============================="

echo -e "\n1. API Status:"
curl -s "$BASE_URL" | jq '.'

echo -e "\n\n2. Test Firestore Write:"
curl -s -X POST "$BASE_URL/test-write" \
  -H "Content-Type: application/json" \
  -d '{"test": "Hello Firestore!", "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' | jq '.'

echo -e "\n\n3. Test Firestore Read:"
curl -s "$BASE_URL/test-read" | jq '.'

echo -e "\n\n4. Create Test Assignment:"
curl -s -X POST "$BASE_URL/assignments" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Essay on Firebase",
    "description": "Write a 500-word essay about Firebase and its features",
    "maxPoints": 100
  }' | jq '.'

echo -e "\n\n5. List Assignments:"
curl -s "$BASE_URL/assignments" | jq '.'

echo -e "\n\nTest complete!"