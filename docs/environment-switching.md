# Environment Switching Guide

This guide explains how to quickly switch between emulators (local), staging, and production environments in the Roo project.

## Quick Reference

```bash
# Switch environments using NPM scripts (recommended)
npm run env:local      # Switch to local emulators
npm run env:staging    # Switch to staging Firebase
npm run env:production # Switch to production Firebase
npm run env:status     # Show current environment

# Or use scripts directly
./scripts/switch-environment.sh local
./scripts/switch-environment.sh staging
./scripts/switch-environment.sh production
./scripts/show-environment.sh
```

## Environments Overview

### 🔧 Local (Emulators)
- **Firebase Project**: `roo-app-3d24e` (uses production project config)
- **Services**: All services run locally via Firebase emulators
- **Data**: Isolated test data, automatically seeded
- **Use Case**: Development, testing, debugging

### ⚠️ Staging
- **Firebase Project**: `roo-staging-602dd` 
- **Services**: Real Firebase services in staging project
- **Data**: Staging test data, safe for testing
- **Use Case**: Integration testing, demo, pre-production validation

### 🚨 Production
- **Firebase Project**: `roo-app-3d24e`
- **Services**: Real Firebase services in production
- **Data**: Live user data
- **Use Case**: Live application, requires extra caution

## Environment Files Structure

### Frontend Environment Files
```
frontend/
├── .env                 # Active environment (copied from specific env)
├── .env.local          # Local emulator configuration
├── .env.staging        # Staging Firebase configuration  
├── .env.production     # Production Firebase configuration
└── .env.example        # Template for new environments
```

### Functions Environment Files
```
functions/
├── .env                # Active environment (copied from specific env)
├── .env.local         # Local emulator configuration
├── .env.staging       # Staging Firebase configuration
├── .env.production    # Production Firebase configuration
└── .env.local.example # Template for new environments
```

## Switching Commands

### Master Switcher Script
The `scripts/switch-environment.sh` script is the main tool for switching environments:

```bash
# Basic usage
./scripts/switch-environment.sh [local|staging|production]

# Examples
./scripts/switch-environment.sh local      # Switch to emulators
./scripts/switch-environment.sh staging    # Switch to staging
./scripts/switch-environment.sh production # Switch to production (requires confirmation)
```

**Features:**
- Automatic environment file validation
- Firebase project switching
- Environment file backup
- Safety confirmations for production
- Colored output with clear status

### Individual Scripts
Legacy scripts that delegate to the master switcher:

```bash
./scripts/use-local.sh       # Switch to local emulators
./scripts/use-staging.sh     # Switch to staging Firebase
./scripts/use-production.sh  # Switch to production Firebase
```

### NPM Scripts (Recommended)
Convenient shortcuts available in `package.json`:

```bash
npm run env:local      # Switch to local development
npm run env:staging    # Switch to staging environment
npm run env:production # Switch to production environment
npm run env:status     # Display current environment status
```

### Environment Status Display
Check your current environment configuration:

```bash
npm run env:status
# or
./scripts/show-environment.sh
```

**Status Display Shows:**
- Current Firebase project
- Active environment files
- Emulator vs. remote services
- API key configuration status
- Available environment files
- Switching commands

## Safety Features

### Production Safeguards
- **Confirmation Required**: Production switch requires typing "YES"
- **Clear Warnings**: Red text warns about live data
- **Backup System**: Automatic backup of current environment files

### Environment Validation
- **File Existence**: Validates environment files exist before switching
- **Firebase CLI**: Checks Firebase CLI installation and authentication
- **Project Access**: Verifies access to target Firebase project

### Backup System
Environment files are automatically backed up to `env-backups/` with timestamps:
```
env-backups/
├── 20250128_143022/
│   ├── frontend.env.backup
│   └── functions.env.backup
└── 20250128_143156/
    ├── frontend.env.backup
    └── functions.env.backup
```

## Configuration Details

### Local Environment (.env.local)
```bash
# Uses emulators for all services
PUBLIC_USE_EMULATORS=true
PUBLIC_FUNCTIONS_EMULATOR_URL=http://localhost:5001/roo-app-3d24e/us-central1

# Test accounts
VITE_TEST_TEACHER_BOARD_EMAIL=teacher@test.com
VITE_TEST_STUDENT_BOARD_EMAIL=student@test.com
```

