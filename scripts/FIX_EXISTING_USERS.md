# Fix Existing Users Script

This script creates Firestore user profiles for existing Firebase Auth users who were created before the automatic profile creation trigger was added.

## Usage

### Fix All Users Without Profiles
```bash
node scripts/fix-existing-users.js
```

This will:
1. List all users from Firebase Auth
2. Check each user for an existing Firestore profile
3. Create profiles for users who don't have one
4. Use the role from their custom claims (or default to 'student')

### Fix a Specific User
```bash
# Fix a specific user with their UID
node scripts/fix-existing-users.js --uid=USER_ID_HERE

# Fix a specific user and override their role
node scripts/fix-existing-users.js --uid=USER_ID_HERE --role=teacher
```

## What the Script Does

For each user without a profile, it creates a Firestore document with:
- Basic user info (uid, email, displayName)
- Role (from custom claims or specified)
- Metadata (creation time, last sign in)
- Role-specific fields:
  - **Teachers**: teacherData with configuredSheets, sheetId, classrooms
  - **Students**: studentData with enrolledClasses, submittedAssignments

## New User Behavior

Going forward, new users will automatically have profiles created when they sign up, thanks to the Firebase Auth trigger (`onUserCreated` function) that was deployed.

## Troubleshooting

If you get permission errors, make sure:
1. You have the service account key file in the project root
2. The `GOOGLE_APPLICATION_CREDENTIALS` environment variable is set
3. The service account has the necessary permissions

Run with service account:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/Users/stew/Repos/vibe/roo/roo-app-3d24e-service-account.json"
node scripts/fix-existing-users.js
```