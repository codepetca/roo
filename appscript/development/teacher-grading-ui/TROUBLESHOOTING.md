# AppScript Teacher Grading UI - Troubleshooting Guide

## Common Issues and Solutions

### Issue: Assignments Not Showing After Classroom Selection

**Symptoms:**
- Classrooms appear in dropdown ✅
- Selecting a classroom shows "No assignments found" ❌
- Browser console shows: `📊 [Client] Raw assignment data: {assignmentCount: 0}`
- Tests pass but deployed app doesn't work

**Root Cause:**
The `CacheManager.transformClassroomsToCacheFormat()` function may be overwriting populated data arrays with empty arrays during the transformation process.

**Debugging Steps:**
1. Check browser console for assignment counts:
   ```
   📊 [Client] Raw assignment data: {assignmentCount: 0}  // Bad
   📊 [Client] Raw assignment data: {assignmentCount: 4}  // Good
   ```

2. Check if cache contains old data from before a fix:
   - Look for "Cache is valid" messages when it should be rebuilding
   - Old cached data won't have the fixes applied

**Solution:**

1. **Fix the data transformation** in `CacheManager.gs`:
   ```javascript
   // BAD - Always creates empty arrays
   assignments: [],
   students: [],
   submissions: [],
   
   // GOOD - Preserves existing data
   assignments: course.assignments || [],
   students: course.students || [],
   submissions: course.submissions || [],
   ```

2. **Force cache invalidation** by incrementing the version in `CacheManager.gs`:
   ```javascript
   CACHE_VERSION: '1.1.0', // Increment to force all caches to rebuild
   ```

3. **Deploy and test**:
   ```bash
   clasp push --force
   clasp deploy --deploymentId [YOUR_DEPLOYMENT_ID] --description "Fix cache transformation"
   ```

**Prevention:**
- Always test with a fresh cache after modifying data structures
- Add debug logging to track data through transformations
- Consider cache versioning strategy for structural changes

---

### Issue: Cache Not Updating After Code Changes

**Symptoms:**
- Code changes deployed but app behavior doesn't change
- Old data structures persist despite fixes

**Solution:**
1. Increment `CACHE_VERSION` in `CacheManager.gs`
2. Or use the "Refresh Dashboard Data" button in the UI
3. Or manually clear cache in AppScript editor console:
   ```javascript
   CacheManager.clearCache(Session.getActiveUser().getEmail())
   ```

---

### Issue: Deployment Not Updating

**Symptoms:**
- `clasp push` succeeds but changes don't appear
- Deployed app shows old behavior

**Common Mistakes:**
- Using `clasp deploy` without `--deploymentId` (creates new deployment)
- Forgetting to `clasp push` before deploying

**Correct Deployment:**
```bash
# Always use this pattern
clasp push --force
clasp deploy --deploymentId AKfycbxCACap-LCKNjYSx8oXAS2vxnjrvcXn6Weypd_dIr_wbiRPsIKh0J2Z4bMSxuK9vyM2hw --description "Your changes"
```

---

### Debugging Tips

1. **Enable comprehensive logging**:
   - Client-side: Browser console shows emoji-based logs
   - Server-side: Check AppScript editor Execution log

2. **Check data at each step**:
   - Mock data exists? ✓
   - Data passed to transformer? ✓  
   - Data preserved after transformation? ✓
   - Cache contains correct data? ✓
   - Client receives correct data? ✓

3. **Test functions in AppScript editor**:
   ```javascript
   // Run these in AppScript editor to debug
   testDashboardData()
   healthCheck()
   testRealClassroomData()
   ```

---

### Useful Debug Commands

**In Browser Console:**
```javascript
// Check current cache state
AppState.dashboardCache

// Check loaded assignments
AppState.currentClassroom?.assignments

// Force cache refresh
refreshDashboardData()
```

**In AppScript Editor:**
```javascript
// Clear cache for current user
clearDashboardCache()

// Test mock data building
testDashboardData()

// Check cache directly
const cache = CacheManager.loadDashboardCache(Session.getActiveUser().getEmail())
console.log(cache?.classrooms?.[0]?.assignments?.length)
```

---

Last Updated: January 2025