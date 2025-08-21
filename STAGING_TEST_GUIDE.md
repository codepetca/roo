# Staging Environment Test Guide - Import Fix Verification

## 🎯 Test Objective
Verify that identical JSON imports no longer show false differences due to timestamp changes.

## 📋 Prerequisites
- Frontend running at: http://localhost:5174
- Using staging Firebase (production data)
- Test credentials: `teacher@test.com` / `test123`
- Test file: `/Users/stew/Repos/vibe/roo/frontend/e2e/fixtures/classroom-snapshot-mock.json`

## 🧪 Test Steps

### Step 1: Access Application
1. Open browser to http://localhost:5174
2. Login with: `teacher@test.com` / `test123`

### Step 2: First Import (Baseline)
1. Navigate to **Data Import** → **Import JSON Snapshot**
2. Click "Choose File" and select:
   ```
   /Users/stew/Repos/vibe/roo/frontend/e2e/fixtures/classroom-snapshot-mock.json
   ```
3. Review the preview showing:
   - 3 classrooms
   - 87 assignments 
   - 1,833 submissions
4. Click **"Confirm Import"**
5. Wait for import to complete
6. Note: First import creates baseline data

### Step 3: Second Import (THE TEST)
1. Return to **Data Import** → **Import JSON Snapshot**
2. Upload the **EXACT SAME FILE** again
3. **Expected Result**: 
   - ✅ **SUCCESS**: Shows "No changes detected" or empty diff
   - ❌ **FAILURE**: Shows differences (timestamps causing false positives)

## 🔍 What's Happening Behind the Scenes

### First Import:
1. Normalizes snapshot (removes volatile timestamps)
2. Imports data to Firestore
3. Saves compressed snapshot (~178KB) to `teacher_imports` collection

### Second Import:
1. Normalizes new snapshot
2. Compares with stored compressed snapshot
3. Detects identical content → Returns empty diff
4. Skips unnecessary processing

## 📊 Verification in Firebase Console

1. Go to: https://console.firebase.google.com/project/roo-app-3d24e/firestore
2. Check `teacher_imports` collection
3. Look for document with teacher's UID
4. Should contain:
   - `compressedSnapshot`: Base64 gzip data
   - `compressionRatio`: ~0.91 (91% compression)
   - `originalSize`: ~2,200,000 bytes
   - `compressedSize`: ~178,000 bytes

## ✅ Success Criteria
- Second import shows no changes
- No false positives from timestamp differences
- Compressed snapshot stored successfully
- ~91% storage reduction achieved

## 🐛 Troubleshooting
- If differences still show: Check browser console for errors
- If import fails: Check network tab for API responses
- If no compression: Check `teacher_imports` collection exists

## 📝 Test Data Details
The test snapshot contains:
- **Teacher**: teacher@schoolemail.com
- **Classrooms**: 3 (ICS4U classes)
- **Students**: 78 total
- **Assignments**: 87 total
- **Submissions**: 1,833 total
- **Volatile Fields** (automatically normalized):
  - `snapshotMetadata.fetchedAt`
  - `snapshotMetadata.expiresAt`
  - `submissions[].updatedAt`