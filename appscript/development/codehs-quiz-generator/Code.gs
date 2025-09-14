/**
 * CodeHS Quiz Generator - Main Application Logic
 * Location: Code.gs
 * 
 * Main orchestration code for the CodeHS quiz generation system
 * Coordinates between AI service, Forms service, and user interface
 */

/**
 * Main function to serve the HTML interface
 * This is called when the web app is accessed
 */
function doGet() {
  const htmlOutput = HtmlService.createTemplateFromFile('ui');
  htmlOutput.title = 'CodeHS Quiz Generator';
  
  return htmlOutput.evaluate()
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Include external files (for HTML template)
 * @param {string} filename - Name of file to include
 * @returns {string} File content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Main quiz generation endpoint called from frontend
 * @param {Object} config - Quiz configuration from UI
 * @returns {Object} Quiz creation results
 */
function generateQuiz(config) {
  try {
    console.log('Starting quiz generation with config:', config);
    
    // Step 1: Validate configuration
    const validationResult = validateQuizConfig(config);
    if (!validationResult.isValid) {
      throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
    }

    // Step 2: Get unit content and prepare for AI
    const unitContent = getUnitContent(config.selectedUnit);
    if (!unitContent) {
      throw new Error(`Unit not found: ${config.selectedUnit}`);
    }

    const concepts = getConceptsForUnit(config.selectedUnit);
    const aiConfig = {
      unit: config.selectedUnit,
      codingQuestions: config.codingQuestions || 3,
      multipleChoiceQuestions: config.multipleChoiceQuestions || 20,
      concepts: concepts
    };

    // Step 3: Generate questions using AI
    console.log('Generating questions with AI...');
    const generatedQuestions = generateQuizQuestions(aiConfig);
    
    // Step 4: Validate AI-generated questions
    const questionValidation = validateGeneratedQuestions(generatedQuestions);
    if (!questionValidation.isValid) {
      console.warn('Question validation issues:', questionValidation.issues);
      // Continue with warnings, but log them
    }

    // Step 5: Create the Google Form
    console.log('Creating Google Form...');
    const quizTitle = config.customTitle || `${unitContent.title} - Programming Quiz`;
    const quizDescription = config.customDescription || 
      `This quiz covers key concepts from ${unitContent.title}. ` +
      `It includes ${aiConfig.codingQuestions} coding questions and ${aiConfig.multipleChoiceQuestions} multiple choice questions.`;

    const quizData = {
      title: quizTitle,
      description: quizDescription,
      questions: generatedQuestions,
      config: config
    };

    const formResult = createGoogleFormQuiz(quizData);

    // Step 6: Return success result
    const result = {
      success: true,
      form: formResult,
      questions: {
        coding: generatedQuestions.codingQuestions.length,
        multipleChoice: generatedQuestions.multipleChoiceQuestions.length,
        total: generatedQuestions.codingQuestions.length + generatedQuestions.multipleChoiceQuestions.length
      },
      unit: unitContent.title,
      generatedAt: new Date().toISOString(),
      warnings: questionValidation.issues
    };

    console.log('Quiz generation completed successfully:', result);
    return result;

  } catch (error) {
    console.error('Quiz generation failed:', error);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

/**
 * Get available CodeHS units for frontend dropdown
 * @returns {Array} Array of available units
 */
function getAvailableUnits() {
  try {
    return getAllUnits();
  } catch (error) {
    console.error('Error getting units:', error);
    return [];
  }
}

/**
 * Get detailed information about a specific unit
 * @param {string} unitId - Unit identifier
 * @returns {Object} Unit details including lessons and concepts
 */
function getUnitDetails(unitId) {
  try {
    const unitContent = getUnitContent(unitId);
    if (!unitContent) {
      return null;
    }

    return {
      id: unitId,  // Ensure the id is included
      ...unitContent,
      concepts: getConceptsForUnit(unitId),
      lessonCount: unitContent.lessons.length,
      difficultyLevels: [...new Set(unitContent.lessons.map(l => l.difficulty))]
    };
  } catch (error) {
    console.error('Error getting unit details:', error);
    return null;
  }
}

/**
 * Get all units with their complete details for frontend caching
 * This preloads all unit information to make unit selection instant
 * @returns {Array} Array of units with full details
 */
function getAllUnitsWithDetails() {
  try {
    console.log('📚 Loading all units with details for caching...');
    
    const basicUnits = getAllUnits();
    const detailedUnits = [];
    
    for (const unit of basicUnits) {
      const details = getUnitDetails(unit.id);
      if (details) {
        detailedUnits.push(details);
      }
    }
    
    console.log(`✅ Loaded ${detailedUnits.length} units with complete details`);
    return detailedUnits;
    
  } catch (error) {
    console.error('Error getting all units with details:', error);
    // Fallback to basic units if detailed loading fails
    return getAllUnits();
  }
}

/**
 * Validate quiz configuration from frontend
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result
 */
function validateQuizConfig(config) {
  const errors = [];

  // Required fields
  if (!config.selectedUnit) {
    errors.push('Unit selection is required');
  }

  // Numeric validations
  const codingQuestions = parseInt(config.codingQuestions) || 3;
  const multipleChoiceQuestions = parseInt(config.multipleChoiceQuestions) || 20;

  if (codingQuestions < 1 || codingQuestions > 10) {
    errors.push('Coding questions must be between 1 and 10');
  }

  if (multipleChoiceQuestions < 5 || multipleChoiceQuestions > 50) {
    errors.push('Multiple choice questions must be between 5 and 50');
  }

  // Unit validation with debugging
  const availableUnits = getAllUnits();
  const validUnit = availableUnits.some(unit => unit.id === config.selectedUnit);
  if (!validUnit) {
    console.error(`Unit validation failed for: "${config.selectedUnit}"`);
    console.error('Available units:', availableUnits.map(u => u.id));
    errors.push('Selected unit is not available');
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    normalizedConfig: {
      ...config,
      codingQuestions: codingQuestions,
      multipleChoiceQuestions: multipleChoiceQuestions
    }
  };
}

/**
 * Get quiz generation status (for progress tracking)
 * This could be enhanced with more sophisticated progress tracking
 * @returns {Object} Current status
 */
function getGenerationStatus() {
  return {
    isGenerating: false,
    progress: 0,
    currentStep: 'Ready',
    lastGenerated: null
  };
}

/**
 * Check if user has granted all required OAuth permissions
 * This function tests each API access before allowing quiz generation
 * @returns {Object} Permission status and missing permissions
 */
function checkUserPermissions() {
  const results = {
    timestamp: new Date().toISOString(),
    hasAllPermissions: true,
    permissions: {},
    missingPermissions: [],
    instructions: []
  };

  try {
    // Test 1: Forms API access
    try {
      const testForm = FormApp.create('PERMISSION TEST - DELETE IMMEDIATELY');
      const formId = testForm.getId();
      DriveApp.getFileById(formId).setTrashed(true); // Clean up
      
      results.permissions.forms = {
        granted: true,
        message: 'Forms API access confirmed'
      };
    } catch (error) {
      results.hasAllPermissions = false;
      results.permissions.forms = {
        granted: false,
        error: error.message,
        message: 'Forms API access denied'
      };
      results.missingPermissions.push('Google Forms');
      results.instructions.push('Grant permission to create and manage Google Forms');
    }

    // Test 2: Drive API access
    try {
      DriveApp.getRootFolder();
      results.permissions.drive = {
        granted: true,
        message: 'Drive API access confirmed'
      };
    } catch (error) {
      results.hasAllPermissions = false;
      results.permissions.drive = {
        granted: false,
        error: error.message,
        message: 'Drive API access denied'
      };
      results.missingPermissions.push('Google Drive');
      results.instructions.push('Grant permission to access Google Drive');
    }

    // Test 3: User info access
    try {
      Session.getActiveUser().getEmail();
      results.permissions.userInfo = {
        granted: true,
        message: 'User info access confirmed'
      };
    } catch (error) {
      results.hasAllPermissions = false;
      results.permissions.userInfo = {
        granted: false,
        error: error.message,
        message: 'User info access denied'
      };
      results.missingPermissions.push('User Information');
      results.instructions.push('Grant permission to access your email address');
    }

    // Test 4: External requests (for AI API)
    results.permissions.externalRequests = {
      granted: true,
      message: 'External request permission assumed (cannot test directly)'
    };

    // Test 5: API Key configuration
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      results.hasAllPermissions = false;
      results.permissions.apiKey = {
        granted: false,
        message: 'Gemini API key not configured'
      };
      results.missingPermissions.push('API Configuration');
      results.instructions.push('Configure Gemini API key using deployEnvironmentVariables()');
    } else {
      results.permissions.apiKey = {
        granted: true,
        message: 'Gemini API key configured'
      };
    }

  } catch (error) {
    results.hasAllPermissions = false;
    results.error = error.message;
    results.instructions.push('Unexpected error during permission check');
  }

  return results;
}

/**
 * MINIMAL TEST: Create form with basic questions only (no quiz features)
 * This isolates the basic Forms API functionality from quiz-specific features
 */
function testMinimalFormCreation() {
  try {
    console.log('🔬 Testing minimal form creation (no quiz features)...');
    
    // Create basic form
    const form = FormApp.create('MINIMAL TEST: Basic Form');
    form.setDescription('Testing basic form creation without quiz features');
    form.setCollectEmail(true);
    
    console.log('✅ Basic form created, adding simple questions...');
    
    // Add simple paragraph text question (no points, no validation)
    const textItem = form.addParagraphTextItem();
    textItem.setTitle('1. Write a simple Karel program')
          .setHelpText('Just write any Karel command')
          .setRequired(true);
    
    console.log('✅ Text question added');
    
    // Add simple multiple choice question (no points, no feedback)
    const mcItem = form.addMultipleChoiceItem();
    mcItem.setTitle('2. Which command moves Karel forward?')
          .setRequired(true);
    
    const choices = [
      mcItem.createChoice('move()'),
      mcItem.createChoice('forward()'),
      mcItem.createChoice('step()'),
      mcItem.createChoice('go()')
    ];
    
    mcItem.setChoices(choices);
    console.log('✅ Multiple choice question added');
    
    const formUrl = form.getPublishedUrl();
    const editUrl = form.getEditUrl();
    
    console.log('🎉 SUCCESS: Minimal form created with basic questions!');
    console.log('   Form URL:', formUrl);
    
    return {
      success: true,
      message: 'Minimal form created successfully',
      formResult: {
        formId: form.getId(),
        title: form.getTitle(),
        publishedUrl: formUrl,
        editUrl: editUrl,
        questionCount: { coding: 1, multipleChoice: 1, total: 2 }
      }
    };
    
  } catch (error) {
    console.error('❌ MINIMAL TEST FAILED:', error);
    console.error('   Stack:', error.stack);
    
    return {
      success: false,
      error: error.message,
      details: error.toString()
    };
  }
}

/**
 * INCREMENTAL TEST: Add quiz features one at a time to isolate issues
 */
function testIncrementalQuizFeatures() {
  try {
    console.log('🔬 Testing incremental quiz features...');
    
    // Step 1: Create basic form
    const form = FormApp.create('INCREMENTAL TEST: Quiz Features');
    form.setDescription('Testing quiz features incrementally');
    form.setCollectEmail(true);
    console.log('✅ Step 1: Basic form created');
    
    // Step 2: Set as quiz FIRST (before adding questions)
    form.setIsQuiz(true);
    console.log('✅ Step 2: Form set as quiz');
    
    // Step 3: Add simple multiple choice with points only
    const mcItem = form.addMultipleChoiceItem();
    mcItem.setTitle('Test question: What is 2+2?')
          .setRequired(true);
    
    const choices = [
      mcItem.createChoice('3', false),
      mcItem.createChoice('4', true), // Correct answer
      mcItem.createChoice('5', false)
    ];
    
    mcItem.setChoices(choices);
    console.log('✅ Step 3: Multiple choice question with correct answer added');
    
    // Step 4: Try to set points
    try {
      mcItem.setPoints(5);
      console.log('✅ Step 4: Points set successfully');
    } catch (pointsError) {
      console.error('❌ Step 4 FAILED: Cannot set points -', pointsError.message);
      throw new Error(`Points setting failed: ${pointsError.message}`);
    }
    
    // Step 5: Try to set feedback (using correct API method)
    try {
      const correctFeedback = FormApp.createFeedback()
        .setText('Correct! Well done.')  // Changed from setDisplayText to setText
        .build();
      
      const incorrectFeedback = FormApp.createFeedback()
        .setText('Incorrect. The answer is 4.')
        .build();
      
      mcItem.setFeedbackForCorrect(correctFeedback);
      mcItem.setFeedbackForIncorrect(incorrectFeedback);
      console.log('✅ Step 5: Feedback set successfully with correct API methods');
    } catch (feedbackError) {
      console.error('❌ Step 5 FAILED: Cannot set feedback -', feedbackError.message);
      throw new Error(`Feedback setting failed: ${feedbackError.message}`);
    }
    
    const formUrl = form.getPublishedUrl();
    console.log('🎉 SUCCESS: All incremental features worked!');
    
    return {
      success: true,
      message: 'All incremental quiz features working',
      formResult: {
        formId: form.getId(),
        publishedUrl: formUrl,
        editUrl: form.getEditUrl()
      }
    };
    
  } catch (error) {
    console.error('❌ INCREMENTAL TEST FAILED:', error);
    return {
      success: false,
      error: error.message,
      step: 'Check console for step-by-step failure details'
    };
  }
}

/**
 * SIMPLIFIED TEST: Use working incremental approach with hardcoded questions
 * This bypasses the complex forms service and uses the proven approach
 */
function testSimplifiedQuizCreation() {
  try {
    console.log('🔧 Testing simplified quiz creation with hardcoded questions...');
    
    // Step 1: Create basic form (like incremental test)
    const form = FormApp.create('SIMPLIFIED: Karel Programming Quiz');
    form.setDescription('This quiz tests Karel programming concepts using the simplified approach that works.');
    form.setCollectEmail(true);
    
    // Step 2: Set as quiz FIRST
    form.setIsQuiz(true);
    console.log('✅ Form configured as quiz');
    
    // Step 3: Add coding questions section
    form.addSectionHeaderItem()
      .setTitle('📝 Coding Questions')
      .setHelpText('Write your Karel programs for the following challenges.');
    
    // Step 4: Add coding questions (simplified - no complex validation)
    const codingQuestions = [
      {
        title: "Make Karel Move Forward",
        description: "Write a program to make Karel move forward 3 steps and then turn left.",
        pointValue: 10,
        solution: "function run() {\n    move();\n    move();\n    move();\n    turnLeft();\n}"
      },
      {
        title: "Karel Function Practice", 
        description: "Create a function called 'moveAndTurn' that makes Karel move forward twice and turn left. Then call this function 2 times.",
        pointValue: 15,
        solution: "function moveAndTurn() {\n    move();\n    move();\n    turnLeft();\n}\n\nfunction run() {\n    moveAndTurn();\n    moveAndTurn();\n}"
      }
    ];
    
    codingQuestions.forEach((question, index) => {
      const item = form.addParagraphTextItem();
      item.setTitle(`${index + 1}. ${question.title} (${question.pointValue} points)`)
          .setHelpText(question.description)
          .setRequired(true);
      console.log(`✅ Added coding question: ${question.title}`);
    });
    
    // Step 5: Add multiple choice section
    form.addSectionHeaderItem()
      .setTitle('🎯 Multiple Choice Questions')
      .setHelpText('Select the best answer for each question.');
    
    // Step 6: Add multiple choice questions (using proven method)
    const mcQuestions = [
      {
        title: "Which command makes Karel move forward one space?",
        options: ["forward()", "move()", "step()", "go()"],
        correct: 1, // Index of correct answer
        points: 5,
        explanation: "The move() command makes Karel move forward one space."
      },
      {
        title: "What happens when Karel tries to move into a wall?",
        options: ["Karel breaks the wall", "Karel bounces back", "The program crashes with an error", "Karel stops and waits"],
        correct: 2,
        points: 5,
        explanation: "When Karel hits a wall, the program crashes with a runtime error."
      }
    ];
    
    mcQuestions.forEach((question, index) => {
      const item = form.addMultipleChoiceItem();
      item.setTitle(`${index + 1}. ${question.title}`)
          .setRequired(true);
      
      const choices = question.options.map((option, optionIndex) => {
        return item.createChoice(option, optionIndex === question.correct);
      });
      
      item.setChoices(choices);
      item.setPoints(question.points);
      
      // Add feedback using working API
      const correctFeedback = FormApp.createFeedback()
        .setText(`✅ Correct! ${question.explanation}`)
        .build();
        
      const incorrectFeedback = FormApp.createFeedback()
        .setText(`❌ Incorrect. ${question.explanation}`)
        .build();
      
      item.setFeedbackForCorrect(correctFeedback);
      item.setFeedbackForIncorrect(incorrectFeedback);
      
      console.log(`✅ Added MC question: ${question.title}`);
    });
    
    const formUrl = form.getPublishedUrl();
    const editUrl = form.getEditUrl();
    
    console.log('🎉 SUCCESS: Simplified quiz created with all features!');
    
    return {
      success: true,
      message: 'Simplified quiz created successfully',
      formResult: {
        formId: form.getId(),
        title: form.getTitle(),
        publishedUrl: formUrl,
        editUrl: editUrl,
        questionCount: { coding: 2, multipleChoice: 2, total: 4 }
      }
    };
    
  } catch (error) {
    console.error('❌ SIMPLIFIED TEST FAILED:', error);
    return {
      success: false,
      error: error.message,
      details: error.toString()
    };
  }
}

/**
 * DIAGNOSTIC TEST: Test each forms service component individually
 * This will identify exactly which component causes the failure
 */
function testFormsServiceComponents() {
  try {
    console.log('🔬 Testing forms service components individually...');
    
    // Create the same sample data as the failing test
    const sampleQuestions = {
      codingQuestions: [
        {
          id: 1,
          difficulty: "easy",
          title: "Make Karel Move Forward",
          description: "Write a program to make Karel move forward 3 steps and then turn left.",
          concepts: ["move()", "turnLeft()", "basic commands"],
          sampleApproach: "Use the move() command three times, then use turnLeft() once.",
          pointValue: 10
        }
      ],
      multipleChoiceQuestions: [
        {
          id: 1,
          title: "Which command makes Karel move forward one space?",
          options: {
            "A": "forward()",
            "B": "move()",
            "C": "step()",
            "D": "go()"
          },
          correctAnswer: "B",
          explanation: "The move() command makes Karel move forward one space.",
          concepts: ["basic commands"],
          pointValue: 5
        }
      ]
    };

    const form = FormApp.create('DIAGNOSTIC: Forms Service Components Test');
    console.log('✅ Step 1: Basic form creation - SUCCESS');
    
    // Test Step 2: createBaseForm equivalent
    form.setDescription('Testing forms service components individually');
    form.setAcceptingResponses(true);
    form.setAllowResponseEdits(false);
    form.setCollectEmail(true);
    form.setShowLinkToRespondAgain(false);
    console.log('✅ Step 2: Base form configuration - SUCCESS');
    
    // Test Step 3: configureAsQuiz equivalent  
    form.setIsQuiz(true);
    form.setShuffleQuestions(false);
    form.setLimitOneResponsePerUser(true);
    // Note: setRequireLogin() removed - not supported in current Google Forms API
    console.log('✅ Step 3: Quiz configuration - SUCCESS');
    
    // Test Step 4: Try section header creation
    try {
      form.addSectionHeaderItem()
        .setTitle('📝 Coding Questions')
        .setHelpText('Write your Karel programs for the following challenges. Include proper function definitions and clear logic.');
      console.log('✅ Step 4: Section header creation - SUCCESS');
    } catch (error) {
      console.error('❌ Step 4 FAILED: Section header -', error.message);
      throw new Error(`Section header failed: ${error.message}`);
    }
    
    // Test Step 5: Try buildCodingQuestionHelp
    try {
      const question = sampleQuestions.codingQuestions[0];
      let helpText = question.description + '\n\n';
      
      if (question.concepts && question.concepts.length > 0) {
        helpText += `Key Concepts: ${question.concepts.join(', ')}\n`;
      }
      
      if (question.sampleApproach) {
        helpText += `\nApproach: ${question.sampleApproach}`;
      }
      
      if (question.difficulty) {
        helpText += `\nDifficulty: ${question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}`;
      }
      
      console.log('✅ Step 5: Help text generation - SUCCESS');
      
      // Test Step 6: Add paragraph text item with generated help
      const item = form.addParagraphTextItem();
      item.setTitle(`1. ${question.title} (${question.pointValue} points)`)
          .setHelpText(helpText)
          .setRequired(true);
      console.log('✅ Step 6: Paragraph text item with help text - SUCCESS');
      
    } catch (error) {
      console.error('❌ Step 5-6 FAILED: Coding question creation -', error.message);
      throw new Error(`Coding question creation failed: ${error.message}`);
    }
    
    // Test Step 7: Try MC section header
    try {
      form.addSectionHeaderItem()
        .setTitle('🎯 Multiple Choice Questions')
        .setHelpText('Select the best answer for each question.');
      console.log('✅ Step 7: MC section header - SUCCESS');
    } catch (error) {
      console.error('❌ Step 7 FAILED: MC section header -', error.message);
      throw new Error(`MC section header failed: ${error.message}`);
    }
    
    // Test Step 8: Try complex MC question creation (like forms service)
    try {
      const mcQuestion = sampleQuestions.multipleChoiceQuestions[0];
      const mcItem = form.addMultipleChoiceItem();
      mcItem.setTitle(`1. ${mcQuestion.title}`)
            .setRequired(true);
      
      // Create choices using forms service method
      const choices = [];
      const optionKeys = ['A', 'B', 'C', 'D'];
      let correctAnswerFound = false;
      
      optionKeys.forEach(key => {
        if (mcQuestion.options[key]) {
          const isCorrect = (key === mcQuestion.correctAnswer);
          if (isCorrect) correctAnswerFound = true;
          
          const choice = mcItem.createChoice(mcQuestion.options[key], isCorrect);
          choices.push(choice);
        }
      });
      
      mcItem.setChoices(choices);
      mcItem.setPoints(mcQuestion.pointValue || 5);
      
      const correctFeedback = FormApp.createFeedback()
        .setText(`✅ Correct! ${mcQuestion.explanation || ''}`)
        .build();
        
      const incorrectFeedback = FormApp.createFeedback()
        .setText(`❌ Incorrect. ${mcQuestion.explanation || 'Review the concept and try again.'}`)
        .build();
      
      mcItem.setFeedbackForCorrect(correctFeedback);
      mcItem.setFeedbackForIncorrect(incorrectFeedback);
      
      console.log('✅ Step 8: Complex MC question creation - SUCCESS');
      
    } catch (error) {
      console.error('❌ Step 8 FAILED: Complex MC question -', error.message);
      throw new Error(`Complex MC question failed: ${error.message}`);
    }
    
    // Test Step 9: Try finalizeQuizSettings equivalent
    try {
      const codingPoints = sampleQuestions.codingQuestions.reduce((sum, q) => sum + (q.pointValue || 10), 0);
      const mcPoints = sampleQuestions.multipleChoiceQuestions.reduce((sum, q) => sum + (q.pointValue || 5), 0);
      const totalPoints = codingPoints + mcPoints;
      
      const submissionItem = form.addSectionHeaderItem();
      submissionItem.setTitle('📋 Submission Complete')
                    .setHelpText(`Total Points Available: ${totalPoints}\n\nCoding questions will be manually reviewed by your instructor. Multiple choice questions are automatically graded.`);
      
      console.log('✅ Step 9: Final quiz settings - SUCCESS');
      
    } catch (error) {
      console.error('❌ Step 9 FAILED: Final quiz settings -', error.message);
      throw new Error(`Final quiz settings failed: ${error.message}`);
    }
    
    const formUrl = form.getPublishedUrl();
    console.log('🎉 ALL STEPS SUCCESSFUL: Forms service components all work individually!');
    
    return {
      success: true,
      message: 'All forms service components work individually',
      formResult: {
        formId: form.getId(),
        publishedUrl: formUrl,
        editUrl: form.getEditUrl()
      }
    };
    
  } catch (error) {
    console.error('❌ DIAGNOSTIC TEST FAILED at step:', error);
    return {
      success: false,
      error: error.message,
      step: 'Check console for exact step that failed'
    };
  }
}

/**
 * ULTRA BASIC TEST: Test the absolute minimum operations one by one
 * This will catch the failure at the most basic level
 */
function testUltraBasicOperations() {
  try {
    console.log('🔬 Testing ultra basic operations...');
    
    // Test 1: Can we even call the forms service function?
    try {
      console.log('Step 1: Attempting to call createBaseForm...');
      const form = createBaseForm('Ultra Basic Test', 'Testing the most basic operations');
      console.log('✅ Step 1: createBaseForm SUCCESS');
      return { success: true, step: 1, form: { publishedUrl: form.getPublishedUrl() } };
    } catch (error) {
      console.error('❌ Step 1 FAILED: createBaseForm error:', error);
      return { success: false, step: 1, error: error.message };
    }
    
  } catch (error) {
    console.error('❌ ULTRA BASIC TEST FAILED:', error);
    return { success: false, step: 0, error: error.message };
  }
}

/**
 * TEST JUST FORM CREATION: Bypass all our code, just test FormApp directly
 */
function testJustFormCreation() {
  try {
    console.log('🔬 Testing just FormApp.create...');
    
    const form = FormApp.create('JUST FORM TEST');
    console.log('✅ FormApp.create worked');
    
    form.setDescription('This is just a basic form creation test');
    console.log('✅ setDescription worked');
    
    const url = form.getPublishedUrl();
    console.log('✅ getPublishedUrl worked:', url);
    
    return {
      success: true,
      message: 'Basic FormApp operations work',
      formUrl: url
    };
    
  } catch (error) {
    console.error('❌ Basic FormApp test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * FORMS SERVICE TEST: Use forms service with simplified data structure
 * This tests if the issue is data structure vs forms service logic
 */
function testFormsServiceWithSimpleData() {
  try {
    console.log('🔧 Testing forms service with known good data structure...');
    
    // Use the EXACT same data structure as the working simplified test
    const simpleQuestions = {
      codingQuestions: [
        {
          title: "Make Karel Move Forward",
          description: "Write a program to make Karel move forward 3 steps and then turn left.",
          pointValue: 10,
          difficulty: "easy",
          concepts: ["move()", "turnLeft()"],
          sampleApproach: "Use move() three times, then turnLeft()"
        }
      ],
      multipleChoiceQuestions: [
        {
          title: "Which command makes Karel move forward one space?",
          options: {
            "A": "forward()",
            "B": "move()",
            "C": "step()",
            "D": "go()"
          },
          correctAnswer: "B",
          explanation: "The move() command makes Karel move forward one space.",
          pointValue: 5
        }
      ]
    };

    // Create quiz data exactly like the main function does
    const quizData = {
      title: "FORMS SERVICE TEST: Simple Data",
      description: "Testing forms service with simplified data structure",
      questions: simpleQuestions,
      config: { codingQuestions: 1, multipleChoiceQuestions: 1 }
    };

    console.log('📝 Calling createGoogleFormQuiz with simple data...');
    const formResult = createGoogleFormQuiz(quizData);
    
    console.log('🎉 SUCCESS: Forms service worked with simple data!');
    
    return {
      success: true,
      message: 'Forms service works with simple data structure',
      formResult: formResult
    };
    
  } catch (error) {
    console.error('❌ FORMS SERVICE SIMPLE DATA TEST FAILED:', error);
    console.error('   Stack:', error.stack);
    
    return {
      success: false,
      error: error.message,
      details: error.toString()
    };
  }
}

/**
 * Test endpoint for creating quiz with hardcoded questions
 * Can be called from webapp to test Forms API functionality
 * @returns {Object} Test results
 */
function testHardcodedQuizGeneration() {
  return testFormCreationWithSampleQuestions();
}

/**
 * Get user-friendly permission status for the webapp
 * @returns {Object} Simplified permission status for UI
 */
function getPermissionStatus() {
  const check = checkUserPermissions();
  
  return {
    ready: check.hasAllPermissions,
    missing: check.missingPermissions,
    instructions: check.instructions,
    details: check.permissions,
    needsSetup: check.missingPermissions.includes('API Configuration'),
    needsAuth: check.missingPermissions.some(p => p.includes('Google'))
  };
}

/**
 * Force OAuth authorization by attempting privileged operations
 * This will trigger permission prompts if called from webapp
 * @returns {Object} Authorization attempt result
 */
function requestPermissions() {
  try {
    // This will force OAuth prompts for missing permissions
    const testResults = checkUserPermissions();
    
    return {
      success: testResults.hasAllPermissions,
      message: testResults.hasAllPermissions ? 
        'All permissions granted successfully!' : 
        'Some permissions still missing. Please grant all requested permissions.',
      status: testResults
    };
  } catch (error) {
    return {
      success: false,
      message: 'Permission request failed: ' + error.message,
      error: error.message
    };
  }
}

/**
 * Test function to verify all services are working
 * @returns {Object} Test results
 */
function runSystemTest() {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    // Test 1: Syllabus data access
    results.tests.syllabusData = {
      passed: true,
      data: getAllUnits().length > 0,
      message: `Found ${getAllUnits().length} units`
    };
  } catch (error) {
    results.tests.syllabusData = {
      passed: false,
      error: error.message
    };
  }

  try {
    // Test 2: AI service configuration
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    results.tests.aiService = {
      passed: !!apiKey,
      message: apiKey ? 'API key configured' : 'API key not found'
    };
  } catch (error) {
    results.tests.aiService = {
      passed: false,
      error: error.message
    };
  }

  try {
    // Test 3: Forms service access
    const testForm = FormApp.create('Test Quiz - DELETE ME');
    const formId = testForm.getId();
    DriveApp.getFileById(formId).setTrashed(true); // Clean up immediately
    
    results.tests.formsService = {
      passed: true,
      message: 'Forms API accessible'
    };
  } catch (error) {
    results.tests.formsService = {
      passed: false,
      error: error.message
    };
  }

  results.overallStatus = Object.values(results.tests).every(test => test.passed) ? 'PASS' : 'FAIL';
  
  return results;
}

/**
 * Helper function to get recent quizzes (for dashboard)
 * @param {number} limit - Maximum number of quizzes to return
 * @returns {Array} Recent quiz information
 */
function getRecentQuizzes(limit = 10) {
  try {
    return listCreatedQuizzes().slice(0, limit);
  } catch (error) {
    console.error('Error getting recent quizzes:', error);
    return [];
  }
}

/**
 * Initialize the application (run once after deployment)
 * Sets up any required configuration or initial data
 */
function initializeApp() {
  console.log('Initializing CodeHS Quiz Generator...');
  
  // Check if API key is configured
  const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    console.log('API key not configured. Run setupGeminiAPIKey() to configure.');
  }
  
  // Log available units for verification
  const units = getAllUnits();
  console.log(`Available units: ${units.map(u => u.title).join(', ')}`);
  
  console.log('Initialization complete');
}

/**
 * FORCE RE-AUTHORIZATION: Triggers OAuth consent flow
 * Run this function to force Google to ask for permissions again
 */
function forceReauthorization() {
  try {
    console.log('🔐 Attempting to trigger OAuth re-authorization...');
    
    // Try to access all the APIs we need permissions for
    console.log('📝 Testing Forms API...');
    FormApp.create('AUTH TEST - DELETE ME');
    
    console.log('💾 Testing Drive API...');
    DriveApp.getRootFolder();
    
    console.log('📧 Testing User Info...');
    Session.getActiveUser().getEmail();
    
    console.log('🌐 Testing External Requests...');
    // This will be tested when we try to call Gemini
    
    console.log('✅ All APIs accessible - authorization is working!');
    return { success: true, message: 'Authorization verified' };
    
  } catch (error) {
    console.log('🔄 Permission error detected - this should trigger re-auth');
    console.error('Error:', error.message);
    return { success: false, needsAuth: true, error: error.message };
  }
}

/**
 * TEST FUNCTION: Create form with hardcoded questions to verify API works
 * This tests the Forms API with known good data before testing AI integration
 */
function testFormCreationWithSampleQuestions() {
  try {
    console.log('🧪 Testing form creation with hardcoded sample questions...');
    
    // Create sample question data in the expected format
    const sampleQuestions = {
      codingQuestions: [
        {
          id: 1,
          difficulty: "easy",
          title: "Make Karel Move Forward",
          description: "Write a program to make Karel move forward 3 steps and then turn left.",
          concepts: ["move()", "turnLeft()", "basic commands"],
          sampleApproach: "Use the move() command three times, then use turnLeft() once.",
          pointValue: 10,
          solution: "function run() {\n    move();\n    move();\n    move();\n    turnLeft();\n}"
        },
        {
          id: 2,
          difficulty: "medium", 
          title: "Karel Function Practice",
          description: "Create a function called 'moveAndTurn' that makes Karel move forward twice and turn left. Then call this function 2 times.",
          concepts: ["functions", "function definition", "function calls"],
          sampleApproach: "Define the function with proper syntax, then call it in main().",
          pointValue: 15,
          solution: "function moveAndTurn() {\n    move();\n    move();\n    turnLeft();\n}\n\nfunction run() {\n    moveAndTurn();\n    moveAndTurn();\n}"
        }
      ],
      multipleChoiceQuestions: [
        {
          id: 1,
          title: "Which command makes Karel move forward one space?",
          options: {
            "A": "forward()",
            "B": "move()",
            "C": "step()",
            "D": "go()"
          },
          correctAnswer: "B",
          explanation: "The move() command makes Karel move forward one space in the direction Karel is facing.",
          concepts: ["basic commands"],
          pointValue: 5
        },
        {
          id: 2,
          title: "What happens when Karel tries to move into a wall?",
          options: {
            "A": "Karel breaks the wall",
            "B": "Karel bounces back",
            "C": "The program crashes with an error",
            "D": "Karel stops and waits"
          },
          correctAnswer: "C",
          explanation: "When Karel hits a wall, the program will crash with a runtime error.",
          concepts: ["Karel world", "error handling"],
          pointValue: 5
        },
        {
          id: 3,
          title: "Which statement best describes a function in Karel?",
          options: {
            "A": "A way to repeat commands exactly 5 times",
            "B": "A collection of commands that can be reused",
            "C": "A special type of beeper",
            "D": "A way to make Karel move faster"
          },
          correctAnswer: "B",
          explanation: "Functions allow you to group commands together and reuse them, making code more organized and efficient.",
          concepts: ["functions", "code organization"],
          pointValue: 5
        }
      ]
    };

    // Create quiz data structure
    const testQuizData = {
      title: "TEST: Karel Programming Quiz",
      description: "This is a test quiz with hardcoded questions to verify the Google Forms API is working correctly.",
      questions: sampleQuestions,
      config: { codingQuestions: 2, multipleChoiceQuestions: 3 }
    };

    // Test form creation
    console.log('📝 Creating test form with sample questions...');
    const formResult = createGoogleFormQuiz(testQuizData);
    
    console.log('✅ SUCCESS: Test form created successfully!');
    console.log('   Form URL:', formResult.publishedUrl);
    console.log('   Edit URL:', formResult.editUrl);
    console.log('   Question Count:', formResult.questionCount);
    
    return {
      success: true,
      message: 'Test form created successfully with sample questions',
      formResult: formResult
    };
    
  } catch (error) {
    console.error('❌ TEST FAILED: Error creating test form:', error);
    console.error('   Error details:', error.toString());
    console.error('   Stack trace:', error.stack);
    
    return {
      success: false,
      error: error.message,
      details: error.toString(),
      suggestion: 'Check the Forms API implementation and error logs above'
    };
  }
}

/**
 * METHOD ISOLATION TESTS: Test each Forms API method individually
 * These tests isolate exactly which method causes "This operation is not supported"
 */

/**
 * TEST 1: Quiz Configuration Methods
 */
function testQuizConfigurationMethods() {
  try {
    console.log('🔬 Testing quiz configuration methods individually...');
    
    const form = FormApp.create('METHOD TEST: Quiz Config');
    form.setDescription('Testing quiz configuration methods one by one');
    console.log('✅ Basic form created');
    
    // Test each quiz config method individually (excluding unsupported methods)
    const testMethods = [
      { name: 'setIsQuiz', method: () => form.setIsQuiz(true) },
      { name: 'setShuffleQuestions', method: () => form.setShuffleQuestions(false) },
      { name: 'setLimitOneResponsePerUser', method: () => form.setLimitOneResponsePerUser(true) }
      // Note: setRequireLogin() removed - not supported in current Google Forms API
    ];
    
    const results = { success: true, methods: {} };
    
    for (const test of testMethods) {
      try {
        console.log(`   Testing ${test.name}...`);
        test.method();
        console.log(`   ✅ ${test.name} SUCCESS`);
        results.methods[test.name] = { success: true };
      } catch (error) {
        console.error(`   ❌ ${test.name} FAILED:`, error.message);
        results.methods[test.name] = { success: false, error: error.message };
        results.success = false;
        results.failedMethod = test.name;
        break; // Stop on first failure
      }
    }
    
    // Clean up
    DriveApp.getFileById(form.getId()).setTrashed(true);
    
    return results;
    
  } catch (error) {
    console.error('❌ Quiz configuration test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * TEST 2: Feedback System Methods
 */
function testFeedbackSystemMethods() {
  try {
    console.log('🔬 Testing feedback system methods individually...');
    
    const form = FormApp.create('METHOD TEST: Feedback System');
    form.setIsQuiz(true); // Need quiz mode for feedback
    console.log('✅ Quiz form created');
    
    // Create a test question first
    const mcItem = form.addMultipleChoiceItem();
    mcItem.setTitle('Test question')
          .setChoices([mcItem.createChoice('Option A', true), mcItem.createChoice('Option B', false)]);
    console.log('✅ Test question created');
    
    const testMethods = [
      { 
        name: 'createFeedback', 
        method: () => FormApp.createFeedback().setText('Test feedback').build() 
      },
      { 
        name: 'setFeedbackForCorrect', 
        method: () => {
          const feedback = FormApp.createFeedback().setText('Correct!').build();
          mcItem.setFeedbackForCorrect(feedback);
        }
      },
      { 
        name: 'setFeedbackForIncorrect', 
        method: () => {
          const feedback = FormApp.createFeedback().setText('Incorrect!').build();
          mcItem.setFeedbackForIncorrect(feedback);
        }
      }
    ];
    
    const results = { success: true, methods: {} };
    
    for (const test of testMethods) {
      try {
        console.log(`   Testing ${test.name}...`);
        test.method();
        console.log(`   ✅ ${test.name} SUCCESS`);
        results.methods[test.name] = { success: true };
      } catch (error) {
        console.error(`   ❌ ${test.name} FAILED:`, error.message);
        results.methods[test.name] = { success: false, error: error.message };
        results.success = false;
        results.failedMethod = test.name;
        break;
      }
    }
    
    // Clean up
    DriveApp.getFileById(form.getId()).setTrashed(true);
    
    return results;
    
  } catch (error) {
    console.error('❌ Feedback system test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * TEST 3: Points Assignment Methods
 */
function testPointsAssignmentMethods() {
  try {
    console.log('🔬 Testing points assignment methods individually...');
    
    const form = FormApp.create('METHOD TEST: Points Assignment');
    form.setIsQuiz(true); // Need quiz mode for points
    console.log('✅ Quiz form created');
    
    // Test on multiple choice item
    const mcItem = form.addMultipleChoiceItem();
    mcItem.setTitle('MC Test question')
          .setChoices([mcItem.createChoice('A', true), mcItem.createChoice('B', false)]);
    
    // Test on paragraph text item  
    const textItem = form.addParagraphTextItem();
    textItem.setTitle('Text Test question').setRequired(true);
    
    console.log('✅ Test questions created');
    
    const testMethods = [
      { name: 'setPoints on MC', method: () => mcItem.setPoints(5) },
      { name: 'setPoints on Text', method: () => textItem.setPoints(10) }
    ];
    
    const results = { success: true, methods: {} };
    
    for (const test of testMethods) {
      try {
        console.log(`   Testing ${test.name}...`);
        test.method();
        console.log(`   ✅ ${test.name} SUCCESS`);
        results.methods[test.name] = { success: true };
      } catch (error) {
        console.error(`   ❌ ${test.name} FAILED:`, error.message);
        results.methods[test.name] = { success: false, error: error.message };
        results.success = false;
        results.failedMethod = test.name;
        break;
      }
    }
    
    // Clean up
    DriveApp.getFileById(form.getId()).setTrashed(true);
    
    return results;
    
  } catch (error) {
    console.error('❌ Points assignment test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * TEST 4: Section Header Methods
 */
function testSectionHeaderMethods() {
  try {
    console.log('🔬 Testing section header methods individually...');
    
    const form = FormApp.create('METHOD TEST: Section Headers');
    console.log('✅ Basic form created');
    
    const testMethods = [
      { 
        name: 'addSectionHeaderItem', 
        method: () => form.addSectionHeaderItem().setTitle('Test Section') 
      },
      { 
        name: 'setTitle on section', 
        method: () => {
          const section = form.addSectionHeaderItem();
          section.setTitle('Another Section');
          return section;
        }
      },
      { 
        name: 'setHelpText on section', 
        method: () => {
          const section = form.addSectionHeaderItem();
          section.setTitle('Section with Help').setHelpText('This is help text');
          return section;
        }
      }
    ];
    
    const results = { success: true, methods: {} };
    
    for (const test of testMethods) {
      try {
        console.log(`   Testing ${test.name}...`);
        test.method();
        console.log(`   ✅ ${test.name} SUCCESS`);
        results.methods[test.name] = { success: true };
      } catch (error) {
        console.error(`   ❌ ${test.name} FAILED:`, error.message);
        results.methods[test.name] = { success: false, error: error.message };
        results.success = false;
        results.failedMethod = test.name;
        break;
      }
    }
    
    // Clean up
    DriveApp.getFileById(form.getId()).setTrashed(true);
    
    return results;
    
  } catch (error) {
    console.error('❌ Section header test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * ISOLATED TEST: Test setRequireLogin() method under different conditions
 * This method was previously failing but research suggests it should work
 */
function testSetRequireLoginIsolated() {
  console.log('🔍 Testing setRequireLogin() method in isolation...');
  
  const testResults = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  // Test 1: Basic form with setRequireLogin() only
  try {
    console.log('Test 1: Basic form with setRequireLogin() only');
    const form1 = FormApp.create('TEST 1: Basic + setRequireLogin');
    form1.setRequireLogin(true);
    console.log('✅ Test 1 SUCCESS: setRequireLogin() on basic form');
    testResults.tests.basicForm = { success: true, formUrl: form1.getPublishedUrl() };
    DriveApp.getFileById(form1.getId()).setTrashed(true); // Clean up
  } catch (error) {
    console.error('❌ Test 1 FAILED:', error.message);
    testResults.tests.basicForm = { success: false, error: error.message };
  }
  
  // Test 2: setCollectEmail first, then setRequireLogin
  try {
    console.log('Test 2: setCollectEmail + setRequireLogin');
    const form2 = FormApp.create('TEST 2: Email + Login');
    form2.setCollectEmail(true);
    form2.setRequireLogin(true);
    console.log('✅ Test 2 SUCCESS: setCollectEmail then setRequireLogin');
    testResults.tests.emailThenLogin = { success: true, formUrl: form2.getPublishedUrl() };
    DriveApp.getFileById(form2.getId()).setTrashed(true);
  } catch (error) {
    console.error('❌ Test 2 FAILED:', error.message);
    testResults.tests.emailThenLogin = { success: false, error: error.message };
  }
  
  // Test 3: setRequireLogin first, then setCollectEmail
  try {
    console.log('Test 3: setRequireLogin + setCollectEmail');
    const form3 = FormApp.create('TEST 3: Login + Email');
    form3.setRequireLogin(true);
    form3.setCollectEmail(true);
    console.log('✅ Test 3 SUCCESS: setRequireLogin then setCollectEmail');
    testResults.tests.loginThenEmail = { success: true, formUrl: form3.getPublishedUrl() };
    DriveApp.getFileById(form3.getId()).setTrashed(true);
  } catch (error) {
    console.error('❌ Test 3 FAILED:', error.message);
    testResults.tests.loginThenEmail = { success: false, error: error.message };
  }
  
  // Test 4: Full quiz setup with setRequireLogin at the end
  try {
    console.log('Test 4: Full quiz setup + setRequireLogin at end');
    const form4 = FormApp.create('TEST 4: Quiz + Login End');
    form4.setCollectEmail(true);
    form4.setIsQuiz(true);
    form4.setLimitOneResponsePerUser(true);
    form4.setRequireLogin(true); // Last
    console.log('✅ Test 4 SUCCESS: Full quiz setup with login at end');
    testResults.tests.quizLoginEnd = { success: true, formUrl: form4.getPublishedUrl() };
    DriveApp.getFileById(form4.getId()).setTrashed(true);
  } catch (error) {
    console.error('❌ Test 4 FAILED:', error.message);
    testResults.tests.quizLoginEnd = { success: false, error: error.message };
  }
  
  // Test 5: setRequireLogin early in quiz setup
  try {
    console.log('Test 5: setRequireLogin early in quiz setup');
    const form5 = FormApp.create('TEST 5: Login Early Quiz');
    form5.setRequireLogin(true); // First
    form5.setCollectEmail(true);
    form5.setIsQuiz(true);
    form5.setLimitOneResponsePerUser(true);
    console.log('✅ Test 5 SUCCESS: setRequireLogin early in quiz setup');
    testResults.tests.loginEarlyQuiz = { success: true, formUrl: form5.getPublishedUrl() };
    DriveApp.getFileById(form5.getId()).setTrashed(true);
  } catch (error) {
    console.error('❌ Test 5 FAILED:', error.message);
    testResults.tests.loginEarlyQuiz = { success: false, error: error.message };
  }
  
  // Analyze results
  const successfulTests = Object.keys(testResults.tests).filter(test => testResults.tests[test].success);
  const failedTests = Object.keys(testResults.tests).filter(test => !testResults.tests[test].success);
  
  testResults.summary = {
    total: Object.keys(testResults.tests).length,
    successful: successfulTests.length,
    failed: failedTests.length,
    successfulTests: successfulTests,
    failedTests: failedTests
  };
  
  if (successfulTests.length > 0) {
    console.log(`🎉 SUCCESS: ${successfulTests.length} test(s) worked: ${successfulTests.join(', ')}`);
    testResults.overallSuccess = true;
    testResults.workingApproach = successfulTests[0]; // First working approach
  } else {
    console.log(`❌ ALL TESTS FAILED: setRequireLogin() not supported in current environment`);
    testResults.overallSuccess = false;
    testResults.conclusion = 'setRequireLogin() appears to be unsupported';
  }
  
  return testResults;
}

/**
 * MASTER METHOD TEST: Run all individual method tests
 */
function testAllFormsMethods() {
  try {
    console.log('🔬 Running complete Forms API method isolation tests...');
    
    const results = {
      timestamp: new Date().toISOString(),
      overallSuccess: true,
      tests: {}
    };
    
    // Run each test category
    const testCategories = [
      { name: 'quizConfig', test: testQuizConfigurationMethods },
      { name: 'feedback', test: testFeedbackSystemMethods },
      { name: 'points', test: testPointsAssignmentMethods },
      { name: 'sections', test: testSectionHeaderMethods }
    ];
    
    for (const category of testCategories) {
      console.log(`\n📋 Testing ${category.name} methods...`);
      const result = category.test();
      results.tests[category.name] = result;
      
      if (!result.success) {
        results.overallSuccess = false;
        results.firstFailure = {
          category: category.name,
          method: result.failedMethod,
          error: result.error
        };
        console.log(`\n🚨 FIRST FAILURE DETECTED in ${category.name}: ${result.failedMethod}`);
        break; // Stop on first failure to isolate the exact issue
      }
    }
    
    if (results.overallSuccess) {
      console.log('\n🎉 ALL METHOD TESTS PASSED - Issue may be in complex interaction');
    } else {
      console.log('\n🎯 EXACT FAILURE IDENTIFIED:', results.firstFailure);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Master method test failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * QUICK TEST: Verify Google Forms API permissions are working
 * Run this function in the Apps Script editor to test Forms access
 * Creates a test form and immediately deletes it
 */
function testFormsAPIAccess() {
  try {
    console.log('🧪 Testing Google Forms API access...');
    
    // Step 1: Try to create a simple form
    const testForm = FormApp.create('TEST FORM - DELETE ME');
    const formId = testForm.getId();
    const formUrl = testForm.getPublishedUrl();
    
    console.log(`✅ SUCCESS: Created test form`);
    console.log(`   Form ID: ${formId}`);
    console.log(`   Form URL: ${formUrl}`);
    
    // Step 2: Try to add a simple question
    const item = testForm.addMultipleChoiceItem();
    item.setTitle('Test Question: What is 2+2?')
        .setChoices([
          item.createChoice('3'),
          item.createChoice('4', true), // correct answer
          item.createChoice('5')
        ]);
    
    console.log(`✅ SUCCESS: Added test question to form`);
    
    // Step 3: Try to configure as quiz
    testForm.setIsQuiz(true);
    console.log(`✅ SUCCESS: Configured form as quiz`);
    
    // Step 4: Clean up - delete the test form
    const file = DriveApp.getFileById(formId);
    file.setTrashed(true);
    console.log(`🗑️ Cleaned up: Deleted test form`);
    
    // Final result
    console.log(`\n🎉 FORMS API TEST PASSED!`);
    console.log(`   ✅ Can create forms`);
    console.log(`   ✅ Can add questions`);  
    console.log(`   ✅ Can configure quiz settings`);
    console.log(`   ✅ Can delete forms`);
    console.log(`\n🚀 Your CodeHS Quiz Generator should work now!`);
    
    return {
      success: true,
      message: 'Forms API access verified successfully',
      permissions: ['create', 'modify', 'delete', 'quiz_settings']
    };
    
  } catch (error) {
    console.error('❌ FORMS API TEST FAILED:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Details: ${error.toString()}`);
    
    // Check specific error types
    if (error.message.includes('permissions') || error.message.includes('auth')) {
      console.error(`\n🔧 SOLUTION: OAuth permissions issue`);
      console.error(`   1. Re-authorize the script with new permissions`);
      console.error(`   2. Check that appsscript.json has correct scopes`);
      console.error(`   3. Try running the webapp to trigger OAuth flow`);
    }
    
    return {
      success: false,
      error: error.message,
      solution: 'Check OAuth permissions and re-authorize the application'
    };
  }
}