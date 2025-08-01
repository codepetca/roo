# 🔧 Roo Integration Troubleshooting Guide

**Last Updated**: 2025-08-01  
**Status**: Based on working solution

This guide helps diagnose and fix common issues with the Roo teacher onboarding and webhook integration system.

---

## 🚨 **Common Issues & Solutions**

### **1. Permission Denied Errors**

#### **Symptom**: 
```
"The caller does not have permission"
"403 Forbidden" 
"GaxiosError: The caller does not have permission"
```

#### **Root Cause**:
Google Sheet not shared with Firebase service account

#### **Solution for NEW Sheets**:
✅ **FIXED**: New sheets created through onboarding automatically include service account permissions

#### **Solution for EXISTING Sheets**:
1. Open your Google Sheet: `https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit`
2. Click **"Share"** button (top right)
3. Add email: `firebase-adminsdk-fbsvc@roo-app-3d24e.iam.gserviceaccount.com`
4. Set permissions to **"Editor"**
5. Click **"Send"**
6. Test webhook again

#### **Verification**:
```javascript
// In AppScript, run testWithSampleSheet() - should succeed
```

---

### **2. Invalid API Key Errors**

#### **Symptom**:
```
"Invalid API key" 
"401 Unauthorized"
"Webhook called with invalid API key"
```

#### **Root Cause**:
AppScript not configured with valid API key

#### **Solution**:
**Option A - Use hardcoded key (recommended for testing)**:
```javascript
function getStoredApiKey() {
  return "roo-webhook-dev-stable123456";
}
```

**Option B - Store in AppScript properties**:
```javascript
function setupBoardApiKey() {
  const properties = PropertiesService.getScriptProperties();
  properties.setProperty('ROO_BOARD_API_KEY', 'roo-webhook-dev-stable123456');
  console.log("✅ API key configured");
}
```

#### **Verification**:
Check Firebase logs - should see successful webhook calls, not 401 errors

---

### **3. AppScript Function Not Found**

#### **Symptom**:
```
"ReferenceError: syncToRooSystem is not defined"
"ReferenceError: getStoredApiKey is not defined"
```

#### **Root Cause**:
Missing functions in AppScript project

#### **Solution**:
Add these functions to your AppScript:

```javascript
/**
 * Sync processed data to Roo system
 */
function syncToRooSystem(sheetId, apiKey) {
  try {
    console.log("🔗 Calling Roo webhook...");
    
    const teacherId = determineTeacherId(sheetId);
    const payload = {
      spreadsheetId: sheetId,
      teacherId: teacherId,
      timestamp: new Date().toISOString(),
      source: 'board-webapp'
    };
    
    const response = UrlFetchApp.fetch(BOARD_CONFIG.WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();
    
    console.log("📥 Webhook response code:", responseCode);
    console.log("📥 Webhook response:", responseText);
    
    if (responseCode >= 200 && responseCode < 300) {
      return { success: true, data: JSON.parse(responseText).data };
    } else {
      return { 
        success: false, 
        error: `Webhook failed (${responseCode}): ${responseText}` 
      };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Determine teacher ID from sheet or context
 */
function determineTeacherId(sheetId) {
  try {
    const sheet = SpreadsheetApp.openById(sheetId);
    const owner = sheet.getOwner();
    if (owner && owner.getEmail()) {
      return owner.getEmail();
    }
  } catch (error) {
    console.log("⚠️ Could not get sheet owner:", error.message);
  }
  
  return Session.getActiveUser().getEmail();
}

/**
 * Get stored API key
 */
function getStoredApiKey() {
  return "roo-webhook-dev-stable123456";
}

/**
 * Configuration constants
 */
const BOARD_CONFIG = {
  WEBHOOK_URL: 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/classroom-sync',
  API_KEY_PROPERTY: 'ROO_BOARD_API_KEY'
};
```

---

### **4. Webhook Timeout Issues**

#### **Symptom**:
```
"Request timeout"
"Script timeout" 
AppScript stops at webhook call
```

#### **Root Cause**:
Large datasets or slow Firebase processing

#### **Solution**:
1. **Check Firebase logs** for processing errors
2. **Reduce data size** - test with smaller datasets first
3. **Increase timeout** in AppScript (if needed):
```javascript
const response = UrlFetchApp.fetch(BOARD_CONFIG.WEBHOOK_URL, {
  // ... other options
  muteHttpExceptions: true,
  'timeout': 60 // 60 seconds instead of 30
});
```

#### **Verification**:
Monitor Firebase function logs during webhook processing

---

### **5. Sheet Structure Issues**

#### **Symptom**:
```
"No data found in sheet"
"Invalid sheet format"
Data not syncing properly
```

#### **Root Cause**:
Google Sheet missing required tabs or headers

#### **Solution**:
Ensure your sheet has these tabs with correct headers:

**Sheet1 (Assignments)**:
```
Assignment ID | Course ID | Title | Description | Due Date | Max Points | Submission Type | Created Date
```

**Submissions**:
```
Submission ID | Assignment Title | Course ID | First Name | Last Name | Email | Submission Text | Submission Date | Current Grade | Grading Status | Max Points | Source Sheet Name | Assignment Description | Last Processed | Source File ID | Is Quiz | Form ID
```

**Answer Keys**:
```
Form ID | Assignment Title | Course ID | Question Number | Question Text | Question Type | Points | Correct Answer | Answer Explanation | Grading Strictness
```

#### **Verification**:
Check AppScript logs - should see submission counts, not "No data found"

---

### **6. Firebase Function Deployment Issues**

#### **Symptom**:
```
"Function not found"
"404 Not Found" responses
Webhook URL not accessible
```

