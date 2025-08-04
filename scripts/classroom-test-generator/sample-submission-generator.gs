/**
 * Sample Submission Generator for AI Grading Testing
 * Location: sample-submission-generator.gs
 * 
 * Creates authentic Google Slides presentations and Google Docs portfolio websites
 * for testing the AI grading system with realistic student submissions.
 */

/**
 * MAIN FUNCTION: Generate all sample submissions
 * Creates Google Slides presentations and Google Docs for perfect/imperfect students
 */
function generateSampleSubmissions() {
  console.log("🎯 Starting Sample Submission Generation...");
  
  try {
    // Create Google Slides presentations
    console.log("📊 Creating Algorithm Presentations...");
    const presentations = createAlgorithmPresentations();
    
    // Create Google Docs portfolio websites
    console.log("🌐 Creating Portfolio Websites...");
    const portfolios = createPortfolioWebsites();
    
    // Create Karel Programming Challenge documents
    console.log("🤖 Creating Karel Programming Challenge submissions...");
    const karelSubmissions = createKarelSubmissions();
    
    // Create Quiz: Python Fundamentals submissions
    console.log("📋 Creating Quiz: Python Fundamentals submissions...");
    const testSubmissions = createTestSubmissions();
    
    console.log("\n🎉 Sample submissions created successfully!");
    console.log("\n📋 URLs for Google Classroom Testing:");
    
    console.log("\n🤖 Karel Programming Challenge Assignment:");
    const perfectKarel = karelSubmissions.find(k => k.studentType === 'perfect');
    const imperfectKarel = karelSubmissions.find(k => k.studentType === 'imperfect');
    console.log(`   Perfect Student: ${perfectKarel.url}`);
    console.log(`   Imperfect Student: ${imperfectKarel.url}`);
    
    console.log("\n📊 Algorithm Presentation Assignment:");
    const perfectSlides = presentations.find(p => p.studentType === 'perfect');
    const imperfectSlides = presentations.find(p => p.studentType === 'imperfect');
    console.log(`   Perfect Student: ${perfectSlides.url}`);
    console.log(`   Imperfect Student: ${imperfectSlides.url}`);
    
    console.log("\n🌐 Personal Portfolio Website Assignment:");
    const perfectPortfolio = portfolios.find(p => p.studentType === 'perfect');
    const imperfectPortfolio = portfolios.find(p => p.studentType === 'imperfect');
    console.log(`   Perfect Student: ${perfectPortfolio.publishedUrl}`);
    console.log(`   Imperfect Student: ${imperfectPortfolio.publishedUrl}`);
    
    console.log("\n📋 Quiz: Python Fundamentals Assignment:");
    const perfectTest = testSubmissions.find(t => t.studentType === 'perfect');
    const imperfectTest = testSubmissions.find(t => t.studentType === 'imperfect');
    console.log(`   Perfect Student: ${perfectTest.url}`);
    console.log(`   Imperfect Student: ${imperfectTest.url}`);
    
    console.log("\n✅ Ready for Google Classroom testing!");
    console.log("💡 Copy these URLs directly into your test student submissions");
    console.log("🎯 Perfect Student submissions should score 90-100%");
    console.log("📚 Imperfect Student submissions should score 45-75%");
    
    return {
      presentations,
      portfolios,
      karelSubmissions,
      testSubmissions
    };
    
  } catch (error) {
    console.error("❌ Error generating sample submissions:", error);
    throw error;
  }
}

/**
 * Create Karel Programming Challenge submissions
 */
function createKarelSubmissions() {
  console.log("🤖 Creating Karel Programming Challenge documents...");
  
  const submissions = [];
  
  // Create perfect student submission
  const perfectSubmission = createSingleKarelSubmission('perfect');
  submissions.push(perfectSubmission);
  
  // Create imperfect student submission
  const imperfectSubmission = createSingleKarelSubmission('imperfect');
  submissions.push(imperfectSubmission);
  
  return submissions;
}

/**
 * Create a single Karel Programming Challenge document
 */
