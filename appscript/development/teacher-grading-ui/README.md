# Roo Teacher Grading Portal

A comprehensive AppScript-based web application for grading student assignments and managing classrooms with AI assistance.

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

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Test with mock data first before real API integration
4. Verify all required OAuth permissions are granted

---

**Last Updated**: January 2025
**Version**: 1.0.0 (Development)
**Compatibility**: Google Apps Script, Modern Browsers (Chrome, Firefox, Safari, Edge)