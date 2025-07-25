/**
 * Parser service for converting submission text to structured format
 * Location: functions/src/services/parser.ts
 */

export interface StudentAnswers {
  [questionNumber: string]: string;
}

/**
 * Parses submission text into structured question-answer pairs
 * Location: functions/src/services/parser.ts:12
 */
export function parseSubmissionText(submissionText: string): StudentAnswers {
  const studentAnswers: StudentAnswers = {};
  
  if (!submissionText) {
    return studentAnswers;
  }

  // Split by lines and process each line
  const lines = submissionText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Look for question pattern: "1. Question text: answer"
    const questionMatch = line.match(/^(\d+)\.\s*([^:]+):\s*(.*)$/);
    
    if (questionMatch) {
      const questionNumber = questionMatch[1];
      let answer = questionMatch[3].trim();
      
      // Handle multi-line answers (continue reading until next question or end)
      let nextLineIndex = i + 1;
      while (nextLineIndex < lines.length) {
        const nextLine = lines[nextLineIndex].trim();
        
        // Stop if we hit the next question number
        if (nextLine.match(/^\d+\./)) {
          break;
        }
        
        // Stop if we hit another field (like "Email Address:", "Score:", etc.)
        if (nextLine.includes(':') && !nextLine.match(/^\d+\./)) {
          // Check if this looks like a question continuation or a new field
          if (nextLine.match(/^(Email Address|Score|First Name|Last Name):/)) {
            break;
          }
        }
        
        // Add the line to the answer if it's not empty
        if (nextLine) {
          answer += '\n' + nextLine;
        }
        
        nextLineIndex++;
      }
      
      // Update the loop index to skip processed lines
      i = nextLineIndex - 1;
      
      studentAnswers[questionNumber] = answer.trim();
    }
  }
  
  return studentAnswers;
}

/**
 * Extract answers from Karel quiz submission format specifically
 * Handles mixed format where some questions are numbered (1-3) and others are by question text
 * Location: functions/src/services/parser.ts:65
 */
export function parseKarelQuizSubmission(submissionText: string, answerKey?: any): StudentAnswers {
  const studentAnswers: StudentAnswers = {};
  
  if (!submissionText) {
    return studentAnswers;
  }

  // Split by lines and process each line
  const lines = submissionText.split('\n');
  
  // Question mappings based on the answer key format
  const questionMappings = [
    { num: 1, startsWith: "1. Implement this function that gets Karel to spin" },
    { num: 2, startsWith: "2. Implement this function that gets Karel to move to the end" },
    { num: 3, startsWith: "3. Implement the code that gets Karel to put balls all along" },
    { num: 4, startsWith: "How many balls are in the world after execution" },
    { num: 5, startsWith: "Where is Karel at the end of code execution" },
    { num: 6, startsWith: "Which function is defined in SuperKarel" },
    { num: 7, startsWith: "How many times should the 'main()' function be defined" },
    { num: 8, startsWith: "What symbol is used to create a single line comment" },
    { num: 9, startsWith: "Why do we use functions in programming" },
    { num: 10, startsWith: "Breaking a larger problem into smaller more simpler parts" },
    { num: 11, startsWith: "How many times will Karel move forward using this code" },
    { num: 12, startsWith: "Why do we use while loops in JavaScript" },
    { num: 13, startsWith: "Which of the following are control structures" }
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Find which question this line represents
    const questionMapping = questionMappings.find(mapping => 
      line.startsWith(mapping.startsWith)
    );
    
    if (questionMapping) {
      // Special handling for question 11 which has a different format
      if (questionMapping.num === 11) {
        // Question 11 format: "Question?\n\ncode\n}: answer"
        let nextLineIndex = i + 1;
        let answer = '';
        
        while (nextLineIndex < lines.length) {
          const nextLine = lines[nextLineIndex].trim();
          
          // Look for the answer pattern }: answer
          if (nextLine.match(/^}:\s*(.+)$/)) {
            answer = nextLine.match(/^}:\s*(.+)$/)?.[1] || '';
            break;
          }
          
          // Stop if we hit the next question
          const nextQuestionMapping = questionMappings.find(mapping => 
            nextLine.startsWith(mapping.startsWith)
          );
          if (nextQuestionMapping) {
            break;
          }
          
          nextLineIndex++;
        }
        
        studentAnswers[questionMapping.num.toString()] = answer.trim();
        i = nextLineIndex;
      } else {
        // Normal question processing
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
          let answer = line.substring(colonIndex + 1).trim();
          
          // For questions 1-3 (coding questions), collect multi-line answers
          if (questionMapping.num <= 3) {
            let nextLineIndex = i + 1;
            while (nextLineIndex < lines.length) {
              const nextLine = lines[nextLineIndex].trim();
              
              // Stop if we hit the next question
              const nextQuestionMapping = questionMappings.find(mapping => 
                nextLine.startsWith(mapping.startsWith)
              );
              if (nextQuestionMapping) {
                break;
              }
              
              // Stop if we hit a form field
              if (nextLine.match(/^(Email Address|Score|First Name|Last Name):/)) {
                break;
              }
              
              // Add non-empty lines to the answer
              if (nextLine) {
                answer += '\n' + nextLine;
              }
              
              nextLineIndex++;
            }
            
            // Update loop index to skip processed lines
            i = nextLineIndex - 1;
          }
          
          studentAnswers[questionMapping.num.toString()] = answer.trim();
        }
      }
    }
  }
  
  return studentAnswers;
}