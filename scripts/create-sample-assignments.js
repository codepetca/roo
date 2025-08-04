#!/usr/bin/env node

/**
 * Create Sample Assignment Files using Google APIs
 * 
 * This script creates real Google Slides presentations and Google Docs
 * for testing the AI grading system with authentic student submissions.
 * 
 * Usage: node scripts/create-sample-assignments.js
 */

const { google } = require('googleapis');
const path = require('path');
const fs = require('fs').promises;

// Initialize Google APIs
const auth = new google.auth.GoogleAuth({
  keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY || '/Users/stew/Repos/vibe/roo/roo-app-3d24e-service-account.json',
  scopes: [
    'https://www.googleapis.com/auth/presentations',
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive'
  ]
});

const slides = google.slides({ version: 'v1', auth });
const docs = google.docs({ version: 'v1', auth });
const drive = google.drive({ version: 'v3', auth });

/**
 * Create a Google Slides presentation for Algorithm Presentation assignment
 */
async function createAlgorithmPresentation(studentType) {
  console.log(`Creating ${studentType} Algorithm Presentation...`);
  
  const title = studentType === 'perfect' 
    ? 'Sorting Algorithms: Bubble Sort vs Quick Sort - Professional Analysis'
    : 'Sorting Stuff - Basic Overview';
    
  // Create presentation
  const presentation = await slides.presentations.create({
    requestBody: {
      title: title
    }
  });
  
  const presentationId = presentation.data.presentationId;
  console.log(`Created presentation: ${presentationId}`);
  
  // Get slides content based on student type
  const slideContent = studentType === 'perfect' 
    ? getPerfectStudentSlides() 
    : getImperfectStudentSlides();
  
  // Create slides with content
  const requests = [];
  
  // Add slides (skip first slide which is auto-created)
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
    await slides.presentations.batchUpdate({
      presentationId,
      requestBody: { requests }
    });
  }
  
  // Add content to slides
  const contentRequests = [];
  slideContent.forEach((slide, index) => {
    if (index === 0) {
      // Update title slide
      contentRequests.push({
        replaceAllText: {
          containsText: { text: '{{title}}' },
          replaceText: slide.title
        }
      });
    } else {
      // Add content to other slides
      contentRequests.push({
        insertText: {
          objectId: `slide_${index}`,
          text: slide.title,
          insertionIndex: 0
        }
      });
      
      if (slide.content) {
        contentRequests.push({
          insertText: {
            objectId: `slide_${index}`,
            text: slide.content,
            insertionIndex: slide.title.length
          }
        });
      }
    }
  });
  
  // Make presentation public
  await drive.permissions.create({
    fileId: presentationId,
    requestBody: {
      role: 'reader',
      type: 'anyone'
    }
  });
  
  const presentationUrl = `https://docs.google.com/presentation/d/${presentationId}/edit?usp=sharing`;
  console.log(`✅ ${studentType} Algorithm Presentation created: ${presentationUrl}`);
  
  return presentationUrl;
}

/**
 * Create a Google Doc for Personal Portfolio Website assignment
 */
