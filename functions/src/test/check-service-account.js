/**
 * Check which service account is being used by the webhook
 */

const https = require('https');

const API_KEY = 'roo-webhook-dev-stable123456';
const BASE_URL = 'https://us-central1-roo-app-3d24e.cloudfunctions.net/api';

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + (url.search || ''),
      method: 'GET',
      headers: {
        'X-API-Key': API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonResponse });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function checkServiceAccount() {
  console.log('🔍 Checking service account information...\n');
  
  try {
    const result = await makeRequest('/webhooks/debug/service-account');
    
    if (result.status === 200 && result.data.success) {
      console.log('✅ Service Account Information:');
      console.log('   Email:', result.data.serviceAccount.email);
      console.log('   Project ID:', result.data.serviceAccount.projectId);
      console.log('\n📋 Environment:');
      Object.entries(result.data.environment).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
      
      if (result.data.recentSyncHistory && result.data.recentSyncHistory.length > 0) {
        console.log('\n📜 Recent Sync History:');
        result.data.recentSyncHistory.forEach((sync, index) => {
          console.log(`\n   ${index + 1}. ${sync.timestamp}`);
          console.log(`      Teacher: ${sync.teacherId}`);
          console.log(`      Success: ${sync.success}`);
          if (sync.error) {
            console.log(`      Error: ${sync.error}`);
          }
          if (sync.results) {
            console.log(`      Results: ${JSON.stringify(sync.results)}`);
          }
        });
      }
    } else {
      console.log('❌ Failed to get service account info:', result.data);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

async function testSheetAccess(spreadsheetId) {
  console.log('\n\n🔍 Testing sheet access...\n');
  
  try {
    const result = await makeRequest(`/webhooks/debug/test-sheet?spreadsheetId=${spreadsheetId}`);
    
    if (result.status === 200 && result.data.success) {
      console.log('✅ Sheet Access Successful!');
      console.log('   Title:', result.data.sheetInfo.title);
      console.log('   Time Zone:', result.data.sheetInfo.timeZone);
      console.log('   Sheets:');
      result.data.sheetInfo.sheets.forEach(sheet => {
        console.log(`   - ${sheet.title} (${sheet.rowCount} rows x ${sheet.columnCount} columns)`);
      });
    } else {
      console.log('❌ Sheet Access Failed:', result.data.error);
      if (result.data.details) {
        console.log('   Details:', JSON.stringify(result.data.details, null, 2));
      }
      if (result.data.helpfulHints) {
        console.log('\n💡 Helpful Hints:');
        result.data.helpfulHints.forEach(hint => {
          console.log(`   - ${hint}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

// Run the checks
async function main() {
  const spreadsheetId = '1Fgjm8Dz_LsjU36Wh8Va0nwo1y4aDWgm6hliW-01Q7_g'; // Your test sheet
  
  await checkServiceAccount();
  await testSheetAccess(spreadsheetId);
}

main();