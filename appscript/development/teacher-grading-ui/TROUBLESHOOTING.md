# Teacher Grading UI - Troubleshooting Guide

## Common Issues & Quick Fixes

### 📝 **No Student Submissions Showing**
**Problem**: Assignments display but clicking shows 0 submissions
**Solution**: Clear cache to reload fresh data
```javascript
// In browser console (F12)
clearCache()
```
**Alternative**: Click 🔄 Refresh button in header

### 📚 **No Assignments After Selecting Classroom**
**Problem**: Cache has old data structure
**Solution**: Force cache rebuild by incrementing version in `CacheManager.gs`:
```javascript
CACHE_VERSION: '1.2.0', // Increment number
```

### 🚀 **Deployment Not Working**
**Problem**: `clasp push` alone doesn't update live web app
**Solution**: Always push AND deploy:
```bash
clasp push
clasp deploy --deploymentId AKfycbxCACap-LCKNjYSx8oXAS2vxnjrvcXn6Weypd_dIr_wbiRPsIKh0J2Z4bMSxuK9vyM2hw --description "Changes"
```

## Debug Commands

### Browser Console (F12)
```javascript
clearCache()                    // Clear cache and reload
AppState.dashboardCache        // Check cached data
refreshDashboardData()         // Manual refresh
```

### Apps Script Editor
```javascript
clearDashboardCache()          // Clear server cache
testDashboardData()           // Test mock data
healthCheck()                 // System health check
```

## When to Clear Cache
- After updating MockData.js
- When submissions/assignments don't show
- After changing data structures
- When seeing old data after code changes

## Development Flow
1. **Make changes** to code/mock data
2. **Push and deploy**: `clasp push && clasp deploy --deploymentId [ID]`
3. **Clear cache**: `clearCache()` in browser console
4. **Test**: Verify changes work correctly

---
*Keep this file concise - detailed explanations go in README.md*