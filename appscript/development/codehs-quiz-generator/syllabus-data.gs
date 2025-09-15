/**
 * CodeHS Syllabus Data and Content Structure
 * Location: syllabus-data.gs
 * 
 * Contains structured curriculum data for quiz generation
 * Based on CodeHS Intro to Computer Science course content
 */

/**
 * Main curriculum structure with units and lessons
 */
const CODEHS_CURRICULUM = {
  "programming-with-karel": {
    title: "Programming with Karel",
    description: "Introduction to programming fundamentals using Karel the Dog robot",
    lessons: [
      {
        id: "introduction-to-karel",
        title: "Introduction to Karel",
        concepts: ["basic programming", "Karel robot", "commands", "world", "programming basics"],
        difficulty: "beginner",
        topics: [
          "What is Karel?",
          "Karel's world and environment",
          "Basic programming concepts",
          "Understanding robot programming"
        ]
      },
      {
        id: "karel-commands-and-movement",
        title: "Karel Commands and Movement",
        concepts: ["move()", "turnLeft()", "putBall()", "takeBall()", "basic commands"],
        difficulty: "beginner",
        topics: [
          "Basic Karel commands",
          "Movement in Karel's world",
          "Manipulating balls",
          "Sequential command execution"
        ]
      },
      {
        id: "defining-new-methods",
        title: "Defining New Methods",
        concepts: ["methods", "functions", "method definition", "code organization", "reusability"],
        difficulty: "intermediate",
        topics: [
          "Creating custom methods",
          "Method syntax and structure",
          "Code reusability",
          "Organizing code with methods"
        ]
      },
      {
        id: "loops",
        title: "Loops",
        concepts: ["for loops", "while loops", "iteration", "repetition", "loop control"],
        difficulty: "intermediate",
        topics: [
          "Understanding repetition",
          "For loop syntax and usage",
          "While loop concepts",
          "Loop control and termination"
        ]
      },
      {
        id: "conditional-statements",
        title: "Conditional Statements",
        concepts: ["if statements", "conditionals", "boolean logic", "decision making", "conditions"],
        difficulty: "intermediate",
        topics: [
          "Making decisions in programs",
          "If statement syntax",
          "Boolean conditions",
          "Conditional program flow"
        ]
      },
      {
        id: "decomposition-and-problem-solving",
        title: "Decomposition and Problem Solving",
        concepts: ["decomposition", "problem solving", "top-down design", "modular programming"],
        difficulty: "intermediate",
        topics: [
          "Breaking down complex problems",
          "Problem-solving strategies",
          "Modular programming approach",
          "Design and planning"
        ]
      },
      {
        id: "more-complex-karel-problems",
        title: "More Complex Karel Problems",
        concepts: ["complex problems", "advanced techniques", "combining concepts", "problem solving"],
        difficulty: "advanced",
        topics: [
          "Combining multiple programming concepts",
          "Advanced problem-solving techniques",
          "Complex Karel challenges",
          "Integration of all learned concepts"
        ]
      }
    ]
  }
};

/**
 * Question templates for different types and difficulty levels
 */
const QUESTION_TEMPLATES = {
  coding: {
    beginner: {
      karel_movement: "Write a Karel program to make Karel move {steps} steps forward and then turn left.",
      ball_collection: "Write a program to make Karel collect all balls from a {pattern} pattern.",
      simple_navigation: "Create a program to make Karel navigate from point A to point B avoiding walls."
    },
    intermediate: {
      function_creation: "Create a function called '{functionName}' that makes Karel {action}. Then use this function in your main program.",
      loop_implementation: "Use a for loop to make Karel {action} {count} times.",
      conditional_logic: "Write a program that checks if Karel {condition} and then {action}."
    },
    advanced: {
      complex_navigation: "Create a program that uses while loops and conditionals to make Karel navigate a maze and collect all balls.",
      nested_structures: "Write a program using nested loops and conditionals to make Karel {complexTask}.",
      problem_solving: "Design a complete solution for Karel to {complexProblem} using functions, loops, and conditionals."
    }
  },
  multipleChoice: {
    concepts: [
      {
        category: "basic_commands",
        questions: [
          "Which command makes Karel move forward one space?",
          "What happens when Karel tries to move through a wall?",
          "Which command makes Karel pick up a ball?"
        ]
      },
      {
        category: "functions",
        questions: [
          "What is the main purpose of creating functions in Karel?",
          "Where should function definitions be placed in a Karel program?",
          "What is the entry point of every Karel program?"
        ]
      },
      {
        category: "control_structures",
        questions: [
          "What type of loop should you use when you know exactly how many times to repeat an action?",
          "What is the difference between 'if' and 'while' statements?",
          "Which control structure allows for alternative execution paths?"
        ]
      }
    ]
  }
};

/**
 * Utility functions for accessing curriculum data
 */
function getAllUnits() {
  return Object.keys(CODEHS_CURRICULUM).map(key => ({
    id: key,
    title: CODEHS_CURRICULUM[key].title,
    description: CODEHS_CURRICULUM[key].description
  }));
}

function getUnitContent(unitId) {
  return CODEHS_CURRICULUM[unitId] || null;
}

function getLessonsByDifficulty(unitId, difficulty) {
  const unit = CODEHS_CURRICULUM[unitId];
  if (!unit) return [];
  
  return unit.lessons.filter(lesson => lesson.difficulty === difficulty);
}

function getConceptsForUnit(unitId) {
  const unit = CODEHS_CURRICULUM[unitId];
  if (!unit) return [];
  
  const allConcepts = [];
  unit.lessons.forEach(lesson => {
    allConcepts.push(...lesson.concepts);
  });
  
  return [...new Set(allConcepts)]; // Remove duplicates
}