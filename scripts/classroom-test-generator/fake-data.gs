/**
 * Fake data generation utilities for students and content
 * Location: fake-data.gs
 */

/**
 * Generate fake student data with realistic names and emails
 */
function generateFakeStudents(count = 20) {
  const students = [];
  const profiles = CONFIG.STUDENTS.profiles;
  const domain = CONFIG.STUDENTS.emailDomain;
  
  for (let i = 0; i < Math.min(count, profiles.length); i++) {
    const profile = profiles[i];
    const email = `${profile.firstName.toLowerCase()}.${profile.lastName.toLowerCase()}${domain}`;
    
    students.push({
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: email,
      fullName: `${profile.firstName} ${profile.lastName}`
    });
  }
  
  return students;
}

/**
 * Generate realistic programming assignment content
 */
function generateProgrammingContent() {
  return {
    karel: {
      title: "Karel Navigation Challenge",
      content: `# Karel Navigation Challenge

## Objective
Program Karel the Dog to navigate through a maze and collect all beepers while avoiding walls.

## Instructions
1. Karel starts at position (1,1) facing East
2. There are beepers scattered throughout the maze
3. Karel must collect all beepers and return to the starting position
4. Use only these commands: move(), turnLeft(), pickBeeper(), putBeeper()

## Starter Code
\`\`\`javascript
function run() {
    // Your code here
    // Remember: Karel can only turn left!
}
\`\`\`

## Grading Criteria
- [ ] Karel collects all beepers (40 points)
- [ ] Karel returns to starting position (20 points)
- [ ] Code uses proper functions (20 points)
- [ ] Code is well-commented (20 points)

**Total: 100 points**
**Due: Next week**`
    },
    
    gradeCalculator: {
      title: "Grade Calculator Spreadsheet",
      content: `# Grade Calculator Project

## Objective
Create a spreadsheet that automatically calculates student grades from assignment scores.

## Requirements
1. Create columns for: Student Name, Homework (5 assignments), Quizzes (3 quizzes), Midterm, Final
2. Calculate weighted average: Homework 30%, Quizzes 20%, Midterm 25%, Final 25%
3. Assign letter grades: A (90-100), B (80-89), C (70-79), D (60-69), F (<60)
4. Include summary statistics (class average, highest/lowest grade)

## Sample Data
Use the provided sample student data in the template sheet.

## Functions to Use
- SUM(), AVERAGE(), IF(), VLOOKUP()
- Conditional formatting for grade ranges

## Submission
Share your completed spreadsheet with edit permissions.`
    },
    
    algorithmPresentation: {
      title: "Algorithm Visualization Presentation",
      content: `# Algorithm Visualization Project

## Objective
Create a presentation that explains sorting algorithms using visual examples.

## Requirements
1. Choose 2 sorting algorithms (e.g., Bubble Sort, Quick Sort)
2. Create slides showing step-by-step execution
3. Include complexity analysis (Big O notation)
4. Add animations or visual elements to show data movement
5. Compare performance characteristics

## Slide Structure
1. Title slide
2. Algorithm 1: Description
3. Algorithm 1: Visual walkthrough
4. Algorithm 1: Complexity analysis
5. Algorithm 2: Description
6. Algorithm 2: Visual walkthrough
7. Algorithm 2: Complexity analysis
8. Comparison and conclusions

## Presentation Tips
- Use clear, readable fonts
- Include actual code snippets
- Make animations smooth and educational
- Time limit: 5-7 minutes`
    },
    
    pythonBasics: {
      title: "Python Basics Notebook",
      content: `# Python Basics Exercises

Complete the following exercises in this Colab notebook.

## Exercise 1: Variables and Data Types
Create variables of different types and print their values.

## Exercise 2: Lists and Loops
Create a list of numbers and use a loop to calculate their sum.

## Exercise 3: Functions
Write a function that takes a list of grades and returns the average.

## Exercise 4: Conditional Logic
Write a program that converts numeric grades to letter grades.

## Exercise 5: File Processing
Read a CSV file and calculate statistics on the data.

**Submit by copying the Colab notebook to your Drive and sharing the link.**`
    },
    
    dataAnalysis: {
      title: "Student Survey Data Analysis",
      content: `# Data Analysis Project

## Dataset
You've been provided with survey data from 200 students about their study habits.

## Analysis Tasks
1. Clean the data (handle missing values, outliers)
2. Calculate descriptive statistics
3. Create visualizations:
   - Bar chart of favorite subjects
   - Histogram of study hours per week
   - Scatter plot of GPA vs study hours
4. Write conclusions based on your findings

## Tools
Use Google Sheets functions and charting tools for analysis.

## Deliverables
1. Cleaned dataset
2. Summary statistics table
3. 3+ charts/graphs
4. Written analysis (2-3 paragraphs)

**Focus on finding interesting patterns in the data!**`
    }
  };
}

