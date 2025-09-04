#!/bin/bash

# Script to clear all Firebase emulator data (destructive operation)
# Usage: ./scripts/clear-emulator-data.sh

echo "🗑️ Clearing Firebase Emulator Data..."

# Check if emulators are running
if ! curl -s http://localhost:4000 > /dev/null; then
  echo "❌ Firebase emulators are not running!"
  echo "Start them with: npm run emulators"
  exit 1
fi

# Get project ID from .firebaserc or firebase.json
PROJECT_ID="roo-auto-grading-dev"

echo "📦 Project ID: $PROJECT_ID"

# Clear Firestore
echo "🗑️  Clearing Firestore data..."
curl -X DELETE "http://localhost:8080/emulator/v1/projects/$PROJECT_ID/databases/(default)/documents" \
  -H "Authorization: Bearer owner"

# Clear Authentication
echo "🗑️  Clearing Authentication data..."
curl -X DELETE "http://localhost:9099/emulator/v1/projects/$PROJECT_ID/accounts" \
  -H "Authorization: Bearer owner"

# Clear Storage (if using)
echo "🗑️  Clearing Storage data..."
curl -X DELETE "http://localhost:9199/emulator/v1/projects/$PROJECT_ID/buckets" \
  -H "Authorization: Bearer owner" 2>/dev/null || echo "Storage emulator not running"

echo "✅ Emulator data cleared!"
echo ""
echo "💡 To seed with test data, run: npm run emulators:seed-users"