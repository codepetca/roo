#!/bin/bash

# Deployment Verification Script
# Runs after deployment to verify all endpoints are working correctly
# This catches deployment issues that unit tests miss

set -e

# Default to production URL, but allow override for testing
BASE_URL="${1:-https://us-central1-roo-app-3d24e.cloudfunctions.net/api}"

echo "======================================"
echo "🚀 DEPLOYMENT VERIFICATION"
echo "======================================"
echo "Base URL: $BASE_URL"
echo ""

# Track failures
FAILED_TESTS=0
TOTAL_TESTS=0

# Helper function to test an endpoint
test_endpoint() {
    local method="$1"
    local path="$2"
    local data="$3"
    local expected_status="$4"
    local description="$5"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: $description... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$BASE_URL$path" 2>/dev/null || echo "000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$BASE_URL$path" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null || echo "000")
    fi
    
    # Extract status code (last line)
    status_code=$(echo "$response" | tail -n 1)
    # Extract body (everything except last line) - macOS compatible
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo "✅ OK (Status: $status_code)"
    else
        echo "❌ FAILED (Expected: $expected_status, Got: $status_code)"
        echo "   Response: $body" | head -n 3
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
}

echo "🔍 HEALTH CHECK ENDPOINTS"
echo "========================="
test_endpoint "GET" "/" "" "200" "API Status"
test_endpoint "GET" "/sheets/test" "" "200" "Sheets Connection"
test_endpoint "GET" "/gemini/test" "" "200" "Gemini Connection"

echo ""
echo "🔒 AUTHENTICATION ENDPOINTS"
echo "==========================="

# Test student-request-passcode with non-enrolled email (should return 404)
test_endpoint "POST" "/auth/student-request-passcode" \
    '{"email":"nonexistent@example.com"}' \
    "404" \
    "Student passcode (non-enrolled)"

# Test student-request-passcode with invalid email (should return 400)
test_endpoint "POST" "/auth/student-request-passcode" \
    '{"email":"invalid-email"}' \
    "400" \
    "Student passcode (invalid email)"

# Test student-request-passcode with missing email (should return 400)
test_endpoint "POST" "/auth/student-request-passcode" \
    '{}' \
    "400" \
    "Student passcode (missing email)"

# Test verify-passcode with missing data (should return 400)
test_endpoint "POST" "/auth/verify-passcode" \
    '{"email":"test@example.com"}' \
    "400" \
    "Verify passcode (missing passcode)"

# Test send-passcode without auth (should return 401)
test_endpoint "POST" "/auth/send-passcode" \
    '{"email":"student@example.com"}' \
    "401" \
    "Send passcode (no auth)"

# Test reset-student without auth (should return 401)
test_endpoint "POST" "/auth/reset-student" \
    '{"studentEmail":"student@example.com"}' \
    "401" \
    "Reset student (no auth)"

echo ""
echo "📊 GRADING ENDPOINTS"
echo "===================="

# Test grading endpoints with minimal data
test_endpoint "POST" "/test-grading" \
    '{"text":"function test(){}","maxPoints":10,"criteria":["Logic"]}' \
    "200" \
    "Test grading"

test_endpoint "POST" "/grade-quiz" \
    '{"submissionId":"test","formId":"test","studentAnswers":{"1":"answer"}}' \
    "200" \
    "Grade quiz"

test_endpoint "POST" "/grade-assignment" \
    '{"submissionId":"test","submissionText":"code","assignmentTitle":"Test","maxPoints":10}' \
    "200" \
    "Grade assignment"

echo ""
echo "📁 DATA ENDPOINTS"
echo "================="

test_endpoint "GET" "/assignments" "" "200" "List assignments"
test_endpoint "GET" "/sheets/all-submissions" "" "200" "All submissions"
test_endpoint "GET" "/sheets/ungraded" "" "200" "Ungraded submissions"

echo ""
echo "👤 USER ENDPOINTS"
echo "================="

# Test user endpoints without auth (should return 401)
test_endpoint "GET" "/users/profile" "" "401" "Get profile (no auth)"
test_endpoint "GET" "/users/profile/exists" "" "401" "Check profile (no auth)"
test_endpoint "PATCH" "/users/profile/school-email" \
    '{"schoolEmail":"teacher@school.edu"}' \
    "401" \
    "Update school email (no auth)"

echo ""
echo "======================================"
echo "📊 VERIFICATION SUMMARY"
echo "======================================"

if [ $FAILED_TESTS -eq 0 ]; then
    echo "✅ ALL TESTS PASSED ($TOTAL_TESTS/$TOTAL_TESTS)"
    echo "Deployment verified successfully!"
    exit 0
else
    echo "❌ FAILED TESTS: $FAILED_TESTS/$TOTAL_TESTS"
    echo ""
    echo "⚠️  DEPLOYMENT ISSUES DETECTED!"
    echo "Please check the failed endpoints above."
    echo ""
    echo "Common causes:"
    echo "1. Endpoint not registered in index.ts"
    echo "2. Secret/environment variable issues"
    echo "3. Build/compilation errors"
    echo "4. CORS configuration problems"
    echo "5. Authentication middleware issues"
    exit 1
fi