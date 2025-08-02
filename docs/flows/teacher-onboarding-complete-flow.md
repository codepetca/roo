# 🎓 Complete Teacher Onboarding & Data Sync Flow

**Status**: ✅ Working as of August 2025  
**Last Updated**: 2025-08-01  

This document describes the complete end-to-end flow for teacher onboarding and data synchronization in the Roo system.

## 📋 **Overview**

Teachers go through a seamless onboarding process that:
1. Creates a Google Sheet in their Drive
2. Automatically configures permissions for webhook access
3. Provides AppScript code for data processing
4. Enables automatic sync to Firestore via webhook

## 🔄 **Complete Flow Diagram**

```
Teacher Signup → OAuth Sheet Creation → AppScript Setup → Data Processing → Webhook Sync → Firestore
      ↓               ↓                     ↓               ↓              ↓           ↓
   [Frontend]    [OAuth Service]      [Google Apps]    [AppScript]   [Firebase]  [Database]
```

---

## 🎯 **Phase 1: Teacher Onboarding**

### **Step 1: Teacher Registration**
- Teacher signs up via frontend: `/teacher/onboarding`
- Uses Google OAuth for authentication
- Stores access token for Google Drive/Sheets access

### **Step 2: Google Sheet Creation**
**Location**: `functions/src/routes/teacher-onboarding.ts:createTeacherSheetOAuth()`

```javascript
// Process flow:
1. Validate teacher authentication
2. Check if board account already has sheet
3. Create OAuth sheet template service
4. Generate sheet title: "_roo_data"
5. Create spreadsheet in teacher's Drive
6. Share with board account AND service account  ← KEY FIX
7. Update Firestore configuration
8. Generate custom AppScript code
```

### **Critical Permission Fix**
**Location**: `functions/src/services/base-sheet-service.ts:shareWithBoardAccount()`

```javascript
// Automatically shares sheet with BOTH:
// 1. Board account (teacher's institutional email)
// 2. Service account (firebase-adminsdk-fbsvc@roo-app-3d24e.iam.gserviceaccount.com)

await this.drive.permissions.create({
  fileId: spreadsheetId,
  resource: {
    role: "writer",
    type: "user", 
    emailAddress: boardAccountEmail
  }
});

await this.drive.permissions.create({
  fileId: spreadsheetId,
  resource: {
    role: "writer",
    type: "user",
    emailAddress: SERVICE_ACCOUNT_EMAIL  // ← AUTOMATIC SERVICE ACCOUNT ACCESS
  }
});
```

### **Step 3: AppScript Code Generation**
Teacher receives complete AppScript code including:
- Configuration constants
- Data processing functions
- Webhook integration code
- API authentication

---

## 🔄 **Phase 2: Data Processing & Sync**

### **Step 1: Teacher Data Collection**
- Teachers collect submissions via Google Forms
- Form responses populate Google Sheets
- Data includes assignments, submissions, answer keys

### **Step 2: AppScript Processing**
**Function**: `processAllSubmissions()`

```javascript
// Processing flow:
1. Access teacher's Google Drive folders
2. Find classroom folders (ending with "-roo")
3. Process all Google Forms in each classroom
4. Extract submissions, assignments, answer keys
5. Write consolidated data to "_roo_data" sheet
6. Call webhook to sync with Roo system
```

### **Step 3: Webhook Integration**
**Function**: `syncToRooSystem(sheetId, apiKey)`

```javascript
// Webhook call flow:
1. Determine teacher ID from sheet owner
2. Create payload with spreadsheet ID and teacher ID
3. Call Firebase webhook with API authentication
4. Process response and log results
```

### **Webhook Authentication**
- **API Key Required**: `"roo-webhook-dev-stable123456"`
- **Header**: `X-API-Key`
- **Validation**: Server validates against hardcoded dev keys

---

## 🚀 **Phase 3: Firebase Processing**

