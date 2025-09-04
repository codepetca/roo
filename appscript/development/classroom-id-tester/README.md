# Google Classroom ID Tester

A comprehensive Apps Script tool for testing Google Classroom API ID availability and access patterns.

## Purpose

This script helps developers understand what IDs and data are accessible through the Google Classroom API when building educational applications. It systematically tests user identification, course access, student enrollment data, assignments, and submissions.

## Features

### ID Types Tested
- **User IDs**: Session API, People API, Classroom Profile IDs
- **Course IDs**: All courses where you're a teacher (active and archived)
- **Student IDs**: Per-course student enrollment with profile data
- **Assignment IDs**: CourseWork items with metadata
- **Submission IDs**: Student submissions per assignment

### Key Functions

#### `testClassroomIds()`
Main testing function that runs a comprehensive test of all accessible IDs and permissions.

#### `testUserIds()`  
Tests user identification methods:
- Session.getActiveUser() and Session.getEffectiveUser()
- People API for immutable user IDs
- Classroom UserProfiles API

#### `testCourseIds()`
Tests course access and hierarchical data:
- Lists all accessible courses
- For each course, tests student and assignment access
- Provides summary statistics

#### `testPermissions()`
Analyzes what permissions and scopes are actually available at runtime.

#### `testSpecificId(idType)`
Tests specific ID types for targeted debugging.

## Setup Instructions

### 1. Create New Apps Script Project
1. Go to [script.google.com](https://script.google.com)
2. Create a new project
3. Replace default Code.gs with the provided Code.gs
4. Replace appsscript.json with the provided configuration

### 2. Enable Required Services
The script requires these advanced services (configured in appsscript.json):
- **Google Classroom API** (v1) - Access to courses, students, assignments
- **People API** (v1) - Access to user profile information

### 3. OAuth Scopes
The script requests these permissions:
- `classroom.courses.readonly` - Read course information
- `classroom.rosters.readonly` - Read student rosters  
- `classroom.coursework.*.readonly` - Read assignments and submissions
- `classroom.profile.*` - Read classroom profiles
- `userinfo.*` - Read basic user information
- `contacts.readonly` - Access People API

### 4. Authorization
On first run, you'll be prompted to authorize these permissions. The script only reads data and makes no modifications.

## Usage

### Basic Testing
```javascript
// Run comprehensive test
testClassroomIds();

// Test specific components
testUserIds();
testPermissions();

// Test specific ID type
testSpecificId("user");
testSpecificId("course");
```

### Expected Output
The script logs structured output showing:
- User identification results
- Course listing with metadata
- Student enrollment data (first 3 per course)
- Assignment details (first 2 per course) 
- Submission information (first 2 per assignment)
- Summary statistics
- Permission analysis results

### Sample Output Format
```
===============================================
       GOOGLE CLASSROOM ID ACCESSIBILITY TEST
===============================================

=== USER IDENTIFICATION ===
✓ Session Active User Email: teacher@school.edu
✓ People API Resource Name: people/123456789
✓ Classroom Profile ID: 123456789

=== COURSE ACCESS ===
✓ Total Accessible Courses: 2

--- Course 1 ---
  Name: AP Computer Science A
  Course ID: 456789123
  State: ACTIVE
  ✓ Students in course: 25
  ✓ Assignments in course: 12

=== SUMMARY ===
Total Courses: 2
Total Students: 45
Total Assignments: 24
Total Submissions: 450
```

## Troubleshooting

### Common Issues

#### "People API not enabled" 
- Ensure People API is enabled in the Apps Script project's Services
- Check that `contacts.readonly` scope is included

#### "Cannot list students" or "Cannot list coursework"
- Verify you have teacher access to the courses
- Check that classroom roster and coursework scopes are granted

#### No courses found
- The script only shows courses where you are listed as a teacher
- Students won't see courses in the teacher view

### Permission Errors
If you encounter permission errors:
1. Check the OAuth scopes in appsscript.json
2. Re-run authorization in the Apps Script editor
3. Verify advanced services are enabled
4. Confirm you have appropriate Google Workspace/Classroom access

## Integration with Roo Project

This tester is designed to support the Roo educational grading system by helping understand:
- What student IDs are available for enrollment matching
- How assignment and submission data can be accessed
- User identification patterns for authentication flows
- Permission requirements for classroom data extraction

The insights from this tester inform the design of the main classroom snapshot exporter and grading pipeline.

## Security Notes

- This script is read-only and makes no modifications to classroom data
- All API calls use official Google APIs with standard OAuth flows
- Logged data may include student emails and names - handle logs appropriately
- Use appropriate Google Workspace admin controls for production deployment