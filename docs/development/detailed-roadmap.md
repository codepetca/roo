# Roo Auto-Grading System - Development Plan

## Current Status (Updated: July 25, 2025)

### ✅ What's Working
- **Generous grading system**: AI gives 9/10 points for Karel code with syntax errors (missing semicolons)
- **Quiz grading endpoint** (`/grade-quiz`): Successfully integrates with answer keys from Google Sheets
- **Code grading endpoint** (`/grade-code`): Uses generous mode for individual coding assignments
- **Google Sheets integration**: Reads submissions, answer keys, and can update grades
- **Comprehensive testing**: Test script validates all endpoints systematically
- **Apps Script**: Extracts Google Forms responses and quiz answer keys from board account

### ❌ What Needs Work
- Some endpoints still broken: `GET /sheets/assignments`, `POST /test-write`
- Real end-to-end testing with actual submission IDs needed
- Automation pipeline not implemented
- Teacher dashboard for manual control not built

## Development Phases

### Phase 1: Complete Core Grading (Immediate Priority)
**Goal**: Ensure grading works end-to-end with real data

#### Tasks:
1. **Test with real submission IDs**
   - Use actual Karel quiz submission IDs from Google Sheets
   - Verify `/grade-quiz` processes real student answers correctly
   - Test that grades are written back to correct rows in Google Sheets

2. **Fix broken endpoints**
   - Debug `GET /sheets/assignments` error (range parsing issue)
   - Fix `POST /test-write` Firestore write error
   - Ensure all endpoints in test script return proper responses

3. **End-to-end validation**
   - Parse real Karel quiz submission text into individual answers
   - Grade complete submission and verify results
   - Confirm teacher can see updated grades in Google Sheets

**Success Criteria**: 
- Grade a real Karel quiz submission completely
- See updated grade appear in Google Sheets
- All test script endpoints return success

---

### Phase 2: Automated Grading Pipeline (Next Priority)
**Goal**: Daily automated grading with teacher manual controls

#### Schedule Architecture:
```
Daily Schedule:
6:00 PM → Apps Script extracts submissions → Personal Sheets
7:00 PM → Firebase processes ungraded → Updates grades in Sheets

Manual Override:
Teacher Dashboard → "Run Grading Now" → Real-time processing
```

#### 2a: Apps Script Daily Trigger
**Tasks**:
- Modify board Apps Script to run daily at 6pm (not per form submission)
- Extract all new/ungraded submissions from the day
- Batch send data to personal Google Sheets
- Add error handling and logging

#### 2b: Firebase Scheduled Grading  
**Tasks**:
- Create Firebase scheduled function using Cloud Scheduler (daily 7pm)
- Process all ungraded submissions in batch
- Add comprehensive error handling and retry logic
- Log grading results, success/failure rates
- Send summary email to teacher

#### 2c: Teacher Dashboard Manual Control
**Tasks**:
- Create simple HTML/CSS/JS teacher interface
- "Run Grading Now" button to manually trigger pipeline
- View grading status and logs in real-time
- Review and adjust individual grades if needed
- Display grading statistics (processed, errors, etc.)

**Success Criteria**:
- Automated grading runs daily without intervention
- Teacher can manually trigger grading anytime
- Clear visibility into grading status and any issues

---

### Phase 3: Student Access System (Later)
**Goal**: Students can view their grades with course passcodes

*Postponed until automated grading is stable and reliable*

#### Future Tasks:
- Passcode-based authentication per course
- Student dashboard to view grades and detailed feedback
- Simple web interface for grade lookup

---

### Phase 4: Assignment Collection Enhancement (Future)
**Goal**: Collect and grade document submissions via Google Forms

#### Future Tasks:
- Extend Apps Script for Google Docs/Sheets submissions
- Google Drive content extraction and parsing
- Rubric-based grading for assignments (not just quizzes)

---

## Technical Architecture

### Current System Flow:
```
Board Account (Apps Script) → Personal Google Sheets → Firebase Functions → AI Grading → Updated Sheets
```

### Grading Endpoints:
- **`/grade-quiz`**: Quiz with answer keys (multiple choice + AI for code questions)
- **`/grade-code`**: Individual assignments with generous coding mode
- **`/test-grading`**: Testing endpoint (doesn't save to sheets)

### Data Structure:
- **Submissions Sheet**: 17 columns including quiz metadata (isQuiz, formId)
- **Answer Keys Sheet**: Question-by-question correct answers and grading strictness
- **Grading Status**: pending → graded → reviewed

---

## Key Lessons Learned

### Technical Requirements
- **Critical**: Firebase functions must pass TypeScript compilation before deployment
- **Routing**: Systematic endpoint testing prevents subtle path matching issues
- **Error Handling**: Comprehensive test scripts catch issues early

### AI Grading Success
- **Generous Mode**: Successfully gives 9/10 for correct logic with syntax errors
- **Prompt Engineering**: AI understands handwritten code context and is appropriately forgiving
- **Code Detection**: Automatically detects code questions vs multiple choice

### Google Sheets Integration
- **Answer Keys**: Successfully extracts quiz structure and correct answers
- **Submission Parsing**: Handles various form response formats
- **Grade Updates**: Can write back to specific rows and columns

---

## Testing Strategy

### Phase 1 Testing:
- Real Karel quiz submission data
- End-to-end grading verification
- Google Sheets update confirmation

### Phase 2 Testing:
- Batch processing with multiple submissions
- Scheduled function reliability
- Teacher dashboard functionality
- Error handling and recovery

### Ongoing Testing:
- Run comprehensive test script before each deployment
- Monitor Firebase logs for errors
- Verify grading accuracy with sample submissions

---

## Common Issues & Troubleshooting

### Deployment Issues
- **TypeScript errors**: Run `npm run build` before `npm run deploy`
- **Route not found**: Check for compilation errors preventing deployment
- **Missing endpoints**: Verify all routes are before the 404 handler

### Grading Issues
- **Answer key not found**: Verify formId exists in Answer Keys sheet
- **Submission not found**: Check submissionId exists in Submissions sheet
- **AI grading errors**: Check Firebase logs for rate limiting or API issues

### Google Sheets Issues
- **Range parsing**: Ensure sheet tabs exist and ranges are valid
- **Permission errors**: Verify service account has access to spreadsheet
- **Data format**: Check column structure matches expected format

---

## Next Steps

1. **Immediate**: Test `/grade-quiz` with real Karel submission ID
2. **This week**: Implement daily automated grading pipeline
3. **Next week**: Build teacher dashboard with manual controls
4. **Future**: Student access system and assignment collection

---

*This plan will be updated as each phase is completed and new requirements emerge.*