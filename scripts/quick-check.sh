#!/bin/bash

# Quick System Health Check - Fast version that doesn't rebuild everything

echo "🚀 QUICK HEALTH CHECK"
echo "===================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Quick checks that don't require building
echo "📦 Dependencies:"
node --version > /dev/null 2>&1 && echo -e "  Node.js ${GREEN}✓${NC}" || echo -e "  Node.js ${RED}✗${NC}"
npm --version > /dev/null 2>&1 && echo -e "  npm ${GREEN}✓${NC}" || echo -e "  npm ${RED}✗${NC}"

echo ""
echo "🔍 Type Checking:"
cd /Users/stew/Repos/vibe/roo/shared && npm run type-check > /dev/null 2>&1 && echo -e "  Shared types ${GREEN}✓${NC}" || echo -e "  Shared types ${RED}✗${NC}"
cd /Users/stew/Repos/vibe/roo/frontend && npm run check > /dev/null 2>&1 && echo -e "  Frontend ${GREEN}✓${NC}" || echo -e "  Frontend ${RED}✗${NC}"
cd /Users/stew/Repos/vibe/roo/functions && npm run type-check > /dev/null 2>&1 && echo -e "  Backend ${GREEN}✓${NC}" || echo -e "  Backend ${RED}✗${NC}"

echo ""
echo "🧪 Tests:"
cd /Users/stew/Repos/vibe/roo/functions && npm run test > /dev/null 2>&1 && echo -e "  Backend tests ${GREEN}✓${NC}" || echo -e "  Backend tests ${RED}✗${NC}"

echo ""
echo "🌐 API Status:"
if curl -s http://localhost:5001 > /dev/null 2>&1; then
    echo -e "  Emulators ${GREEN}✓ Running${NC}"
else
    echo -e "  Emulators ${YELLOW}⚠ Not running${NC} (run 'npm run dev')"
fi

echo ""
echo "📋 Quick Commands:"
echo "  npm run dev       - Start development"
echo "  npm run test      - Run all tests"
echo "  npm run build     - Build everything"
echo "  npm run health    - Full health check"