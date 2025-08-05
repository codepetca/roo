/**
 * Mock Data for Teacher Grading UI - Minimal Test Data
 * Streamlined for efficient development and testing
 */

// Mock classrooms - reduced to 1 for efficiency
const MOCK_CLASSROOMS = [
  {
    id: 'class-math-101',
    name: 'Math 101 - Introduction to Programming',
    section: 'Section A',
    description: 'Learn programming fundamentals with Karel the Dog',
    enrollmentCode: 'abc123',
    courseState: 'ACTIVE',
    creationTime: '2025-01-01T00:00:00Z',
    studentCount: 5,  // Reduced from 30
    assignmentCount: 2,  // Reduced from 5
    alternateLink: 'https://classroom.google.com/c/mock1'
  }
];

// Mock assignments - minimal set
const MOCK_ASSIGNMENTS = {
  'class-math-101': [
    {
      id: 'assign-karel-1',
      title: 'Karel Exercise 1 - Basic Movement',
      description: 'Learn to move Karel forward and turn left',
      type: 'coding',
      status: 'graded',
      maxScore: 100,
      dueDate: '2025-01-15T23:59:59Z',
      creationTime: '2025-01-01T00:00:00Z',
      updateTime: '2025-01-01T00:00:00Z',
      workType: 'ASSIGNMENT',
      submissionStats: {
        total: 5,
        submitted: 5,
        graded: 5,
        pending: 0
      }
    },
    {
      id: 'assign-karel-2',
      title: 'Karel Exercise 2 - Functions',
      description: 'Create and use functions with Karel',
      type: 'coding',
      status: 'partial',
      maxScore: 100,
      dueDate: '2025-01-25T23:59:59Z',
      creationTime: '2025-01-10T00:00:00Z',
      updateTime: '2025-01-10T00:00:00Z',
      workType: 'ASSIGNMENT',
      submissionStats: {
        total: 5,
        submitted: 3,
        graded: 1,
        pending: 2
      }
    }
  ]
};

// Mock students - minimal set
const MOCK_STUDENTS = {
  'class-math-101': [
    {
      id: 'student-1',
      email: 'alice@school.edu',
      name: 'Alice Johnson',
      displayName: 'Alice Johnson'
    },
    {
      id: 'student-2', 
      email: 'bob@school.edu',
      name: 'Bob Smith',
      displayName: 'Bob Smith'
    },
    {
      id: 'student-3',
      email: 'charlie@school.edu', 
      name: 'Charlie Brown',
      displayName: 'Charlie Brown'
    },
    {
      id: 'student-4',
      email: 'diana@school.edu',
      name: 'Diana Prince', 
      displayName: 'Diana Prince'
    },
    {
      id: 'student-5',
      email: 'evan@school.edu',
      name: 'Evan Davis',
      displayName: 'Evan Davis'
    }
  ]
};

