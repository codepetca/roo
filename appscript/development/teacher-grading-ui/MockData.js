/**
 * Mock Data for Teacher Grading UI
 * Comprehensive test data for all UI scenarios
 */

// Mock classrooms
const MOCK_CLASSROOMS = [
  {
    id: 'class-math-101',
    name: 'Math 101 - Introduction to Programming',
    section: 'Section A',
    description: 'Learn programming fundamentals with Karel the Dog',
    enrollmentCode: 'abc123',
    courseState: 'ACTIVE',
    creationTime: '2025-01-01T00:00:00Z',
    studentCount: 30,
    alternateLink: 'https://classroom.google.com/c/mock1'
  },
  {
    id: 'class-sci-202',
    name: 'Science 202 - Advanced Programming',
    section: 'Section B',
    description: 'Advanced programming concepts and algorithms',
    enrollmentCode: 'xyz789',
    courseState: 'ACTIVE',
    creationTime: '2025-01-01T00:00:00Z',
    studentCount: 28,
    alternateLink: 'https://classroom.google.com/c/mock2'
  },
  {
    id: 'class-cs-303',
    name: 'CS 303 - Data Structures',
    section: 'Section A',
    description: 'Introduction to data structures and algorithms',
    enrollmentCode: 'ds303',
    courseState: 'ACTIVE',
    creationTime: '2025-01-01T00:00:00Z',
    studentCount: 25,
    alternateLink: 'https://classroom.google.com/c/mock3'
  }
];

// Mock assignments organized by classroom
const MOCK_ASSIGNMENTS = {
  'class-math-101': [
    {
      id: 'assign-karel-1',
      title: 'Karel Exercise 1 - Basic Movement',
      description: 'Learn to move Karel forward and turn',
      type: 'coding',
      status: 'graded',
      maxScore: 100,
      dueDate: '2025-01-15T23:59:59Z',
      creationTime: '2025-01-01T00:00:00Z',
      updateTime: '2025-01-01T00:00:00Z',
      workType: 'ASSIGNMENT',
      submissionStats: {
        total: 30,
        submitted: 30,
        graded: 30,
        pending: 0
      }
    },
    {
      id: 'assign-karel-2',
      title: 'Karel Exercise 2 - Loops and Conditions',
      description: 'Use loops and if statements with Karel',
      type: 'coding',
      status: 'graded',
      maxScore: 100,
      dueDate: '2025-01-20T23:59:59Z',
      creationTime: '2025-01-05T00:00:00Z',
      updateTime: '2025-01-05T00:00:00Z',
      workType: 'ASSIGNMENT',
      submissionStats: {
        total: 30,
        submitted: 30,
        graded: 30,
        pending: 0
      }
    },
    {
      id: 'assign-karel-3',
      title: 'Karel Exercise 3 - Functions',
      description: 'Create and use functions with Karel',
      type: 'coding',
      status: 'partial',
      maxScore: 100,
      dueDate: '2025-01-25T23:59:59Z',
      creationTime: '2025-01-10T00:00:00Z',
      updateTime: '2025-01-10T00:00:00Z',
      workType: 'ASSIGNMENT',
      submissionStats: {
        total: 30,
        submitted: 25,
        graded: 15,
        pending: 10
      }
    },
    {
      id: 'quiz-basics-1',
      title: 'Quiz 1 - Programming Basics',
      description: 'Test your knowledge of basic programming concepts',
      type: 'quiz',
      status: 'graded',
      maxScore: 50,
      dueDate: '2025-01-18T23:59:59Z',
      creationTime: '2025-01-08T00:00:00Z',
      updateTime: '2025-01-08T00:00:00Z',
      workType: 'SHORT_ANSWER_QUESTION',
      submissionStats: {
        total: 30,
        submitted: 30,
        graded: 30,
        pending: 0
      }
    },
    {
      id: 'quiz-loops-2',
      title: 'Quiz 2 - Loops and Logic',
      description: 'Quiz on loops, conditions, and logical operators',
      type: 'quiz',
      status: 'pending',
      maxScore: 50,
      dueDate: '2025-01-30T23:59:59Z',
      creationTime: '2025-01-15T00:00:00Z',
      updateTime: '2025-01-15T00:00:00Z',
      workType: 'SHORT_ANSWER_QUESTION',
      submissionStats: {
        total: 30,
        submitted: 5,
        graded: 0,
        pending: 5
      }
    }
  ],
  'class-sci-202': [
    {
      id: 'assign-algo-1',
      title: 'Algorithm Challenge 1',
      description: 'Implement sorting algorithms',
      type: 'coding',
      status: 'partial',
      maxScore: 100,
      dueDate: '2025-01-28T23:59:59Z',
      creationTime: '2025-01-10T00:00:00Z',
      updateTime: '2025-01-10T00:00:00Z',
      workType: 'ASSIGNMENT',
      submissionStats: {
        total: 28,
        submitted: 20,
        graded: 12,
        pending: 8
      }
    },
    {
      id: 'quiz-algo-1',
      title: 'Quiz - Algorithm Complexity',
      description: 'Understanding Big O notation',
      type: 'quiz',
      status: 'pending',
      maxScore: 40,
      dueDate: '2025-02-01T23:59:59Z',
      creationTime: '2025-01-15T00:00:00Z',
      updateTime: '2025-01-15T00:00:00Z',
      workType: 'SHORT_ANSWER_QUESTION',
      submissionStats: {
        total: 28,
        submitted: 0,
        graded: 0,
        pending: 0
      }
    }
  ],
  'class-cs-303': [
    {
      id: 'assign-ds-1',
      title: 'Implement a Stack',
      description: 'Create a stack data structure with push/pop operations',
      type: 'coding',
      status: 'pending',
      maxScore: 100,
      dueDate: '2025-02-05T23:59:59Z',
      creationTime: '2025-01-20T00:00:00Z',
      updateTime: '2025-01-20T00:00:00Z',
      workType: 'ASSIGNMENT',
      submissionStats: {
        total: 25,
        submitted: 0,
        graded: 0,
        pending: 0
      }
    }
  ]
};

