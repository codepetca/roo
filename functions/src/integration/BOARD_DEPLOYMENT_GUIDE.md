# 🚀 Board Web App Deployment Guide

This guide walks you through deploying the Roo Board Integration as a web app that all teachers can use.

## 📋 Overview

You'll create a web app that:
- ✅ Receives sheet IDs via URL parameters (secure)
- ✅ Uses a single stored API key (you control it)
- ✅ Processes teacher sheets and syncs to Roo
- ✅ Can be used by all teachers without API key management

## 🎯 Final Result

Teachers will use URLs like:
```
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?sheetId=1ABC123...
```

## 📁 Step 1: Create the AppScript Project

1. **Go to Google Apps Script**
   - Visit: https://script.google.com
   - Sign in with your Google account

2. **Create New Project**
   - Click **"+ New project"**
   - Name it: **"Roo Board Integration"**

3. **Add the Code**
   - Delete the default `function myFunction() {}` code
   - Copy ALL code from `/functions/src/integration/BoardWebAppScript.gs`
   - Paste into the AppScript editor
   - Save the project (Ctrl+S or Cmd+S)

## ⚙️ Step 2: Deploy as Web App

1. **Click Deploy Button**
   - In the AppScript editor, click **"Deploy"** (top right)
   - Select **"New deployment"**

2. **Configure Deployment**
   - **Type**: Select **"Web app"**
   - **Description**: "Roo Board Integration v1.0"
   - **Execute as**: **"Me"** (your account) ← IMPORTANT!
   - **Who has access**: **"Anyone with Google account"** ← IMPORTANT!

3. **Authorize**
   - Click **"Deploy"**
   - Click **"Authorize access"**
   - Choose your Google account
   - Click **"Advanced"** → **"Go to Roo Board Integration (unsafe)"**
   - Click **"Allow"**

4. **Copy the Web App URL**
   - You'll get a URL like: `https://script.google.com/macros/s/ABC123.../exec`
   - **Save this URL** - teachers will use it!

## 🔧 Step 3: Configure the API Key

1. **In the AppScript Editor**
   - Find the function dropdown at the top
   - Select: **`setupBoardApiKey`**
   - Click **"Run"**
   - Grant permissions if prompted

2. **Check the Logs**
   - Click **View → "Logs"**
   - You should see:
   ```
   === SETTING UP BOARD API KEY ===
   ✅ Board API key configured
   API Key preview: roo-board-in...
   === TESTING BOARD CONNECTION ===
   Status response code: 200
   ✅ Board connection successful!
   ```

3. **If Connection Fails**
   - First deploy the updated webhook (see Step 4)
   - Then run `setupBoardApiKey` again

## 🚀 Step 4: Deploy Updated Webhook

The webhook needs to recognize the new board API key:

1. **In Terminal (in the roo project directory)**:
   ```bash
   cd /Users/stew/Repos/vibe/roo/functions
   npm run build
   firebase deploy --only functions:api
   ```

2. **Wait for Deployment**
   - This may take 2-3 minutes
   - You'll see: `✔ functions[api(us-central1)] Deployment complete`

3. **Test the Connection**
   - Back in AppScript, run `testBoardConnection`
   - Should show: "✅ Board connection successful!"

## ✅ Step 5: Test the Web App

1. **Test with Sample Sheet**
   - In AppScript, run function: `testWithSampleSheet`
   - Or replace the sheet ID in that function with one you can access
   - Check logs for success

2. **Test via URL**
   - Open a browser tab
   - Go to: `YOUR_WEB_APP_URL?sheetId=ACTUAL_SHEET_ID`
   - Should see JSON response with `"success": true`

3. **Test Error Handling**
   - Try: `YOUR_WEB_APP_URL?sheetId=invalid`
   - Should see: `"success": false, "error": "Invalid sheet ID format"`

## 📋 Step 6: Document for Teachers

Create instructions for teachers:

### For Teachers: How to Use the Roo Integration

1. **Get your Google Sheet ID**
   - Open your sheet in Google Sheets
   - Copy the ID from the URL (the long string between `/d/` and `/edit`)

2. **Visit the integration URL**
   ```
   https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec?sheetId=YOUR_SHEET_ID
   ```

3. **Share your sheet with the integration**
   - Share your Google Sheet with: `YOUR_EMAIL@gmail.com`
   - Give "Editor" access

4. **Results**
   - Success: `{"success": true, "data": {...}}`
   - Error: `{"success": false, "error": "..."}`

## 🔧 Maintenance Functions

Use these functions in AppScript for maintenance:

- **`showBoardStatus()`** - Check current configuration
- **`testBoardConnection()`** - Test webhook connection
- **`clearBoardConfig()`** - Reset configuration
- **`setupBoardApiKey()`** - Reconfigure API key

## 🔍 Troubleshooting

### "Script function not found" Error
- Make sure you saved the AppScript after pasting the code
- Check that all functions are present in the editor

### "Permission denied" on Sheets
- Teacher needs to share their sheet with your email
- Must give "Editor" or "Viewer" access

### "Invalid API key" in Logs
- Run `setupBoardApiKey()` in AppScript
- Deploy the updated webhook code
- Run `testBoardConnection()` to verify

### "Cannot access sheet" Error
- Sheet must be shared with your Google account
- Sheet ID must be valid (44+ characters)

### Web App Returns Error Page
- Check deployment settings: "Execute as: Me"
- Check access: "Anyone with Google account"
- Redeploy if settings were wrong

## 📊 Monitoring

**Check Usage:**
- AppScript: View → "Executions" shows all requests
- Firebase: Functions logs show webhook calls

**Check Last Sync:**
- Run `showBoardStatus()` in AppScript

## 🎉 Success Indicators

Your deployment is working when:
- ✅ `testBoardConnection()` shows successful connection  
- ✅ Web app URL responds with JSON
- ✅ Test sheet processing completes
- ✅ Firebase logs show successful webhook calls
- ✅ Teachers can use the URL with their sheet IDs

## 🔒 Security Notes

- ✅ **API key is secure** - stored in AppScript properties, never exposed
- ✅ **Only sheet IDs in URLs** - no sensitive data exposed
- ✅ **You control access** - can disable deployment anytime
- ✅ **Teachers can't see code** - they only use the URL
- ✅ **Audit trail** - all usage logged in AppScript executions

---

**Next Steps**: Once deployed, teachers just need the web app URL and their sheet IDs. No API key management required!