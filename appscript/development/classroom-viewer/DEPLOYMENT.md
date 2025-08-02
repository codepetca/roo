# Deployment Instructions for Board Account

Since clasp is blocked in the board account, follow these manual steps:

## Step 1: Access Google Apps Script

1. Login to your board Google account
2. Go to https://script.google.com
3. Click "New Project"
4. Name it "Roo Classroom Viewer"

## Step 2: Copy Files

Copy and paste each file's content in this exact order:

### File 1: Code.gs
- In the editor, the default file should be named `Code.gs`
- Delete any existing content
- Copy all content from `Code.js` in this folder
- Paste into `Code.gs`

### File 2: index.html
- Click the "+" next to Files
- Select "HTML"
- Name it exactly: `index`
- Copy all content from `index.html`
- Paste into the new file

### File 3: styles.html
- Click the "+" next to Files
- Select "HTML"
- Name it exactly: `styles`
- Copy all content from `styles.html`
- Paste into the new file

### File 4: javascript.html
- Click the "+" next to Files
- Select "HTML"
- Name it exactly: `javascript`
- Copy all content from `javascript.html`
- Paste into the new file

## Step 3: Enable Google Classroom API

1. In the Apps Script editor, click "Services" (+ icon on left sidebar)
2. Find "Google Classroom API v1"
3. Click "Add"
4. The identifier should be "Classroom" (default)
5. Click "OK"

## Step 4: Save and Test

1. Save all files (Ctrl+S or Cmd+S)
2. Click "Run" button
3. Select `doGet` function
4. Grant permissions when prompted
5. Check execution log for any errors

## Step 5: Deploy as Web App

1. Click "Deploy" → "New Deployment"
2. Click gear icon → "Web app"
3. Fill in:
   - Description: "Classroom Viewer v1.0"
   - Execute as: "Me"
   - Who has access: "Anyone with Google account" (within your domain)
4. Click "Deploy"
5. Copy the Web App URL

## Step 6: Test the Web App

1. Open the Web App URL in a new tab
2. You should see the Classroom Viewer interface
3. Your classrooms should load automatically
4. Test clicking on classrooms to view students
5. Test the Export CSV feature

## Permissions Required

The app will request these permissions:
- View your Google Classroom classes
- View your Google Classroom class rosters
- View course work and grades in Google Classroom

## Troubleshooting

### If you see "Authorization required"
- Run the `doGet` function manually first
- Grant all requested permissions

### If classrooms don't load
- Check View → Logs for errors
- Verify Classroom API is enabled
- Ensure you have teacher access to classrooms

### For blank page
- Check that all 4 files were created correctly
- Verify file names match exactly (case-sensitive)

## Security Notes

- The app runs with YOUR permissions
- Only you can see the data (unless you change access settings)
- No data is sent to external servers
- All processing happens within Google's infrastructure