// Mock student submissions organized by assignment ID
const MOCK_SUBMISSIONS = {
  'assign-karel-3': [
    {
      id: 'sub-001',
      studentId: 'student-001',
      studentName: 'Alice Johnson',
      studentEmail: 'alice.johnson@school.edu',
      assignmentId: 'assign-karel-3',
      status: 'graded',
      score: 95,
      maxScore: 100,
      feedback: 'Excellent work! Your use of functions is very clean and well-organized. Great job on the edge case handling.',
      submittedAt: '2025-01-24T14:30:00Z',
      gradedAt: '2025-01-24T16:45:00Z',
      late: false,
      content: `function main() {
  moveToWall();
  turnAround();
  moveToWall();
  celebrate();
}

function moveToWall() {
  while (frontIsClear()) {
    move();
  }
}

function turnAround() {
  turnLeft();
  turnLeft();
}

function celebrate() {
  for (let i = 0; i < 4; i++) {
    turnLeft();
  }
}`
    },
    {
      id: 'sub-002',
      studentId: 'student-002',
      studentName: 'Bob Smith',
      studentEmail: 'bob.smith@school.edu',
      assignmentId: 'assign-karel-3',
      status: 'graded',
      score: 82,
      maxScore: 100,
      feedback: 'Good work! Consider adding comments to explain your function logic. The solution works but could be more efficient.',
      submittedAt: '2025-01-24T15:00:00Z',
      gradedAt: '2025-01-24T17:00:00Z',
      late: false,
      content: `function main() {
  // Move forward until wall
  while (frontIsClear()) {
    move();
  }
  // Turn around
  turnLeft();
  turnLeft();
  // Move back
  while (frontIsClear()) {
    move();
  }
}`
    },
    {
      id: 'sub-003',
      studentId: 'student-003',
      studentName: 'Charlie Davis',
      studentEmail: 'charlie.davis@school.edu',
      assignmentId: 'assign-karel-3',
      status: 'pending',
      submittedAt: '2025-01-24T16:30:00Z',
      late: false,
      content: `function main() {
  moveKarel();
}

function moveKarel() {
  // Student code here
  while (frontIsClear()) {
    move();
  }
}`
    },
    {
      id: 'sub-004',
      studentId: 'student-004',
      studentName: 'Diana Martinez',
      studentEmail: 'diana.martinez@school.edu',
      assignmentId: 'assign-karel-3',
      status: 'grading',
      submittedAt: '2025-01-24T17:00:00Z',
      late: false,
      content: `function main() {
  for (let i = 0; i < 10; i++) {
    if (frontIsClear()) {
      move();
    } else {
      turnLeft();
    }
  }
}`
    },
    {
      id: 'sub-005',
      studentId: 'student-005',
      studentName: 'Eve Wilson',
      studentEmail: 'eve.wilson@school.edu',
      assignmentId: 'assign-karel-3',
      status: 'pending',
      submittedAt: '2025-01-24T18:00:00Z',
      late: false,
      content: `// TODO: Implement the solution`
    },
    {
      id: 'sub-006',
      studentId: 'student-006',
      studentName: 'Frank Brown',
      studentEmail: 'frank.brown@school.edu',
      assignmentId: 'assign-karel-3',
      status: 'graded',
      score: 88,
      maxScore: 100,
      feedback: 'Good implementation! Your functions are well-structured. Try to make your function names more descriptive.',
      submittedAt: '2025-01-24T19:00:00Z',
      gradedAt: '2025-01-24T20:00:00Z',
      late: false,
      content: `function main() {
  func1();
  func2();
  func1();
}

function func1() {
  while (frontIsClear()) {
    move();
  }
}

function func2() {
  turnLeft();
  turnLeft();
}`
    },
    // Add more submissions to test pagination
    {
      id: 'sub-007',
      studentId: 'student-007',
      studentName: 'Grace Lee',
      studentEmail: 'grace.lee@school.edu',
      assignmentId: 'assign-karel-3',
      status: 'pending',
      submittedAt: '2025-01-24T20:00:00Z',
      late: false,
      content: `function main() { /* Implementation pending */ }`
    },
    {
      id: 'sub-008',
      studentId: 'student-008',
      studentName: 'Henry Taylor',
      studentEmail: 'henry.taylor@school.edu',
      assignmentId: 'assign-karel-3',
      status: 'pending',
      submittedAt: '2025-01-24T20:30:00Z',
      late: false,
      content: `function main() { move(); }`
    }
  ],
  'quiz-basics-1': [
    {
      id: 'sub-quiz-001',
      studentId: 'student-001',
      studentName: 'Alice Johnson',
      studentEmail: 'alice.johnson@school.edu',
      assignmentId: 'quiz-basics-1',
      status: 'graded',
      score: 48,
      maxScore: 50,
      feedback: 'Excellent understanding of the concepts! Just missed one small detail in question 3.',
      submittedAt: '2025-01-18T14:00:00Z',
      gradedAt: '2025-01-18T15:00:00Z',
      late: false,
      content: {
        answers: [
          { question: 1, answer: 'A loop is a control structure that repeats code', correct: true },
          { question: 2, answer: 'if-else', correct: true },
          { question: 3, answer: 'function', correct: false },
          { question: 4, answer: 'variable declaration', correct: true },
          { question: 5, answer: 'true', correct: true }
        ]
      }
    },
    {
      id: 'sub-quiz-002',
      studentId: 'student-002',
      studentName: 'Bob Smith',
      studentEmail: 'bob.smith@school.edu',
      assignmentId: 'quiz-basics-1',
      status: 'graded',
      score: 40,
      maxScore: 50,
      feedback: 'Good effort! Review the concepts of functions and loops for better understanding.',
      submittedAt: '2025-01-18T14:30:00Z',
      gradedAt: '2025-01-18T15:30:00Z',
      late: false,
      content: {
        answers: [
          { question: 1, answer: 'A loop repeats', correct: true },
          { question: 2, answer: 'switch', correct: false },
          { question: 3, answer: 'method', correct: true },
          { question: 4, answer: 'var x = 5', correct: true },
          { question: 5, answer: 'false', correct: false }
        ]
      }
    }
  ],
  'quiz-loops-2': [
    {
      id: 'sub-quiz2-001',
      studentId: 'student-001',
      studentName: 'Alice Johnson',
      studentEmail: 'alice.johnson@school.edu',
      assignmentId: 'quiz-loops-2',
      status: 'pending',
      submittedAt: '2025-01-25T10:00:00Z',
      late: false,
      content: {
        answers: [
          { question: 1, answer: 'for loop iterates a specific number of times' },
          { question: 2, answer: 'while (condition)' },
          { question: 3, answer: 'break' },
          { question: 4, answer: 'O(n^2)' },
          { question: 5, answer: 'true && false = false' }
        ]
      }
    }
  ],
  'assign-algo-1': [
    {
      id: 'sub-algo-001',
      studentId: 'student-201',
      studentName: 'John Anderson',
      studentEmail: 'john.anderson@school.edu',
      assignmentId: 'assign-algo-1',
      status: 'graded',
      score: 92,
      maxScore: 100,
      feedback: 'Excellent implementation of quicksort! Your partition function is very efficient.',
      submittedAt: '2025-01-26T14:00:00Z',
      gradedAt: '2025-01-26T16:00:00Z',
      late: false,
      content: `function quickSort(arr) {
  if (arr.length <= 1) return arr;
  
  const pivot = arr[Math.floor(arr.length / 2)];
  const left = arr.filter(x => x < pivot);
  const middle = arr.filter(x => x === pivot);
  const right = arr.filter(x => x > pivot);
  
  return [...quickSort(left), ...middle, ...quickSort(right)];
}`
    }
  ]
};

