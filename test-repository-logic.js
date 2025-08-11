/**
 * Test the repository query logic for dual email system
 */

// Mock teacher data for testing query logic
const mockTeacher = {
  id: 'teacher_123',
  email: 'dev.codepet@gmail.com',
  schoolEmail: 'course123@schoolboard.edu',
  name: 'Test Teacher',
  role: 'teacher',
  classroomIds: []
};

// Mock classroom data
const classroomsWithSchoolEmail = [
  {
    id: 'classroom_1',
    teacherId: 'course123@schoolboard.edu', // School board email
    name: 'Math Class'
  }
];

const classroomsWithPersonalEmail = [
  {
    id: 'classroom_2', 
    teacherId: 'dev.codepet@gmail.com', // Personal email
    name: 'Science Class'
  }
];

// Simulate the repository query logic
function simulateGetClassroomsByTeacher(teacherEmail) {
  console.log(`\n=== Simulating getClassroomsByTeacher('${teacherEmail}') ===`);
  
  // Step 1: Get teacher
  console.log('Step 1: Get teacher by email');
  const teacher = mockTeacher.email === teacherEmail ? mockTeacher : null;
  console.log('Teacher found:', teacher ? 'Yes' : 'No');
  if (teacher) {
    console.log('  - Personal email:', teacher.email);
    console.log('  - School email:', teacher.schoolEmail);
  }
  
  // Step 2: Query by personal email first
  console.log('\nStep 2: Query classrooms by personal email');
  const personalEmailResults = classroomsWithPersonalEmail.filter(
    c => c.teacherId === teacherEmail
  );
  console.log('Found with personal email:', personalEmailResults.length);
  
  if (personalEmailResults.length > 0) {
    console.log('SUCCESS: Found classrooms with personal email');
    return personalEmailResults;
  }
  
  // Step 3: If no results and has school email, try school email
  console.log('\nStep 3: No results with personal email, trying school email');
  if (teacher?.schoolEmail && teacher.schoolEmail !== teacherEmail) {
    console.log('Querying by school email:', teacher.schoolEmail);
    const schoolEmailResults = classroomsWithSchoolEmail.filter(
      c => c.teacherId === teacher.schoolEmail
    );
    console.log('Found with school email:', schoolEmailResults.length);
    
    if (schoolEmailResults.length > 0) {
      console.log('SUCCESS: Found classrooms with school email');
      return schoolEmailResults;
    }
  }
  
  console.log('No classrooms found with either email');
  return [];
}

console.log('Testing repository dual email query logic...');

// Test 1: Teacher with classrooms owned by school email (common scenario)
const result1 = simulateGetClassroomsByTeacher('dev.codepet@gmail.com');
console.log('Result 1 classrooms:', result1.map(c => c.name));

// Test 2: Teacher with classrooms owned by personal email (edge case)
mockTeacher.schoolEmail = undefined; // Simulate teacher without school email
const result2 = simulateGetClassroomsByTeacher('dev.codepet@gmail.com');  
console.log('\nResult 2 classrooms:', result2.map(c => c.name));

console.log('\n=== REPOSITORY LOGIC TEST COMPLETE ===');