# Roo - Auto-Grading System Implementation Plan

## Overview
Firebase-based auto-grading system for Google Classroom with Gemini AI integration.

## Architecture
- **Firebase Functions**: Serverless backend
- **Firestore**: Data persistence  
- **Gemini AI**: Auto-grading (15 req/min free tier)
- **Apps Script**: Google Classroom integration
- **Simple Auth**: Email+passcode (bypass school restrictions)

## Incremental Build Steps

### Step 1: Firebase Project Setup & Basic Function
- Create Firebase project
- Initialize Firebase Functions locally
- Create a simple "hello world" function
- **Test**: Deploy and verify function works

### Step 2: Firestore Database Setup
- Design basic collections (assignments, submissions, grades)
- Create function to write/read test data
- **Test**: Verify data persistence and retrieval

### Step 3: Gemini AI Integration
- Add Google AI SDK dependency
- Create simple text grading function with rate limiting
- **Test**: Grade a sample text and verify response

### Step 4: Google Classroom Bridge (Apps Script)
- Create Apps Script project
- Build function to fetch assignments/submissions
- **Test**: Successfully pull data from a test classroom

### Step 5: Basic Grading Pipeline
- Connect Classroom data → Firestore → Gemini → results
- **Test**: End-to-end grading of one assignment

### Step 6: Authentication System
- Implement email+passcode auth
- **Test**: User can login and see their results

### Step 7: Dashboard Interface
- Basic web interface for teachers and students
- **Test**: View assignments and grades through UI

## Key Features
- Automated attendance tracking via document changes
- Dual dashboard (teacher admin + student results)
- Batch grading with document processing
- Cost monitoring and rate limiting
- School restriction-friendly authentication