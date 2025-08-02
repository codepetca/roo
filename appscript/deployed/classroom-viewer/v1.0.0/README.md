# Classroom Viewer MVP

A simple Google Apps Script web app that displays teacher's classrooms and student information using the Google Classroom API.

## Features

- View all active classrooms
- See student counts and enrollment statistics
- View detailed student lists with emails and student numbers
- Export all data to CSV
- Clean, responsive Material Design interface

## Setup Instructions

### 1. Development Setup (using clasp)

```bash
# Navigate to this directory
cd appscript/development/classroom-viewer

# Login to your Google account
clasp login

# Create new Apps Script project
clasp create --title "Roo Classroom Viewer" --type webapp

# Push code to Google
clasp push

# Open in browser
clasp open
```

### 2. Enable Classroom API

1. In Apps Script editor, click "Services" (+)
2. Find "Google Classroom API" 
3. Click "Add"
4. Save the project

### 3. Deploy as Web App

1. Click "Deploy" → "New Deployment"
2. Type: Web app
3. Execute as: Me
4. Who has access: Only myself (for testing)
5. Click "Deploy"
6. Copy the Web App URL

### 4. Manual Setup (for Board Account)

If clasp is blocked:

1. Go to script.google.com
2. Create new project
3. Copy each file's content:
   - `Code.js` → Code.gs
   - `index.html` → index.html
   - `styles.html` → styles.html
   - `javascript.html` → javascript.html
4. Enable Classroom API (see step 2 above)
5. Deploy as Web App

## Testing

1. Open the Web App URL
2. You should see your classrooms load automatically
3. Click on any classroom to view students
4. Use Export CSV to download all data

## Key Functions

- `getClassroomsWithStudents()` - Fetches all classrooms with student details
- `getClassroomStats()` - Calculates summary statistics
- `exportClassroomData()` - Generates CSV export

## Student Number Discovery

The student number is extracted from the email address:
- Email: `440030068@gapps.yrdsb.ca`
- Student Number: `440030068`

## Troubleshooting

### "Failed to load classrooms"
- Make sure Classroom API is enabled
- Check that you have teacher access to classrooms
- View logs: View → Logs

### No classrooms showing
- Verify you have active courses where you're listed as teacher
- Check courseStates filter in Code.js

## Next Steps

This MVP can be extended to:
- Add assignment viewing
- Integrate with auto-grading
- Add submission tracking
- Connect to Firebase for data sync