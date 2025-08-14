/**
 * Script to regenerate classroom-snapshot-mock.json with updated test data
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createMockClassroomSnapshot } from './test-data.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Generate updated mock data with Stewart included
const mockSnapshot = createMockClassroomSnapshot('medium'); // Use medium dataset

// Write to the mock JSON file
const outputPath = join(__dirname, 'classroom-snapshot-mock.json');
const jsonContent = JSON.stringify(mockSnapshot, null, '\t');

writeFileSync(outputPath, jsonContent, 'utf8');

console.log('✅ Updated classroom-snapshot-mock.json with Stewart Chan as student');
console.log(`📊 Generated data:`);
console.log(`   - Teacher: ${mockSnapshot.teacher.email}`);
console.log(`   - Classrooms: ${mockSnapshot.classrooms.length}`);
console.log(`   - Students: ${mockSnapshot.globalStats.totalStudents}`);
console.log(`   - Stewart included: ${mockSnapshot.classrooms.some(c => 
    c.students.some(s => s.email === 'stewart.chan@gapps.yrdsb.ca')
)}`);