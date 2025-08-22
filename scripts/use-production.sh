#!/bin/bash
# Switch to production Firebase environment

set -e  # Exit on error

echo "🔄 Switching to PRODUCTION environment..."

# 1. Switch Firebase project
echo "📡 Switching to production Firebase project..."
firebase use production
if [ $? -eq 0 ]; then
    echo "✅ Firebase project switched to production"
else
    echo "❌ Failed to switch Firebase project"
    exit 1
fi

# 2. Copy production environment files
echo "📁 Copying production environment files..."

# Frontend production config
if [ -f "frontend/.env.production" ]; then
    cp frontend/.env.production frontend/.env
    echo "✅ Frontend production config activated"
else
    echo "⚠️  Warning: frontend/.env.production not found"
fi

# Functions production config (may not exist, use defaults)
if [ -f "functions/.env.production" ]; then
    cp functions/.env.production functions/.env
    echo "✅ Functions production config activated"
else
    # Create minimal production config
    echo "# Production environment" > functions/.env
    echo "ENVIRONMENT=production" >> functions/.env
    echo "FIREBASE_PROJECT_ID=roo-app-3d24e" >> functions/.env
    echo "✅ Functions production config created"
fi

# 3. Display current configuration
echo ""
echo "🎯 Current Environment: PRODUCTION"
echo "📊 Firebase Project: $(firebase projects:list --json | jq -r '.result[] | select(.projectId == "roo-app-3d24e") | .displayName')"
echo "🔗 Project ID: roo-app-3d24e"
echo ""

# 4. Show next steps
echo "📋 Next Steps:"
echo "   1. Ensure all API keys are production-ready"
echo "   2. Verify service account credentials are configured for production"
echo "   3. Run: npm run dev (for local development against production)"
echo "   4. Run: npm run deploy (to deploy to production)"
echo ""
echo "⚠️  WARNING: You are now working against the PRODUCTION environment!"
echo "⚠️  Double-check all changes before deploying!"