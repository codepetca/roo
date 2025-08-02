# OAuth Scope Fix for Board Account

The 403 error indicates insufficient authentication scopes. Here's how to fix it:

## Problem
Board accounts often have stricter permission requirements than personal accounts.

## Solution 1: Update OAuth Scopes (Automatic)

I've updated the `appsscript.json` with broader scopes:

```json
"oauthScopes": [
  "https://www.googleapis.com/auth/classroom.courses",
  "https://www.googleapis.com/auth/classroom.rosters", 
  "https://www.googleapis.com/auth/classroom.profile.emails",
  "https://www.googleapis.com/auth/classroom.profile.photos",
  "https://www.googleapis.com/auth/script.external_request",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile"
]
```

## Solution 2: Manual Authorization Reset

In your board account Apps Script project:

1. **Clear existing permissions**:
   - Go to Project Settings (gear icon)
   - Scroll to "OAuth Scopes"
   - Click "Reset permissions"

2. **Update appsscript.json**:
   - Copy the updated scopes from the new `BUNDLE.gs`
   - Or manually update the manifest file

3. **Re-authorize**:
   - Run `doGet()` function
   - Grant ALL new permissions when prompted
   - Don't skip any permission requests

## Solution 3: Alternative Approach

If scopes still don't work, try this modified function:

```javascript
function testBoardAccess() {
  try {
    // Try different API endpoints
    const endpoints = [
      'https://classroom.googleapis.com/v1/courses?pageSize=1',
      'https://classroom.googleapis.com/v1/courses?teacherId=me&pageSize=1'
    ];
    
    const token = ScriptApp.getOAuthToken();
    console.log("Token available:", !!token);
    
    for (let url of endpoints) {
      console.log("Testing:", url);
      
      const response = UrlFetchApp.fetch(url, {
        headers: {
          'Authorization': 'Bearer ' + token
        },
        muteHttpExceptions: true
      });
      
      console.log("Response code:", response.getResponseCode());
      
      if (response.getResponseCode() === 200) {
        console.log("✅ Success with:", url);
        return true;
      } else {
        console.log("❌ Error response:", response.getContentText().substring(0, 200));
      }
    }
    
  } catch (error) {
    console.log("❌ Exception:", error.toString());
  }
  
  return false;
}
```

## Updated Files

- `BUNDLE.gs` - Regenerated with new scopes
- `appsscript.json` - Updated OAuth permissions

## Next Steps

1. Copy the NEW `BUNDLE.gs` to your board account
2. Run the setup function
3. The broader scopes should resolve the 403 error

If it still doesn't work, the board account may have additional restrictions that require IT admin approval.