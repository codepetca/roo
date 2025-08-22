# Firestore Collection Deletion Script

A safe and comprehensive script to delete all Firestore collections except the `/users` collection.

## 🛡️ Safety Features

- **Dry-run mode**: Preview what will be deleted without actually deleting
- **Explicit confirmation**: Requires typing "DELETE" to confirm (unless using `--force`)
- **Users protection**: The `/users` collection is explicitly protected and never deleted
- **Color-coded output**: Clear visual indicators for protected vs. to-be-deleted collections
- **Environment targeting**: Support for both production and emulator environments
- **Error handling**: Comprehensive error logging and graceful failure handling
- **Batch operations**: Efficient deletion using Firebase batch operations

## 📋 Collections Handled

The script will delete these collections (if they exist):
- `classrooms`
- `assignments` 
- `submissions`
- `grades`
- `enrollments`
- `teacher_imports`
- `passcodes`
- Any other collections found at runtime

**Protected collection** (never deleted):
- `users`

## 🚀 Usage

### 1. Preview Mode (Recommended First Step)
```bash
# See what would be deleted without actually deleting
node scripts/delete-collections-except-users.js --dry-run
```

### 2. Interactive Deletion
```bash
# Delete with confirmation prompt
node scripts/delete-collections-except-users.js
```

### 3. Automated Deletion
```bash
# Skip confirmation prompt (use with caution)
node scripts/delete-collections-except-users.js --force
```

### 4. Emulator Testing
```bash
# Target Firebase emulator instead of production
node scripts/delete-collections-except-users.js --emulator --dry-run
```

## 🎛️ Command Line Options

| Flag | Description |
|------|-------------|
| `--dry-run` | Preview what will be deleted without actually deleting |
| `--force` | Skip confirmation prompt |
| `--emulator` | Target Firebase emulator instead of production |
| `--help`, `-h` | Show usage information |

## ⚠️ Important Warnings

1. **Always run `--dry-run` first** to preview what will be deleted
2. **Production environment**: The script connects to your production Firebase project by default
3. **Irreversible action**: Deleted data cannot be recovered
4. **Authentication**: Ensure you have proper Firebase Admin SDK credentials configured
5. **Users collection**: While protected by the script, always verify it's working as expected

## 🧪 Testing

Run the test script to validate the logic:
```bash
node scripts/test-deletion-script.js
```

This test validates:
- Collection filtering logic
- Users protection
- Edge cases (empty database, no users collection, etc.)
- Safety feature implementation

## 📖 Example Output

### Dry Run Mode
```
🔥 Firestore Collection Deletion Script
📋 Deletes ALL collections except /users
🔍 Scanning Firestore for collections...

📊 Found 6 total collections:
    ✅ users (protected)
    🗑️  classrooms (will be deleted)
    🗑️  assignments (will be deleted)
    🗑️  submissions (will be deleted)
    🗑️  grades (will be deleted)
    🗑️  passcodes (will be deleted)

🧪 DRY RUN MODE: No data will actually be deleted
🚀 Starting DRY RUN...
🧪 Dry run completed! 5 collections would be deleted
✅ Users collection remains protected and untouched
```

### Interactive Mode
```
⚠️  WARNING: This will permanently delete the following collections:
    • classrooms
    • assignments
    • submissions
    • grades
    • passcodes

✅ Protected collection (will NOT be deleted):
    • users

🎯 Target: PRODUCTION

Are you sure you want to proceed? Type "DELETE" to confirm:
```

## 🔧 Troubleshooting

### Authentication Errors
- Ensure Firebase Admin SDK is properly configured
- Check that your service account has Firestore Admin permissions
- Verify the project ID matches your target project

### Emulator Connection Issues
- Start the Firestore emulator: `firebase emulators:start --only firestore`
- Ensure emulator is running on localhost:8080
- Use `--emulator` flag when targeting emulator

### Permission Denied
- Verify your Firebase project permissions
- Ensure the service account has `Cloud Datastore Owner` or `Firebase Admin` role

## 📝 Script Files

- `delete-collections-except-users.js`: Main deletion script
- `test-deletion-script.js`: Logic validation tests  
- `README-deletion-script.md`: This documentation

## 🛠️ Development Notes

Based on existing patterns in `scripts/delete-firestore-data.js`, this script:
- Uses Firebase Admin SDK for server-side operations
- Implements batch deletion for efficiency (100 documents per batch)
- Follows the project's established error handling patterns
- Includes comprehensive logging and user feedback