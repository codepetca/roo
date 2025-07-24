# Google Sheets Workflow for Roo Auto-Grading

## Overview
Since direct Google Classroom API access is blocked by your school district, we use Google Apps Script to export classroom data to your personal Google Sheets, then read from those sheets via Firebase.

## Architecture Flow

```
Google Classroom → Apps Script → Personal Google Sheets → Firebase Functions → Auto-Grading
```

## Setup Steps

### 1. Create Google Sheets Structure

Create a new Google Spreadsheet in your personal account with these sheets:

#### Sheet 1: "Assignments"
| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H |
|----------|----------|----------|-----------|-----------|-----------|-----------|-----------|
| Assignment ID | Course ID | Title | Description | Due Date | Max Points | Submission Type | Created Date |

#### Sheet 2: "Submissions" 
| Column A | Column B | Column C | Column D | Column E | Column F | Column G | Column H | Column I | Column J | Column K |
|----------|----------|----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|-----------|
| Submission ID | Assignment ID | Student ID | Student Name | Student Email | Submission Text | Submission Date | Status | Current Grade | Submission Type | Source File ID |

### 2. Grant Board Account Access

**IMPORTANT**: Share your personal Google Sheets with your board account email address and give it **Editor** permissions.

### 3. Google Apps Script Setup (Board Account)

1. Log into your **board Google account**
2. Go to [script.google.com](https://script.google.com)
3. Create a new standalone project
4. Copy the code from `board-appscript.gs`
5. Update the CONFIG section with your specific values:
   - **PERSONAL_SPREADSHEET_ID**: Get from your Google Sheets URL
   - **CALENDAR_ID**: Usually your email address
   - **CLASSROOMS_PARENT_FOLDER_NAME**: `'classrooms'` (should work as-is)
   - **ROO_SUFFIX**: `'-roo'` (only processes folders ending with this)
   - **EXCLUDED_FOLDER_NAMES**: Already set to `['_old_classrooms', 'staff', 'clubs']`

### 4. Apps Script Features

The unified board account script:
- ✅ Processes Google Forms submissions directly
- ✅ Extracts content from student Docs/Sheets/Slides
- ✅ Enriches assignments with Google Calendar due dates
- ✅ Writes everything to your personal sheets (complete overwrite)
- ✅ Runs automatically on scheduled triggers

### 5. Firebase Configuration

Set your spreadsheet ID as a Firebase parameter:

```bash
firebase functions:config:set SHEETS_SPREADSHEET_ID="YOUR_SPREADSHEET_ID_HERE"
```

### 6. Enable Auto-Grading for Specific Classrooms

**Opt-in by folder naming**: Rename Google Drive folders (not classroom names) to end with `-roo`:
- `10 CS P3` → `10 CS P3-roo` 
- `11 AP CSA P1` → `11 AP CSA P1-roo`

**Benefits of this approach**:
- ✅ Explicit opt-in prevents accidental processing
- ✅ Easy to enable/disable by renaming folders  
- ✅ Keeps classroom names unchanged in Google Classroom
- ✅ Clear visual indicator of which classes use auto-grading

### 7. Enable Google Sheets API

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library/sheets.googleapis.com?project=roo-app-3d24e)
2. Enable the Google Sheets API
3. Your Firebase service account will automatically have access

## Testing the Integration

### 1. Test Sheets Connection
```bash
curl "https://us-central1-roo-app-3d24e.cloudfunctions.net/api/sheets/test"
```

### 2. Get Assignments from Sheets
```bash
curl "https://us-central1-roo-app-3d24e.cloudfunctions.net/api/sheets/assignments"
```

### 3. Get Submissions for an Assignment
```bash
curl -X POST "https://us-central1-roo-app-3d24e.cloudfunctions.net/api/sheets/submissions" \
  -H "Content-Type: application/json" \
  -d '{"assignmentId": "your-assignment-id"}'
```

## Auto-Grading Workflow

1. **Apps Script** regularly exports classroom data to sheets
2. **Firebase Function** polls for ungraded submissions
3. **Gemini AI** grades the submissions
4. **Firebase** writes grades back to the sheet
5. **Apps Script** (optional) can sync grades back to Classroom

## Benefits of This Approach

✅ **Bypasses school restrictions** - Uses your personal Google account
✅ **Maintains data separation** - School data stays in your control
✅ **Automated pipeline** - Once set up, runs automatically
✅ **Audit trail** - All data visible in sheets for transparency
✅ **Flexible** - Easy to modify data structure as needed

## Security Considerations

- Sheets contain student data - ensure proper access controls
- Use Firebase secrets for API keys
- Log all grading actions for audit purposes
- Consider data retention policies for student information

## Next Steps

1. Create the Google Sheets with the structure above
2. Get the spreadsheet ID and configure Firebase
3. Enable Google Sheets API
4. Test the connection
5. Create the Apps Script for data export
6. Build the auto-grading workflow