function createSingleKarelSubmission(studentType) {
  const isPerfect = studentType === 'perfect';
  const studentName = isPerfect ? 'Perfect Student' : 'Imperfect Student';
  const title = `${studentName} - Karel Programming Challenge`;
    
  console.log(`   Creating ${studentType} Karel submission: ${title}`);
  
  // Create document
  const doc = Docs.Documents.create({
    title: title
  });
  
  const documentId = doc.documentId;
  
  // Get content
  const content = isPerfect ? getPerfectKarelContent() : getImperfectKarelContent();
  
  // Add content to document
  Docs.Documents.batchUpdate({
    requests: [{
      insertText: {
        location: { index: 1 },
        text: content
      }
    }]
  }, documentId);
  
  // Make document publicly viewable
  Drive.Permissions.create({
    role: 'reader',
    type: 'anyone'
  }, documentId);
  
  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit?usp=sharing`;
  
  console.log(`   ✅ ${studentType} Karel submission created: ${documentUrl}`);
  
  return {
    studentType: studentType,
    documentId: documentId,
    url: documentUrl,
    title: title
  };
}

/**
 * Create Quiz: Python Fundamentals submissions
 */
function createTestSubmissions() {
  console.log("📋 Creating Quiz: Python Fundamentals documents...");
  
  const submissions = [];
  
  // Create perfect student submission
  const perfectSubmission = createSingleTestSubmission('perfect');
  submissions.push(perfectSubmission);
  
  // Create imperfect student submission
  const imperfectSubmission = createSingleTestSubmission('imperfect');
  submissions.push(imperfectSubmission);
  
  return submissions;
}

/**
 * Create a single Quiz: Python Fundamentals document
 */
function createSingleTestSubmission(studentType) {
  const isPerfect = studentType === 'perfect';
  const studentName = isPerfect ? 'Perfect Student' : 'Imperfect Student';
  const title = `${studentName} - Quiz: Python Fundamentals`;
    
  console.log(`   Creating ${studentType} test submission: ${title}`);
  
  // Create document
  const doc = Docs.Documents.create({
    title: title
  });
  
  const documentId = doc.documentId;
  
  // Get content
  const content = isPerfect ? getPerfectTestContent() : getImperfectTestContent();
  
  // Add content to document
  Docs.Documents.batchUpdate({
    requests: [{
      insertText: {
        location: { index: 1 },
        text: content
      }
    }]
  }, documentId);
  
  // Make document publicly viewable
  Drive.Permissions.create({
    role: 'reader',
    type: 'anyone'
  }, documentId);
  
  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit?usp=sharing`;
  
  console.log(`   ✅ ${studentType} test submission created: ${documentUrl}`);
  
  return {
    studentType: studentType,
    documentId: documentId,
    url: documentUrl,
    title: title
  };
}

/**
 * Create Google Slides presentations for Algorithm Presentation assignment
 */
function createAlgorithmPresentations() {
  console.log("📊 Creating Google Slides presentations...");
  
  const presentations = [];
  
  // Create perfect student presentation
  const perfectPresentation = createSinglePresentation('perfect');
  presentations.push(perfectPresentation);
  
  // Create imperfect student presentation  
  const imperfectPresentation = createSinglePresentation('imperfect');
  presentations.push(imperfectPresentation);
  
  return presentations;
}

/**
 * Create a single Google Slides presentation
 */
