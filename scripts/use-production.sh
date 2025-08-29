#!/bin/bash
# Switch to production Firebase environment

set -e  # Exit on error

echo "🔄 Switching to PRODUCTION environment..."

# Check if master switcher exists and use it
if [ -f "scripts/switch-environment.sh" ]; then
    ./scripts/switch-environment.sh production
else
    # Fallback to direct switching with safety checks
    echo "⚠️  WARNING: You are about to switch to PRODUCTION environment!"
    echo "⚠️  This affects LIVE users and data. Proceed with caution."
    echo ""
    
    # Production confirmation
    read -p "Are you sure you want to switch to PRODUCTION? (Type 'YES' to confirm): " confirm
    if [ "$confirm" != "YES" ]; then
        echo "ℹ️  Production switch cancelled."
        exit 0
    fi

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

    # Functions production config
    if [ -f "functions/.env.production" ]; then
        cp functions/.env.production functions/.env
        echo "✅ Functions production config activated"
    else
        echo "⚠️  Warning: functions/.env.production not found"
        # Create minimal production config as fallback
        echo "# Production environment" > functions/.env
        echo "ENVIRONMENT=production" >> functions/.env
        echo "FIREBASE_PROJECT_ID=roo-app-3d24e" >> functions/.env
        echo "✅ Minimal functions production config created"
    fi

    # 3. Display current configuration
    echo ""
    echo "🎯 Current Environment: PRODUCTION"
    echo "📊 Firebase Project: roo-app-3d24e"
    echo "🔗 Frontend: Uses production Firebase"
    echo "🔗 Functions: Deploy to production"
    echo ""

    # 4. Show next steps
    echo "📋 Next Steps:"
    echo "   1. Verify all API keys are production-ready"
    echo "   2. Run: npm run quality:check (before any changes)"
    echo "   3. Run: npm run deploy (deploy to production)"
    echo ""
    echo "⚠️  WARNING: You are now working against the PRODUCTION environment!"
    echo "⚠️  All changes affect LIVE users!"
fi