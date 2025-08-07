# Classroom Snapshot Exporter

A Google Apps Script web application that exports Google Classroom data in a format compatible with the Roo Auto-Grading Platform. This tool allows teachers to easily export their classroom data as JSON snapshots that can be imported into Roo for AI-powered grading.

## 🎯 Purpose

- **Export Google Classroom data** in Roo-compatible format
- **Preserve complete classroom structure** including students, assignments, submissions
- **Enable seamless migration** to Roo's AI grading platform
- **Provide teacher-friendly interface** for data export

## 📋 Features

### Core Functionality
- ✅ Export all active Google Classrooms
- ✅ Include student rosters and profiles
- ✅ Export assignments with materials and settings
- ✅ Include student submissions and grades
- ✅ Compatible with `@shared/schemas/classroom-snapshot.ts`

### Advanced Options
- 🔧 Selective classroom export
- 📎 Include/exclude assignment materials
- 📝 Include/exclude student submissions
- 📊 Include quiz data when available
- ⚙️ Configurable export limits

### User Experience
- 🌐 Web-based interface
- 📱 Responsive design
- ⚡ Real-time progress tracking
- 📥 Multiple download options
- 🔍 Data preview functionality

## 🏗️ Architecture

### File Structure
```
appscript/development/classroom-snapshot-exporter/
├── Code.js                        # Main entry point & web app handlers
├── ClassroomSnapshotExporter.js   # Core export orchestration
├── DataCollectors.js              # Google Classroom API integration
├── SchemaAdapters.js              # Data transformation layer
├── SnapshotConfig.js              # Configuration & validation
├── TestSuite.js                   # Development testing suite
├── index.html                     # Main web interface
├── styles.html                    # CSS styling
├── javascript.html                # Client-side functionality
├── appsscript.json                # OAuth permissions & manifest
└── README.md                      # This documentation
```

### Component Overview

#### 🚀 **Code.js** - Web App Entry Point
- `doGet()` - Serves web interface
- `doPost()` - Handles API requests
- Main export functions for UI
- Error handling and logging

#### 🔄 **ClassroomSnapshotExporter.js** - Core Engine
- `export()` - Main orchestration function
- `getTeacherProfile()` - Extract teacher information
- `getAllClassroomsWithData()` - Fetch complete classroom data
- `calculateGlobalStats()` - Generate statistics

#### 📡 **DataCollectors.js** - Google API Integration
- `collectClassrooms()` - Fetch active courses
- `collectAssignments()` - Get courseWork with enhancements
- `collectStudents()` - Get enrolled students
- `collectSubmissions()` - Get student submissions
- Rate limiting and error handling

#### 🔄 **SchemaAdapters.js** - Data Transformation
- `adaptTeacherProfile()` - Convert user to TeacherProfile
- `adaptClassroom()` - Convert Course to ClassroomWithData
- `adaptAssignment()` - Convert CourseWork to AssignmentWithStats
- `adaptStudent()` - Convert Student to StudentSnapshot
- `adaptSubmission()` - Convert StudentSubmission to SubmissionSnapshot

#### ⚙️ **SnapshotConfig.js** - Configuration & Validation
- Configuration management with defaults
- Schema validation for exported data
- Metadata creation and management
- Statistics generation

## 🚀 Deployment Guide

### Prerequisites
1. Google account with Google Classroom access
2. Google Apps Script project
3. Teacher role in at least one Google Classroom

### Setup Instructions

1. **Create Apps Script Project**
   ```bash
   1. Go to script.google.com
   2. Create new project
   3. Replace default Code.gs with provided files
   ```

2. **Upload All Files**
   - Copy all `.js` files to your Apps Script project
   - Create HTML files (index.html, styles.html, javascript.html)
   - Update appsscript.json with OAuth scopes

3. **Configure OAuth Scopes**
   The app requires these Google Classroom permissions:
   - `classroom.courses.readonly` - Read course information
   - `classroom.coursework.students.readonly` - Read assignments and submissions
   - `classroom.rosters.readonly` - Read student rosters
   - `classroom.profile.emails` - Read user email addresses
   - `userinfo.email` - User identification

4. **Deploy as Web App**
   ```bash
   1. Click "Deploy" → "New deployment"
   2. Choose "Web app" as type
   3. Set execute as: "User accessing the web app"
   4. Set access: "Anyone" (for public use)
   5. Deploy and copy the web app URL
   ```

5. **Test the Deployment**
   ```javascript
   // Run in Apps Script editor
   function testDeployment() {
     return quickTest();
   }
   ```

## 💻 Usage Guide

### For Teachers

1. **Access the Web App**
   - Visit the deployed web app URL
   - Sign in with your Google account
   - Grant necessary permissions

2. **Check Connection**
   - Click "Check Connection" to verify API access
   - Ensure you have active Google Classrooms

3. **Configure Export**
   - Choose data options (submissions, materials, quiz data)
   - Optionally select specific classrooms
   - Set any export limits if needed

4. **Export Data**
   - Click "Test Export" to verify functionality
   - Click "Export Full Data" for complete export
   - Monitor progress in real-time

5. **Download Results**
   - Download JSON file when export completes
   - Preview data before downloading
   - Copy to clipboard if needed

