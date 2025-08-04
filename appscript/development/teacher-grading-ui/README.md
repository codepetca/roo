# Roo Teacher Grading Portal

A comprehensive AppScript-based web application for grading student assignments and managing classrooms with AI assistance.

## 🤖 **AI Assistant Guide - READ FIRST**

**CRITICAL**: This is an **AppScript-based web application**, NOT a traditional web app with build tools.

### **Development Model**
- **Platform**: Google Apps Script (NOT SvelteKit/React/Vue)
- **Deployment**: Direct AppScript deployment (NO webpack/vite/build process)
- **Architecture**: Mock-first development with API Gateway pattern
- **UI Framework**: Vanilla JavaScript + HTML components + CSS (NO frontend frameworks)

### **Complete Development Workflow**
```bash
# 1. Edit files locally
# 2. Upload to Apps Script editor
clasp push

# 3. Update live web app (REQUIRED - push alone doesn't update live app)
clasp deploy --deploymentId AKfycbxCACap-LCKNjYSx8oXAS2vxnjrvcXn6Weypd_dIr_wbiRPsIKh0J2Z4bMSxuK9vyM2hw --description "Update description"

# 4. Test in browser with console open (F12)
```

### **Key Pain Points & Solutions**
- **❌ Common Mistake**: Running `clasp push` and expecting live web app to update
- **✅ Correct Flow**: Always run `clasp deploy --deploymentId [ID]` after `clasp push`
- **❌ UI Not Loading**: Test server functions in Apps Script editor first, then check browser console
- **✅ Debug Process**: Browser console shows client errors, Apps Script logs show server errors

### **Architecture Pattern**
```javascript
// API Gateway switches between mock and real data
const CONFIG = {
  USE_MOCK: true,  // Toggle for instant demo vs real APIs
  API_BASE_URL: 'https://firebase-functions-url',
  API_KEY: 'api-key'
};
```

## Features

### 🎯 **Core Functionality**
- **Classroom Management**: View and select from teacher's Google Classroom courses
- **Assignment Overview**: Browse coding assignments and quizzes with status indicators
- **Student Submissions**: Review individual student work with detailed content display
- **AI-Powered Grading**: Automated grading with confidence scores and feedback
- **Batch Operations**: Grade multiple submissions simultaneously
- **Manual Override**: Teachers can modify AI grades and feedback
- **Export Capabilities**: Generate CSV reports of grades

### 🤖 **AI Integration**
- Mock AI grading with realistic processing delays
- Confidence scoring for AI recommendations
- Customizable feedback based on assignment type
- Support for both coding and quiz assignments

### 🎨 **Modern UI/UX**
- Responsive design for desktop and tablet use
- Clean, professional interface inspired by Google Workspace
- Real-time status updates and progress indicators
- Keyboard shortcuts for efficient workflow
- Toast notifications for user feedback

## Architecture

### **API Gateway Pattern**
The application uses a centralized API gateway (`ApiGateway.js`) that can switch between mock data and real API calls:

```javascript
const CONFIG = {
  USE_MOCK: true,  // Toggle between mock and real APIs
  API_BASE_URL: 'https://your-firebase-functions-url/api/v2',
  API_KEY: 'your-api-key-here'
};
```

### **File Structure**
```
appscript/development/teacher-grading-ui/
├── Code.js              # Main entry point & routing
├── ApiGateway.js        # Central API gateway
├── MockData.js          # Comprehensive test data
├── index.html           # Main layout structure
├── styles.html          # Modern UI styling
├── javascript.html      # Client-side application logic
├── sidebar.html         # Navigation component
├── grading-modal.html   # Grading interface
├── appsscript.json      # AppScript manifest
└── README.md           # This documentation
```

## 🏗️ **Architecture Decisions & Rationale**

### **Why AppScript Instead of SvelteKit Frontend?**
1. **Integrated Google Ecosystem**: Direct access to Google Classroom APIs without CORS issues
2. **No Authentication Complexity**: Built-in Google OAuth integration
3. **Simplified Deployment**: No build pipeline, hosting, or server management
4. **Teacher Familiarity**: Teachers already use Google Workspace tools

### **Component Architecture**
```javascript
// HTML Files as Components (NOT React/Vue components)
index.html          // Main layout container
├── sidebar.html    // Navigation component  
├── grading-modal.html  // Detailed grading interface
└── styles.html     // Shared CSS styles

// Vanilla JavaScript State Management  
const AppState = {
  currentUser: null,
  classrooms: [],
  currentClassroom: null,
  currentAssignment: null,
  submissions: []
};
```

### **API Gateway Pattern Benefits**
- **Mock-First Development**: Build UI without backend dependencies
- **Easy Testing**: Switch between mock and real data instantly
- **Development Speed**: No API rate limits or authentication during development
- **Production Ready**: Flip one flag to use real Firebase Functions

