#!/bin/bash
# Switch to local emulator development environment

set -e  # Exit on error

echo "🔄 Switching to LOCAL (emulator) environment..."

# Check if master switcher exists and use it
if [ -f "scripts/switch-environment.sh" ]; then
    ./scripts/switch-environment.sh local
else
    # Fallback to direct switching
    echo "📁 Copying local environment files..."
    
    # Frontend local config
    if [ -f "frontend/.env.local" ]; then
        cp frontend/.env.local frontend/.env
        echo "✅ Frontend local config activated"
    else
        echo "⚠️  Warning: frontend/.env.local not found"
    fi
    
    # Functions local config  
    if [ -f "functions/.env.local" ]; then
        cp functions/.env.local functions/.env
        echo "✅ Functions local config activated"
    else
        echo "⚠️  Warning: functions/.env.local not found"
    fi
    
    # Display current configuration
    echo ""
    echo "🎯 Current Environment: LOCAL (EMULATORS)"
    echo "📊 Frontend: Uses emulators (localhost:5001, :8080, :9099)"
    echo "📊 Functions: Connects to local emulators"
    echo "🔗 Emulator UI: http://localhost:4000"
    echo ""
    
    # Show next steps
    echo "📋 Next Steps:"
    echo "   1. Run: npm run dev (starts emulators + frontend)"
    echo "   2. Access Emulator UI: http://localhost:4000"
    echo "   3. Use test accounts: teacher@test.com, student@test.com"
    echo ""
fi