### **Step 1: Webhook Reception**
**Location**: `functions/src/routes/webhooks.ts:handleClassroomSyncWebhook()`

```javascript
// Webhook processing:
1. Validate API key authentication
2. Extract spreadsheet ID and teacher ID
3. Create classroom sync service
4. Process data from Google Sheets
5. Sync to Firestore database
6. Return results to AppScript
```

### **Step 2: Google Sheets Access**
**Location**: `functions/src/services/sheets.ts:createSheetsService()`

```javascript
// Service account authentication:
1. Use Firebase default service account
2. Access Google Sheets API with full permissions
3. Read submissions, assignments, answer keys
4. Process data for Firestore storage (no write-back to sheets)
```

### **Step 3: Firestore Sync**
**Location**: `functions/src/services/classroom-sync.ts`

```javascript
// Database synchronization:
1. Create/update classroom records
2. Create/update student records  
3. Sync assignment and submission data
4. Handle errors and partial success
5. Return comprehensive sync results
```

---

## 🔐 **Security & Authentication**

### **Google Sheets Access**
- **Service Account**: `firebase-adminsdk-fbsvc@roo-app-3d24e.iam.gserviceaccount.com`
- **Permissions**: Automatic "writer" access during sheet creation
- **Scope**: Only sheets explicitly shared during onboarding

### **Webhook Authentication** 
- **API Keys**: Hardcoded development keys
- **Production**: Should use environment variables
- **Headers**: `X-API-Key` required for all webhook calls

### **OAuth Tokens**
- **Teacher Access**: Stored in Firestore user profiles
- **Sheet Creation**: Uses teacher's Google Drive permissions
- **Sharing**: Automatically grants service account access

---

## 📊 **Data Flow**

### **1. Google Forms → Google Sheets**
```
Student Submissions → Form Responses → Sheet Rows
```

### **2. AppScript Processing**
```
Multiple Classroom Sheets → Consolidated _roo_data Sheet
```

### **3. Webhook Sync**
```
_roo_data Sheet → Firebase Functions → Firestore Database
```

### **4. Grade Display**
```
Firestore Grades → Firebase Functions → Teacher & Student Dashboards
```

---

## ✅ **Success Indicators**

### **Onboarding Success**
- ✅ Google Sheet created in teacher's Drive
- ✅ Sheet shared with both board account and service account
- ✅ AppScript code generated and provided
- ✅ Configuration stored in Firestore

### **Processing Success**
- ✅ AppScript finds and processes classroom folders
- ✅ Data consolidated in _roo_data sheet
- ✅ Webhook called with proper authentication
- ✅ Firebase function processes without permission errors

### **Sync Success**
- ✅ Classrooms created/updated in Firestore
- ✅ Students created/updated in Firestore
- ✅ Submissions synced with proper metadata
- ✅ Grades stored in Firestore for frontend display

---

## 🚨 **Common Issues & Solutions**

### **Permission Denied Errors**
**Symptom**: `403 Forbidden` or "The caller does not have permission"
**Solution**: Sheet not shared with service account (should be automatic now)

### **Invalid API Key**
**Symptom**: `401 Unauthorized` from webhook
**Solution**: Check API key in AppScript matches server validation

### **Sheet Not Found**
**Symptom**: AppScript can't access sheets
**Solution**: Verify sheet sharing permissions and IDs

### **Webhook Timeout**
**Symptom**: AppScript reports timeout
**Solution**: Check Firebase function logs for processing errors

---

## 🎯 **Key Success Factors**

1. **Automatic Service Account Sharing** - Eliminates manual permission setup
2. **Robust Error Handling** - Clear error messages guide troubleshooting  
3. **API Authentication** - Prevents unauthorized webhook access
4. **Comprehensive Logging** - Both AppScript and Firebase log detailed info
5. **Idempotent Operations** - Safe to retry processing and sync

---

**This flow represents the complete working solution as of August 2025. All components have been tested and are functioning correctly.**