# Google Classroom Test Data Generator

A complete Google Apps Script solution for generating realistic test data for Google Classroom auto-grading development.

## Overview

This script creates a fully functional Google Classroom with:
- 20 fake students with realistic names and emails
- 5 programming assignments linked to Google Docs/Sheets/Slides
- 3 auto-graded quiz assignments with Google Forms
- Complete answer keys and grading rubrics

## Quick Start

### 1. Create Apps Script Project
1. Go to [script.google.com](https://script.google.com)
2. Create a new project named "Classroom Test Data Generator"
3. Copy all `.gs` files from this directory into your project
4. Copy the `appsscript.json` manifest file

### 2. Enable APIs
Go to Google Cloud Console for your project and enable:
- Google Classroom API
- Google Drive API
- Google Docs API
- Google Sheets API
- Google Slides API
- Google Forms API

### 3. Run Setup
```javascript
// Test API access first
testApiAccess();

// Generate complete test classroom
generateTestClassroom();

// Get classroom info and invite links
getClassroomInfo();
```

## Project Structure

```
classroom-test-generator/
├── appsscript.json          # API configuration and OAuth scopes
├── main.gs                  # Main orchestration functions
├── config.gs                # Configuration settings
├── fake-data.gs             # Data generation utilities
├── classroom-creator.gs     # Classroom and student management
├── assignment-generator.gs  # Programming assignments with Drive docs
├── quiz-generator.gs        # Quiz forms with answer keys
└── README.md               # This file
```

## Generated Content

### Classroom: "CS101 Test - Programming Fundamentals"
- 20 fake students with emails like `alex.johnson@student.testschool.edu`
- Organized course materials in Google Drive folders
- Realistic assignment due dates spread over semester

### Programming Assignments (5 total)
1. **Karel Navigation Challenge** → Google Doc with problem description
2. **Grade Calculator Spreadsheet** → Google Sheets with formulas
3. **Algorithm Visualization Presentation** → Google Slides template
4. **Python Basics Notebook** → Instructions for Google Colab
5. **Data Analysis Project** → Google Sheets with sample survey data

### Quiz Assignments (3 total)
1. **Programming Concepts Quiz** (10 questions, 20 points)
2. **Logic and Control Structures** (8 questions, 24 points)
3. **Functions and Parameters** (6 questions, 24 points)

All quizzes include:
- Multiple choice and short answer questions
- Complete answer keys for auto-grading
- Explanatory feedback for correct/incorrect responses

## Key Features

### Realistic Test Data
- Student names from diverse backgrounds
- Proper email formatting for educational institutions
- Assignment content that matches real CS101 coursework
- Due dates spread realistically across a semester

### Complete Auto-Grading Setup
- Quiz forms with pre-configured correct answers
- Point values assigned to each question
- Feedback messages for student responses
- Forms linked directly to Classroom assignments

### Drive Integration
- All materials stored in organized folder structure
- Programming assignments link to actual Google Docs/Sheets/Slides
- Proper sharing permissions for student access
- Easy transfer between Google accounts

## Usage Functions

### Main Functions
```javascript
generateTestClassroom()     // Create everything
testApiAccess()            // Verify API permissions
getClassroomInfo()         // Get classroom details and links
cleanupTestData()          // Delete test data (use carefully!)
```

### Testing Functions
```javascript
testFormsApi()             // Test Google Forms API access
listClassroomStudents(id)  // List students in classroom
listClassroomAssignments(id) // List assignments in classroom
```

## Configuration

Edit `config.gs` to customize:
- Classroom name and description
- Number of fake students (up to 20)
- Assignment topics and due dates
- Quiz question content
- Email domain for student accounts

## Transfer to Production Account

1. Run the generator in your personal account
2. Note the classroom ID and enrollment code
3. Transfer ownership or share classroom with your board account
4. Copy Drive folders to the target account
5. Update sharing permissions as needed

## Troubleshooting

### API Permission Issues
- Ensure all APIs are enabled in Google Cloud Console
- Check OAuth scopes in `appsscript.json`
- Run `testApiAccess()` to verify permissions

### Rate Limiting
- Script includes delays to avoid API rate limits
- If you hit limits, wait and retry
- Consider reducing batch sizes in config

### Forms API Issues
- Forms API requires REST calls (not Advanced Service)
- Ensure OAuth token has Forms scope
- Test with `testFormsApi()` function

## Security Notes

- All generated data is clearly marked as test/fake
- Student emails use `.testschool.edu` domain
- Classroom title includes "Test" identifier
- Easy cleanup function provided for data removal

## Support

This script is designed for educational testing purposes only. Generated classrooms and forms should be used in development environments and cleaned up when no longer needed.

For issues or questions, refer to the Google Apps Script and Classroom API documentation.