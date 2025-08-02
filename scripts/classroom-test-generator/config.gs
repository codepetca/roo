/**
 * Configuration settings for Classroom Test Data Generator
 * Location: config.gs
 */

const CONFIG = {
  // Classroom Settings
  CLASSROOM: {
    name: "CS101 Test - Programming Fundamentals",
    section: "Fall 2025",
    description: "Test classroom for auto-grading development. Contains fake students and assignments for testing purposes.",
    room: "Virtual Lab A",
    ownerId: "me"
  },
  
  // Student Generation Settings
  STUDENTS: {
    count: 20,
    emailDomain: "@student.testschool.edu",
    profiles: [
      {firstName: "Alex", lastName: "Johnson"},
      {firstName: "Sarah", lastName: "Chen"},
      {firstName: "Michael", lastName: "Rodriguez"},
      {firstName: "Emma", lastName: "Williams"},
      {firstName: "David", lastName: "Brown"},
      {firstName: "Jessica", lastName: "Davis"},
      {firstName: "Ryan", lastName: "Wilson"},
      {firstName: "Ashley", lastName: "Garcia"},
      {firstName: "Brandon", lastName: "Martinez"},
      {firstName: "Samantha", lastName: "Anderson"},
      {firstName: "Tyler", lastName: "Taylor"},
      {firstName: "Madison", lastName: "Thomas"},
      {firstName: "Jordan", lastName: "Jackson"},
      {firstName: "Lauren", lastName: "White"},
      {firstName: "Kevin", lastName: "Harris"},
      {firstName: "Megan", lastName: "Clark"},
      {firstName: "Austin", lastName: "Lewis"},
      {firstName: "Brittany", lastName: "Robinson"},
      {firstName: "Connor", lastName: "Walker"},
      {firstName: "Stephanie", lastName: "Hall"}
    ]
  },
  
  // Assignment Topics
  PROGRAMMING_ASSIGNMENTS: [
    {
      title: "Karel Navigation Challenge",
      description: "Program Karel to navigate through a maze and collect beepers",
      type: "docs",
      dueInDays: 7
    },
    {
      title: "Grade Calculator Spreadsheet",
      description: "Create formulas to calculate student grades from assignment scores",
      type: "sheets",
      dueInDays: 10
    },
    {
      title: "Algorithm Visualization Presentation",
      description: "Create slides explaining sorting algorithms with visual examples",
      type: "slides",
      dueInDays: 14
    },
    {
      title: "Python Basics Notebook",
      description: "Complete Python exercises covering variables, loops, and functions",
      type: "colab",
      dueInDays: 5
    },
    {
      title: "Data Analysis Project",
      description: "Analyze student survey data and create charts",
      type: "sheets",
      dueInDays: 21
    }
  ],
  
  // Quiz Topics
  QUIZ_ASSIGNMENTS: [
    {
      title: "Programming Concepts Quiz",
      description: "Test your understanding of variables, data types, and basic syntax",
      questionCount: 10,
      pointsPerQuestion: 2,
      dueInDays: 3
    },
    {
      title: "Logic and Control Structures",
      description: "Quiz on if statements, loops, and boolean logic",
      questionCount: 8,
      pointsPerQuestion: 3,
      dueInDays: 12
    },
    {
      title: "Functions and Parameters",
      description: "Understanding function definitions, parameters, and return values",
      questionCount: 6,
      pointsPerQuestion: 4,
      dueInDays: 18
    }
  ],
  
  // Google Forms API Settings
  FORMS_API: {
    baseUrl: "https://forms.googleapis.com/v1/forms"
  },
  
  // Folder Settings
  DRIVE_FOLDERS: {
    mainFolder: "CS101 Test Materials",
    assignments: "Programming Assignments",
    quizzes: "Quiz Forms"
  }
};

/**
 * Get current timestamp for due dates
 */
function getCurrentTimestamp() {
  return new Date();
}

/**
 * Calculate due date from current date plus days
 */
function getDueDate(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}