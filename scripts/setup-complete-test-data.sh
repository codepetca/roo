#!/bin/bash

# Complete Test Data Setup for Roo Firebase Emulators
# This script sets up a complete test environment with users and data

set -e

echo "🎯 Setting up complete Firebase test environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function for colored output
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] ⚠️  $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "firebase.json" ]; then
    error "firebase.json not found. Please run from the roo project root."
    exit 1
fi

# Step 1: Stop any existing emulators
log "Stopping any existing Firebase emulators..."
pkill -f "firebase emulators" || true
sleep 2

# Step 2: Clear existing emulator data (optional - ask user)
echo
read -p "🔄 Clear existing emulator data? This will delete all current test data. (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    log "Clearing existing emulator data..."
    rm -rf frontend/e2e/fixtures/firebase-export
    rm -rf .firebase/emulators
    success "Existing data cleared"
else
    warning "Keeping existing emulator data"
fi

# Step 3: Start emulators in background
log "Starting Firebase emulators..."
cd frontend
npm run emulators &
EMULATOR_PID=$!

# Step 4: Wait for emulators to be ready
log "Waiting for emulators to start (max 30 seconds)..."
COUNTER=0
while [ $COUNTER -lt 30 ]; do
    if curl -f http://127.0.0.1:9099 > /dev/null 2>&1 && \
       curl -f http://127.0.0.1:8080 > /dev/null 2>&1 && \
       curl -f http://127.0.0.1:5001 > /dev/null 2>&1; then
        success "Emulators are ready!"
        break
    fi
    sleep 1
    COUNTER=$((COUNTER+1))
    echo -n "."
done

if [ $COUNTER -eq 30 ]; then
    error "Emulators failed to start within 30 seconds"
    kill $EMULATOR_PID || true
    exit 1
fi

echo

# Step 5: Create test users (teachers + students)
log "Creating test users (teachers and students)..."
if npx tsx e2e/scripts/setup-test-users.ts; then
    success "Test users created successfully"
else
    error "Failed to create test users"
    kill $EMULATOR_PID || true
    exit 1
fi

# Step 6: Import classroom data for each teacher
log "Importing classroom data for teachers..."

# Function to import teacher data
import_teacher_data() {
    local teacher_email=$1
    local snapshot_file=$2
    
    log "Importing data for $teacher_email..."
    
    # Authenticate teacher
    TOKEN=$(curl -s -X POST \
        'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key' \
        -H 'Content-Type: application/json' \
        -d "{\"email\":\"$teacher_email\",\"password\":\"test123\",\"returnSecureToken\":true}" \
        | jq -r '.idToken')
    
    if [ "$TOKEN" = "null" ]; then
        error "Failed to authenticate $teacher_email"
        return 1
    fi
    
    # Import snapshot
    RESPONSE=$(curl -s -X POST \
        http://127.0.0.1:5001/roo-app-3d24e/us-central1/api/snapshots/import \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d @"e2e/fixtures/$snapshot_file")
    
    if echo "$RESPONSE" | jq -e '.success' > /dev/null; then
        local stats=$(echo "$RESPONSE" | jq -r '.data.summary')
        success "$teacher_email: $stats"
    else
        error "Failed to import data for $teacher_email"
        echo "$RESPONSE"
        return 1
    fi
}

# Import data for each teacher
if import_teacher_data "teacher1@test.com" "teacher1-snapshot.json" && \
   import_teacher_data "teacher2@test.com" "teacher2-snapshot.json" && \
   import_teacher_data "teacher3@test.com" "teacher3-snapshot.json"; then
    success "All teacher data imported successfully"
else
    error "Failed to import some teacher data"
    kill $EMULATOR_PID || true
    exit 1
fi

# Step 7: Generate updated mock data
log "Regenerating mock test data..."
if node e2e/fixtures/regenerate-mock-data.js; then
    success "Mock data updated"
else
    warning "Mock data update failed (non-critical)"
fi

# Step 8: Verify setup
log "Verifying setup..."

# Check users count
USER_COUNT=$(curl -s -X POST \
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:query' \
    -H 'Content-Type: application/json' \
    -d '{"returnUserInfo": true}' \
    | jq -r '.userInfo | length' 2>/dev/null || echo "0")

# Test API endpoints
API_STATUS=$(curl -s http://127.0.0.1:5001/roo-app-3d24e/us-central1/api/ | jq -r '.status' 2>/dev/null || echo "error")

echo
echo "============================================================"
success "🎉 Firebase Test Environment Setup Complete!"
echo "============================================================"
echo
echo "📊 Setup Summary:"
echo "   👥 Users created: $USER_COUNT"
echo "   🏫 Teachers: 3 (teacher1@test.com, teacher2@test.com, teacher3@test.com)"
echo "   🎓 Students: 8 (student1-8@schoolemail.com)"
echo "   📚 Classroom data: Imported for all teachers"
echo "   🔧 API Status: $API_STATUS"
echo
echo "🌐 Access Points:"
echo "   • Emulator UI: http://127.0.0.1:4000"
echo "   • Auth Emulator: http://127.0.0.1:9099"
echo "   • Firestore Emulator: http://127.0.0.1:8080"
echo "   • Functions Emulator: http://127.0.0.1:5001"
echo
echo "🔑 Test Credentials:"
echo "   Teachers: teacher[1-3]@test.com / test123"
echo "   Students: student[1-8]@schoolemail.com / passcode: 12345"
echo
echo "🚀 Ready for Development!"
echo "   The emulators will continue running in the background."
echo "   Use 'pkill -f firebase' to stop them when done."
echo "============================================================"