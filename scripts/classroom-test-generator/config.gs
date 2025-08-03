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
  ASSIGNMENTS: [
    {
      title: "Karel Programming Challenge",
      description: "Write a Karel program to solve the maze puzzle. Your program should:\n\n• Navigate Karel through the maze\n• Collect all beepers\n• Return to starting position\n• Use proper functions and comments\n\nSubmit your solution as a Google Doc with your code and explanation of your approach.\n\nGrading:\n- Correct solution (40 pts)\n- Code organization (30 pts)\n- Comments and explanation (30 pts)",
      submissionType: "GOOGLE_DOC",
      dueInDays: 7,
      maxPoints: 100
    },
    {
      title: "Algorithm Presentation",
      description: "Create a presentation explaining how sorting algorithms work. Choose TWO algorithms from:\n\n• Bubble Sort\n• Selection Sort\n• Insertion Sort\n• Quick Sort\n\nYour presentation should include:\n- How each algorithm works (step-by-step)\n- Visual examples with data\n- Time complexity analysis\n- When to use each algorithm\n\nSubmit as Google Slides (8-12 slides total).\n\nGrading:\n- Algorithm explanations (50 pts)\n- Visual clarity (25 pts)\n- Analysis and comparisons (25 pts)",
      submissionType: "GOOGLE_SLIDES",
      dueInDays: 14,
      maxPoints: 100
    },
    {
      title: "Personal Portfolio Website",
      description: "Create a personal portfolio website showcasing your programming projects. Your site should include:\n\n• About Me section\n• 3+ coding projects with descriptions\n• Skills and technologies you know\n• Contact information\n• Professional design and layout\n\nHost your site on GitHub Pages, Netlify, or similar platform.\n\nSubmit the PUBLIC URL to your live website.\n\nGrading:\n- Content completeness (40 pts)\n- Design and usability (30 pts)\n- Technical implementation (30 pts)",
      submissionType: "LINK",
      dueInDays: 21,
      maxPoints: 100
    }
  ],
  
  // Quiz Topics
  QUIZ_ASSIGNMENTS: [
    {
      title: "Programming Fundamentals Test",
      description: "Multiple choice test covering basic programming concepts",
      questionCount: 8,
      pointsPerQuestion: 5,
      dueInDays: 10,
      type: "MULTIPLE_CHOICE_ONLY"
    },
    {
      title: "Comprehensive Programming Assessment",
      description: "Mixed format test with multiple choice, short answer, and essay questions",
      questionCount: 6,
      pointsPerQuestion: 10,
      dueInDays: 20,
      type: "MIXED_FORMAT"
    }
  ],
  
  // Google Forms API Settings
  FORMS_API: {
    baseUrl: "https://forms.googleapis.com/v1/forms"
  },
  
  // Folder Settings
  DRIVE_FOLDERS: {
    classroomsFolder: "Classrooms"  // Capital C to match Google's default
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