### **Why No Build Tools?**
- **Direct Deployment**: Apps Script handles hosting and serving
- **No Dependencies**: Pure HTML/CSS/JS reduces complexity
- **Fast Iteration**: Edit → Push → Deploy → Test cycle under 30 seconds
- **Debugging Simplicity**: Browser DevTools work directly with source code

## Clasp Development Commands

### **Essential Commands**
```bash
# Setup (one-time)
clasp login
clasp create --type standalone --title "Project Name"

# Development cycle
clasp push                    # Upload files to Apps Script editor
clasp deploy --deploymentId [ID] --description "Changes"  # Update live web app

# Testing
clasp open                    # Open Apps Script editor
# Run individual functions in editor for server-side debugging
```

### **Deployment ID Management**
- **Current Deployment ID**: `AKfycbxCACap-LCKNjYSx8oXAS2vxnjrvcXn6Weypd_dIr_wbiRPsIKh0J2Z4bMSxuK9vyM2hw`
- **Get New ID**: `clasp deploy` (creates new deployment)  
- **Update Existing**: `clasp deploy --deploymentId [ID]` (updates existing)
- **List Deployments**: `clasp deployments`

## Setup Instructions

### **1. Create New AppScript Project**
1. Go to [script.google.com](https://script.google.com)
2. Click "New Project"
3. Delete the default `Code.gs` file

### **2. Copy Project Files**
Copy all files from this directory to your AppScript project:
1. **Code.js** → Create new `.gs` file, paste content
2. **ApiGateway.js** → Create new `.gs` file, paste content  
3. **MockData.js** → Create new `.gs` file, paste content
4. **index.html** → Create new HTML file, paste content
5. **styles.html** → Create new HTML file, paste content
6. **javascript.html** → Create new HTML file, paste content
7. **sidebar.html** → Create new HTML file, paste content
8. **grading-modal.html** → Create new HTML file, paste content
9. **appsscript.json** → Replace default manifest

### **3. Configure Permissions**
The `appsscript.json` includes required OAuth scopes:
- Google Classroom read access
- User email access
- External requests (for future API calls)

### **4. Deploy as Web App**
1. Click "Deploy" → "New Deployment"
2. Choose "Web app" as type
3. Set "Execute as" to "Me"
4. Set "Who has access" to "Anyone" (for testing)
5. Click "Deploy"

### **5. Test the Application**
1. Open the provided web app URL
2. Authorize Google permissions
3. Select a classroom from dropdown
4. Browse assignments and test grading workflow

## Usage Guide

### **Navigation**
1. **Select Classroom**: Choose from dropdown in sidebar
2. **Browse Assignments**: Click assignments to view submissions
3. **Grade Submissions**: Click individual submissions to open grading modal
4. **Batch Operations**: Select multiple submissions for batch grading

### **Grading Workflow**
1. **Open Submission**: Click student name to open grading modal
2. **Review Content**: View student's code or quiz answers
3. **AI Grading**: Click "Grade with AI" for automated scoring
4. **Manual Override**: Modify score and feedback as needed
5. **Save Grade**: Click "Save Grade" to store results
6. **Navigation**: Use Previous/Next buttons or keyboard shortcuts

### **Keyboard Shortcuts** (in grading modal)
- `Escape` - Close modal
- `Ctrl + ←` - Previous submission
- `Ctrl + →` - Next submission  
- `Ctrl + S` - Save grade

### **Export Features**
- **Assignment Export**: Export grades for current assignment
- **CSV Format**: Student name, email, score, feedback, timestamps

## Configuration

### **Switching to Real APIs**
To connect to real Firebase Functions API:

1. **Update ApiGateway.js**:
```javascript
const CONFIG = {
  USE_MOCK: false,  // Switch to real APIs
  API_BASE_URL: 'https://your-actual-firebase-url/api/v2',
  API_KEY: 'your-actual-api-key'
};
```

2. **Deploy Firebase Functions** with matching endpoints:
   - `POST /api/v2/grade/submission`
   - `POST /api/v2/grade/batch`
   - `POST /api/v2/grades/save`

### **Google Classroom Integration**
For real Google Classroom data, the application will automatically:
- Fetch teacher's active courses
- Load coursework assignments
- Retrieve student submissions
- Access student rosters

## Mock Data

The application includes comprehensive mock data for testing:

### **Sample Classrooms**
- **Math 101**: 30 students, 5 assignments (mix of coding and quizzes)
- **Science 202**: 28 students, 2 assignments (advanced algorithms)
- **CS 303**: 25 students, 1 assignment (data structures)

### **Assignment Types**
- **Coding Assignments**: Karel exercises with JavaScript code
- **Quizzes**: Multiple choice and short answer questions
- **Mixed Status**: Graded, pending, and in-progress submissions

### **Realistic Scenarios**
- Students with various submission times
- Late submissions marked appropriately
- Different score ranges and feedback quality
- Batch grading scenarios with multiple pending submissions

## Testing

### **Manual Testing Checklist**
- [ ] Classroom selection loads assignments
- [ ] Assignment selection loads submissions  
- [ ] Individual grading modal opens correctly
- [ ] AI grading simulation works with progress bar
- [ ] Manual grade override saves properly
- [ ] Batch grading processes multiple submissions
- [ ] Export generates proper CSV files
- [ ] Status filters work correctly
- [ ] Keyboard shortcuts function properly
- [ ] Responsive design works on different screen sizes

### **Error Scenarios**
- Network timeouts (simulated in mock mode)
- Invalid grade inputs
- Missing required fields
- API authentication failures

## Development Notes

### **Code Organization**
- **Separation of Concerns**: API gateway isolates data access
- **Modular Components**: HTML components for reusability
- **State Management**: Centralized application state in JavaScript
- **Error Handling**: Comprehensive error handling with user feedback

### **Performance Considerations**
- **Lazy Loading**: Submissions loaded only when assignment selected
- **Efficient Updates**: Minimal DOM manipulation for status changes
- **Memory Management**: Proper cleanup of intervals and event listeners

### **Security Features**
- **Input Validation**: All user inputs validated client and server-side
- **XSS Prevention**: HTML escaping for all dynamic content
- **Permission Scoping**: Minimal required OAuth scopes

## Troubleshooting

### **Common Issues**

1. **"Authorization required" errors**
   - Re-deploy the web app
   - Check OAuth scopes in appsscript.json
   - Ensure user has classroom access

2. **Blank screen on load**
   - Check browser console for JavaScript errors
   - Verify all HTML files are properly created
   - Test with incognito mode

3. **Mock data not loading**
   - Verify MockData.js is properly included
   - Check CONFIG.USE_MOCK is set to true
   - Look for syntax errors in mock data

4. **Grading modal not opening**
   - Check for JavaScript errors in console
   - Verify grading-modal.html is included
   - Test with different browsers

### **Debug Mode**
Enable debug logging in ApiGateway.js:
```javascript
const CONFIG = {
  DEBUG: true  // Enable console logging
};
```

## Future Enhancements

### **Planned Features**
- Real-time collaboration for co-teachers
- Advanced analytics and reporting
- Custom rubric support
- Student feedback collection
- Integration with LMS systems

### **Technical Improvements**
- Progressive Web App (PWA) capabilities
- Offline mode support
- Advanced keyboard shortcuts
- Accessibility enhancements
- Mobile-responsive improvements

## 🚨 **Troubleshooting Guide - Common Issues**

### **Issue: "Made changes but web app not updating"**
**Problem**: Running `clasp push` but live web app shows old version
**Solution**: 
```bash
clasp push  # Upload changes
clasp deploy --deploymentId AKfycbxCACap-LCKNjYSx8oXAS2vxnjrvcXn6Weypd_dIr_wbiRPsIKh0J2Z4bMSxuK9vyM2hw --description "Updated version"  # Update live app
```

### **Issue: "Submissions not loading after clicking assignment"**
**Debug Process**:
1. **Test Server Function**: In Apps Script editor, run `testSubmissionsLoading()`
2. **Check Browser Console**: Open F12, look for error messages
3. **Verify Assignment ID**: Ensure assignment ID matches mock data keys
4. **Check Mock Data**: Verify `MOCK_SUBMISSIONS['assign-karel-3']` exists

### **Issue: "AppScript security banner too prominent"**
**Solutions**:
- **Deployment Setting**: Use `"access": "ANYONE"` instead of `"ANYONE_ANONYMOUS"`
- **Production**: Deploy through Google Workspace domain for branded experience
- **Note**: Some security notice will always appear for Apps Script web apps

### **Issue: "Permission denied accessing Google APIs"**
**Solutions**:
1. **Check OAuth Scopes**: Verify `appsscript.json` includes required classroom scopes
2. **Re-authorize**: Delete and redeploy to trigger new permission request
3. **Test Account**: Ensure testing with account that has classroom access

### **Issue: "Loading spinners stuck forever"**
**Debug Steps**:
1. **Server-Side**: Test individual functions in Apps Script editor
2. **Client-Side**: Check browser console for JavaScript errors
3. **Network**: Verify function calls are reaching the server
4. **Mock Data**: Ensure mock data structure matches expected format

### **Development Best Practices**
- **Always test server functions individually** before testing full UI
- **Use browser console extensively** - all operations are logged with emojis
- **Verify deployment updates** by checking deployment version in Apps Script
- **Test with different browsers** if issues persist
- **Keep deployment ID handy** for quick updates

## Support

For additional issues:
1. **Check Console Logs**: Browser console shows detailed debug info with emoji indicators
2. **Test Server Functions**: Use Apps Script editor to run individual functions
3. **Verify File Structure**: Ensure all 9 files are properly uploaded
4. **Check Deployment Status**: Verify deployment version matches your changes

---

**Last Updated**: January 2025
**Version**: 1.0.0 (Development)
**Compatibility**: Google Apps Script, Modern Browsers (Chrome, Firefox, Safari, Edge)