// Mock student data for reference
const MOCK_STUDENTS = {
  'student-001': { name: 'Alice Johnson', email: 'alice.johnson@school.edu', id: 'student-001' },
  'student-002': { name: 'Bob Smith', email: 'bob.smith@school.edu', id: 'student-002' },
  'student-003': { name: 'Charlie Davis', email: 'charlie.davis@school.edu', id: 'student-003' },
  'student-004': { name: 'Diana Martinez', email: 'diana.martinez@school.edu', id: 'student-004' },
  'student-005': { name: 'Eve Wilson', email: 'eve.wilson@school.edu', id: 'student-005' },
  'student-006': { name: 'Frank Brown', email: 'frank.brown@school.edu', id: 'student-006' },
  'student-007': { name: 'Grace Lee', email: 'grace.lee@school.edu', id: 'student-007' },
  'student-008': { name: 'Henry Taylor', email: 'henry.taylor@school.edu', id: 'student-008' },
  'student-201': { name: 'John Anderson', email: 'john.anderson@school.edu', id: 'student-201' }
};

// Helper function to get assignment statistics
function getAssignmentStats(assignmentId) {
  const submissions = MOCK_SUBMISSIONS[assignmentId] || [];
  return {
    total: submissions.length,
    graded: submissions.filter(s => s.status === 'graded').length,
    pending: submissions.filter(s => s.status === 'pending').length,
    grading: submissions.filter(s => s.status === 'grading').length,
    averageScore: calculateAverageScore(submissions)
  };
}

// Calculate average score for graded submissions
function calculateAverageScore(submissions) {
  const gradedSubmissions = submissions.filter(s => s.status === 'graded' && s.score !== undefined);
  if (gradedSubmissions.length === 0) return 0;
  
  const totalScore = gradedSubmissions.reduce((sum, s) => sum + s.score, 0);
  return Math.round(totalScore / gradedSubmissions.length);
}