#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Loading full pipeline...');

try {
  // Load all the components
  const { snapshotToCore, mergeSnapshotWithExisting } = require('./functions/lib/shared/schemas/transformers.js');
  const { SnapshotProcessor } = require('./functions/lib/src/services/snapshot-processor.js');
  
  console.log('Loading mock data...');
  const mockDataPath = path.join(__dirname, 'frontend/e2e/fixtures/classroom-snapshot-mock.json');
  const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

  console.log('Running full pipeline test...');
  
  // Create a snapshot processor
  const processor = new SnapshotProcessor();
  
  // Process the snapshot (this calls the entire pipeline)
  processor.processSnapshot(mockData, 'teacher@test.com')
    .then(result => {
      console.log('=== Full Pipeline Results ===');
      console.log('Success:', result.success);
      console.log('Processing time:', result.processingTime + 'ms');
      console.log('Stats:', JSON.stringify(result.stats, null, 2));
      
      if (result.errors.length > 0) {
        console.log('Errors:');
        result.errors.forEach(err => {
          console.log(`  ${err.entity} ${err.id}: ${err.error}`);
        });
      }
      
      if (result.stats.submissionsCreated === 0) {
        console.log('\n❌ NO SUBMISSIONS CREATED - The bug is confirmed!');
        console.log('Check the debug logs above to see where submissions were lost.');
      } else {
        console.log('\n✅ Submissions successfully created!');
      }
    })
    .catch(error => {
      console.error('Pipeline failed:', error);
      console.error(error.stack);
    });

} catch (error) {
  console.error('Error setting up pipeline test:', error);
  console.error(error.stack);
}