function createSinglePresentation(studentType) {
  const isPerfect = studentType === 'perfect';
  const studentName = isPerfect ? 'Perfect Student' : 'Imperfect Student';
  const title = `${studentName} - Algorithm Presentation`;
    
  console.log(`   Creating ${studentType} presentation: ${title}`);
  
  // Create presentation
  const presentation = Slides.Presentations.create({
    title: title
  });
  
  const presentationId = presentation.presentationId;
  
  // Get slide content
  const slideContent = isPerfect ? getPerfectStudentSlides() : getImperfectStudentSlides();
  
  // Create additional slides (first slide already exists)
  const requests = [];
  
  // Add slides for content beyond the first slide
  for (let i = 1; i < slideContent.length; i++) {
    requests.push({
      createSlide: {
        insertionIndex: i,
        slideLayoutReference: {
          predefinedLayout: 'TITLE_AND_BODY'
        }
      }
    });
  }
  
  // Execute slide creation
  if (requests.length > 0) {
    Slides.Presentations.batchUpdate({
      requests: requests
    }, presentationId);
  }
  
  // Add content to slides
  const contentRequests = [];
  
  slideContent.forEach((slide, index) => {
    // Get the slide from the presentation to get proper object IDs
    const currentPresentation = Slides.Presentations.get(presentationId);
    const currentSlide = currentPresentation.slides[index];
    
    if (index === 0) {
      // Update title slide
      const titleShape = currentSlide.pageElements.find(element => 
        element.shape && element.shape.placeholder && 
        element.shape.placeholder.type === 'CENTERED_TITLE'
      );
      
      if (titleShape) {
        contentRequests.push({
          insertText: {
            objectId: titleShape.objectId,
            text: slide.title,
            insertionIndex: 0
          }
        });
      }
    } else {
      // Update content slides
      const titleShape = currentSlide.pageElements.find(element =>
        element.shape && element.shape.placeholder && 
        element.shape.placeholder.type === 'TITLE'
      );
      
      const bodyShape = currentSlide.pageElements.find(element =>
        element.shape && element.shape.placeholder && 
        element.shape.placeholder.type === 'BODY'
      );
      
      if (titleShape) {
        contentRequests.push({
          insertText: {
            objectId: titleShape.objectId,
            text: slide.title,
            insertionIndex: 0
          }
        });
      }
      
      if (bodyShape && slide.content) {
        contentRequests.push({
          insertText: {
            objectId: bodyShape.objectId,
            text: slide.content,
            insertionIndex: 0
          }
        });
      }
    }
  });
  
  // Execute content updates
  if (contentRequests.length > 0) {
    Slides.Presentations.batchUpdate({
      requests: contentRequests
    }, presentationId);
  }
  
  // Make presentation publicly viewable
  Drive.Permissions.create({
    role: 'reader',
    type: 'anyone'
  }, presentationId);
  
  const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit?usp=sharing`;
  
  console.log(`   ✅ ${studentType} presentation created: ${presentationUrl}`);
  
  return {
    studentType: studentType,
    presentationId: presentationId,
    url: presentationUrl,
    title: title
  };
}

/**
 * Create Google Docs portfolio websites
 */
function createPortfolioWebsites() {
  console.log("🌐 Creating Google Docs portfolio websites...");
  
  const portfolios = [];
  
  // Create perfect student portfolio
  const perfectPortfolio = createSinglePortfolio('perfect');
  portfolios.push(perfectPortfolio);
  
  // Create imperfect student portfolio
  const imperfectPortfolio = createSinglePortfolio('imperfect');
  portfolios.push(imperfectPortfolio);
  
  return portfolios;
}

/**
 * Create a single Google Docs portfolio website
 */
function createSinglePortfolio(studentType) {
  const isPerfect = studentType === 'perfect';
  const studentName = isPerfect ? 'Perfect Student' : 'Imperfect Student';
  const title = `${studentName} - Personal Portfolio Website`;
    
  console.log(`   Creating ${studentType} portfolio: ${title}`);
  
  // Create document
  const doc = Docs.Documents.create({
    title: title
  });
  
  const documentId = doc.documentId;
  
  // Get content
  const content = isPerfect ? getPerfectPortfolioContent() : getImperfectPortfolioContent();
  
  // Add content to document
  Docs.Documents.batchUpdate({
    requests: [{
      insertText: {
        location: { index: 1 },
        text: content
      }
    }]
  }, documentId);
  
  // Apply basic formatting for perfect student
  if (isPerfect) {
    const formattingRequests = [
      // Make headers bold
      {
        updateTextStyle: {
          range: {
            startIndex: 1,
            endIndex: content.indexOf('\n') + 1
          },
          textStyle: {
            bold: true,
            fontSize: { magnitude: 18, unit: 'PT' }
          },
          fields: 'bold,fontSize'
        }
      }
    ];
    
    Docs.Documents.batchUpdate({
      requests: formattingRequests
    }, documentId);
  }
  
  // Make document publicly viewable
  Drive.Permissions.create({
    role: 'reader',
    type: 'anyone'
  }, documentId);
  
  // Publish to web
  const publishRequest = UrlFetchApp.fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ScriptApp.getOAuthToken()}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({
      requests: [{
        updateDocumentStyle: {
          documentStyle: {
            useEvenPageHeaderFooter: false
          },
          fields: 'useEvenPageHeaderFooter'
        }
      }]
    })
  });
  
  const documentUrl = `https://docs.google.com/document/d/${documentId}/edit?usp=sharing`;
  const publishedUrl = `https://docs.google.com/document/d/${documentId}/pub`;
  
  console.log(`   ✅ ${studentType} portfolio created: ${publishedUrl}`);
  
  return {
    studentType: studentType,
    documentId: documentId,
    url: documentUrl,
    publishedUrl: publishedUrl,
    title: title
  };
}



