#!/bin/bash
# Switch to staging Firebase environment

set -e  # Exit on error

echo "🔄 Switching to STAGING environment..."

# Check if master switcher exists and use it
if [ -f "scripts/switch-environment.sh" ]; then
    ./scripts/switch-environment.sh staging
else
    # Fallback to direct switching
    # 1. Switch Firebase project
    echo "📡 Switching to staging Firebase project..."
    firebase use staging
    if [ $? -eq 0 ]; then
        echo "✅ Firebase project switched to staging"
    else
        echo "❌ Failed to switch Firebase project"
        echo "   Make sure you have access to roo-staging-602dd project"
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
    echo "📊 Firebase Project: roo-staging-602dd"
    echo "🔗 Frontend: Uses staging Firebase"
    echo "🔗 Functions: Deploy to staging"
    echo ""

    # 4. Show next steps
    echo "📋 Next Steps:"
    echo "   1. Verify API keys in environment files"
    echo "   2. Ensure service account credentials are configured for staging"
    echo "   3. Run: npm run dev (for local development against staging)"
    echo "   4. Run: npm run deploy (to deploy to staging)"
    echo ""
    echo "⚠️  Remember: You are now working against the STAGING environment!"
fi