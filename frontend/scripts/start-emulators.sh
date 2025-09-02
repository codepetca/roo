#!/bin/bash

# Start Firebase emulators with persistent data
# This script automatically imports/exports user data

EXPORT_DIR="./e2e/fixtures/firebase-export"

echo "🔧 Starting Firebase emulators with persistent data..."

# Check if export directory exists
if [ -d "$EXPORT_DIR" ]; then
    echo "📂 Found existing data, importing from: $EXPORT_DIR"
    firebase emulators:start --only auth,firestore,functions --import "$EXPORT_DIR" --export-on-exit "$EXPORT_DIR"
else
    echo "🆕 No existing data found, starting fresh..."
    firebase emulators:start --only auth,firestore,functions --export-on-exit "$EXPORT_DIR"
fi