// Mock submissions - minimal representative set
const MOCK_SUBMISSIONS = {
  'assign-karel-1': [
    {
      id: 'sub-1-alice',
      assignmentId: 'assign-karel-1',
      studentId: 'student-1',
      studentName: 'Alice Johnson',
      studentEmail: 'alice@school.edu',
      submissionText: 'function main() {\n  move();\n  turnLeft();\n  move();\n}',
      status: 'graded',
      score: 95,
      feedback: 'Excellent work! Clean and efficient code.',
      submittedAt: '2025-01-12T10:30:00Z',
      gradedAt: '2025-01-13T14:20:00Z',
      late: false,
      attachments: []
    },
    {
      id: 'sub-1-bob',
      assignmentId: 'assign-karel-1',
      studentId: 'student-2', 
      studentName: 'Bob Smith',
      studentEmail: 'bob@school.edu',
      submissionText: 'function main() {\n  move();\n  move();\n  turnLeft();\n}',
      status: 'graded',
      score: 87,
      feedback: 'Good work! Check the sequence of movements.',
      submittedAt: '2025-01-12T15:45:00Z',
      gradedAt: '2025-01-13T16:10:00Z', 
      late: false,
      attachments: []
    },
    {
      id: 'sub-1-charlie',
      assignmentId: 'assign-karel-1',
      studentId: 'student-3',
      studentName: 'Charlie Brown',
      studentEmail: 'charlie@school.edu',
      submissionText: 'function main() {\n  move();\n  turnLeft();\n  move();\n  turnLeft();\n}',
      status: 'graded',
      score: 78,
      feedback: 'Nice attempt! Review the requirements carefully.',
      submittedAt: '2025-01-14T09:15:00Z',
      gradedAt: '2025-01-14T11:30:00Z',
      late: false,
      attachments: []
    }
  ],
  'assign-karel-2': [
    {
      id: 'sub-2-alice',
      assignmentId: 'assign-karel-2',
      studentId: 'student-1',
      studentName: 'Alice Johnson', 
      studentEmail: 'alice@school.edu',
      submissionText: 'function main() {\n  for (int i = 0; i < 4; i++) {\n    moveToWall();\n    turnLeft();\n  }\n}\n\nfunction moveToWall() {\n  while (frontIsClear()) {\n    move();\n  }\n}',
      status: 'graded',
      score: 92,
      feedback: 'Great use of functions and loops!',
      submittedAt: '2025-01-20T11:00:00Z',
      gradedAt: '2025-01-21T09:45:00Z',
      late: false,
      attachments: []
    },
    {
      id: 'sub-2-bob',
      assignmentId: 'assign-karel-2',
      studentId: 'student-2',
      studentName: 'Bob Smith',
      studentEmail: 'bob@school.edu', 
      submissionText: 'function main() {\n  move();\n  turnLeft();\n  move();\n  turnLeft();\n}',
      status: 'pending',
      score: null,
      feedback: null,
      submittedAt: '2025-01-22T16:30:00Z',
      gradedAt: null,
      late: false,
      attachments: []
    },
    {
      id: 'sub-2-charlie',
      assignmentId: 'assign-karel-2',
      studentId: 'student-3',
      studentName: 'Charlie Brown',
      studentEmail: 'charlie@school.edu',
      submissionText: 'function main() {\n  // TODO: Need to finish this\n  move();\n}',
      status: 'pending', 
      score: null,
      feedback: null,
      submittedAt: '2025-01-23T14:15:00Z',
      gradedAt: null,
      late: true,
      attachments: []
    }
  ]
};

// Helper function to get assignment stats
function getAssignmentStats(assignmentId) {
  const submissions = MOCK_SUBMISSIONS[assignmentId] || [];
  return {
    total: submissions.length,
    submitted: submissions.length,
    graded: submissions.filter(s => s.status === 'graded').length,
    pending: submissions.filter(s => s.status === 'pending').length,
    averageScore: submissions.filter(s => s.score !== null).reduce((sum, s) => sum + s.score, 0) / submissions.filter(s => s.score !== null).length || 0
  };
}

// Global stats calculation
function calculateGlobalStats() {
  const totalClassrooms = MOCK_CLASSROOMS.length;
  const totalStudents = Object.values(MOCK_STUDENTS).reduce((sum, students) => sum + students.length, 0);
  const totalAssignments = Object.values(MOCK_ASSIGNMENTS).reduce((sum, assignments) => sum + assignments.length, 0);
  const totalSubmissions = Object.values(MOCK_SUBMISSIONS).reduce((sum, submissions) => sum + submissions.length, 0);
  const ungradedSubmissions = Object.values(MOCK_SUBMISSIONS).reduce((sum, submissions) => 
    sum + submissions.filter(s => s.status === 'pending').length, 0);

  return {
    totalClassrooms,
    totalStudents,
    totalAssignments,
    totalSubmissions,
    ungradedSubmissions
  };
}