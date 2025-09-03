# 🎯 Firebase Test Data Setup Scripts

This directory contains scripts for setting up complete Firebase emulator test environments for the Roo auto-grading system.

## 🚀 Quick Start

### 1. Complete Setup (Users + Data)
**Sets up everything: emulators, users, classroom data, and mock data**

```bash
# From project root
npm run emulators:setup
```

**What this does:**
- Stops existing emulators
- Optionally clears existing data
- Starts fresh emulators
- Creates 11 test users (3 teachers + 8 students)
- Imports realistic classroom data for all teachers
- Regenerates mock data
- Provides verification summary

### 2. Users Only Setup
**Quick setup for just users (when emulators are already running)**

```bash
# From project root (requires emulators to be running)
npm run emulators:setup-users
```

**What this does:**
- Creates test users only
- Much faster than full setup
- Great for development when you just need fresh users

## 📚 Available Scripts

### Core Setup Scripts

| Script | Command | Description |
|--------|---------|-------------|
| **Complete Setup** | `npm run emulators:setup` | Full environment setup |
| **Users Only** | `npm run emulators:setup-users` | Just create test users |
| **Manual Full** | `bash scripts/setup-complete-test-data.sh` | Run full setup directly |
| **Manual Users** | `bash scripts/setup-test-users-only.sh` | Run users-only directly |

### Frontend-Specific Scripts

```bash
cd frontend

# Create test users (requires emulators running)
npm run test:setup-users
# or
npx tsx e2e/scripts/setup-test-users.ts

# Clean up test users
npm run test:cleanup-users

# Regenerate mock test data
node e2e/fixtures/regenerate-mock-data.js

# Start emulators with fresh data (no import)
npm run emulators:fresh
```

## 👥 Test User Accounts

### Teachers (Email/Password Auth)
- **teacher1@test.com** / `test123` - Alice Anderson
- **teacher2@test.com** / `test123` - Bob Brown  
- **teacher3@test.com** / `test123` - Carol Chen

### Students (School Email/Passcode Auth)
- **student1@schoolemail.com** through **student8@schoolemail.com**
- **Passcode**: `12345` for all students
- Names: Alex Smith, Blake Johnson, Casey Williams, Dana Davis, Elliott Evans, Finley Foster, Gray Garcia, Harper Harris

## 📊 Test Data Structure

### Complete Setup Includes:

**📋 Classroom Data:**
- **Teacher1**: 2 classrooms, 5 assignments, realistic submissions
- **Teacher2**: 2 classrooms, 5 assignments, cross-enrollment scenarios  
- **Teacher3**: 1 advanced classroom, 4 assignments, progression scenarios

**🔗 Student Enrollments:**
- Multi-teacher enrollments (student1 → teacher1 & teacher2)
- Multi-class enrollments (student2 → CS 101 & CS 102)
- Progression paths (student3 → intro & advanced courses)

**📁 Data Types:**
- Google Forms quiz submissions
- Google Docs assignment submissions
- Mixed content types for comprehensive testing

## 🌐 Access Points After Setup

| Service | URL | Purpose |
|---------|-----|---------|
| **Emulator UI** | http://127.0.0.1:4000 | Visual interface for all services |
| **Auth Emulator** | http://127.0.0.1:9099 | Firebase Authentication |
| **Firestore Emulator** | http://127.0.0.1:8080 | Firestore Database |
| **Functions Emulator** | http://127.0.0.1:5001 | Cloud Functions API |

## 🔧 Advanced Usage

### Custom Data Generation

```bash
# Regenerate mock data with specific parameters
cd frontend
node e2e/fixtures/regenerate-mock-data.js

# Import specific teacher data manually
curl -X POST \
  http://127.0.0.1:5001/roo-app-3d24e/us-central1/api/snapshots/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @e2e/fixtures/teacher1-snapshot.json
```

### Environment Management

```bash
# Start emulators with existing data
npm run emulators

# Start emulators fresh (no import)
cd frontend && npm run emulators:fresh

# Export current emulator data
firebase emulators:export ./my-backup

# Kill all emulators
npm run emulators:kill
```

## 🔍 Verification

After running setup, verify everything is working:

```bash
# Check emulator status
curl http://127.0.0.1:5001/roo-app-3d24e/us-central1/api/

# Test teacher login
curl -X POST \
  'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key' \
  -H 'Content-Type: application/json' \
  -d '{"email":"teacher1@test.com","password":"test123","returnSecureToken":true}'

# Browse data visually
open http://127.0.0.1:4000
```

## ⚡ Performance Tips

- **Use users-only setup** during development for faster iteration
- **Complete setup once** at the start of work session
- **Export emulator data** to preserve complex setups
- **Use persistent data** with the regular emulators command

## 🐛 Troubleshooting

**Emulators won't start:**
```bash
# Kill any stuck processes
pkill -f firebase
# Clear data and try again
rm -rf frontend/e2e/fixtures/firebase-export
npm run emulators:setup
```

**Users creation fails:**
```bash
# Make sure emulators are running first
curl http://127.0.0.1:9099 # Should not error
npm run emulators:setup-users
```

**Import fails:**
```bash
# Check authentication
# Make sure the teacher user exists before importing their data
```

## 📝 Script Locations

- **Complete Setup**: `scripts/setup-complete-test-data.sh`
- **Users Only**: `scripts/setup-test-users-only.sh`
- **User Config**: `frontend/e2e/scripts/test-users-config.ts`
- **User Creation**: `frontend/e2e/scripts/setup-test-users.ts`
- **Mock Data**: `frontend/e2e/fixtures/regenerate-mock-data.js`