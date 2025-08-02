# Webhook Integration Deployment

## Overview
This is the current production webhook integration that processes Google Sheets submissions.

## Deployment Status
- **Status**: LIVE
- **Deployed**: Previously deployed (exact date unknown)
- **Board Account Script ID**: Not documented (check board account)

## Features
- Processes teacher Google Sheets
- Syncs classroom and student data to Firebase
- Handles form submissions
- API Key authentication

## Configuration Required
- API Key: Set in Script Properties as `ROO_BOARD_API_KEY`
- Current key: `roo-webhook-dev-stable123456`

## Web App URL Format
```
https://script.google.com/macros/s/[SCRIPT_ID]/exec?sheetId=[SHEET_ID]
```