/**
 * Perfect student slides content
 */
function getPerfectStudentSlides() {
  return [
    {
      title: 'Sorting Algorithms: Bubble Sort vs Quick Sort\nCS101 - Programming Fundamentals\nPerfect Student\nJanuary 2025'
    },
    {
      title: 'Agenda',
      content: '• What are sorting algorithms?\n• Bubble Sort deep dive\n• Quick Sort deep dive\n• Performance comparison\n• When to use each algorithm\n• Visual demonstrations\n• Time complexity analysis\n• Conclusion and recommendations'
    },
    {
      title: 'What are Sorting Algorithms?',
      content: 'Definition: Algorithms that arrange elements in a specific order (ascending/descending)\n\nWhy Important:\n• Fundamental computer science concept\n• Basis for many other algorithms\n• Real-world applications (databases, search engines)\n• Understanding efficiency and optimization\n\nCommon Types: Bubble, Selection, Insertion, Merge, Quick, Heap'
    },
    {
      title: 'Bubble Sort - How It Works',
      content: 'Algorithm Steps:\n1. Compare adjacent elements\n2. Swap if they\'re in wrong order\n3. Repeat for entire array\n4. Continue until no swaps needed\n\nPseudocode:\nfor i = 0 to n-1:\n    for j = 0 to n-2-i:\n        if array[j] > array[j+1]:\n            swap(array[j], array[j+1])\n\nKey Characteristic: "Bubbles" largest elements to the end'
    },
    {
      title: 'Bubble Sort - Visual Example',
      content: 'Initial Array: [64, 34, 25, 12, 22, 11, 90]\n\nPass 1: [34, 25, 12, 22, 11, 64, 90]\nPass 2: [25, 12, 22, 11, 34, 64, 90]\nPass 3: [12, 22, 11, 25, 34, 64, 90]\nPass 4: [12, 11, 22, 25, 34, 64, 90]\nPass 5: [11, 12, 22, 25, 34, 64, 90] ✓\n\nTotal Comparisons: 21\nTotal Swaps: 12'
    },
    {
      title: 'Quick Sort - How It Works',
      content: 'Algorithm Strategy: Divide and Conquer\n1. Choose a \'pivot\' element\n2. Partition array around pivot\n3. Recursively sort sub-arrays\n4. Combine results\n\nPseudocode:\nquickSort(array, low, high):\n    if low < high:\n        pivot = partition(array, low, high)\n        quickSort(array, low, pivot-1)\n        quickSort(array, pivot+1, high)\n\nKey Advantage: Much faster average performance'
    },
    {
      title: 'Time Complexity Analysis',
      content: 'BUBBLE SORT:\n• Best Case: O(n) - already sorted\n• Average Case: O(n²)\n• Worst Case: O(n²) - reverse sorted\n• Space Complexity: O(1)\n\nQUICK SORT:\n• Best Case: O(n log n)\n• Average Case: O(n log n)\n• Worst Case: O(n²) - rare with good pivot selection\n• Space Complexity: O(log n)'
    },
    {
      title: 'Performance Comparison',
      content: 'Array Size | Bubble Sort | Quick Sort\n     100   |    ~5,000   |    ~664\n   1,000   |  ~500,000   |  ~9,966\n  10,000   | ~50,000,000 | ~132,877\n\nQuick Sort is ~375x faster for 10,000 elements!\n\n[Graph showing exponential vs logarithmic growth curves]'
    },
    {
      title: 'When to Use Each Algorithm',
      content: 'BUBBLE SORT - Use When:\n✓ Learning/teaching algorithm concepts\n✓ Very small datasets (< 10 elements)\n✓ Simplicity is more important than speed\n✗ Never use for production systems\n\nQUICK SORT - Use When:\n✓ Large datasets requiring speed\n✓ Average case performance matters most\n✓ Memory usage should be minimized\n✓ Industry-standard sorting needed'
    },
    {
      title: 'Real-World Applications',
      content: 'BUBBLE SORT:\n• Educational purposes\n• Embedded systems with tiny datasets\n• Code golf competitions (shortest code)\n\nQUICK SORT:\n• Database indexing\n• Search engine ranking\n• Operating system file sorting\n• Programming language standard libraries\n• Big data processing'
    },
    {
      title: 'Conclusion',
      content: 'Key Takeaways:\n• Algorithm choice depends on context\n• Time complexity matters for scalability\n• Quick Sort dominates for practical applications\n• Understanding both teaches important CS concepts\n\nNext Steps:\n• Explore other algorithms (Merge Sort, Heap Sort)\n• Practice implementing in different languages\n• Analyze algorithm performance in real projects\n\nReferences: Cormen CLRS, Khan Academy, Algorithm Visualizer'
    }
  ];
}

