#!/bin/bash
# Switch to staging Firebase environment

set -e  # Exit on error

echo "🔄 Switching to STAGING environment..."

# 1. Switch Firebase project
echo "📡 Switching to staging Firebase project..."
firebase use staging
if [ $? -eq 0 ]; then
    echo "✅ Firebase project switched to staging"
else
    echo "❌ Failed to switch Firebase project"
    exit 1
fi

# 2. Copy staging environment files
echo "📁 Copying staging environment files..."

# Frontend staging config
if [ -f "frontend/.env.staging" ]; then
    cp frontend/.env.staging frontend/.env
    echo "✅ Frontend staging config activated"
else
    echo "⚠️  Warning: frontend/.env.staging not found"
fi

# Functions staging config
if [ -f "functions/.env.staging" ]; then
    cp functions/.env.staging functions/.env
    echo "✅ Functions staging config activated"
else
    echo "⚠️  Warning: functions/.env.staging not found"
fi

# 3. Display current configuration
echo ""
echo "🎯 Current Environment: STAGING"
echo "📊 Firebase Project: $(firebase projects:list --json | jq -r '.result[] | select(.projectId == "roo-staging-602dd") | .displayName')"
echo "🔗 Project ID: roo-staging-602dd"
echo ""

# 4. Show next steps
echo "📋 Next Steps:"
echo "   1. Update API keys in .env files if needed"
echo "   2. Ensure service account credentials are configured for staging"
echo "   3. Run: npm run dev (for local development against staging)"
echo "   4. Run: npm run deploy (to deploy to staging)"
echo ""
echo "⚠️  Remember: You are now working against the STAGING environment!"