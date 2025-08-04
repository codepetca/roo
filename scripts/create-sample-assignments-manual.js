#!/usr/bin/env node

/**
 * Generate Sample Assignment Content for Manual Creation
 * 
 * Since the service account doesn't have Google Slides/Docs API permissions,
 * this script generates the content that can be manually copied into Google files.
 * 
 * Usage: node scripts/create-sample-assignments-manual.js
 */

const fs = require('fs').promises;
const path = require('path');

/**
 * Generate Google Slides JSON format for import
 */
function generateSlidesContent(studentType) {
  const slides = studentType === 'perfect' ? getPerfectStudentSlides() : getImperfectStudentSlides();
  
  return {
    title: studentType === 'perfect' 
      ? 'Sorting Algorithms: Bubble Sort vs Quick Sort - Professional Analysis'
      : 'Sorting Stuff - Basic Overview',
    slides: slides.map((slide, index) => ({
      slideNumber: index + 1,
      title: slide.title,
      content: slide.content || ''
    }))
  };
}

/**
 * Generate HTML content for Google Docs
 */
function generateDocsContent(studentType) {
  const content = studentType === 'perfect' ? getPerfectPortfolioContent() : getImperfectPortfolioContent();
  
  // Convert to HTML format that can be pasted into Google Docs
  const htmlContent = content
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>')
    .replace(/(\*|_)(.*?)\1/g, '<em>$2</em>')
    .replace(/^(#{1,6})\s*(.*)$/gm, (match, hashes, text) => {
      const level = hashes.length;
      return `<h${level}>${text}</h${level}>`;
    });
  
  return {
    title: studentType === 'perfect'
      ? 'Perfect Student - Professional Portfolio'
      : 'My Basic Website - Struggling Student',
    htmlContent,
    plainContent: content
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
 * Generate instructions for manual creation
 */
function generateInstructions() {
  return `
# Manual Google Slides & Docs Creation Instructions

Since the service account doesn't have Google Slides/Docs API permissions, 
follow these steps to create the sample assignments manually:

## Creating Google Slides Presentations

### Perfect Student Algorithm Presentation:
1. Go to slides.google.com
2. Create a new presentation titled "Sorting Algorithms: Bubble Sort vs Quick Sort - Professional Analysis"
3. Use the content from 'perfect-slides-content.json' to create 12 professional slides
4. Apply consistent formatting, professional theme, and clear structure
5. Share with "Anyone with the link can view"
6. Copy the sharing URL

### Imperfect Student Algorithm Presentation:
1. Create a new presentation titled "Sorting Stuff - Basic Overview"
2. Use the content from 'imperfect-slides-content.json' for 9 basic slides
3. Use minimal formatting and casual presentation style
4. Share with "Anyone with the link can view"
5. Copy the sharing URL

## Creating Google Docs Portfolio Websites

### Perfect Student Portfolio:
1. Go to docs.google.com
2. Create a new document titled "Perfect Student - Professional Portfolio"
3. Copy content from 'perfect-portfolio-content.txt'
4. Apply professional formatting with headers, bullet points, and structure
5. Go to File > Publish to the web > Publish
6. Copy the published URL (ends with /pub)

### Imperfect Student Portfolio:
1. Create a new document titled "My Basic Website - Struggling Student"
2. Copy content from 'imperfect-portfolio-content.txt'
3. Use basic formatting with minimal structure
4. Publish to the web and copy URL

## After Creation:
1. Update the sample submission files with the real URLs
2. Test that URLs are accessible and content is visible
3. Use these URLs in your Google Classroom test submissions

This gives you authentic Google files for comprehensive AI grading testing!
`;
}

/**
 * Main execution function
 */
async function main() {
  try {
    console.log('📝 Generating sample assignment content for manual creation...\n');
    
    // Create output directory
    const outputDir = '/Users/stew/Repos/vibe/roo/sample-submissions/manual-creation';
    await fs.mkdir(outputDir, { recursive: true });
    
    // Generate slides content
    const perfectSlides = generateSlidesContent('perfect');
    const imperfectSlides = generateSlidesContent('imperfect');
    
    await fs.writeFile(
      path.join(outputDir, 'perfect-slides-content.json'),
      JSON.stringify(perfectSlides, null, 2)
    );
    
    await fs.writeFile(
      path.join(outputDir, 'imperfect-slides-content.json'),
      JSON.stringify(imperfectSlides, null, 2)
    );
    
    // Generate docs content
    const perfectDocs = generateDocsContent('perfect');
    const imperfectDocs = generateDocsContent('imperfect');
    
    await fs.writeFile(
      path.join(outputDir, 'perfect-portfolio-content.txt'),
      perfectDocs.plainContent
    );
    
    await fs.writeFile(
      path.join(outputDir, 'imperfect-portfolio-content.txt'),
      imperfectDocs.plainContent
    );
    
    // Generate instructions
    await fs.writeFile(
      path.join(outputDir, 'INSTRUCTIONS.md'),
      generateInstructions()
    );
    
    console.log('✅ Sample assignment content generated successfully!');
    console.log('\nGenerated Files:');
    console.log(`📊 Perfect Student Slides: ${outputDir}/perfect-slides-content.json`);
    console.log(`📊 Imperfect Student Slides: ${outputDir}/imperfect-slides-content.json`);
    console.log(`🌐 Perfect Student Portfolio: ${outputDir}/perfect-portfolio-content.txt`);
    console.log(`🌐 Imperfect Student Portfolio: ${outputDir}/imperfect-portfolio-content.txt`);
    console.log(`📋 Instructions: ${outputDir}/INSTRUCTIONS.md`);
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Follow the instructions in INSTRUCTIONS.md to create the Google files manually');
    console.log('2. Update the sample submission files with the real Google URLs');
    console.log('3. Test the URLs in your Google Classroom submissions');
    
  } catch (error) {
    console.error('❌ Error generating sample assignment content:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  generateSlidesContent,
  generateDocsContent,
  generateInstructions
};