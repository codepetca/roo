#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load mock data
const mockDataPath = path.join(__dirname, 'frontend/e2e/fixtures/classroom-snapshot-mock.json');
const mockData = JSON.parse(fs.readFileSync(mockDataPath, 'utf8'));

console.log('=== Mock Data Analysis ===');
console.log(`Classrooms: ${mockData.classrooms.length}`);

let totalSubmissions = 0;
let submissionsWithStudentWork = 0;
let submissionsWithContent = 0;

for (const classroom of mockData.classrooms) {
  console.log(`\nClassroom: ${classroom.name}`);
  console.log(`  Submissions: ${classroom.submissions.length}`);
  
  totalSubmissions += classroom.submissions.length;
  
  for (const submission of classroom.submissions) {
    if (submission.studentWork && submission.studentWork.trim()) {
      submissionsWithStudentWork++;
    }
    if (submission.content && submission.content.trim()) {
      submissionsWithContent++;
    }
  }
}

console.log('\n=== Summary ===');
console.log(`Total submissions: ${totalSubmissions}`);
console.log(`Submissions with studentWork: ${submissionsWithStudentWork}`);
console.log(`Submissions with content: ${submissionsWithContent}`);

console.log('\n=== Sample Submission ===');
const sampleSubmission = mockData.classrooms[0].submissions[0];
console.log('Sample submission structure:');
console.log(JSON.stringify({
  id: sampleSubmission.id,
  assignmentId: sampleSubmission.assignmentId,
  studentEmail: sampleSubmission.studentEmail,
  studentName: sampleSubmission.studentName,
  studentWork: sampleSubmission.studentWork?.slice(0, 100) + '...',
  content: sampleSubmission.content?.slice(0, 100) + '...',
  status: sampleSubmission.status,
  attachments: sampleSubmission.attachments,
  submittedAt: sampleSubmission.submittedAt
}, null, 2));

console.log('\n=== Field Presence Check ===');
const requiredFields = ['id', 'assignmentId', 'studentEmail', 'studentName', 'status', 'attachments'];
for (const field of requiredFields) {
  const present = sampleSubmission.hasOwnProperty(field);
  console.log(`${field}: ${present ? '✓' : '✗'}`);
}