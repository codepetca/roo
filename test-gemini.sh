#!/bin/bash

# Test script for Gemini AI integration

BASE_URL="https://us-central1-roo-app-3d24e.cloudfunctions.net/api"

echo "Testing Gemini AI Integration..."
echo "================================"

echo -e "\n1. Test Gemini API connection:"
curl -s "$BASE_URL/gemini/test" | jq '.'

echo -e "\n\n2. Test AI grading with sample essay:"
curl -s -X POST "$BASE_URL/test-grading" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Cloud computing has revolutionized how businesses operate. It provides scalable infrastructure, reduces costs, and enables remote work. Companies can focus on their core business instead of managing IT infrastructure. However, security concerns and vendor lock-in remain challenges that organizations must carefully consider.",
    "criteria": ["Thesis clarity", "Evidence quality", "Organization", "Writing quality"],
    "maxPoints": 100
  }' | jq '.'

echo -e "\n\n3. Test with short text (should still work):"
curl -s -X POST "$BASE_URL/test-grading" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Firebase is good for apps.",
    "maxPoints": 50
  }' | jq '.'

echo -e "\n\n4. Test validation with empty text (should fail):"
curl -s -X POST "$BASE_URL/test-grading" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "",
    "maxPoints": 100
  }' | jq '.'

echo -e "\n\nGemini test complete!"