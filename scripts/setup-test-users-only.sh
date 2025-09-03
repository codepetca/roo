#!/bin/bash

# Quick Test Users Setup for Roo Firebase Emulators
# This script only creates users (faster than full setup)

set -e

echo "👥 Setting up Firebase test users only..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] ✅ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "firebase.json" ]; then
    error "firebase.json not found. Please run from the roo project root."
    exit 1
fi

# Check if emulators are running
log "Checking if emulators are running..."
if ! curl -f http://127.0.0.1:9099 > /dev/null 2>&1 || \
   ! curl -f http://127.0.0.1:8080 > /dev/null 2>&1 || \
   ! curl -f http://127.0.0.1:5001 > /dev/null 2>&1; then
    error "Firebase emulators are not running!"
    echo "Please start them with: npm run emulators"
    exit 1
fi

success "Emulators are running"

# Create test users
log "Creating test users..."
cd frontend

if npx tsx e2e/scripts/setup-test-users.ts; then
    success "Test users created successfully"
else
    error "Failed to create test users"
    exit 1
fi

echo
echo "============================================================"
success "🎉 Test Users Setup Complete!"
echo "============================================================"
echo
echo "👥 Users Created:"
echo "   🏫 Teachers: teacher1@test.com, teacher2@test.com, teacher3@test.com"
echo "   🎓 Students: student1-8@schoolemail.com"
echo
echo "🔑 Credentials:"
echo "   Teachers: password 'test123'"
echo "   Students: passcode '12345'"
echo
echo "🌐 Emulator UI: http://127.0.0.1:4000"
echo "============================================================"