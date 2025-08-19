#!/bin/bash

BASE_URL="https://api-pmxfayuvra-uc.a.run.app"

echo "=== ROO API ENDPOINT TESTS ==="
echo "Testing all endpoints systematically..."
echo "Base URL: $BASE_URL"
echo ""

# GET endpoints
echo "🔍 GET ENDPOINTS:"
echo "=================="

echo "1. API Status:"
response=$(curl -s "$BASE_URL/" | jq -r '.message // "ERROR"')
echo "   Result: $response"

echo ""
echo "2. Sheets Test:"
response=$(curl -s "$BASE_URL/sheets/test" | jq -r '.success // "ERROR"')
echo "   Result: $response"

echo ""
echo "3. Gemini Test:"
response=$(curl -s "$BASE_URL/gemini/test" | jq -r '.success // "ERROR"')
echo "   Result: $response"

echo ""
echo "4. All Submissions:"
response=$(curl -s "$BASE_URL/sheets/all-submissions" | jq -r '.count // "ERROR"')
echo "   Result: $response submissions found"

echo ""
echo "5. Ungraded Submissions:"
response=$(curl -s "$BASE_URL/sheets/ungraded" | jq -r '.count // "ERROR"')
echo "   Result: $response ungraded submissions"

echo ""
echo "6. Assignments (Firestore):"
response=$(curl -s "$BASE_URL/assignments" | jq -r '.count // "ERROR"')
echo "   Result: $response assignments"

echo ""
echo "7. Sheets Assignments:"
response=$(curl -s "$BASE_URL/sheets/assignments" | jq -r '.count // "ERROR"')
echo "   Result: $response assignments from sheets"

echo ""
echo "8. Test Read (Firestore):"
response=$(curl -s "$BASE_URL/test-read" | jq -r '.count // "ERROR"')
echo "   Result: $response test documents"

# POST endpoints with test data
echo ""
echo "📝 POST ENDPOINTS:"
echo "=================="

echo "9. Test Grading (Karel code with syntax error):"
response=$(curl -s -X POST "$BASE_URL/test-grading" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "function spin() {\n    turnLeft()\n    turnLeft()\n    turnLeft()\n    turnLeft()\n}", 
    "maxPoints": 10, 
    "criteria": ["Logic", "Understanding"]
  }' | jq -r '.grading.score // "ERROR"')
echo "   Result: $response/10 points (should be generous despite missing semicolons)"

echo ""
echo "10. Answer Key (Karel Quiz):"
response=$(curl -s -X POST "$BASE_URL/sheets/answer-key" \
  -H "Content-Type: application/json" \
  -d '{"formId": "1yCb14sIiQ5ieiaWs8hPOlDh4-vOgGdp3Zf8pEyFjLdY"}' \
  | jq -r '.answerKey.totalPoints // .error // "ERROR"')
echo "   Result: $response total points available"

echo ""
echo "11. Test Write (Firestore):"
response=$(curl -s -X POST "$BASE_URL/test-write" \
  -H "Content-Type: application/json" \
  -d '{"testMessage": "API test from script"}' \
  | jq -r '.success // "ERROR"')
echo "   Result: $response"

echo ""
echo "12. Create Assignment:"
response=$(curl -s -X POST "$BASE_URL/assignments" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Assignment", "description": "API test", "maxPoints": 100}' \
  | jq -r '.success // "ERROR"')
echo "   Result: $response"

echo ""
echo "13. Sheets Submissions (test assignment):"
response=$(curl -s -X POST "$BASE_URL/sheets/submissions" \
  -H "Content-Type: application/json" \
  -d '{"assignmentId": "Unit 1 Test: Karel the Dog"}' \
  | jq -r '.count // .error // "ERROR"')
echo "   Result: $response submissions for Karel test"

# Test the potentially broken endpoints
echo ""
echo "🚨 PREVIOUSLY BROKEN ENDPOINTS:"
echo "==============================="

echo "14. Grade Quiz (should work now):"
response=$(curl -s -X POST "$BASE_URL/grade-quiz" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": "test_submission_1",
    "formId": "1yCb14sIiQ5ieiaWs8hPOlDh4-vOgGdp3Zf8pEyFjLdY",
    "studentAnswers": {
      "1": "turnLeft();\nturnLeft();\nturnLeft();\nturnLeft();",
      "6": "turnRight()",
      "7": "1"
    }
  }' | jq -r '.success // .error // "ENDPOINT_NOT_FOUND"')
echo "   Result: $response"

echo ""
echo "15. Grade Assignment (universal assignment grading):"
response=$(curl -s -X POST "$BASE_URL/grade-assignment" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": "test_code_1",
    "submissionText": "function moveToWall() {\n    while (frontIsClear()) {\n        move()\n    }\n}",
    "assignmentTitle": "Karel Move Function",
    "maxPoints": 10,
    "isCodeAssignment": true
  }' | jq -r '.success // .error // "ENDPOINT_NOT_FOUND"')
echo "   Result: $response"

echo ""
echo "✅ TEST COMPLETE!"
echo "=================="
echo ""
echo "Summary:"
echo "- If you see 'ENDPOINT_NOT_FOUND' for grade-quiz or grade-assignment, there's still a routing issue"
echo "- If you see 'ERROR' responses, check the Firebase logs for details"
echo "- Working endpoints should return success: true or specific data"
echo ""
echo "Next steps:"
echo "1. Fix any routing issues for grade-quiz and grade-assignment"
echo "2. Test end-to-end grading with real Karel quiz data"
echo "3. Proceed with automation pipeline"