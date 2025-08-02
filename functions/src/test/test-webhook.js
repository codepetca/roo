/**
 * Manual test script for the classroom sync webhook
 * 
 * Usage:
 * 1. Update the teacherId and spreadsheetId below
 * 2. Run: node functions/src/test/test-webhook.js
 */

const https = require('https');

// Configuration
const config = {
  webhookUrl: 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api/webhooks/classroom-sync',
  apiKey: 'roo-webhook-dev-stable123456',
  // Update these values for your test:
  teacherId: 'stewart.chan@gapps.yrdsb.ca', // Replace with actual teacher email
  spreadsheetId: '1Fgjm8Dz_LsjU36Wh8Va0nwo1y4aDWgm6hliW-01Q7_g' // Replace with actual sheet ID
};

async function testWebhook() {
  console.log('🚀 Testing webhook with:', {
    teacherId: config.teacherId,
    spreadsheetId: config.spreadsheetId
  });

  const payload = JSON.stringify({
    spreadsheetId: config.spreadsheetId,
    teacherId: config.teacherId,
    timestamp: new Date().toISOString(),
    source: 'manual-test'
  });

  const url = new URL(config.webhookUrl);

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'X-API-Key': config.apiKey,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('📥 Response Status:', res.statusCode);
        console.log('📥 Response Headers:', res.headers);

        try {
          const jsonResponse = JSON.parse(data);
          console.log('📥 Response Body:', JSON.stringify(jsonResponse, null, 2));

          if (jsonResponse.success) {
            console.log('✅ Webhook succeeded!');
            console.log('📊 Results:', {
              classroomsCreated: jsonResponse.data?.classroomsCreated || 0,
              classroomsUpdated: jsonResponse.data?.classroomsUpdated || 0,
              studentsCreated: jsonResponse.data?.studentsCreated || 0,
              studentsUpdated: jsonResponse.data?.studentsUpdated || 0
            });
          } else {
            console.log('❌ Webhook failed:', jsonResponse.error);
          }
        } catch (e) {
          console.log('📥 Raw Response:', data);
        }

        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

// Also test the status endpoint
async function testStatusEndpoint() {
  console.log('\n🔍 Testing status endpoint...');

  const statusUrl = config.webhookUrl.replace('/classroom-sync', '/status');
  const url = new URL(statusUrl);

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'GET',
    headers: {
      'X-API-Key': config.apiKey
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log('📥 Status Response:', res.statusCode);
        try {
          const jsonResponse = JSON.parse(data);
          console.log('📥 Status Body:', JSON.stringify(jsonResponse, null, 2));
        } catch (e) {
          console.log('📥 Raw Status Response:', data);
        }
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Status request failed:', error.message);
      reject(error);
    });

    req.end();
  });
}

// Run the tests
async function runTests() {
  try {
    await testStatusEndpoint();
    await testWebhook();
    console.log('\n✅ All tests completed');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }
}

runTests();