/**
 * Generate quiz questions with answer keys
 */
function generateQuizQuestions() {
  return {
    multipleChoiceOnly: [
      {
        question: "Which of the following is a valid variable name in Python?",
        type: "MULTIPLE_CHOICE",
        options: ["2student", "student_name", "student-name", "class"],
        correctAnswer: 1,
        points: 2,
        feedback: "Variable names must start with a letter or underscore and cannot contain hyphens or be reserved keywords."
      },
      {
        question: "What data type is the value 3.14?",
        type: "MULTIPLE_CHOICE",
        options: ["integer", "float", "string", "boolean"],
        correctAnswer: 1,
        points: 2,
        feedback: "3.14 is a decimal number, which is represented as a float data type."
      },
      {
        question: "Which operator is used for string concatenation in Python?",
        type: "MULTIPLE_CHOICE",
        options: ["&", "*", "+", "||"],
        correctAnswer: 2,
        points: 2,
        feedback: "The + operator concatenates (joins) strings together in Python."
      },
      {
        question: "What will print(len('Hello')) output?",
        type: "MULTIPLE_CHOICE",
        options: ["3", "4", "5", "6"],
        correctAnswer: 2,
        points: 2,
        feedback: "The len() function returns the number of characters in a string. 'Hello' has 5 characters."
      },
      {
        question: "True or False: Python is case-sensitive",
        type: "MULTIPLE_CHOICE",
        options: ["True", "False"],
        correctAnswer: 0,
        points: 2,
        feedback: "Python is case-sensitive, meaning 'Variable' and 'variable' are different."
      },
      {
        question: "What data type is the value 3.14?",
        type: "MULTIPLE_CHOICE",
        options: ["integer", "float", "string", "boolean"],
        correctAnswer: 1,
        points: 5,
        feedback: "3.14 is a decimal number, which is represented as a float data type."
      },
      {
        question: "Which operator is used for string concatenation in Python?",
        type: "MULTIPLE_CHOICE",
        options: ["&", "*", "+", "||"],
        correctAnswer: 2,
        points: 5,
        feedback: "The + operator concatenates (joins) strings together in Python."
      },
      {
        question: "What will len('Hello World') return?",
        type: "MULTIPLE_CHOICE",
        options: ["10", "11", "12", "Error"],
        correctAnswer: 1,
        points: 5,
        feedback: "The len() function counts all characters including spaces. 'Hello World' has 11 characters."
      },
      {
        question: "Which of these is NOT a Python data type?",
        type: "MULTIPLE_CHOICE",
        options: ["list", "tuple", "array", "dictionary"],
        correctAnswer: 2,
        points: 5,
        feedback: "While Python has lists, tuples, and dictionaries built-in, 'array' is not a basic Python data type (though arrays exist in the numpy library)."
      },
      {
        question: "What does the 'if' statement do?",
        type: "MULTIPLE_CHOICE",
        options: ["Repeats code", "Makes decisions", "Defines functions", "Imports modules"],
        correctAnswer: 1,
        points: 5,
        feedback: "The 'if' statement allows programs to make decisions by executing code only when certain conditions are true."
      },
      {
        question: "Which loop is best for iterating over a list?",
        type: "MULTIPLE_CHOICE",
        options: ["while loop", "for loop", "do-while loop", "repeat loop"],
        correctAnswer: 1,
        points: 5,
        feedback: "For loops are designed for iterating over sequences like lists."
      },
      {
        question: "What does 'break' do in a loop?",
        type: "MULTIPLE_CHOICE",
        options: ["Pauses the loop", "Exits the loop", "Restarts the loop", "Skips to next iteration"],
        correctAnswer: 1,
        points: 5,
        feedback: "The 'break' statement immediately exits the current loop."
      }
    ],
    
    mixedFormat: [
      {
        question: "What keyword is used to define a function in Python?",
        type: "MULTIPLE_CHOICE",
        options: ["function", "def", "define", "func"],
        correctAnswer: 1,
        points: 10,
        feedback: "Functions are defined using the 'def' keyword followed by the function name."
      },
      {
        question: "What does a 'return' statement do?",
        type: "MULTIPLE_CHOICE",
        options: ["Prints a value", "Sends a value back to caller", "Defines a variable", "Starts a loop"],
        correctAnswer: 1,
        points: 10,
        feedback: "The return statement sends a value back to whoever called the function."
      },
      {
        question: "Write a Python function that takes two numbers and returns their sum.",
        type: "SHORT_ANSWER",
        correctAnswer: "def add(a, b): return a + b",
        points: 10,
        feedback: "Your function should use 'def' keyword, take two parameters, and return their sum using the + operator."
      },
      {
        question: "What is the output of this code: print(len([1, 2, 3, 4, 5]))?",
        type: "SHORT_ANSWER",
        correctAnswer: "5",
        points: 10,
        feedback: "The len() function counts the number of items in a list. Count the elements in the list."
      },
      {
        question: "Explain the difference between a list and a tuple in Python.",
        type: "PARAGRAPH",
        correctAnswer: "Lists are mutable and use brackets []. Tuples are immutable and use parentheses (). Use lists for changing data, tuples for constant data.",
        points: 10,
        feedback: "Consider mutability, syntax, and use cases."
      },
      {
        question: "Explain how a for loop works in Python with an example.",
        type: "PARAGRAPH",
        correctAnswer: "A for loop iterates over sequences. Example: for i in range(3): print(i) prints 0, 1, 2. The loop runs the indented code for each item.",
        points: 10,
        feedback: "Include what a for loop does and provide a specific example."
      }
    ]
  };
}

