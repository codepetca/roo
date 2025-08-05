# Claude Context - Teacher Grading UI

## Quick Overview
Google Apps Script web app for grading student assignments with AI assistance. Teachers select classrooms, view assignments, and grade submissions using Gemini AI.

## Core Architecture (50 lines)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Browser UI    │────▶│  Apps Script     │────▶│ Google          │
│  (HTML/JS/CSS)  │◀────│  Server Code     │◀────│ Classroom API   │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  API Gateway     │
                        │ (Mock/Real Mode) │
                        └──────────────────┘
                               │
                        ┌──────┴───────┐
                        ▼              ▼
                  ┌─────────┐    ┌──────────┐
                  │  Mock   │    │  Gemini  │
                  │  Data   │    │    AI    │
                  └─────────┘    └──────────┘
```

### Key Files & Purpose
- **Code.js** - Entry point, routing, user management
- **ApiGateway.js** - Data fetching (mock/real), AI grading integration
- **index.html** - Main UI layout
- **javascript.html** - Client-side logic
- **MockData.js** - Test data for development

### Data Flow
1. Teacher opens web app → `doGet()` serves HTML
2. UI requests classrooms → `getClassrooms()` → API Gateway
3. Teacher selects assignment → `getSubmissions()`
4. Grade submission → `gradeSubmissionWithAI()` → Gemini API
5. Save grade → `saveGrade()` → Update storage

### Common Development Tasks

**Add new API endpoint:**
```javascript
// In Code.js
function myNewEndpoint(param) {
  return myNewFunction(param);
}

// In ApiGateway.js
function myNewFunction(param) {
  if (getApiGatewayConfig().USE_MOCK) {
    return { success: true, data: MOCK_DATA };
  }
  // Real API implementation
}
```

**Deploy changes:**
```bash
clasp push
clasp deploy --deploymentId AKfycbxCACap-LCKNjYSx8oXAS2vxnjrvcXn6Weypd_dIr_wbiRPsIKh0J2Z4bMSxuK9vyM2hw
```

### Key Concepts
- **Mock-first development** - Toggle USE_MOCK for instant testing
- **No build process** - Direct HTML/JS/CSS serving
- **API Gateway pattern** - Single point for all data access
- **Enhanced data** - Assignments include materials, rubrics, quiz data
- **AI grading context** - Builds comprehensive context for Gemini

### Current State
- Mock mode enabled by default
- 3 sample classrooms with assignments/students
- AI grading returns simulated results
- All UI functionality works with mock data