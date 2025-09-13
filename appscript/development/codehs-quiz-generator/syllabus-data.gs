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
        id: "intro-programming-karel",
        title: "Introduction to Programming with Karel",
        concepts: ["basic programming", "Karel commands", "move()", "turnLeft()", "putBeeper()", "takeBeeper()"],
        difficulty: "beginner",
        topics: [
          "What is programming?",
          "Karel's world and basic commands",
          "Sequential execution of commands",
          "Understanding program flow"
        ]
      },
      {
        id: "more-about-karel",
        title: "More About Karel",
        concepts: ["Karel's world", "beepers", "walls", "conditions"],
        difficulty: "beginner",
        topics: [
          "Karel's environment and constraints",
          "Understanding beepers and walls",
          "Karel's directional system",
          "Basic problem-solving strategies"
        ]
      },
      {
        id: "functions-in-karel",
        title: "Functions in Karel",
        concepts: ["functions", "function definition", "function calls", "code reusability"],
        difficulty: "intermediate",
        topics: [
          "What are functions?",
          "Creating custom functions",
          "Function naming conventions",
          "Benefits of using functions"
        ]
      },
      {
        id: "main-function",
        title: "The Main Function",
        concepts: ["main function", "program entry point", "function organization"],
        difficulty: "intermediate",
        topics: [
          "Understanding the main() function",
          "Program execution flow",
          "Organizing code with functions",
          "Function hierarchy"
        ]
      },
      {
        id: "top-down-design",
        title: "Top Down Design and Decomposition",
        concepts: ["top-down design", "decomposition", "problem solving", "modular programming"],
        difficulty: "intermediate",
        topics: [
          "Breaking down complex problems",
          "Creating sub-problems",
          "Modular approach to programming",
          "Design strategies"
        ]
      },
      {
        id: "commenting-code",
        title: "Commenting Your Code",
        concepts: ["comments", "code documentation", "readability"],
        difficulty: "beginner",
        topics: [
          "Why comment code?",
          "Single-line and multi-line comments",
          "Best practices for commenting",
          "Documentation strategies"
        ]
      },
      {
        id: "super-karel",
        title: "Super Karel",
        concepts: ["Super Karel", "turnRight()", "turnAround()", "extended commands"],
        difficulty: "beginner",
        topics: [
          "Super Karel's additional commands",
          "turnRight() and turnAround()",
          "When to use Super Karel vs regular Karel",
          "Command efficiency"
        ]
      },
      {
        id: "for-loops",
        title: "For Loops",
        concepts: ["for loops", "iteration", "repetition", "loop syntax"],
        difficulty: "intermediate",
        topics: [
          "Understanding repetition in programming",
          "for loop syntax and structure",
          "Loop counters and iteration",
          "When to use for loops"
        ]
      },
      {
        id: "if-statements",
        title: "If Statements and Conditionals",
        concepts: ["if statements", "conditionals", "boolean logic", "decision making"],
        difficulty: "intermediate",
        topics: [
          "Making decisions in programs",
          "Boolean conditions and logic",
          "if statement syntax",
          "Conditional program flow"
        ]
      },
      {
        id: "if-else-statements",
        title: "If/Else Statements",
        concepts: ["if-else", "conditional logic", "alternative execution paths"],
        difficulty: "intermediate",
        topics: [
          "Alternative execution paths",
          "if-else syntax and structure",
          "Handling multiple conditions",
          "Decision trees in programming"
        ]
      },
      {
        id: "while-loops",
        title: "While Loops",
        concepts: ["while loops", "conditional repetition", "loop conditions"],
        difficulty: "advanced",
        topics: [
          "Conditional repetition",
          "while loop syntax and logic",
          "Loop conditions and termination",
          "Avoiding infinite loops"
        ]
      },
      {
        id: "control-structures",
        title: "Control Structures Example",
        concepts: ["control structures", "loops", "conditionals", "complex programs"],
        difficulty: "advanced",
        topics: [
          "Combining loops and conditionals",
          "Complex program structure",
          "Nested control structures",
          "Program flow control"
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
      beeper_collection: "Write a program to make Karel collect all beepers from a {pattern} pattern.",
      simple_navigation: "Create a program to make Karel navigate from point A to point B avoiding walls."
    },
    intermediate: {
      function_creation: "Create a function called '{functionName}' that makes Karel {action}. Then use this function in your main program.",
      loop_implementation: "Use a for loop to make Karel {action} {count} times.",
      conditional_logic: "Write a program that checks if Karel {condition} and then {action}."
    },
    advanced: {
      complex_navigation: "Create a program that uses while loops and conditionals to make Karel navigate a maze and collect all beepers.",
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
          "Which command makes Karel pick up a beeper?"
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