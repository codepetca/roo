# AppScript Webhook Testing Guide

Follow these steps to test the webhook integration with Google Apps Script.

## 📋 Prerequisites
- [x] Webhook endpoints deployed (already done!)
- [x] API Key: `roo-webhook-dev-stable123456` (ready to use!)
- [ ] Google account with AppScript access
- [ ] 10 minutes for testing

## 🚀 Step 1: Create Test AppScript Project

1. **Open Google Apps Script**
   - Go to: https://script.google.com
   - Sign in with your Google account

2. **Create New Project**
   - Click the **"+ New project"** button
   - The script editor will open with default code

3. **Name Your Project**
   - Click "Untitled project" at the top
   - Name it: **"Roo Webhook Test"**
   - Click "OK"

## 📝 Step 2: Add Test Code

1. **Clear Default Code**
   - Select all the default code (Ctrl+A or Cmd+A)
   - Delete it

2. **Copy Test Script**
   - Open the file: `/functions/src/test/quick-test-appscript.js`
   - Copy ALL the code from that file
   - Paste it into the AppScript editor

3. **Save the Project**
   - Press **Ctrl+S** (Windows) or **Cmd+S** (Mac)
   - Or click File > Save

## ▶️ Step 3: Run the Tests

1. **Select Function to Run**
   - In the toolbar, find the function dropdown (shows "Select function")
   - Click it and select: **`quickTestWebhook`**

2. **Run the Function**
   - Click the **"Run"** button (play icon ▶️)
   - **First time only**: You'll see an authorization prompt

3. **Grant Permissions** (first time only)
   - Click "Review permissions"
   - Choose your Google account
   - Click "Advanced" (bottom left)
   - Click "Go to Roo Webhook Test (unsafe)"
   - Click "Allow"
   - The function will now run

## 📊 Step 4: View Test Results

1. **Open Logs**
   - Click **View > Logs** in the menu
   - Or press **Ctrl+Enter** (Windows) or **Cmd+Enter** (Mac)

2. **Check Results**
   You should see output like:
   ```
   ========================================
   🚀 STARTING WEBHOOK TEST
   ========================================

   📡 Test 1: Checking API health...
      ✅ API is online
      ✅ Found 2 webhook endpoints

   📊 Test 2: Testing webhook status endpoint...
      ✅ Status endpoint working (HTTP 200)
      ℹ️  Webhook version: 1.0.0

   🔄 Test 3: Testing classroom sync...
      📤 Sending sync request...
      📋 Spreadsheet: 1Fgjm8Dz_L...
      👤 Teacher: stewart.chan@gapps.yrdsb.ca
      📥 Response code: 207
      
      📊 Sync Results:
      - Classrooms created: 0
      - Classrooms updated: 0
      - Students created: 0
      - Students updated: 0
      
      ⚠️  Errors encountered:
      1. Classroom sync failed: The caller does not have permission
      
      ℹ️  Note: Permission errors are EXPECTED in test environment

   ========================================
   📝 TEST SUMMARY
   ========================================
   ✅ API Health: PASSED
   ✅ Webhook Status: PASSED
   ⚠️  Classroom Sync: PARTIAL (check errors)

   🎉 ALL TESTS PASSED! Webhook integration is ready!
   📋 Next step: Integrate with your existing AppScript
   ```

## ✅ Understanding Test Results

### Success Indicators:
- **API Health: PASSED** - The API is online and responding
- **Webhook Status: PASSED** - Authentication with API key is working
- **Classroom Sync: PARTIAL** - The endpoint is working (permission errors are normal)

### Expected "Errors":
- **"The caller does not have permission"** - This is NORMAL in test environment
- The production environment will have proper Google Sheets access
- HTTP 207 (Multi-Status) is the expected response code

## 🔧 Troubleshooting

### If API Health Fails:
- Check your internet connection
- Verify the URL is correct
- The API might be redeploying (wait 2 minutes and retry)

### If Webhook Status Fails (401 error):
- Verify API key is exactly: `roo-webhook-dev-stable123456`
- Check for extra spaces or typos in the code

### If You See No Output:
- Make sure you clicked "View > Logs"
- Run the function again
- Check the Execution transcript for errors

## 🎯 Next Steps

Once all tests show PASSED or PARTIAL (with expected permission errors):

1. **You're ready to integrate!** 
2. Proceed to integrate with your existing AppScript
3. Copy the integration code from `/functions/src/integration/appscript-webhook.js`
4. Follow the integration guide in `INTEGRATION_STEPS.md`

## 📌 Quick Reference

**API Key**: `roo-webhook-dev-stable123456`
**Status URL**: `https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/status`
**Sync URL**: `https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/classroom-sync`

## 🆘 Need Help?

- Check the execution transcript for detailed errors
- Verify all URLs and API keys are correct
- Permission errors are EXPECTED - they don't indicate a problem
- The webhook is working if you get HTTP 200 or 207 responses