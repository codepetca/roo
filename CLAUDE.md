# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Roo is an AI-powered auto-grading system for educational assignments, particularly focused on programming assignments (Karel the Dog) and quizzes. The system integrates with Google Classroom, Google Sheets, and uses Google's Gemini AI for grading.

## Development Commands

### Core Development Commands
- `cd functions && npm run build` - Compile TypeScript to JavaScript
- `cd functions && npm run build:watch` - Watch mode compilation 
- `cd functions && npm run serve` - Start Firebase emulators for local testing
- `cd functions && npm run deploy` - Deploy functions to Firebase (requires build first)
- `cd functions && npm run logs` - View Firebase function logs

### Testing Commands
- `./test-all-endpoints.sh` - Comprehensive test of all API endpoints
- `./test-functions.sh` - Test Firebase functions specifically
- `./test-firestore.sh` - Test Firestore operations
- `./test-gemini.sh` - Test Gemini AI integration
- `./test-sheets.sh` - Test Google Sheets integration
- `./test-validation.sh` - Test data validation

### Required Before Deployment
**CRITICAL**: Firebase functions must pass TypeScript type checking before deploying. Always run `cd functions && npm run build` first to ensure no compilation errors.

## Architecture

### System Flow
Board Account (Apps Script) → Personal Google Sheets → Firebase Functions → Gemini AI → Updated Sheets

### Core Components

1. **Firebase Functions** (`functions/src/`)
   - `index.ts` - Main API router with all endpoints
   - `services/gemini.ts` - AI grading service with rate limiting
   - `services/sheets.ts` - Google Sheets integration
   - `config/firebase.ts` - Firestore configuration
   - `schemas/` - Zod validation schemas
   - `types/` - TypeScript type definitions

2. **Google Sheets Integration**
   - Submissions sheet (17 columns) - stores all student submissions
   - Answer Keys sheet - quiz questions and correct answers  
   - Assignments sheet - assignment metadata
   - Updates grades back to submission rows automatically

3. **AI Grading System**
   - Uses Google Gemini 1.5 Flash model
   - Generous grading mode for handwritten code (missing semicolons = minor penalty)
   - Support for both quiz questions and coding assignments
   - Rate limiting: 15 requests per minute per assignment

### Key Endpoints

#### Grading Endpoints
- `POST /grade-quiz` - Grade complete quiz using answer keys
- `POST /grade-code` - Grade individual coding assignments with generous mode
- `POST /test-grading` - Test grading without saving (for development)

#### Data Management
- `GET /sheets/all-submissions` - Get all submissions from Google Sheets
- `GET /sheets/ungraded` - Get submissions needing grading
- `POST /sheets/answer-key` - Get answer key for specific form ID
- `GET /assignments` - List assignments from Firestore
- `POST /assignments` - Create test assignment

#### Health Checks
- `GET /` - API status and endpoint listing
- `GET /gemini/test` - Test Gemini AI connection
- `GET /sheets/test` - Test Google Sheets connection

## Development Workflow

### Making Changes
1. Edit TypeScript files in `functions/src/`
2. Run `cd functions && npm run build` to verify compilation
3. Use `./test-all-endpoints.sh` to test changes
4. Deploy with `cd functions && npm run deploy` if tests pass

### Testing Strategy
- Use the comprehensive test scripts before any deployment
- Test with real submission IDs from Google Sheets
- Monitor Firebase logs during development: `cd functions && npm run logs`
- Verify grades are written back to correct Google Sheets rows

### Error Handling
- All endpoints include comprehensive error handling and validation
- Rate limiting prevents API abuse
- Structured logging for debugging in production
- Graceful fallbacks for AI grading errors (partial credit)

## Data Structure

### Google Sheets Format
- **Submissions**: 17 columns including submission text, grades, quiz metadata
- **Answer Keys**: Questions with correct answers, point values, grading strictness
- **Grade Updates**: Automatically written to Current Grade (column I) and Status (column J)

### Grading Philosophy
- **Generous Mode**: For handwritten code, focus on logic over syntax
- **Partial Credit**: Always give some credit for attempts
- **Encouraging Feedback**: AI provides positive, constructive feedback
- **Flexible Scoring**: Minor syntax errors don't heavily penalize

## Important Constraints

### Authentication & Security
- Uses Firebase service account for Google Sheets access
- Gemini API key stored as Firebase secret
- No user authentication currently implemented (planned for Phase 3)

### Rate Limits
- Gemini AI: 15 requests per minute per assignment/quiz
- Google Sheets API: Uses default quotas with exponential backoff

### Known Issues
- Some endpoints may need debugging during active development
- Real-time grading dashboard not yet implemented
- Student access system planned but not built

## Future Development

The system is designed for expansion:
- **Phase 2**: Automated daily grading pipeline with teacher dashboard
- **Phase 3**: Student access system with course passcodes  
- **Phase 4**: Document submission collection and grading

See `DEVELOPMENT_PLAN.md` for detailed roadmap and current status.