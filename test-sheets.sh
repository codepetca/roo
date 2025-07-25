#!/bin/bash

# Test script for Google Sheets integration

BASE_URL="https://api-pmxfayuvra-uc.a.run.app"

echo "Testing Google Sheets Integration..."
echo "==================================="

echo -e "\n1. Test Google Sheets API connection:"
curl -s "$BASE_URL/sheets/test" | jq '.'

echo -e "\n\n2. Get assignments from Google Sheets:"
curl -s "$BASE_URL/sheets/assignments" | jq '.'

echo -e "\n\n3. Test getting submissions (will fail without valid assignment ID):"
curl -s -X POST "$BASE_URL/sheets/submissions" \
  -H "Content-Type: application/json" \
  -d '{"assignmentId": "test_assignment_1"}' | jq '.'

echo -e "\n\n4. Test validation with empty assignment ID (should fail):"
curl -s -X POST "$BASE_URL/sheets/submissions" \
  -H "Content-Type: application/json" \
  -d '{"assignmentId": ""}' | jq '.'

echo -e "\n\nSheets test complete!"
echo -e "\nNote: Full testing requires:"
echo -e "1. Google Sheets API enabled in Google Cloud Console"
echo -e "2. Personal Google Sheets created and shared with board account"
echo -e "3. SHEETS_SPREADSHEET_ID parameter set in Firebase"
echo -e "4. Apps Script deployed and running"