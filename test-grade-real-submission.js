// Test grading with real submission data
const submissionText = `Email Address: 440028954@gapps.yrdsb.ca

Score: 18

First Name: Ziwei

Last Name: Feng

1. Implement this function that gets Karel to spin a full circle on the spot in the counter-clockwise direction.: turnLeft();
turnLeft();
turnLeft();
turnLeft();

2. Implement this function that gets Karel to move to the end of the street, put down a ball, and return to the start. The street can be any length. You must use a loop in your solution.: while (frontIsClear()) {
    move();
}
putBall();
turnAround();
while (frontIsClear()) {
    move();
}
turnAround();

3. Implement the code that gets Karel to put balls all along the perimeter of the world, like he is building a fence. The world can be any size. Karel starts in the bottom left corner of the world facing east. You must use appropriate loops in your solution.: for (let i = 0; i < count; count = 4; i++) {
    while (frontIsClear()) {
        move();
        putBall();
    }
    turnLeft();
}

How many balls are in the world after execution of the code?: 4

Where is Karel at the end of code execution? Karel starts on Street 1 Avenue 1 (1, 1) and is facing east. The ball shown is on Street 1 Avenue 4 (4,1).: Street 1 Avenue 5 (5, 1)

Which function is defined in SuperKarel, but not Karel?: turnRight()

How many times should the 'main()' function be defined in a program?: 1

What symbol is used to create a single line comment?: //

Why do we use functions in programming?: All of the above

Breaking a larger problem into smaller more simpler parts is called: top down design

How many times will Karel move forward using this code?

for(let i = 0; i < 10; i++) {
    move();
}: 10

Why do we use while loops in JavaScript?: To repeat some code while a condition is true

Which of the following are control structures? Check all that apply.: If statement, For loop, While loop`;

// Parse the submission
function parseKarelQuizSubmission(submissionText) {
  const studentAnswers = {};
  
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

const studentAnswers = parseKarelQuizSubmission(submissionText);
console.log('Parsed answers:');
console.log(JSON.stringify(studentAnswers, null, 2));

// Output the curl command to test
console.log('\nCurl command to test grading:');
console.log(`curl -s -X POST "https://api-pmxfayuvra-uc.a.run.app/grade-quiz" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify({
    submissionId: "sheet_1P1eRamDlfsqI5MCMVCv0kSTAaNDsdOPlgpY_bVzl_4k_1",
    formId: "1yCb14sIiQ5ieiaWs8hPOlDh4-vOgGdp3Zf8pEyFjLdY",
    studentAnswers
  })}' | jq '.'`);