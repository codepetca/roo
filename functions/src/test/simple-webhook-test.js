/**
 * Simple webhook test - can be used independently of AppScript
 */

const WEBHOOK_URL = 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/classroom-sync';
const STATUS_URL = 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/status';

// Test data - using your actual spreadsheet
const TEST_DATA = {
  spreadsheetId: '1Fgjm8Dz_LsjU36Wh8Va0nwo1y4aDWgm6hliW-01Q7_g',
  teacherId: 'stewart.chan@gapps.yrdsb.ca'
};

// Will be populated when deployment completes
let API_KEY = 'roo-webhook-dev-test';

console.log('Testing webhook endpoints...');

// Test status endpoint first
fetch(STATUS_URL, {
  method: 'GET',
  headers: {
    'X-API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
})
.then(response => {
  console.log('Status endpoint response:', response.status);
  return response.json();
})
.then(data => {
  console.log('Status data:', data);
  
  if (data.success) {
    console.log('✅ Webhook status endpoint working');
    
    // Test the actual sync endpoint
    return fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'X-API-Key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(TEST_DATA)
    });
  } else {
    throw new Error('Status endpoint failed');
  }
})
.then(response => {
  console.log('Sync endpoint response:', response.status);
  return response.json();
})
.then(data => {
  console.log('Sync data:', data);
  
  if (data.success) {
    console.log('✅ Webhook sync endpoint working');
    console.log('🎉 Classroom sync integration is ready!');
  } else {
    console.log('⚠️ Sync had issues:', data.error);
  }
})
.catch(error => {
  console.log('❌ Test failed:', error.message);
});