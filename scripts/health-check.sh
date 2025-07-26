#!/bin/bash

# Roo System Health Check Script
# Quick automated test to verify all components are working

set -e  # Exit on any error

echo "🏥 ROO SYSTEM HEALTH CHECK"
echo "=========================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Track overall health
HEALTH_SCORE=0
TOTAL_CHECKS=0

# Function to run a check
run_check() {
    local name=$1
    local command=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo -n "Checking $name... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASS${NC}"
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        return 1
    fi
}

# Function to run a check with output
run_check_verbose() {
    local name=$1
    local command=$2
    TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
    
    echo "Checking $name..."
    if eval "$command"; then
        echo -e "${GREEN}✓ PASS${NC}"
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        return 1
    fi
}

echo "1️⃣  DEPENDENCY CHECKS"
echo "--------------------"
run_check "Node.js" "node --version"
run_check "npm" "npm --version"
run_check "TypeScript" "npx tsc --version"
run_check "Firebase CLI" "firebase --version"
echo ""

echo "2️⃣  BUILD CHECKS"
echo "---------------"
run_check "Shared types build" "cd shared && npm run build"
run_check "Frontend build" "cd frontend && npm run build"
run_check "Backend build" "cd functions && npm run build"
echo ""

echo "3️⃣  TYPE SAFETY CHECKS"
echo "--------------------"
run_check "Shared types" "cd shared && npm run type-check"
run_check "Frontend types" "cd frontend && npm run check"
run_check "Backend types" "cd functions && npm run type-check"
echo ""

echo "4️⃣  LINTING CHECKS"
echo "-----------------"
# Allow linting to fail without stopping the script
set +e
if cd frontend && npm run lint:check > /dev/null 2>&1; then
    echo -e "Frontend linting... ${GREEN}✓ PASS${NC}"
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
else
    echo -e "Frontend linting... ${YELLOW}⚠ WARNINGS${NC} (non-critical)"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

if cd functions && npm run lint > /dev/null 2>&1; then
    echo -e "Backend linting... ${GREEN}✓ PASS${NC}"
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
else
    echo -e "Backend linting... ${YELLOW}⚠ WARNINGS${NC} (non-critical)"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
set -e
echo ""

echo "5️⃣  AUTOMATED TEST CHECKS"
echo "------------------------"
# Frontend tests
echo "Frontend tests..."
if cd frontend && npm run test:unit -- --run > /dev/null 2>&1; then
    FRONTEND_TESTS=$(npm run test:unit -- --run 2>&1 | grep -E "Test Files|Tests" | tail -2)
    echo -e "${GREEN}✓ PASS${NC} - All frontend tests passing"
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Frontend tests failing"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))

# Backend tests
echo "Backend tests..."
if cd functions && npm run test > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC} - All backend tests passing"
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
else
    echo -e "${RED}✗ FAIL${NC} - Backend tests failing"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

echo "6️⃣  API ENDPOINT CHECK"
echo "--------------------"
# Check if emulators are running
if curl -s http://localhost:5001 > /dev/null 2>&1; then
    echo -e "Firebase emulators... ${GREEN}✓ RUNNING${NC}"
    # Quick API health check
    if curl -s http://localhost:5001/roo-app-3d24e/us-central1/api/status > /dev/null 2>&1; then
        echo -e "API endpoints... ${GREEN}✓ RESPONSIVE${NC}"
        HEALTH_SCORE=$((HEALTH_SCORE + 1))
    else
        echo -e "API endpoints... ${YELLOW}⚠ NOT RESPONDING${NC}"
    fi
else
    echo -e "Firebase emulators... ${YELLOW}⚠ NOT RUNNING${NC} (run 'npm run emulators' to test API)"
fi
TOTAL_CHECKS=$((TOTAL_CHECKS + 1))
echo ""

# Calculate health percentage
HEALTH_PERCENTAGE=$((HEALTH_SCORE * 100 / TOTAL_CHECKS))

echo "📊 HEALTH SUMMARY"
echo "================"
echo "Passed: $HEALTH_SCORE/$TOTAL_CHECKS checks"
echo -n "Overall Health: "

if [ $HEALTH_PERCENTAGE -ge 90 ]; then
    echo -e "${GREEN}🟢 EXCELLENT${NC} ($HEALTH_PERCENTAGE%)"
elif [ $HEALTH_PERCENTAGE -ge 70 ]; then
    echo -e "${YELLOW}🟡 GOOD${NC} ($HEALTH_PERCENTAGE%)"
else
    echo -e "${RED}🔴 NEEDS ATTENTION${NC} ($HEALTH_PERCENTAGE%)"
fi

echo ""
echo "💡 Quick Actions:"
echo "  • Start dev environment: npm run dev"
echo "  • Run manual API tests: npm run test:manual"
echo "  • Fix linting issues: npm run format"
echo "  • View detailed logs: Check individual package directories"

# Exit with appropriate code
if [ $HEALTH_PERCENTAGE -lt 70 ]; then
    exit 1
fi