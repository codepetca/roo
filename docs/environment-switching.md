# Environment Switching Guide: Staging ↔ Production

Complete guide for switching between staging and production Firebase environments in the Roo project.

## 🎯 Quick Switch Commands

```bash
# Switch to staging environment
./scripts/use-staging.sh

# Switch to production environment  
./scripts/use-production.sh
```

## 📋 Required .env Configuration

### Staging Environment

You need to obtain the actual Firebase Web App configuration for the staging project and update these files:

#### `frontend/.env.staging`
```env
PUBLIC_FIREBASE_API_KEY=your-staging-api-key
PUBLIC_FIREBASE_AUTH_DOMAIN=roo-staging-602dd.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=roo-staging-602dd
PUBLIC_FIREBASE_STORAGE_BUCKET=roo-staging-602dd.firebasestorage.app
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=933233788608
PUBLIC_FIREBASE_APP_ID=your-staging-app-id
PUBLIC_USE_EMULATORS=false
```

**How to get the actual values:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select the "roo staging" project
3. Go to Project Settings → General → Your apps
4. Copy the Firebase SDK snippet values

#### `functions/.env.staging`
```env
ENVIRONMENT=staging
FIREBASE_PROJECT_ID=roo-staging-602dd
GEMINI_API_KEY=your-staging-gemini-key
BREVO_API_KEY=your-staging-brevo-key
```

### Production Environment

Already configured in:
- `frontend/.env.production` ✅
- `functions/.env` (created automatically by scripts)

## 🔄 What Each Script Does

### `use-staging.sh`
1. **Firebase CLI**: Switches to staging project (`roo-staging-602dd`)
2. **Frontend**: Copies `.env.staging` → `.env`
3. **Functions**: Copies `.env.staging` → `.env`
4. **Verification**: Shows current project status

### `use-production.sh`
1. **Firebase CLI**: Switches to production project (`roo-app-3d24e`)
2. **Frontend**: Copies `.env.production` → `.env`
3. **Functions**: Creates production `.env` file
4. **Verification**: Shows current project status

## 🛠️ Additional Considerations When Switching

### 1. Service Account Authentication

**Backend Firebase Admin SDK** uses service account authentication:

**For Staging:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/staging-service-account.json"
```

**For Production:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS="path/to/production-service-account.json"
```

Or add to your shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
alias staging-creds='export GOOGLE_APPLICATION_CREDENTIALS="/path/to/staging-service-account.json"'
alias prod-creds='export GOOGLE_APPLICATION_CREDENTIALS="/path/to/production-service-account.json"'
```

### 2. API Keys and External Services

Update these keys when switching environments:

**Google Gemini API:**
- Production key vs staging/development key
- Different rate limits and quotas

**Brevo Email Service:**
- Different API keys for staging vs production
- Different sender configurations

**Google Sheets API:**
- May need different service account permissions
- Different spreadsheet IDs for testing

### 3. Database State Considerations

**Firestore Collections:**
- Staging: Safe to experiment and delete data
- Production: Contains real user data - handle with extreme care

**Authentication Users:**
- Staging: Test users only
- Production: Real user accounts

### 4. Deployment Considerations

**Functions Deployment:**
```bash
# Deploy to currently selected project
npm run deploy

# Or explicitly specify project
firebase deploy --project staging
firebase deploy --project production
```

**Frontend Deployment:**
```bash
# Deploys to currently selected Firebase project
npm run build:frontend && firebase deploy --only hosting
```

## 🚨 Safety Checklist

### Before Switching to Production:
- [ ] Verify you have production service account credentials
- [ ] Confirm all API keys are production-ready
- [ ] Check that you're not in a testing/experimental mindset
- [ ] Consider impact of any database operations

### Before Switching to Staging:
- [ ] Ensure staging project exists and is accessible
- [ ] Verify staging API keys and credentials are configured
- [ ] Understand that staging data can be deleted/modified freely

## 🔍 Verification Commands

Check your current environment:

```bash
# Current Firebase project
firebase projects:list
firebase use

# Current environment files
cat frontend/.env | grep PROJECT_ID
cat functions/.env | grep FIREBASE_PROJECT_ID

# Service account verification
echo $GOOGLE_APPLICATION_CREDENTIALS
```

## 🚧 Troubleshooting

### Authentication Issues
**Problem:** Script shows "invalid_grant" or authentication errors
**Solution:** 
1. Check service account credentials path
2. Verify service account has proper permissions
3. Re-authenticate with Firebase CLI: `firebase login`

### Missing Configuration
**Problem:** "Warning: .env.staging not found"
**Solution:**
1. Get actual Firebase config values from Firebase Console
2. Update `frontend/.env.staging` with real values
3. Add necessary API keys to `functions/.env.staging`

### Wrong Project Selected
**Problem:** Commands affecting wrong environment
**Solution:**
1. Run `firebase use` to check current project
2. Run appropriate switch script: `./scripts/use-staging.sh` or `./scripts/use-production.sh`
3. Verify with `firebase projects:list`

## 📚 Additional Resources

- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Firebase Project Management](https://firebase.google.com/docs/projects/learn-more)
- [Environment Variables in SvelteKit](https://kit.svelte.dev/docs/modules#$env-static-public)

---

**⚠️ Remember:** Always double-check which environment you're working in, especially when making database changes or deploying code!