**Emulator Ports:**
- Auth Emulator: `http://localhost:9099`
- Firestore Emulator: `http://localhost:8080`
- Functions Emulator: `http://localhost:5001`
- Emulator UI: `http://localhost:4000`

### Staging Environment (.env.staging)
```bash
# Uses staging Firebase project
PUBLIC_USE_EMULATORS=false
PUBLIC_FIREBASE_PROJECT_ID=roo-staging-602dd

# Staging test accounts
VITE_TEST_TEACHER_BOARD_EMAIL=dev.codepet@gmail.com
VITE_TEST_STUDENT_BOARD_EMAIL=student.test@gmail.com
```

### Production Environment (.env.production)
```bash
# Uses production Firebase project
PUBLIC_USE_EMULATORS=false
PUBLIC_FIREBASE_PROJECT_ID=roo-app-3d24e

# Production configuration - no test accounts
```

## Development Workflow

### Starting Local Development
```bash
# Switch to local environment
npm run env:local

# Start development servers
npm run dev  # Starts emulators + frontend

# Access emulator UI
open http://localhost:4000
```

### Testing Against Staging
```bash
# Switch to staging
npm run env:staging

# Develop against staging Firebase
npm run dev

# Deploy to staging
npm run deploy
```

### Production Deployment
```bash
# Switch to production (requires confirmation)
npm run env:production

# Run quality checks
npm run quality:check

# Deploy to production
npm run deploy
```

## Troubleshooting

### Common Issues

#### "Firebase CLI not found"
```bash
npm install -g firebase-tools
firebase login
```

#### "Project access denied" 
- Ensure you're authenticated: `firebase login`
- Verify project access in Firebase Console
- Check `.firebaserc` project configuration

#### "Environment file not found"
- Run `npm run env:status` to see missing files
- Copy from `.env.example` files as templates
- Ensure proper API keys are configured

#### "Firebase project not switching"
- Run `firebase logout` then `firebase login`
- Manually switch: `firebase use production` or `firebase use staging`
- Check `.firebaserc` has correct project aliases

### Verification Steps

1. **Check Current Environment**:
   ```bash
   npm run env:status
   ```

2. **Verify Firebase Project**:
   ```bash
   firebase use
   ```

3. **Check Environment Files**:
   ```bash
   cat frontend/.env | grep PROJECT_ID
   cat functions/.env | grep PROJECT_ID
   ```

4. **Test API Connectivity**:
   ```bash
   # For emulators
   curl http://localhost:5001/roo-app-3d24e/us-central1/api/health
   
   # For remote
   curl https://us-central1-roo-app-3d24e.cloudfunctions.net/api/health
   ```

## API Key Management

### Required API Keys

#### Development/Local:
- Gemini API (optional for local testing)
- Brevo API (optional for local testing)
- Service account JSON for Sheets access

#### Staging:
- Staging-specific Gemini API key (if available)
- Staging-specific Brevo API key (if available)
- Service account with staging permissions

#### Production:
- Production Gemini API key ⚠️
- Production Brevo API key ⚠️
- Production service account ⚠️

### Security Notes
- Never commit API keys to repository
- Use different keys for different environments
- Rotate keys regularly
- Monitor API usage and billing

## Best Practices

### Before Switching Environments
1. Commit current changes
2. Check environment status: `npm run env:status`
3. Backup important data if needed
4. Run tests if switching from development

### After Switching Environments
1. Verify switch was successful: `npm run env:status`
2. Check Firebase project: `firebase use`
3. Test basic connectivity
4. Review environment-specific configuration

### Production Safety
- Always run `npm run quality:check` before production deployment
- Use staging environment for testing production-like scenarios
- Have a rollback plan ready
- Monitor applications after production deployments

## Integration with Development Tools

### VS Code Configuration
Add to `.vscode/settings.json`:
```json
{
  "terminal.integrated.env.osx": {
    "NODE_ENV": "development"
  }
}
```

### Environment-Specific Scripts
Create custom scripts for common environment-specific tasks:
```bash
# In package.json
"scripts": {
  "dev:staging": "npm run env:staging && npm run dev",
  "deploy:staging": "npm run env:staging && npm run deploy",
  "test:staging": "npm run env:staging && npm run test:e2e"
}
```

---

**⚠️ Important**: Always double-check your environment before making changes, especially when working with production data. Use `npm run env:status` frequently to verify your current configuration.