/**
 * Imperfect student slides content
 */
function getImperfectStudentSlides() {
  return [
    {
      title: 'Sorting Stuff\nBy: Struggling Student\nCS101'
    },
    {
      title: 'What I\'m Talking About',
      content: 'I\'m going to talk about sorting algorithms. I picked bubble sort and quick sort because they seemed easy.'
    },
    {
      title: 'Bubble Sort',
      content: 'Bubble sort is called bubble sort because it bubbles things up I think.\n\nHow it works:\n1. Look at two numbers\n2. If the first one is bigger, swap them\n3. Keep doing this until it\'s sorted\n\nIt\'s pretty slow but it\'s easy to understand.'
    },
    {
      title: 'Bubble Sort Example',
      content: 'Let\'s say you have: 5, 2, 8, 1\n\nFirst pass: 2, 5, 1, 8 (I think?)\nSecond pass: 2, 1, 5, 8\nFinal: 1, 2, 5, 8\n\nI\'m not totally sure about the steps but that\'s the general idea.'
    },
    {
      title: 'Quick Sort',
      content: 'Quick sort is faster than bubble sort. It uses something called "divide and conquer" which means you split the problem into smaller pieces.\n\nSteps:\n1. Pick a pivot (I don\'t really understand how to pick a good one)\n2. Put smaller numbers on one side, bigger on the other\n3. Do this recursively (recursion is confusing but whatever)'
    },
    {
      title: 'Quick Sort Example',
      content: 'Array: 5, 2, 8, 1\nPick pivot = 5\nSmaller than 5: 2, 1\nBigger than 5: 8\nResult: 1, 2, 5, 8\n\nI think that\'s how it works but I might be missing some steps.'
    },
    {
      title: 'Which is Better?',
      content: 'Quick sort is way faster than bubble sort for big lists.\n\nBubble sort: O(n²) - this means it\'s slow\nQuick sort: O(n log n) - this means it\'s faster\n\nI don\'t really understand the math behind Big O notation but my friend told me these numbers.'
    },
    {
      title: 'When to Use Them',
      content: 'Use bubble sort when:\n- You have a small list\n- You want something simple\n\nUse quick sort when:\n- You have a big list\n- You want it to be fast'
    },
    {
      title: 'Conclusion',
      content: 'Sorting algorithms are important for organizing data. Quick sort is better than bubble sort most of the time because it\'s faster.\n\nBoth of these algorithms can sort lists of numbers from smallest to biggest.\n\nTHE END'
    }
  ];
}

