# Testing Guide - Teacher Grading UI

## Overview
This document covers testing strategies for the Teacher Grading UI AppScript application. Basic test functions are kept in Code.js, while comprehensive testing scenarios are documented here.

## Available Test Functions

### Basic Tests (in Code.js)
- `testBasicFunctionality()` - Quick verification of core features
- `testRealData()` - Test with actual Google Classroom data
- `healthCheck()` - System health verification

### Running Tests
In Apps Script editor console:
```javascript
// Basic smoke test
testBasicFunctionality()

// Test with real data (requires Google Classroom access)
testRealData()

// System health check
healthCheck()
```

## Comprehensive Test Scenarios

### 1. Dashboard Data Flow
**Purpose**: Verify complete data fetching and caching

**Mock Test Steps**:
1. Call `fetchFullDashboardData()` with mock mode
2. Verify classroom structure with nested assignments/students
3. Check cache save/load functionality
4. Validate data size and format

**Real Data Test Steps**:
1. Temporarily set `USE_MOCK = false`
2. Fetch real Google Classroom data
3. Compare structure with mock data
4. Restore mock mode

### 2. Enhanced Data Processing
**Purpose**: Test assignment materials, rubrics, and quiz data

**Test Scenarios**:
- Assignments with Drive files, links, YouTube videos
- Rubric-based assignments
- Google Forms quiz integration
- Submission content extraction

### 3. AI Grading System
**Purpose**: Verify AI grading functionality

**Single Submission Test**:
- Build grading context from assignment/submission
- Call Gemini API (or mock)
- Verify score, feedback, and confidence
- Check error handling

**Batch Grading Test**:
- Process multiple submissions
- Track success/failure rates
- Verify timing and performance
- Test interruption handling

### 4. Content Classification
**Purpose**: Test file type detection and processing

**Test Cases**:
```javascript
// Content type classification
classifyContentType('application/pdf') // -> 'pdf'
classifyContentType('application/vnd.google-apps.document') // -> 'document'

// Text extractability
isTextExtractable('application/pdf') // -> true
isTextExtractable('image/jpeg') // -> false

// Link classification
classifyLinkType('https://github.com/user/repo') // -> 'repository'
classifyLinkType('https://youtube.com/watch?v=123') // -> 'video'
```

### 5. Configuration Testing
**Purpose**: Verify system configuration and API keys

**Tests**:
- Gemini API key configuration
- Mock/real mode switching
- Cache settings validation
- OAuth scope verification

### 6. Error Handling
**Purpose**: Test system resilience

**Scenarios**:
- Network failures
- Invalid API responses
- Missing permissions
- Rate limiting
- Malformed data

## Performance Testing

### Load Testing
- Large classroom data (100+ students)
- Multiple assignment types
- Batch operations with 50+ submissions

### Memory Testing
- Cache size limits
- Data cleanup
- Long-running sessions

## Integration Testing

### Google Classroom API
- Course enumeration
- Assignment fetching
- Submission retrieval
- Grade publishing

### Firebase Functions
- API endpoint connectivity
- Authentication flow
- Data synchronization

## Mock Data Testing

### Mock Data Validation
```javascript
// Verify mock data structure
typeof MOCK_CLASSROOMS !== 'undefined'
MOCK_CLASSROOMS.length > 0
MOCK_ASSIGNMENTS['class-math-101']
MOCK_SUBMISSIONS['assign-karel-3']
```

### Mock Scenario Coverage
- Various assignment types (coding, quiz, document)
- Different submission states (pending, graded, late)
- Multiple student profiles
- Diverse attachment types

## Debugging Strategies

### Server-Side Debugging
1. Use Apps Script editor execution transcript
2. Test individual functions in isolation
3. Check PropertiesService for configuration
4. Review Apps Script logs

### Client-Side Debugging
1. Browser console for JavaScript errors
2. Network tab for API calls
3. localStorage inspection
4. UI state validation

### Common Issues
- **Blank screen**: Check HTML file inclusion
- **API errors**: Verify OAuth scopes and permissions
- **Mock data not loading**: Check file references
- **Grading failures**: Test with smaller data sets

## Test Data Management

### Mock Data Generation
- Realistic student names and emails
- Varied assignment content
- Diverse scoring patterns
- Representative attachment types

### Data Cleanup
- Clear caches between tests
- Reset API mode settings
- Clean up temporary properties

## Automated Testing Strategy

### Continuous Testing
1. Health checks on deployment
2. Mock data validation
3. Basic functionality verification
4. Configuration checks

### Regression Testing
1. Test after major changes
2. Verify backwards compatibility
3. Check UI responsiveness
4. Validate data integrity

## Test Coverage Goals

### Core Functionality: 100%
- User authentication
- Classroom data fetching
- Assignment management
- Submission processing
- Grade storage

### Edge Cases: 80%
- Error conditions
- Network failures
- Invalid inputs
- Permission issues

### Integration Points: 90%
- Google Classroom API
- Firebase Functions
- Gemini AI integration
- Cache system

## Deployment Testing

### Pre-Deployment Checklist
- [ ] All basic tests pass
- [ ] Mock mode functionality verified
- [ ] Real data mode tested (if applicable)
- [ ] UI responsiveness checked
- [ ] Error handling validated

### Post-Deployment Verification
- [ ] Web app loads correctly
- [ ] User authentication works
- [ ] Mock data displays properly
- [ ] No console errors
- [ ] Performance within acceptable limits

## Performance Benchmarks

### Response Times
- Dashboard load: < 3 seconds
- Assignment selection: < 1 second
- Single grading: < 5 seconds
- Batch grading: < 30 seconds (10 submissions)

### Data Limits
- Classrooms: Up to 50
- Students per class: Up to 200
- Assignments per class: Up to 100
- Submissions per assignment: Up to 200

---

**Note**: For actual test execution, use the minimal test functions in Code.js or implement specific test scenarios as needed for development and debugging.