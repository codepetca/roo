#!/bin/bash

# Deploy Firebase Functions to production
# This script ensures proper environment setup before deployment

echo "🚀 Deploying Firebase Functions..."

# Check if service account file exists
if [ ! -f "roo-app-3d24e-service-account.json" ]; then
    echo "❌ Error: Service account file not found!"
    echo "Please download the service account JSON file and save it as:"
    echo "  roo-app-3d24e-service-account.json"
    exit 1
fi

# Build functions
echo "📦 Building functions..."
cd functions
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

cd ..

# Deploy functions
echo "🚀 Deploying to Firebase..."
firebase deploy --only functions

echo "✅ Deployment complete!"