/**
 * Generate random student submission data for testing
 */
function generateStudentSubmissions(assignmentType) {
  const submissions = [];
  const students = generateFakeStudents();
  
  students.forEach((student, index) => {
    let submission = {
      studentEmail: student.email,
      studentName: student.fullName,
      submissionTime: getRandomSubmissionTime(),
      grade: Math.floor(Math.random() * 40) + 60 // Grades between 60-100
    };
    
    // Add type-specific submission data
    switch (assignmentType) {
      case 'programming':
        submission.attachments = [`${student.firstName}_${student.lastName}_code.py`];
        submission.comments = getRandomCodeComment();
        break;
      case 'quiz':
        submission.quizScore = submission.grade;
        submission.questionsCorrect = Math.floor((submission.grade / 100) * 10);
        break;
      case 'document':
        submission.attachments = [`${student.firstName}_${student.lastName}_essay.pdf`];
        break;
    }
    
    submissions.push(submission);
  });
  
  return submissions;
}

/**
 * Helper functions for generating realistic data
 */
function getRandomSubmissionTime() {
  const now = new Date();
  const daysAgo = Math.floor(Math.random() * 7); // 0-7 days ago
  const hoursAgo = Math.floor(Math.random() * 24);
  
  const submissionTime = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000));
  return submissionTime;
}

function getRandomCodeComment() {
  const comments = [
    "Good logic flow, minor syntax issues",
    "Excellent implementation with clear comments",
    "Algorithm works but could be more efficient",
    "Creative solution to the problem",
    "Needs better variable naming",
    "Well-structured code with good error handling"
  ];
  
  return comments[Math.floor(Math.random() * comments.length)];
}