### For Developers

#### Running Tests
```javascript
// In Apps Script editor
function runTests() {
  return TestSuite.runAllTests();
}

// Quick functionality test
function quickTest() {
  // Tests authentication, API access, and basic functionality
}

// Full development export
function devFullExport() {
  // Exports data and saves to Google Drive for inspection
}
```

#### Integration with Other Projects
```javascript
// Import as library or copy functions
const snapshot = ClassroomSnapshotExporter.export({
  includeSubmissions: true,
  includeMaterials: true,
  selectedClassrooms: ['course-123', 'course-456']
});

// Use in other Apps Script projects
const data = exportClassroomSnapshot();
```

## 📊 Data Format

The exported data matches the Roo platform's `ClassroomSnapshot` schema:

```typescript
{
  teacher: TeacherProfile,
  classrooms: ClassroomWithData[],
  globalStats: {
    totalClassrooms: number,
    totalStudents: number,
    totalAssignments: number,
    totalSubmissions: number,
    ungradedSubmissions: number,
    averageGrade?: number
  },
  snapshotMetadata: {
    fetchedAt: string,
    expiresAt: string,
    source: 'google-classroom',
    version: '1.0.0'
  }
}
```

### Sample Export Structure
```json
{
  "teacher": {
    "email": "teacher@school.edu",
    "name": "John Teacher",
    "isTeacher": true,
    "displayName": "Mr. Teacher"
  },
  "classrooms": [
    {
      "id": "123456789",
      "name": "AP Computer Science",
      "section": "Period 1",
      "studentCount": 25,
      "assignments": [...],
      "students": [...],
      "submissions": [...]
    }
  ],
  "globalStats": {
    "totalClassrooms": 1,
    "totalStudents": 25,
    "totalAssignments": 15,
    "totalSubmissions": 375,
    "ungradedSubmissions": 12
  }
}
```

## 🔧 Configuration Options

```javascript
const options = {
  includeSubmissions: true,        // Include student work
  includeMaterials: true,          // Include files/links
  includeQuizData: false,          // Include quiz questions
  includeRubrics: false,           // Include grading rubrics
  selectedClassrooms: null,        // null = all, or array of IDs
  maxClassrooms: null,             // Limit number of classrooms
  maxStudentsPerClass: null,       // Limit students per classroom
  maxSubmissionsPerAssignment: null, // Limit submissions per assignment
  source: 'google-classroom'       // Data source identifier
};
```

## 🧪 Testing

### Automated Test Suite
```javascript
// Run comprehensive tests
TestSuite.runAllTests();

// Individual test categories
TestSuite.testConfiguration();
TestSuite.testDataCollectors();
TestSuite.testSchemaAdapters();
TestSuite.testExportEngine();
TestSuite.testValidation();
TestSuite.testIntegration();
```

### Manual Testing Checklist
- [ ] Authentication flow works
- [ ] Can load classroom list
- [ ] Test export completes successfully
- [ ] Full export produces valid data
- [ ] Downloaded file imports into Roo
- [ ] All selected options work correctly
- [ ] Error handling works for common issues

## 🚨 Troubleshooting

### Common Issues

**"Authentication Required"**
- Ensure you're signed into Google
- Check OAuth permissions in Apps Script
- Verify you have teacher access to Google Classroom

**"No Classrooms Found"**
- Verify you're a teacher in at least one active classroom
- Check Google Classroom API permissions
- Ensure classrooms are not archived

**"Export Failed"**
- Check Google Apps Script execution time limits
- Reduce export scope (fewer classrooms/students)
- Check Google API quotas and rate limits

**"Invalid Snapshot Data"**
- Run validation tests to identify issues
- Check console logs for detailed errors
- Verify all required fields are present

### Debug Mode
```javascript
// Enable debugging in SnapshotConfig.js
const DEBUG_MODE = true;

// Check detailed logs in Apps Script editor
// View execution transcript for detailed error info
```

## 🔒 Privacy & Security

- **No data storage**: Data is processed locally, not stored on external servers
- **OAuth security**: Uses Google's OAuth 2.0 for secure API access
- **Read-only access**: Only reads classroom data, never modifies
- **Teacher control**: Teachers control which data to export
- **Temporary processing**: Data exists only during export process

## 🤝 Contributing

### Development Setup
1. Fork or copy the project files
2. Set up Apps Script project with all files
3. Configure OAuth scopes
4. Run test suite to verify functionality

### Code Standards
- Follow Google Apps Script best practices
- Include JSDoc comments for all functions
- Add appropriate error handling
- Write tests for new functionality
- Maintain compatibility with Roo schema

### Submitting Changes
1. Test all functionality thoroughly
2. Update documentation as needed
3. Ensure backward compatibility
4. Submit with clear description of changes

## 📚 Related Documentation

- [Google Classroom API](https://developers.google.com/classroom)
- [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)
- [Roo Platform Documentation](https://docs.roo.app)
- [Schema Documentation](../../../shared/schemas/README.md)

## 📄 License

Compatible with Roo Auto-Grading Platform. See project license for details.

---

**Built for the Roo Auto-Grading Platform** 🎓  
Making AI-powered grading accessible to every teacher.