/**
 * Perfect student portfolio content
 */
function getPerfectPortfolioContent() {
  return `Perfect Student - Professional Portfolio

=====================================

ABOUT ME
--------

Hi, I'm Perfect Student, a dedicated Computer Science student at University with a strong foundation in programming fundamentals and a passion for software development. My journey began with Karel the Robot in CS101, where I discovered my love for algorithmic problem-solving and clean code architecture.

Currently pursuing my Bachelor's degree with a 3.8 GPA, I've completed coursework in:
• Data Structures & Algorithms
• Object-Oriented Programming (Java, Python)
• Web Development (HTML/CSS/JavaScript, React)
• Database Systems (SQL, MongoDB)
• Software Engineering Principles

Outside of academics, I contribute to open-source projects, participate in coding competitions, and mentor junior students in programming fundamentals.

PROJECTS
--------

PROJECT 1: TaskFlow - Personal Productivity App
• Technology Stack: React, Node.js, Express, MongoDB
• Description: Full-stack web application for task management with user authentication, real-time updates, and data visualization
• Features: Drag-and-drop interface, deadline tracking, progress analytics, responsive design
• GitHub: https://github.com/perfectstudent/taskflow
• Live Demo: https://taskflow-demo.herokuapp.com
• Challenges Solved: Implemented efficient state management, optimized database queries, created intuitive UX

PROJECT 2: Weather Prediction ML Model
• Technology Stack: Python, scikit-learn, pandas, Flask API
• Description: Machine learning model that predicts local weather patterns using historical data
• Features: 85% accuracy rate, RESTful API, interactive data visualizations
• GitHub: https://github.com/perfectstudent/weather-ml
• Dataset: 10 years of meteorological data from NOAA
• Impact: Deployed for local farming community to optimize planting schedules

PROJECT 3: CodeCollab - Real-time Collaborative IDE
• Technology Stack: JavaScript, Socket.io, Monaco Editor, Docker
• Description: Browser-based code editor supporting real-time collaboration
• Features: Syntax highlighting, live cursor tracking, integrated chat, code execution
• GitHub: https://github.com/perfectstudent/codecollab
• Users: 500+ beta testers from university coding clubs
• Recognition: Winner of "Best Innovation" at University Hackathon 2024

PROJECT 4: Campus Navigator Mobile App
• Technology Stack: React Native, Google Maps API, Firebase
• Description: iOS/Android app helping students navigate campus efficiently
• Features: Indoor mapping, class schedule integration, accessibility routes
• GitHub: https://github.com/perfectstudent/campus-nav
• Downloads: 2,000+ from university app store
• Impact: Reduced average walking time between classes by 15%

SKILLS
------

Programming Languages:
• Python (Advanced) - 3 years experience
• JavaScript (Advanced) - 2 years experience
• Java (Intermediate) - 2 years experience
• HTML/CSS (Advanced) - 3 years experience
• SQL (Intermediate) - 1 year experience
• C++ (Beginner) - Currently learning

Frameworks & Libraries:
• React/React Native
• Node.js/Express
• Flask/Django
• Bootstrap/Tailwind CSS
• jQuery

Tools & Technologies:
• Git/GitHub (Version Control)
• MongoDB/PostgreSQL (Databases)
• Docker (Containerization)
• AWS/Heroku (Cloud Deployment)
• Figma (UI/UX Design)
• Postman (API Testing)

CONTACT
-------

Email: perfectstudent@university.edu
LinkedIn: https://linkedin.com/in/perfectstudent
GitHub: https://github.com/perfectstudent
Phone: (555) 123-4567

Resume: Available upon request

---
Built with dedication and passion for software development
© 2025 Perfect Student. All rights reserved.`;
}

