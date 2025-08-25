#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('Loading transformation functions...');

// Try to load the transformers module
try {
  // We need to use the compiled JavaScript version
  const { snapshotToCore } = require('./functions/lib/shared/schemas/transformers.js');
  
  console.log('Loading mock data...');
  const mockDataPath = path.join(__dirname, 'frontend/e2e/fixtures/classroom-snapshot-mock.json');
  const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

  console.log('Running transformation...');
  const result = snapshotToCore(mockData);

  console.log('=== Transformation Results ===');
  console.log(`Classrooms: ${result.classrooms.length}`);
  console.log(`Assignments: ${result.assignments.length}`);
  console.log(`Submissions: ${result.submissions.length}`);
  console.log(`Enrollments: ${result.enrollments.length}`);
  
  if (result.submissions.length === 0) {
    console.log('\n❌ NO SUBMISSIONS TRANSFORMED - This confirms the bug!');
  } else {
    console.log('\n✅ Submissions successfully transformed');
    console.log('Sample transformed submission:');
    const sample = result.submissions[0];
    console.log(JSON.stringify({
      studentEmail: sample.studentEmail,
      studentName: sample.studentName,
      content: sample.content?.slice(0, 50) + '...',
      attachments: sample.attachments.length,
      status: sample.status
    }, null, 2));
  }

} catch (error) {
  console.error('Error running transformation:', error);
  
  if (error.code === 'MODULE_NOT_FOUND') {
    console.log('\nTrying to build the functions first...');
    const { exec } = require('child_process');
    exec('cd functions && npm run build', (buildError, stdout, stderr) => {
      if (buildError) {
        console.error('Build failed:', buildError);
        return;
      }
      console.log('Build completed, try running the script again');
    });
  }
}