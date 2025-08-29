#!/bin/bash
# Display current environment configuration for Roo

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${CYAN}$1${NC}"
}

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

# Function to detect current environment
detect_environment() {
    local env="unknown"
    
    # Check Firebase project
    if command -v firebase &> /dev/null; then
        local firebase_project=$(firebase use --non-interactive 2>/dev/null | grep "Current project:" | cut -d' ' -f3 || echo "unknown")
        
        case $firebase_project in
            "roo-app-3d24e")
                env="production"
                ;;
            "roo-staging-602dd")
                env="staging"
                ;;
            *)
                # Check if using emulators by looking at environment files
                if [ -f "frontend/.env" ]; then
                    if grep -q "PUBLIC_USE_EMULATORS=true" frontend/.env; then
                        env="local"
                    fi
                fi
                ;;
        esac
    fi
    
    echo $env
}

# Function to show Firebase project info
show_firebase_info() {
    print_header "🔥 Firebase Configuration"
    
    if command -v firebase &> /dev/null; then
        local current_project=$(firebase use --non-interactive 2>/dev/null | grep "Current project:" | cut -d' ' -f3 || echo "none")
        
        if [ "$current_project" != "none" ]; then
            print_status "Active Project: $current_project"
            
            case $current_project in
                "roo-app-3d24e")
                    print_info "Environment: PRODUCTION"
                    print_error "⚠️  Working with LIVE data!"
                    ;;
                "roo-staging-602dd")
                    print_info "Environment: STAGING"
                    print_warning "Working with staging data"
                    ;;
                *)
                    print_info "Environment: UNKNOWN"
                    print_warning "Project not recognized"
                    ;;
            esac
        else
            print_error "No Firebase project selected"
        fi
    else
        print_error "Firebase CLI not installed"
    fi
    echo ""
}

# Function to show frontend configuration
show_frontend_config() {
    print_header "🌐 Frontend Configuration"
    
    if [ -f "frontend/.env" ]; then
        print_status "Environment file: frontend/.env exists"
        
        # Extract key configuration
        local project_id=$(grep "^PUBLIC_FIREBASE_PROJECT_ID=" frontend/.env 2>/dev/null | cut -d'=' -f2 || echo "not set")
        local use_emulators=$(grep "^PUBLIC_USE_EMULATORS=" frontend/.env 2>/dev/null | cut -d'=' -f2 || echo "false")
        local functions_url=$(grep "^PUBLIC_FUNCTIONS_EMULATOR_URL=" frontend/.env 2>/dev/null | cut -d'=' -f2 || echo "not set")
        
        print_info "Firebase Project ID: $project_id"
        print_info "Use Emulators: $use_emulators"
        
        if [ "$use_emulators" = "true" ]; then
            print_info "Functions URL: $functions_url"
            print_status "🔧 Using Firebase Emulators"
            print_info "   • Auth: http://localhost:9099"
            print_info "   • Firestore: http://localhost:8080"
            print_info "   • Functions: http://localhost:5001"
            print_info "   • Emulator UI: http://localhost:4000"
        else
            print_status "☁️  Using Remote Firebase Services"
        fi
    else
        print_error "Environment file: frontend/.env not found"
        print_warning "Run environment switch script to create it"
    fi
    echo ""
}

# Function to show functions configuration
show_functions_config() {
    print_header "⚡ Functions Configuration"
    
    if [ -f "functions/.env" ]; then
        print_status "Environment file: functions/.env exists"
        
        # Extract key configuration
        local environment=$(grep "^ENVIRONMENT=" functions/.env 2>/dev/null | cut -d'=' -f2 || echo "not set")
        local project_id=$(grep "^FIREBASE_PROJECT_ID=" functions/.env 2>/dev/null | cut -d'=' -f2 || echo "not set")
        local debug=$(grep "^DEBUG=" functions/.env 2>/dev/null | cut -d'=' -f2 || echo "not set")
        local functions_emulator=$(grep "^FUNCTIONS_EMULATOR=" functions/.env 2>/dev/null | cut -d'=' -f2 || echo "not set")
        
        print_info "Environment: $environment"
        print_info "Firebase Project ID: $project_id"
        print_info "Debug Mode: $debug"
        
        if [ "$functions_emulator" = "true" ]; then
            print_status "🔧 Using Local Emulators"
        else
            print_status "☁️  Using Remote Firebase Services"
        fi
        
        # Check for API keys (without showing values)
        if grep -q "^GEMINI_API_KEY=" functions/.env; then
            print_status "Gemini API Key: configured"
        else
            print_warning "Gemini API Key: not configured"
        fi
        
        if grep -q "^BREVO_API_KEY=" functions/.env; then
            print_status "Brevo API Key: configured"
        else
            print_warning "Brevo API Key: not configured"
        fi
    else
        print_error "Environment file: functions/.env not found"
        print_warning "Run environment switch script to create it"
    fi
    echo ""
}

# Function to show available environment files
show_available_environments() {
    print_header "📁 Available Environment Files"
    
    echo "Frontend:"
    for env_file in frontend/.env.local frontend/.env.staging frontend/.env.production; do
        if [ -f "$env_file" ]; then
            print_status "  $(basename $env_file)"
        else
            print_error "  $(basename $env_file) - missing"
        fi
    done
    
    echo ""
    echo "Functions:"
    for env_file in functions/.env.local functions/.env.staging functions/.env.production; do
        if [ -f "$env_file" ]; then
            print_status "  $(basename $env_file)"
        else
            print_error "  $(basename $env_file) - missing"
        fi
    done
    echo ""
}

# Function to show switching commands
show_switching_commands() {
    print_header "🔄 Environment Switching Commands"
    
    print_info "Master switcher:"
    print_info "  ./scripts/switch-environment.sh local      # Switch to emulators"
    print_info "  ./scripts/switch-environment.sh staging    # Switch to staging"
    print_info "  ./scripts/switch-environment.sh production # Switch to production"
    echo ""
    print_info "Individual scripts:"
    print_info "  ./scripts/use-local.sh       # Switch to local emulators"
    print_info "  ./scripts/use-staging.sh     # Switch to staging Firebase"
    print_info "  ./scripts/use-production.sh  # Switch to production Firebase"
    echo ""
    print_info "NPM shortcuts (if configured):"
    print_info "  npm run env:local      # Switch to local"
    print_info "  npm run env:staging    # Switch to staging"
    print_info "  npm run env:production # Switch to production"
    print_info "  npm run env:status     # Show this status"
    echo ""
}

# Main function
main() {
    echo "🚀 Roo Environment Status"
    echo "=========================="
    echo ""
    
    # Detect and show current environment
    local current_env=$(detect_environment)
    case $current_env in
        "local")
            print_status "🎯 Current Environment: LOCAL (EMULATORS)"
            ;;
        "staging")
            print_warning "🎯 Current Environment: STAGING"
            ;;
        "production")
            print_error "🎯 Current Environment: PRODUCTION"
            ;;
        *)
            print_warning "🎯 Current Environment: UNKNOWN/MIXED"
            ;;
    esac
    echo ""
    
    # Show detailed configuration
    show_firebase_info
    show_frontend_config
    show_functions_config
    show_available_environments
    show_switching_commands
    
    # Show backup information
    if [ -d "env-backups" ]; then
        local backup_count=$(ls -1 env-backups 2>/dev/null | wc -l)
        print_status "Environment backups: $backup_count backups available in env-backups/"
    else
        print_info "Environment backups: No backups created yet"
    fi
    
    echo ""
    print_info "💡 Tip: Always run 'npm run env:status' to verify your environment before important operations!"
}

# Run main function
main "$@"