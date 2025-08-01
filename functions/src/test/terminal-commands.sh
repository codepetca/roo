#!/bin/bash
# Webhook Testing Commands for Terminal
# Copy and run these commands to test the webhook endpoints

echo "================================================"
echo "ROO WEBHOOK TESTING COMMANDS"
echo "================================================"

# Configuration
API_KEY="roo-webhook-dev-stable123456"
BASE_URL="https://us-central1-roo-app-3d24e.cloudfunctions.net/api"
SPREADSHEET_ID="1Fgjm8Dz_LsjU36Wh8Va0nwo1y4aDWgm6hliW-01Q7_g"
TEACHER_ID="stewart.chan@gapps.yrdsb.ca"

echo ""
echo "1. TEST WEBHOOK STATUS ENDPOINT"
echo "--------------------------------"
echo "Copy and run this command:"
echo ""

cat << 'EOF'
curl -X GET "https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/status" \
  -H "X-API-Key: roo-webhook-dev-stable123456" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"
EOF

echo ""
echo "Expected Result: HTTP 200 with webhook info"
echo "Example output:"
echo '{'
echo '  "success": true,'
echo '  "data": {'
echo '    "webhookVersion": "1.0.0",'
echo '    "availableEndpoints": [...]'
echo '  }'
echo '}'

echo ""
echo ""
echo "2. TEST CLASSROOM SYNC WEBHOOK"
echo "-------------------------------"
echo "Copy and run this command:"
echo ""

cat << 'EOF'
curl -X POST "https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/classroom-sync" \
  -H "X-API-Key: roo-webhook-dev-stable123456" \
  -H "Content-Type: application/json" \
  -d '{
    "spreadsheetId": "1Fgjm8Dz_LsjU36Wh8Va0nwo1y4aDWgm6hliW-01Q7_g",
    "teacherId": "stewart.chan@gapps.yrdsb.ca"
  }' \
  -w "\nHTTP Status: %{http_code}\n"
EOF

echo ""
echo "Expected Result: HTTP 207 (Multi-Status) with sync results"
echo "Note: Permission errors are NORMAL in test environment"
echo ""

echo ""
echo "3. CHECK API HEALTH"
echo "--------------------"
echo "Copy and run this command:"
echo ""

cat << 'EOF'
curl -X GET "https://us-central1-roo-app-3d24e.cloudfunctions.net/api/"
EOF

echo ""
echo "Expected Result: Should show webhook endpoints in the list"
echo ""

echo ""
echo "4. PRETTY-PRINT JSON OUTPUT (OPTIONAL)"
echo "--------------------------------------"
echo "If you have jq installed and want formatted JSON:"
echo ""

echo "Status with formatting:"
cat << 'EOF'
curl -s -X GET "https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/status" \
  -H "X-API-Key: roo-webhook-dev-stable123456" | jq '.'
EOF

echo ""
echo ""
echo "Sync with formatting:"
cat << 'EOF'
curl -s -X POST "https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/classroom-sync" \
  -H "X-API-Key: roo-webhook-dev-stable123456" \
  -H "Content-Type: application/json" \
  -d '{"spreadsheetId": "1Fgjm8Dz_LsjU36Wh8Va0nwo1y4aDWgm6hliW-01Q7_g", "teacherId": "stewart.chan@gapps.yrdsb.ca"}' | jq '.'
EOF

echo ""
echo ""
echo "================================================"
echo "TROUBLESHOOTING"
echo "================================================"
echo ""
echo "HTTP 401 - Invalid API Key:"
echo "  - Make sure you're using: roo-webhook-dev-stable123456"
echo ""
echo "HTTP 404 - Endpoint not found:"
echo "  - Webhook may not be deployed yet"
echo "  - Run: npm run deploy"
echo ""
echo "HTTP 207 - Multi-Status (for sync endpoint):"
echo "  - This is NORMAL - means partial success"
echo "  - Check the response for details"
echo ""
echo "Permission errors in sync response:"
echo "  - EXPECTED in test environment"
echo "  - Production will work with proper Google Sheets access"
echo ""