#### **Root Cause**:
Firebase functions not deployed or outdated

#### **Solution**:
```bash
cd /path/to/roo/functions
npm run build
firebase deploy --only functions:api
```

#### **Verification**:
Test webhook URL directly:
```bash
curl -X GET https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/status \
  -H "X-API-Key: roo-webhook-dev-stable123456"
```

Should return status information.

---

## 🔍 **Diagnostic Tools**

### **1. AppScript Debugging**

#### **Check Execution Logs**:
1. In Google Apps Script: **View → Executions**
2. Click on recent execution
3. Look for error messages and webhook responses

#### **Test Functions Individually**:
```javascript
// Test webhook connection
function testBoardConnection() {
  const apiKey = getStoredApiKey();
  const response = UrlFetchApp.fetch(BOARD_CONFIG.STATUS_URL, {
    method: 'GET',
    headers: { 'X-API-Key': apiKey },
    muteHttpExceptions: true
  });
  console.log("Status:", response.getResponseCode());
  console.log("Response:", response.getContentText());
}

// Test data processing
function testSheetProcessing() {
  const result = processTeacherSheet(CONFIG.PERSONAL_SPREADSHEET_ID);
  console.log("Processing result:", result);
}

// Test webhook call
function testWebhookCall() {
  const result = syncToRooSystem(CONFIG.PERSONAL_SPREADSHEET_ID, getStoredApiKey());
  console.log("Webhook result:", result);
}
```

### **2. Firebase Function Debugging**

#### **Check Function Logs**:
```bash
firebase functions:log --only api
```

#### **Monitor Real-time**:
```bash
firebase functions:log --only api --follow
```

#### **Check Specific Errors**:
```bash
firebase functions:log --only api | grep -i error
```

### **3. Google Sheets Access Testing**

#### **Verify Service Account Access**:
1. Open Google Sheet in browser
2. Click **"Share"** → **"Advanced"**  
3. Look for `firebase-adminsdk-fbsvc@roo-app-3d24e.iam.gserviceaccount.com`
4. Should have **"Editor"** permissions

#### **Test Manual Access**:
Try accessing sheet URL directly - should not require login if shared properly.

---

## 📊 **Health Check Procedures**

### **1. Complete System Test**

Run this sequence to test end-to-end functionality:

```javascript
// In AppScript - run these functions in order:
1. showBoardStatus()        // Check configuration
2. testBoardConnection()    // Test webhook connectivity  
3. testSheetProcessing()    // Test data processing
4. testWebhookCall()        // Test full webhook flow
5. processAllSubmissions()  // Full end-to-end test
```

### **2. Expected Success Outputs**

#### **AppScript Logs Should Show**:
```
✅ Board connection successful!
📊 Found X submissions
🔗 Calling Roo webhook...
📥 Webhook response code: 200 (or 207)
✅ Sync successful
```

#### **Firebase Logs Should Show**:
```
Webhook classroom sync initiated
Successfully created Sheets service  
Webhook classroom sync completed
```

### **3. Performance Benchmarks**

#### **Normal Response Times**:
- Webhook connection: < 5 seconds
- Data processing: < 30 seconds  
- Full sync: < 2 minutes

#### **Warning Signs**:
- Webhook timeouts (> 30 seconds)
- Multiple retry attempts
- Large error counts in responses

---

## ⚡ **Quick Fix Checklist**

When something isn't working, try these in order:

### **✅ Level 1 - Basic Checks**
- [ ] Firebase functions deployed recently?
- [ ] AppScript saved after code changes?
- [ ] API key configured in AppScript?
- [ ] Google Sheet shared with service account?

### **✅ Level 2 - Connectivity**  
- [ ] Test webhook status endpoint
- [ ] Check Firebase function logs
- [ ] Verify AppScript execution logs
- [ ] Test Google Sheets access

### **✅ Level 3 - Data Issues**
- [ ] Check sheet structure and headers
- [ ] Verify data formats
- [ ] Test with minimal dataset
- [ ] Check Firestore data consistency

### **✅ Level 4 - Advanced Debugging**
- [ ] Enable detailed logging
- [ ] Test individual components
- [ ] Check network connectivity
- [ ] Review authentication tokens

---

## 🆘 **Emergency Recovery**

### **If Everything Breaks**:

1. **Reset AppScript**:
   - Copy fresh code from onboarding
   - Clear all script properties
   - Reconfigure API key

2. **Reset Firebase**:
   - Redeploy all functions
   - Check environment variables
   - Verify service account permissions

3. **Reset Google Sheet**:
   - Create new `_roo_data` sheet
   - Share with service account manually
   - Copy data from old sheet if needed

4. **Test Incrementally**:
   - Start with basic webhook test
   - Add data processing step by step
   - Verify each component works

---

## 📞 **Getting Help**

### **Log Collection for Support**:

1. **AppScript Logs**:
   - View → Executions → Copy error details
   - Include function names and timestamps

2. **Firebase Logs**:
   ```bash
   firebase functions:log --only api > firebase-logs.txt
   ```

3. **System Information**:
   - Google Sheet ID
   - Teacher email
   - Timestamp of error
   - AppScript project ID

### **Common Support Scenarios**:
- **New Teacher Setup**: Follow complete onboarding flow
- **Existing Teacher Issues**: Focus on permission and API key checks  
- **Data Sync Problems**: Check sheet structure and Firebase logs
- **Performance Issues**: Review dataset size and processing times

---

**This troubleshooting guide covers the most common issues encountered in the Roo integration system. Keep it updated as new issues are discovered and resolved.**