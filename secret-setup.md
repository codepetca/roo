# Firebase Secret Manager Setup

## Step 1: Set the secret (run this in your terminal)
```bash
firebase functions:secrets:set GEMINI_API_KEY
```
- It will prompt you to enter the API key value
- Paste your Gemini API key when prompted

## Step 2: Update the function to use the secret
The function needs to be configured to access the secret.

## Step 3: Deploy with secret access
```bash
firebase deploy --only functions
```

Let me update the code to use Firebase secrets properly...