#!/bin/bash
# Master Environment Switching Script for Roo
# Usage: ./scripts/switch-environment.sh [local|staging|production]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Function to backup current environment files
backup_env_files() {
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_dir="./env-backups/$timestamp"
    
    mkdir -p "$backup_dir"
    
    # Backup frontend .env if it exists
    if [ -f "frontend/.env" ]; then
        cp "frontend/.env" "$backup_dir/frontend.env.backup"
        print_status "Backed up frontend/.env to $backup_dir/"
    fi
    
    # Backup functions .env if it exists
    if [ -f "functions/.env" ]; then
        cp "functions/.env" "$backup_dir/functions.env.backup"
        print_status "Backed up functions/.env to $backup_dir/"
    fi
}

# Function to validate environment files exist
validate_env_files() {
    local env=$1
    local missing_files=()
    
    if [ ! -f "frontend/.env.$env" ]; then
        missing_files+=("frontend/.env.$env")
    fi
    
    if [ ! -f "functions/.env.$env" ]; then
        missing_files+=("functions/.env.$env")
    fi
    
    if [ ${#missing_files[@]} -ne 0 ]; then
        print_error "Missing environment files:"
        for file in "${missing_files[@]}"; do
            print_error "  - $file"
        done
        exit 1
    fi
}

# Function to check Firebase CLI
check_firebase_cli() {
    if ! command -v firebase &> /dev/null; then
        print_error "Firebase CLI is not installed. Please install it first:"
        print_info "npm install -g firebase-tools"
        exit 1
    fi
}

# Function to switch to local environment
switch_to_local() {
    print_info "🔄 Switching to LOCAL (emulator) environment..."
    
    # Validate environment files
    validate_env_files "local"
    
    # Copy environment files
    cp "frontend/.env.local" "frontend/.env"
    cp "functions/.env.local" "functions/.env"
    print_status "Environment files copied"
    
    # No Firebase project switch needed for local
    print_status "Local environment activated"
    
    echo ""
    echo -e "${GREEN}🎯 Current Environment: LOCAL (EMULATORS)${NC}"
    echo -e "${BLUE}📊 Frontend: Uses emulators (http://localhost:5001, :8080, :9099)${NC}"
    echo -e "${BLUE}📊 Functions: Connects to local emulators${NC}"
    echo -e "${BLUE}🔗 Emulator UI: http://localhost:4000${NC}"
    echo ""
    print_info "Next steps:"
    print_info "  1. Run: npm run dev (starts emulators + frontend)"
    print_info "  2. Access Emulator UI: http://localhost:4000"
    echo ""
}

# Function to switch to staging environment  
switch_to_staging() {
    print_info "🔄 Switching to STAGING environment..."
    
    # Validate environment files
    validate_env_files "staging"
    
    # Switch Firebase project first
    print_info "📡 Switching to staging Firebase project..."
    if firebase use staging; then
        print_status "Firebase project switched to staging"
    else
        print_error "Failed to switch Firebase project to staging"
        print_info "Make sure you have access to roo-staging-602dd project"
        exit 1
    fi
    
    # Copy environment files
    cp "frontend/.env.staging" "frontend/.env"
    cp "functions/.env.staging" "functions/.env"
    print_status "Environment files copied"
    
    echo ""
    echo -e "${GREEN}🎯 Current Environment: STAGING${NC}"
    echo -e "${BLUE}📊 Firebase Project: roo-staging-602dd${NC}"
    echo -e "${BLUE}📊 Frontend: Uses staging Firebase${NC}"
    echo -e "${BLUE}📊 Functions: Deploys to staging${NC}"
    echo ""
    print_info "Next steps:"
    print_info "  1. Verify API keys in environment files"
    print_info "  2. Run: npm run dev (local dev against staging)"
    print_info "  3. Run: npm run deploy (deploy to staging)"
    print_warning "Remember: You are working against STAGING!"
    echo ""
}

# Function to switch to production environment
switch_to_production() {
    print_warning "⚠️  You are about to switch to PRODUCTION environment!"
    print_warning "This affects LIVE users and data. Proceed with caution."
    echo ""
    
    # Production confirmation
    read -p "Are you sure you want to switch to PRODUCTION? (Type 'YES' to confirm): " confirm
    if [ "$confirm" != "YES" ]; then
        print_info "Production switch cancelled."
        exit 0
    fi
    
    print_info "🔄 Switching to PRODUCTION environment..."
    
    # Validate environment files
    validate_env_files "production"
    
    # Switch Firebase project first
    print_info "📡 Switching to production Firebase project..."
    if firebase use production; then
        print_status "Firebase project switched to production"
    else
        print_error "Failed to switch Firebase project to production"
        exit 1
    fi
    
    # Copy environment files
    cp "frontend/.env.production" "frontend/.env"
    cp "functions/.env.production" "functions/.env"
    print_status "Environment files copied"
    
    echo ""
    echo -e "${RED}🎯 Current Environment: PRODUCTION${NC}"
    echo -e "${RED}📊 Firebase Project: roo-app-3d24e${NC}"
    echo -e "${RED}📊 Frontend: Uses production Firebase${NC}"
    echo -e "${RED}📊 Functions: Deploys to production${NC}"
    echo ""
    print_info "Next steps:"
    print_info "  1. Verify all API keys are production-ready"
    print_info "  2. Run: npm run quality:check (before any changes)"
    print_info "  3. Run: npm run deploy (deploy to production)"
    print_error "⚠️  WARNING: You are now in PRODUCTION mode!"
    print_error "⚠️  All changes affect LIVE users!"
    echo ""
}

# Main script logic
main() {
    echo "🚀 Roo Environment Switcher"
    echo "============================="
    
    # Check if environment argument is provided
    if [ $# -eq 0 ]; then
        print_error "Usage: $0 [local|staging|production]"
        print_info "Available environments:"
        print_info "  local      - Use Firebase emulators (local development)"
        print_info "  staging    - Use staging Firebase project"  
        print_info "  production - Use production Firebase project"
        exit 1
    fi
    
    local environment=$1
    
    # Check prerequisites
    check_firebase_cli
    
    # Backup current environment
    backup_env_files
    
    # Switch based on environment
    case $environment in
        "local")
            switch_to_local
            ;;
        "staging")
            switch_to_staging
            ;;
        "production")
            switch_to_production
            ;;
        *)
            print_error "Invalid environment: $environment"
            print_info "Valid options: local, staging, production"
            exit 1
            ;;
    esac
    
    print_status "Environment switch complete!"
}

# Run main function
main "$@"