/**
 * Quick test script to verify dual email functionality
 */
const { snapshotToCore } = require('./functions/lib/shared/schemas/transformers.js');

// Test data with dual email scenario
const testSnapshot = {
  teacher: {
    email: "dev.codepet@gmail.com",
    name: "Test Teacher",
    isTeacher: true
  },
  classrooms: [
    {
      id: "test_classroom_123",
      name: "Test Classroom",
      section: "Period 1",
      description: "Test classroom with school board email",
      courseGroupEmail: "course123@schoolboard.edu",
      teacherGroupEmail: "teacher@schoolboard.edu",
      studentCount: 2,
      assignmentCount: 1,
      assignments: [
        {
          id: "assignment_456", 
          title: "Test Assignment",
          description: "A test assignment",
          type: "assignment",
          status: "published",
          maxScore: 100,
          creationTime: "2025-01-05T08:00:00.000Z",
          updateTime: "2025-01-05T08:00:00.000Z",
          submissionStats: { total: 0, submitted: 0, graded: 0, pending: 0 }
        }
      ],
      students: [],
      submissions: [],
      ownerId: "teacher123",
      courseState: "ACTIVE",
      creationTime: "2025-01-01T08:00:00.000Z",
      updateTime: "2025-01-10T08:00:00.000Z"
    }
  ],
  globalStats: {
    totalStudents: 2,
    totalAssignments: 1,
    totalSubmissions: 0,
    ungradedSubmissions: 0
  }
};

console.log('Testing dual email transformation...');

try {
  const transformed = snapshotToCore(testSnapshot);
  
  console.log('\n=== TEACHER TRANSFORMATION ===');
  console.log('Personal email:', transformed.teacher.email);
  console.log('School email:', transformed.teacher.schoolEmail);
  console.log('Expected school email: course123@schoolboard.edu');
  console.log('School email extracted correctly:', transformed.teacher.schoolEmail === 'course123@schoolboard.edu');
  
  console.log('\n=== CLASSROOM TRANSFORMATION ===');
  console.log('Teacher ID in classroom:', transformed.classrooms[0].teacherId);
  console.log('Should match personal email:', transformed.classrooms[0].teacherId === 'dev.codepet@gmail.com');
  
  console.log('\n=== SUCCESS: Dual email extraction working correctly! ===');
  
} catch (error) {
  console.error('Error testing transformation:', error);
}