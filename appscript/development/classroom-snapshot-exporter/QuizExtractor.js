/**
 * QuizExtractor.js - Reliable quiz extraction using verified Google Forms API methods
 * Uses defensive programming to handle Google Forms API limitations gracefully
 */

/**
 * Extract quiz data from a Google Form with robust error handling
 * @param {string} formUrl - The Google Forms URL
 * @returns {Object} Quiz data or null if extraction fails
 */
function extractQuizData(formUrl) {
  try {
    console.log(`Starting quiz extraction for: ${formUrl}`);
    
    // Extract form ID from URL
    const formIdMatch = formUrl.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
    if (!formIdMatch) {
      console.log(`Could not extract form ID from URL: ${formUrl}`);
      return null;
    }
    
    const formId = formIdMatch[1];
    console.log(`Extracted form ID: ${formId}`);
    
    // Try to open the form
    const form = FormApp.openById(formId);
    if (!form) {
      console.log(`Could not open form with ID: ${formId}`);
      return null;
    }
    
    console.log(`Successfully opened form: ${form.getTitle()}`);
    
    // Create basic quiz data structure
    const quizData = {
      formId: formId,
      formUrl: formUrl,
      title: form.getTitle() || 'Untitled Quiz',
      description: form.getDescription() || '',
      isQuiz: false, // Will check below
      collectEmailAddresses: false,
      allowResponseEditing: false,
      shuffleQuestions: false,
      questions: [],
      totalQuestions: 0,
      totalPoints: 0,
      autoGradableQuestions: 0,
      manualGradingRequired: false,
      timeLimit: undefined,
      requireSignIn: true,
      restrictToDomain: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Safely check if it's a quiz - early exit if not
    try {
      quizData.isQuiz = form.isQuiz();
      console.log(`Form is quiz: ${quizData.isQuiz}`);
      
      // Early exit if not a quiz to save processing time
      if (!quizData.isQuiz) {
        console.log(`Form ${formId} is not a quiz - skipping detailed extraction`);
        return quizData;
      }
    } catch (e) {
      console.log(`Could not determine if form is quiz, assuming false: ${e.toString()}`);
      quizData.isQuiz = false;
      return quizData; // Early exit
    }
    
    // Get basic form settings
    try {
      quizData.collectEmailAddresses = form.collectsEmail();
    } catch (e) {
      console.log(`Could not get email collection setting: ${e.toString()}`);
    }
    
    try {
      quizData.allowResponseEditing = form.canEditResponse();
    } catch (e) {
      console.log(`Could not get response editing setting: ${e.toString()}`);
    }
    
    try {
      quizData.shuffleQuestions = form.getShuffleQuestions();
    } catch (e) {
      console.log(`Could not get shuffle questions setting: ${e.toString()}`);
    }
    
    // Get form items (questions)
    let items = [];
    try {
      items = form.getItems() || [];
      console.log(`Found ${items.length} items in form`);
    } catch (e) {
      console.log(`Could not get form items: ${e.toString()}`);
      items = [];
    }
    
    // Process each item
    let questionIndex = 0;
    items.forEach((item, index) => {
      try {
        const question = extractQuestionData(item, questionIndex);
        if (question) {
          quizData.questions.push(question);
          quizData.totalPoints += question.points;
          quizData.totalQuestions++;
          
          if (question.autoGradable) {
            quizData.autoGradableQuestions++;
          } else {
            quizData.manualGradingRequired = true;
          }
          
          questionIndex++;
          console.log(`Processed question ${questionIndex}: ${question.title} (${question.points}pts)`);
        }
      } catch (e) {
        console.warn(`Error processing item ${index}: ${e.toString()}`);
      }
    });
    
    console.log(`Quiz extraction complete: ${quizData.totalQuestions} questions, ${quizData.totalPoints} points`);
    return quizData;
    
  } catch (error) {
    console.error(`Error in quiz extraction: ${error.toString()}`);
    return null;
  }
}

/**
 * Extract question data with robust error handling
 * @param {FormItem} item - The form item
 * @param {number} index - Question index
 * @returns {Object|null} Question data or null
 */
function extractQuestionData(item, index) {
  try {
    // Create basic question structure
    const questionData = {
      id: '',
      title: '',
      description: '',
      type: 'UNKNOWN',
      points: 0,
      required: false,
      options: [],
      correctAnswers: [],
      sampleSolution: '',
      feedback: {
        correct: '',
        incorrect: '',
        general: ''
      },
      autoGradable: false,
      caseSensitive: false,
      index: index
    };
    
    // Get basic properties safely
    try {
      questionData.id = item.getId() ? item.getId().toString() : `question_${index}`;
    } catch (e) {
      questionData.id = `question_${index}`;
    }
    
    try {
      questionData.title = item.getTitle() || `Question ${index + 1}`;
    } catch (e) {
      questionData.title = `Question ${index + 1}`;
    }
    
    try {
      questionData.description = item.getHelpText() || '';
    } catch (e) {
      questionData.description = '';
    }
    
    try {
      if (item.getType) {
        const itemType = item.getType();
        questionData.type = mapItemTypeToQuestionType(itemType);
      }
    } catch (e) {
      console.warn(`Could not get item type: ${e.toString()}`);
    }
    
    // Get points safely
    try {
      if (item.getPoints) {
        questionData.points = item.getPoints() || 0;
      }
    } catch (e) {
      console.warn(`Could not get points: ${e.toString()}`);
    }
    
    // Get required status safely
    try {
      if (item.isRequired) {
        questionData.required = item.isRequired();
      }
    } catch (e) {
      console.warn(`Could not get required status: ${e.toString()}`);
    }
    
    // Determine if auto-gradable (basic heuristic)
    questionData.autoGradable = questionData.points > 0 && 
                               ['RADIO', 'CHECKBOX', 'DROPDOWN', 'LINEAR_SCALE'].includes(questionData.type);
    
    // Try to get choices for multiple choice questions
    if (['RADIO', 'CHECKBOX', 'DROPDOWN'].includes(questionData.type)) {
      try {
        const choices = item.getChoices ? item.getChoices() : [];
        questionData.options = choices.map(choice => {
          try {
            return choice.getValue ? choice.getValue() : String(choice);
          } catch (e) {
            return String(choice);
          }
        });
      } catch (e) {
        console.warn(`Could not get choices: ${e.toString()}`);
      }
    }
    
    return questionData;
    
  } catch (error) {
    console.error(`Error extracting question data: ${error.toString()}`);
    return null;
  }
}

/**
 * Map Google Forms item type to our schema question type
 */
function mapItemTypeToQuestionType(itemType) {
  try {
    const typeString = itemType.toString();
    
    if (typeString.includes('MULTIPLE_CHOICE')) return 'RADIO';
    if (typeString.includes('CHECKBOX')) return 'CHECKBOX';
    if (typeString.includes('LIST')) return 'DROPDOWN';
    if (typeString.includes('TEXT')) return 'SHORT_ANSWER';
    if (typeString.includes('PARAGRAPH')) return 'PARAGRAPH';
    if (typeString.includes('SCALE')) return 'LINEAR_SCALE';
    if (typeString.includes('GRID')) return 'MULTIPLE_CHOICE_GRID';
    
    return 'UNKNOWN';
  } catch (e) {
    return 'UNKNOWN';
  }
}