async function createPortfolioWebsite(studentType) {
  console.log(`Creating ${studentType} Portfolio Website...`);
  
  const title = studentType === 'perfect'
    ? 'Perfect Student - Professional Portfolio'
    : 'My Basic Website - Struggling Student';
  
  // Create document
  const doc = await docs.documents.create({
    requestBody: {
      title: title
    }
  });
  
  const documentId = doc.data.documentId;
  console.log(`Created document: ${documentId}`);
  
  // Get content based on student type
  const content = studentType === 'perfect' 
    ? getPerfectPortfolioContent() 
    : getImperfectPortfolioContent();
  
  // Add content to document
  await docs.documents.batchUpdate({
    documentId,
    requestBody: {
      requests: [{
        insertText: {
          location: { index: 1 },
          text: content
        }
      }]
    }
  });
  
  // Publish to web
  await drive.revisions.update({
    fileId: documentId,
    revisionId: '1',
    requestBody: {
      published: true,
      publishAuto: true,
      publishedOutsideDomain: true
    }
  });
  
  // Make document public
  await drive.permissions.create({
    fileId: documentId,
    requestBody: {
      role: 'reader', 
      type: 'anyone'
    }
  });
  
  const websiteUrl = `https://docs.google.com/document/d/${documentId}/pub`;
  console.log(`✅ ${studentType} Portfolio Website created: ${websiteUrl}`);
  
  return websiteUrl;
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
      content: '\n• What are sorting algorithms?\n• Bubble Sort deep dive\n• Quick Sort deep dive\n• Performance comparison\n• When to use each algorithm\n• Visual demonstrations\n• Time complexity analysis\n• Conclusion and recommendations'
    },
    {
      title: 'What are Sorting Algorithms?',
      content: '\nDefinition: Algorithms that arrange elements in a specific order (ascending/descending)\n\nWhy Important:\n• Fundamental computer science concept\n• Basis for many other algorithms\n• Real-world applications (databases, search engines)\n• Understanding efficiency and optimization\n\nCommon Types: Bubble, Selection, Insertion, Merge, Quick, Heap'
    },
    {
      title: 'Bubble Sort - How It Works',
      content: '\nAlgorithm Steps:\n1. Compare adjacent elements\n2. Swap if they\'re in wrong order\n3. Repeat for entire array\n4. Continue until no swaps needed\n\nPseudocode:\nfor i = 0 to n-1:\n    for j = 0 to n-2-i:\n        if array[j] > array[j+1]:\n            swap(array[j], array[j+1])\n\nKey Characteristic: "Bubbles" largest elements to the end'
    },
    {
      title: 'Bubble Sort - Visual Example',
      content: '\nInitial Array: [64, 34, 25, 12, 22, 11, 90]\n\nPass 1: [34, 25, 12, 22, 11, 64, 90]\nPass 2: [25, 12, 22, 11, 34, 64, 90]\nPass 3: [12, 22, 11, 25, 34, 64, 90]\nPass 4: [12, 11, 22, 25, 34, 64, 90]\nPass 5: [11, 12, 22, 25, 34, 64, 90] ✓\n\nTotal Comparisons: 21\nTotal Swaps: 12'
    },
    {
      title: 'Quick Sort - How It Works',
      content: '\nAlgorithm Strategy: Divide and Conquer\n1. Choose a \'pivot\' element\n2. Partition array around pivot\n3. Recursively sort sub-arrays\n4. Combine results\n\nPseudocode:\nquickSort(array, low, high):\n    if low < high:\n        pivot = partition(array, low, high)\n        quickSort(array, low, pivot-1)\n        quickSort(array, pivot+1, high)\n\nKey Advantage: Much faster average performance'
    },
    {
      title: 'Time Complexity Analysis',
      content: '\nBUBBLE SORT:\n• Best Case: O(n) - already sorted\n• Average Case: O(n²)\n• Worst Case: O(n²) - reverse sorted\n• Space Complexity: O(1)\n\nQUICK SORT:\n• Best Case: O(n log n)\n• Average Case: O(n log n)\n• Worst Case: O(n²) - rare with good pivot selection\n• Space Complexity: O(log n)'
    },
    {
      title: 'Performance Comparison',
      content: '\nArray Size | Bubble Sort | Quick Sort\n     100   |    ~5,000   |    ~664\n   1,000   |  ~500,000   |  ~9,966\n  10,000   | ~50,000,000 | ~132,877\n\nQuick Sort is ~375x faster for 10,000 elements!\n\n[Graph showing exponential vs logarithmic growth curves]'
    },
    {
      title: 'When to Use Each Algorithm',
      content: '\nBUBBLE SORT - Use When:\n✓ Learning/teaching algorithm concepts\n✓ Very small datasets (< 10 elements)\n✓ Simplicity is more important than speed\n✗ Never use for production systems\n\nQUICK SORT - Use When:\n✓ Large datasets requiring speed\n✓ Average case performance matters most\n✓ Memory usage should be minimized\n✓ Industry-standard sorting needed'
    },
    {
      title: 'Real-World Applications',
      content: '\nBUBBLE SORT:\n• Educational purposes\n• Embedded systems with tiny datasets\n• Code golf competitions (shortest code)\n\nQUICK SORT:\n• Database indexing\n• Search engine ranking\n• Operating system file sorting\n• Programming language standard libraries\n• Big data processing'
    },
    {
      title: 'Conclusion',
      content: '\nKey Takeaways:\n• Algorithm choice depends on context\n• Time complexity matters for scalability\n• Quick Sort dominates for practical applications\n• Understanding both teaches important CS concepts\n\nNext Steps:\n• Explore other algorithms (Merge Sort, Heap Sort)\n• Practice implementing in different languages\n• Analyze algorithm performance in real projects\n\nReferences: Cormen CLRS, Khan Academy, Algorithm Visualizer'
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
      content: '\nI\'m going to talk about sorting algorithms. I picked bubble sort and quick sort because they seemed easy.'
    },
    {
      title: 'Bubble Sort',
      content: '\nBubble sort is called bubble sort because it bubbles things up I think.\n\nHow it works:\n1. Look at two numbers\n2. If the first one is bigger, swap them\n3. Keep doing this until it\'s sorted\n\nIt\'s pretty slow but it\'s easy to understand.'
    },
    {
      title: 'Bubble Sort Example',
      content: '\nLet\'s say you have: 5, 2, 8, 1\n\nFirst pass: 2, 5, 1, 8 (I think?)\nSecond pass: 2, 1, 5, 8\nFinal: 1, 2, 5, 8\n\nI\'m not totally sure about the steps but that\'s the general idea.'
    },
    {
      title: 'Quick Sort',
      content: '\nQuick sort is faster than bubble sort. It uses something called "divide and conquer" which means you split the problem into smaller pieces.\n\nSteps:\n1. Pick a pivot (I don\'t really understand how to pick a good one)\n2. Put smaller numbers on one side, bigger on the other\n3. Do this recursively (recursion is confusing but whatever)'
    },
    {
      title: 'Quick Sort Example',
      content: '\nArray: 5, 2, 8, 1\nPick pivot = 5\nSmaller than 5: 2, 1\nBigger than 5: 8\nResult: 1, 2, 5, 8\n\nI think that\'s how it works but I might be missing some steps.'
    },
    {
      title: 'Which is Better?',
      content: '\nQuick sort is way faster than bubble sort for big lists.\n\nBubble sort: O(n²) - this means it\'s slow\nQuick sort: O(n log n) - this means it\'s faster\n\nI don\'t really understand the math behind Big O notation but my friend told me these numbers.'
    },
    {
      title: 'When to Use Them',
      content: '\nUse bubble sort when:\n- You have a small list\n- You want something simple\n\nUse quick sort when:\n- You have a big list\n- You want it to be fast'
    },
    {
      title: 'Conclusion',
      content: '\nSorting algorithms are important for organizing data. Quick sort is better than bubble sort most of the time because it\'s faster.\n\nBoth of these algorithms can sort lists of numbers from smallest to biggest.\n\nTHE END'
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
 * Update sample submission files with real URLs
 */
async function updateSubmissionFiles(perfectSlidesUrl, imperfectSlidesUrl, perfectDocsUrl, imperfectDocsUrl) {
  console.log('Updating sample submission files...');
  
  // Update perfect student algorithm presentation
  const perfectAlgorithmContent = `Algorithm Presentation - Perfect Student Submission

Student Name: Perfect Student
Assignment: Algorithm Presentation (Google Slides)
Date: January 2025

SUBMITTED GOOGLE SLIDES URL: ${perfectSlidesUrl}

This presentation provides a comprehensive analysis of Bubble Sort vs Quick Sort algorithms, including:
• Professional 12-slide presentation with clear structure
• Visual examples and step-by-step algorithm demonstrations
• Time complexity analysis with performance comparisons
• Real-world applications and use case recommendations
• Proper citations and references

Score Expectation: 95-100% - Demonstrates excellent understanding with professional presentation quality.`;

  // Update imperfect student algorithm presentation
  const imperfectAlgorithmContent = `Algorithm Presentation - Imperfect Student Submission

Student Name: Struggling Student
Assignment: Algorithm Presentation (Google Slides)
Date: January 2025

SUBMITTED GOOGLE SLIDES URL: ${imperfectSlidesUrl}

Basic presentation covering sorting algorithms with several issues:
• Only 9 slides with minimal content
• Casual presentation style and unprofessional formatting
• Vague explanations without proper technical detail
• Missing visual examples and performance data
• No references or sources cited

Score Expectation: 65-75% - Shows basic understanding but lacks depth and professionalism.`;

  // Update perfect student portfolio
  const perfectPortfolioContent = `Personal Portfolio Website - Perfect Student Submission

Student Name: Perfect Student
Assignment: Personal Portfolio Website (URL Submission)
Date: January 2025

SUBMITTED WEBSITE URL: ${perfectDocsUrl}

Professional portfolio website featuring:
• Comprehensive About Me section with academic achievements
• 4+ detailed projects with technology stacks and impact metrics
• Complete skills section with proficiency levels
• Professional contact information and social links
• Clean, well-organized presentation

Score Expectation: 95-100% - Demonstrates excellent technical skills and professional presentation.`;

  // Update imperfect student portfolio
  const imperfectPortfolioContent = `Personal Portfolio Website - Imperfect Student Submission

Student Name: Struggling Student
Assignment: Personal Portfolio Website (URL Submission)
Date: January 2025

SUBMITTED WEBSITE URL: ${imperfectDocsUrl}

Basic website with several issues:
• Minimal content with very brief descriptions
• Only 3 basic projects without technical details
• No working links to project code or demos
• Unprofessional presentation and formatting
• Missing contact information and professional links

Score Expectation: 45-55% - Meets basic requirements but lacks professionalism and required content elements.`;

  // Write updated files
  await fs.writeFile('/Users/stew/Repos/vibe/roo/sample-submissions/perfect-student/Algorithm Presentation.txt', perfectAlgorithmContent);
  await fs.writeFile('/Users/stew/Repos/vibe/roo/sample-submissions/imperfect-student/Algorithm Presentation.txt', imperfectAlgorithmContent);
  await fs.writeFile('/Users/stew/Repos/vibe/roo/sample-submissions/perfect-student/Personal Portfolio Website.txt', perfectPortfolioContent);
  await fs.writeFile('/Users/stew/Repos/vibe/roo/sample-submissions/imperfect-student/Personal Portfolio Website.txt', imperfectPortfolioContent);
  
  console.log('✅ Sample submission files updated with real Google URLs');
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('🚀 Creating sample assignments with Google APIs...\n');
    
    // Create Google Slides presentations
    const perfectSlidesUrl = await createAlgorithmPresentation('perfect');
    const imperfectSlidesUrl = await createAlgorithmPresentation('imperfect');
    
    // Create Google Docs portfolio websites
    const perfectDocsUrl = await createPortfolioWebsite('perfect');
    const imperfectDocsUrl = await createPortfolioWebsite('imperfect');
    
    // Update sample submission files
    await updateSubmissionFiles(perfectSlidesUrl, imperfectSlidesUrl, perfectDocsUrl, imperfectDocsUrl);
    
    console.log('\n🎉 All sample assignments created successfully!');
    console.log('\nCreated Files:');
    console.log(`📊 Perfect Student Slides: ${perfectSlidesUrl}`);
    console.log(`📊 Imperfect Student Slides: ${imperfectSlidesUrl}`);
    console.log(`🌐 Perfect Student Portfolio: ${perfectDocsUrl}`);
    console.log(`🌐 Imperfect Student Portfolio: ${imperfectDocsUrl}`);
    
  } catch (error) {
    console.error('❌ Error creating sample assignments:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  createAlgorithmPresentation,
  createPortfolioWebsite,
  updateSubmissionFiles
};