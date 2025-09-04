#!/bin/bash

# Seed Firestore Data for Roo Firebase Emulators
# This script imports sample classroom snapshot data via the API

set -e

echo "🏫 Seeding Firestore with classroom data..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper function for colored output
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if Firebase emulators are running
log "Checking if Firebase emulators are running..."
if ! curl -s http://localhost:4000 > /dev/null; then
    error "Firebase emulators are not running!"
    echo "Start them with: npm run emulators:start"
    exit 1
fi

# Check if Functions are ready
log "Checking if Functions emulator is ready..."
if ! curl -s http://localhost:5001/roo-app-3d24e/us-central1/api > /dev/null; then
    error "Functions emulator is not responding!"
    echo "Make sure functions are deployed: npm run build"
    exit 1
fi

# Check if test snapshots exist
SNAPSHOT_FILE="frontend/e2e/fixtures/teacher1-snapshot.json"
if [ ! -f "$SNAPSHOT_FILE" ]; then
    error "Test snapshot file not found: $SNAPSHOT_FILE"
    exit 1
fi

log "Importing classroom snapshot data..."

# Import via API (requires authentication, so this is a simple approach)
# In a real scenario, you'd authenticate first, but for emulator testing we can try direct import
curl -X POST "http://localhost:5001/roo-app-3d24e/us-central1/api/snapshots/import" \
  -H "Content-Type: application/json" \
  -d @"$SNAPSHOT_FILE" \
  > /dev/null 2>&1

if [ $? -eq 0 ]; then
    log "✅ Classroom data imported successfully"
else
    warn "Snapshot import may require authentication"
    warn "You can import data manually through the frontend at /teacher/data-import/snapshot"
fi

echo ""
echo "🎉 Firestore seeding completed!"
echo ""
echo "📊 Available test data:"
echo "   • Test users with Firebase Auth"
echo "   • Sample classroom data (if import succeeded)"
echo "   • Assignment and submission fixtures"
echo ""
echo "🔗 Access the data at:"
echo "   • Frontend: http://localhost:5173"
echo "   • Firestore UI: http://localhost:4000/firestore"