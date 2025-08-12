## Problem

Teachers sign into the app with their personal Google accounts (e.g., `dev.codepet@gmail.com`), but their classrooms in Google Classroom are owned by their school board email addresses (e.g., `teacher@schoolboard.edu`). This creates a mismatch where the dashboard cannot find and display classroom data.

## Current Implementation

We have implemented a dual email system in the backend:
- Added `schoolEmail` field to teacher schema
- Modified `getClassroomsByTeacher()` to query both personal and school emails  
- Updated snapshot processor to extract school email from classroom data

## Required Solution

Create a UI flow for teachers to set their school board email address:

### 1. Settings Page Enhancement
- Add "School Board Email" field to teacher settings
- Allow teachers to enter/update their school board email
- Validate email format and confirm it matches classroom ownership

### 2. Onboarding Flow  
- After first sign-in, prompt teachers to enter their school board email
- Explain why this is needed ("to display your classroom data")
- Make this step required for dashboard access

### 3. Dashboard Integration
- If teacher hasn't set school email and dashboard is empty, show helpful message
- Provide direct link to settings page to add school email
- Show confirmation when school email is successfully linked

## Technical Details

**Backend (Already Complete)**:
- `Teacher` schema has `schoolEmail` field
- `getClassroomsByTeacher()` queries both emails
- Snapshot import extracts school email automatically

**Frontend (Needs Implementation)**:
- Settings form component
- API calls to update teacher profile
- Dashboard messaging for missing school email
- Onboarding flow components

## Success Criteria

- [ ] Teachers can set their school board email in settings
- [ ] Dashboard displays classrooms owned by school board email
- [ ] Clear user guidance when school email is missing
- [ ] Seamless onboarding experience for new teachers

## Priority

**High** - This directly impacts the core user experience of viewing classroom data on the dashboard.