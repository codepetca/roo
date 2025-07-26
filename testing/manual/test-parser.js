// Test the parser with real submission data
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

function parseSubmissionText(submissionText) {
  const studentAnswers = {};
  
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

const result = parseSubmissionText(submissionText);
console.log(JSON.stringify(result, null, 2));