/**
 * Imperfect student portfolio content
 */
function getImperfectPortfolioContent() {
  return `My Website

Hi I'm a student studying computer science. I like programming and want to get a job after I graduate. I'm learning different programming languages in my classes.

That's pretty much all the content in the about section.

PROJECTS

Calculator
I made a calculator in Java for one of my assignments. It can add, subtract, multiply and divide numbers. The code is on my computer but I forgot to put it on GitHub.

Tic Tac Toe Game
This was a project for class where we had to make a tic tac toe game. Mine works but it's not very fancy. I used HTML and JavaScript I think.

Karel Robot Programs
I wrote some programs to make Karel move around and pick up beepers. It was pretty fun but also frustrating when I got stuck on bugs.

SKILLS

I know some programming languages:
- Java (we use this in class)
- HTML (made this website with it)
- CSS (makes things look better)
- JavaScript (still learning this one)

I'm also learning about algorithms and data structures but they're pretty hard.

CONTACT

Email: strugglingst@email.com
You can email me if you want to talk about programming or something.

Thanks for visiting my site`;
}

/**
 * Perfect student Karel Programming Challenge content
 */
function getPerfectKarelContent() {
  return `Karel Programming Challenge - Perfect Student Submission

Student Name: Perfect Student
Assignment: Karel Programming Challenge
Date: January 2025

SOLUTION APPROACH:
================

My approach to solving the Karel maze challenge involves implementing a systematic wall-following algorithm with beeper collection optimization. The solution uses modular functions for maintainability and includes comprehensive error handling.

ALGORITHM EXPLANATION:
=====================

1. **Initial Assessment**: Karel scans the environment to determine the maze layout
2. **Wall Following**: Implements right-hand rule for consistent navigation
3. **Beeper Collection**: Optimized collection strategy to minimize backtracking
4. **Return Navigation**: Efficient pathfinding back to starting position

COMPLETE CODE SOLUTION:
======================

/* Karel Navigation Challenge - Complete Solution
 * Author: Perfect Student
 * Strategy: Right-hand wall following with optimized beeper collection
 */

function main() {
    // Mark starting position for return journey
    putBeeper();
    
    // Execute maze solving algorithm
    solveMazeWithBeepers();
    
    // Return to starting position
    returnToStart();
    
    // Clean up starting marker
    if (beepersPresent()) {
        pickBeeper();
    }
}

function solveMazeWithBeepers() {
    while (!allBeepersCollected()) {
        // Collect beeper at current position if present
        if (beepersPresent()) {
            pickBeeper();
        }
        
        // Navigate using right-hand rule
        navigateWithRightHandRule();
    }
}

function navigateWithRightHandRule() {
    // Try to turn right and move (right-hand rule)
    if (rightIsClear()) {
        turnRight();
        move();
    } else if (frontIsClear()) {
        // Continue straight if right is blocked
        move();
    } else if (leftIsClear()) {
        // Turn left if front and right are blocked
        turnLeft();
        move();
    } else {
        // Turn around if completely surrounded
        turnAround();
        move();
    }
}

function allBeepersCollected() {
    // Advanced termination check - scan entire accessible area
    return !detectRemainingBeepers();
}

function detectRemainingBeepers() {
    // Sophisticated beeper detection using systematic scanning
    // This implementation would include a complete area scan
    // For this maze, we assume completion when certain conditions are met
    return false; // Simplified for this example
}

function returnToStart() {
    // Navigate back to starting position (marked with beeper)
    while (true) {
        if (beepersPresent() && isStartingPosition()) {
            break; // Found starting position
        }
        
        // Use wall-following to navigate back
        navigateWithRightHandRule();
    }
}

function isStartingPosition() {
    // Verify this is the actual starting position
    // Could include additional position verification logic
    return beepersPresent(); // Simplified check
}

// Helper Functions
function turnRight() {
    turnLeft();
    turnLeft();
    turnLeft();
}

function turnAround() {
    turnLeft();
    turnLeft();
}

function rightIsClear() {
    turnRight();
    boolean clear = frontIsClear();
    turnLeft();
    return clear;
}

function leftIsClear() {
    turnLeft();
    boolean clear = frontIsClear();
    turnRight();
    return clear;
}

TESTING & VERIFICATION:
======================

I tested this solution on multiple maze configurations:

1. **Simple Linear Maze**: ✓ Completed in 12 moves
2. **Complex Branched Maze**: ✓ Completed in 47 moves
3. **Spiral Maze**: ✓ Completed in 31 moves
4. **Dead-end Heavy Maze**: ✓ Completed in 68 moves

PERFORMANCE ANALYSIS:
====================

- **Time Complexity**: O(n) where n is the number of accessible cells
- **Space Complexity**: O(1) - constant memory usage
- **Optimizations**: Right-hand rule prevents infinite loops
- **Error Handling**: Robust boundary detection and collision avoidance

LESSONS LEARNED:
===============

1. **Modular Design**: Breaking complex problems into smaller functions improves maintainability
2. **Algorithm Selection**: Right-hand wall following guarantees maze solution for simply connected mazes
3. **Edge Case Handling**: Proper boundary detection prevents runtime errors
4. **Testing Strategy**: Systematic testing on various maze types ensures robustness

This solution demonstrates strong algorithmic thinking, clean code organization, and comprehensive problem-solving approach.

Score Expectation: 95-100% - Complete solution with excellent documentation and analysis.`;
}

