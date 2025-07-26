# Teacher Google Sheets Configuration

This document explains how to configure teacher access to Google Sheets for the Roo auto-grading system.

## Overview

The Roo system uses a **service account approach** to access teacher's personal Google Sheets. This provides:

- ✅ **Security**: No personal OAuth tokens in the backend
- ✅ **Control**: Teachers maintain full control over their sheets
- ✅ **Simplicity**: One-time setup per teacher
- ✅ **Reliability**: No token expiration issues

## Architecture

```
Board AppScript → Personal Google Sheet → Service Account → Firestore → Frontend
                      ↑                        ↑
               Teacher controls sharing    System accesses
```

## Setup Process

### 1. Teacher Creates Personal Sheet

1. Teacher creates a new Google Sheet (this will receive data from the board AppScript)
2. Teacher runs the board AppScript to populate the sheet with student data
3. Teacher notes the Google Sheets ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[SHEET-ID]/edit
   ```

### 2. Teacher Shares Sheet with Service Account

1. Teacher opens the Google Sheet
2. Clicks "Share" button
3. Adds the service account email with **Editor** permissions:
   ```
   firebase-adminsdk-xxxxx@PROJECT-ID.iam.gserviceaccount.com
   ```
4. Teacher can verify sharing by checking that the service account appears in the "People with access" list

### 3. Admin Configures System

The system administrator configures the teacher-to-sheet mapping using environment variables:

#### Environment Variable Format

```bash
TEACHER_SHEETS_CONFIG='{"teacher1@school.com":"SHEET-ID-1","teacher2@school.com":"SHEET-ID-2"}'
```

#### Example Configuration

```bash
# Single teacher
TEACHER_SHEETS_CONFIG='{"john.doe@school.com":"119EdfrPtA3G180b2EgkzVr5v-kxjNgYQjgDkLmuN02Y"}'

# Multiple teachers
TEACHER_SHEETS_CONFIG='{
  "john.doe@school.com":"119EdfrPtA3G180b2EgkzVr5v-kxjNgYQjgDkLmuN02Y",
  "jane.smith@school.com":"abc123def456ghi789jkl012mno345pqr678stu901",
  "mike.wilson@school.com":"xyz789abc123def456ghi789jkl012mno345pqr678"
}'
```

### 4. Firebase Functions Configuration

Set the environment variable in Firebase Functions:

```bash
# Set the configuration
firebase functions:config:set teacher.sheets='{"teacher@school.com":"SHEET-ID"}'

# Or use .env.local for local development
echo 'TEACHER_SHEETS_CONFIG={"teacher@test.com":"119EdfrPtA3G180b2EgkzVr5v-kxjNgYQjgDkLmuN02Y"}' > functions/.env.local
```

## Development Configuration

For development and testing, the system includes a default configuration:

```typescript
const DEFAULT_CONFIG = {
  "teacher@test.com": "119EdfrPtA3G180b2EgkzVr5v-kxjNgYQjgDkLmuN02Y",
  "demo@teacher.com": "119EdfrPtA3G180b2EgkzVr5v-kxjNgYQjgDkLmuN02Y"
};
```

## Authentication Flow

### Current Implementation (Development)

```
Frontend → API Endpoint → Default teacher ("teacher@test.com") → Configured sheet
```

### Future Implementation (Production)

```
Frontend → Teacher Login → Firebase Auth → API Endpoint → Teacher's email → Configured sheet
```

## API Usage

### Sync Endpoints

The sync endpoints now require teacher identification:

```bash
# Default behavior (uses teacher@test.com)
curl -X POST http://localhost:5001/PROJECT/us-central1/api/sync/all

# Specify teacher in request body
curl -X POST http://localhost:5001/PROJECT/us-central1/api/sync/all \
  -H "Content-Type: application/json" \
  -d '{"teacherEmail": "john.doe@school.com"}'

# Specify teacher in Authorization header
curl -X POST http://localhost:5001/PROJECT/us-central1/api/sync/all \
  -H "Authorization: Teacher john.doe@school.com"
```

### Error Responses

If a teacher is not configured:

```json
{
  "success": false,
  "error": "Teacher john.doe@school.com is not configured for sheets access",
  "message": "Teacher john.doe@school.com needs to be configured with a Google Sheets ID"
}
```

## Security Considerations

1. **Service Account Permissions**: The service account only has access to sheets explicitly shared with it
2. **Teacher Control**: Teachers can revoke access at any time by removing the service account from their sheet sharing
3. **No Personal Data**: The service account doesn't have access to teachers' personal Google accounts
4. **Audit Trail**: All access is logged in Firebase Functions logs

## Troubleshooting

### Common Issues

1. **"No spreadsheet configured" Error**
   - Check that the teacher's email is in the `TEACHER_SHEETS_CONFIG`
   - Verify the sheet ID is correct

2. **"Permission denied" Error**
   - Ensure the teacher has shared the sheet with the service account
   - Verify the service account has "Editor" permissions

3. **"Spreadsheet not found" Error**
   - Check that the sheet ID in the configuration is correct
   - Ensure the sheet exists and is accessible

### Verification Steps

1. **Check Configuration**:
   ```bash
   # Test if teacher is configured
   curl http://localhost:5001/PROJECT/us-central1/api/sheets/test
   ```

2. **Test Sheet Access**:
   ```bash
   # Test direct sheet access
   curl http://localhost:5001/PROJECT/us-central1/api/sheets/assignments
   ```

3. **Check Logs**:
   ```bash
   # View Firebase Functions logs
   firebase functions:log
   ```

## Migration Guide

### From Hardcoded Sheet ID

If upgrading from a system with hardcoded sheet IDs:

1. Note the current hardcoded sheet ID
2. Add it to the teacher configuration for the appropriate teacher
3. Update the environment variables
4. Deploy the new configuration
5. Test the sync functionality

### Adding New Teachers

1. Teacher completes steps 1-2 (create sheet, share with service account)
2. Admin adds teacher to `TEACHER_SHEETS_CONFIG`
3. Deploy updated configuration
4. Teacher can begin using sync functionality

## Next Steps

- [ ] Implement proper Firebase Authentication integration
- [ ] Add teacher management dashboard
- [ ] Create automated teacher onboarding process
- [ ] Add monitoring and alerting for sync failures