/**
 * Imperfect student Karel Programming Challenge content
 */
function getImperfectKarelContent() {
  return `Karel Programming Challenge - Imperfect Student Submission

Student Name: Struggling Student
Assignment: Karel Programming Challenge
Date: January 2025

My Solution:
============

I tried to make Karel go around the maze and pick up beepers. It was pretty hard to figure out but I think my code works mostly.

function main() {
    // Move around and get beepers
    while (true) {  // This might run forever but I don't know how else to do it
        if (beepersPresent()) {
            pickBeeper();
        }
        
        if (frontIsClear()) {
            move();
        } else {
            turnLeft();
        }
    }
}

I think this should work because Karel will keep moving and turning left when it hits walls. It will also pick up beepers when it finds them.

Problems I had:
- I'm not sure how to make Karel stop when it's done
- Sometimes Karel gets stuck in corners
- I don't know how to make Karel go back to the start

I tried to add more functions but I got confused:

function turnRight() {
    turnLeft();
    turnLeft();
    turnLeft();
}

function goBack() {
    // I don't know how to do this
    turnLeft();
    turnLeft();
    move(); // Maybe this works?
}

The code might have some bugs but I ran out of time to fix them. I think the main idea is right though - just move around until you get all the beepers.

I tested it a little bit and it seemed to work sometimes but other times Karel got stuck. I'm not sure why.

I know this isn't perfect but it's the best I could do. Programming is harder than I thought it would be.

Major Issues with this solution:
1. Infinite loop with no termination condition
2. Simple left-turn only navigation will cause infinite loops in many mazes
3. No strategy for returning to start position
4. No systematic approach to maze solving
5. Incomplete helper functions
6. Poor error handling
7. Limited testing and debugging

Score Expectation: 55-65% - Shows basic understanding but has critical flaws and incomplete implementation.`;
}

/**
 * Perfect student Quiz: Python Fundamentals content
 */
function getPerfectTestContent() {
  // Use simplified version to avoid syntax errors
  return getPerfectTestContentSimple();
}

/**
 * Imperfect student Quiz: Python Fundamentals content  
 */
function getImperfectTestContent() {
  // Use simplified version to avoid syntax errors
  return getImperfectTestContentSimple();
}

