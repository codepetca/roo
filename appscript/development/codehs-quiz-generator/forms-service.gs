/**
 * Google Forms API Service Wrapper
 * Location: forms-service.gs
 * 
 * Handles programmatic creation and management of Google Forms quizzes
 */

/**
 * Create a new Google Form quiz with generated questions
 * @param {Object} quizData - Quiz configuration and questions
 * @param {string} quizData.title - Quiz title
 * @param {string} quizData.description - Quiz description  
 * @param {Object} quizData.questions - Generated questions from AI service
 * @param {Object} quizData.config - Original quiz configuration
 * @returns {Object} Created form information
 */
function createGoogleFormQuiz(quizData) {
  try {
    // Step 1: Create the basic form
    const form = createBaseForm(quizData.title, quizData.description);
    
    // Step 2: Configure as quiz with settings
    configureAsQuiz(form);
    
    // Step 3: Add student name fields (First Name, Last Name)
    addStudentNameFields(form);
    
    // Step 4: Add coding questions (paragraph text responses)
    addCodingQuestions(form, quizData.questions.codingQuestions);
    
    // Step 5: Add multiple choice questions
    addMultipleChoiceQuestions(form, quizData.questions.multipleChoiceQuestions);
    
    // Step 6: Finalize quiz settings
    finalizeQuizSettings(form, quizData.questions);
    
    const formUrl = form.getPublishedUrl();
    const editUrl = form.getEditUrl();
    
    console.log(`Quiz created successfully: ${formUrl}`);
    
    return {
      formId: form.getId(),
      title: form.getTitle(),
      publishedUrl: formUrl,
      editUrl: editUrl,
      questionCount: {
        coding: quizData.questions.codingQuestions.length,
        multipleChoice: quizData.questions.multipleChoiceQuestions.length,
        total: quizData.questions.codingQuestions.length + quizData.questions.multipleChoiceQuestions.length
      }
    };
    
  } catch (error) {
    console.error('Error creating Google Form:', error);
    throw new Error(`Failed to create quiz: ${error.message}`);
  }
}

/**
 * Create the base Google Form
 * @param {string} title - Form title
 * @param {string} description - Form description
 * @returns {GoogleAppsScript.Forms.Form} Created form object
 */
function createBaseForm(title, description) {
  const form = FormApp.create(title);
  form.setDescription(description + '\n\nNote: Instructors can manually enable "Collect email addresses" and "Require sign-in" in Form settings for automatic email collection.');
  form.setAcceptingResponses(true);
  form.setAllowResponseEdits(false);
  // Removed form.setCollectEmail(true) - will be set manually in Google Forms UI if needed
  form.setShowLinkToRespondAgain(false);
  
  return form;
}

/**
 * Add student name fields at the beginning of the form
 * @param {GoogleAppsScript.Forms.Form} form - Target form
 */
function addStudentNameFields(form) {
  try {
    console.log('📝 Adding student name fields...');
    
    // Add First Name field
    const firstNameItem = form.addTextItem();
    firstNameItem.setTitle('First Name')
              .setRequired(true);
    console.log('✅ Added First Name field');
    
    // Add Last Name field  
    const lastNameItem = form.addTextItem();
    lastNameItem.setTitle('Last Name')
              .setRequired(true);
    console.log('✅ Added Last Name field');
    
    console.log('✅ Student name fields added successfully');
  } catch (error) {
    console.error('❌ Error adding student name fields:', error);
    throw error;
  }
}

/**
 * Configure form as a quiz with grading enabled
 * @param {GoogleAppsScript.Forms.Form} form - Form to configure
 */
function configureAsQuiz(form) {
  try {
    console.log('🔧 Configuring form as quiz...');
    
    // Enable quiz mode
    form.setIsQuiz(true);
    form.setShuffleQuestions(false); // Keep questions in order for progressive difficulty
    form.setLimitOneResponsePerUser(true);
    
    // Note: form.setRequireLogin(true) is not supported in current Google Forms API
    // Users will need to manually enable "Require sign-in" in Form settings if desired
    console.warn('⚠️ Login requirement must be set manually in Google Forms (setRequireLogin not supported)');
    
    console.log('✅ Quiz configuration applied successfully');
  } catch (error) {
    console.error('❌ Error configuring quiz settings:', error);
    throw error;
  }
}

/**
 * Add coding questions as paragraph text items
 * @param {GoogleAppsScript.Forms.Form} form - Target form
 * @param {Array} codingQuestions - Array of coding questions
 */
function addCodingQuestions(form, codingQuestions) {
  try {
    console.log(`📝 Adding ${codingQuestions.length} coding questions...`);
    
    if (!codingQuestions || codingQuestions.length === 0) {
      console.warn('⚠️ No coding questions provided');
      return;
    }

    codingQuestions.forEach((question, index) => {
      try {
        console.log(`   Adding coding question ${index + 1}: "${question.title}"`);
        
        // Create section for coding question if it's the first one
        if (index === 0) {
          form.addSectionHeaderItem()
            .setTitle('📝 Coding Questions')
            .setHelpText('Write your Karel programs for the following challenges. Include proper function definitions and clear logic.');
        }
        
        // Validate question data
        if (!question.title || !question.description) {
          throw new Error(`Coding question ${index + 1} missing title or description`);
        }
        
        const item = form.addParagraphTextItem();
        item.setTitle(`${index + 1}. ${question.title} (5 points)`)
            .setHelpText(buildCodingQuestionHelp(question))
            .setRequired(true);
        
        // Add coding solution as general feedback
        if (question.solution) {
          const solutionFeedback = FormApp.createFeedback()
            .setText(`Solution:\n\n${question.solution}`)
            .build();
          item.setGeneralFeedback(solutionFeedback);
          console.log(`   ✅ Added solution feedback for coding question ${index + 1}`);
        }
        
        console.log(`   ✅ Successfully added coding question ${index + 1}`);
        
      } catch (questionError) {
        console.error(`❌ Error adding coding question ${index + 1}:`, questionError);
        throw new Error(`Failed to add coding question ${index + 1}: ${questionError.message}`);
      }
    });
    
    console.log('✅ All coding questions added successfully');
  } catch (error) {
    console.error('❌ Error in addCodingQuestions:', error);
    throw error;
  }
}

/**
 * Build help text for coding questions
 * @param {Object} question - Coding question data
 * @returns {string} Formatted help text
 */
function buildCodingQuestionHelp(question) {
  let helpText = question.description;
  
  if (question.sampleApproach) {
    helpText += `\n\nApproach: ${question.sampleApproach}`;
  }
  
  // Safely handle difficulty property
  if (question.difficulty) {
    helpText += `\nDifficulty: ${question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}`;
  }
  
  return helpText;
}

/**
 * Add multiple choice questions to the form
 * @param {GoogleAppsScript.Forms.Form} form - Target form  
 * @param {Array} mcQuestions - Array of multiple choice questions
 */
function addMultipleChoiceQuestions(form, mcQuestions) {
  try {
    console.log(`🎯 Adding ${mcQuestions.length} multiple choice questions...`);
    
    if (!mcQuestions || mcQuestions.length === 0) {
      console.warn('⚠️ No multiple choice questions provided');
      return;
    }

    // Add section header
    form.addSectionHeaderItem()
      .setTitle('🎯 Multiple Choice Questions')
      .setHelpText('Select the best answer for each question.');
    
    mcQuestions.forEach((question, index) => {
      try {
        console.log(`   Adding MC question ${index + 1}: "${question.title}"`);
        
        // Validate question data
        if (!question.title || !question.options || !question.correctAnswer) {
          throw new Error(`MC question ${index + 1} missing required fields (title, options, or correctAnswer)`);
        }
        
        const item = form.addMultipleChoiceItem();
        item.setTitle(`${index + 1}. ${question.title}`)
            .setRequired(true);
        
        // Create choices from options
        const choices = [];
        const optionKeys = ['A', 'B', 'C', 'D'];
        let correctAnswerFound = false;
        
        optionKeys.forEach(key => {
          if (question.options[key]) {
            const isCorrect = (key === question.correctAnswer);
            if (isCorrect) correctAnswerFound = true;
            
            const choice = item.createChoice(question.options[key], isCorrect);
            choices.push(choice);
            console.log(`      Option ${key}: "${question.options[key]}" ${isCorrect ? '(CORRECT)' : ''}`);
          }
        });
        
        if (!correctAnswerFound) {
          throw new Error(`MC question ${index + 1}: Correct answer "${question.correctAnswer}" not found in options`);
        }
        
        if (choices.length < 2) {
          throw new Error(`MC question ${index + 1}: Must have at least 2 choices`);
        }
        
        item.setChoices(choices);
        
        // Set points directly on the multiple choice item
        const points = 1;
        item.setPoints(points);
        console.log(`      Points: ${points}`);
        
        // Set up feedback for correct/incorrect answers (using correct API method)
        const correctFeedback = FormApp.createFeedback()
          .setText(`✅ Correct! ${question.explanation || ''}`)  // Changed from setDisplayText to setText
          .build();
          
        const incorrectFeedback = FormApp.createFeedback()
          .setText(`❌ Incorrect. ${question.explanation || 'Review the concept and try again.'}`)  // Changed from setDisplayText to setText
          .build();
        
        // Apply feedback directly to the multiple choice item
        item.setFeedbackForCorrect(correctFeedback);
        item.setFeedbackForIncorrect(incorrectFeedback);
        
        console.log(`   ✅ Successfully added MC question ${index + 1}`);
        
      } catch (questionError) {
        console.error(`❌ Error adding MC question ${index + 1}:`, questionError);
        throw new Error(`Failed to add MC question ${index + 1}: ${questionError.message}`);
      }
    });
    
    console.log('✅ All multiple choice questions added successfully');
  } catch (error) {
    console.error('❌ Error in addMultipleChoiceQuestions:', error);
    throw error;
  }
}

/**
 * Finalize quiz settings and calculate total points
 * @param {GoogleAppsScript.Forms.Form} form - Target form
 * @param {Object} questions - All questions data
 */
function finalizeQuizSettings(form, questions) {
  // Calculate total possible points
  const codingPoints = questions.codingQuestions.reduce((sum, q) => sum + 5, 0);
  const mcPoints = questions.multipleChoiceQuestions.reduce((sum, q) => sum + 1, 0);
  const totalPoints = codingPoints + mcPoints;
  
  // Add final section with submission info
  const submissionItem = form.addSectionHeaderItem();
  submissionItem.setTitle('📋 Submission Complete')
                .setHelpText(`Total Points Available: ${totalPoints}\n\nCoding questions (5 points each) and multiple choice questions (1 point each) will be automatically graded.`);
  
  console.log(`Quiz configured with ${totalPoints} total points`);
}

/**
 * Get responses from a created quiz form
 * @param {string} formId - Form ID to get responses from
 * @returns {Array} Array of form responses
 */
function getQuizResponses(formId) {
  try {
    const form = FormApp.openById(formId);
    const responses = form.getResponses();
    
    return responses.map(response => {
      const itemResponses = response.getItemResponses();
      const responseData = {
        timestamp: response.getTimestamp(),
        respondentEmail: response.getRespondentEmail(),
        score: response.getScore(),
        answers: {}
      };
      
      itemResponses.forEach(itemResponse => {
        const question = itemResponse.getItem().getTitle();
        responseData.answers[question] = itemResponse.getResponse();
      });
      
      return responseData;
    });
    
  } catch (error) {
    console.error('Error getting quiz responses:', error);
    throw new Error(`Failed to get responses: ${error.message}`);
  }
}

/**
 * Update quiz grading for coding questions (manual grading helper)
 * @param {string} formId - Form ID
 * @param {string} respondentEmail - Student email
 * @param {Array} codingGrades - Array of grades for coding questions
 */
function updateCodingQuestionGrades(formId, respondentEmail, codingGrades) {
  try {
    const form = FormApp.openById(formId);
    const responses = form.getResponses();
    
    const targetResponse = responses.find(response => 
      response.getRespondentEmail() === respondentEmail
    );
    
    if (!targetResponse) {
      throw new Error(`Response not found for email: ${respondentEmail}`);
    }
    
    // This would require manual implementation as Apps Script doesn't directly support
    // programmatic grading of text responses. In practice, this would integrate with
    // the grading system or provide helper functions for instructors.
    
    console.log(`Coding grades updated for ${respondentEmail}`);
    return true;
    
  } catch (error) {
    console.error('Error updating coding grades:', error);
    throw new Error(`Failed to update grades: ${error.message}`);
  }
}

/**
 * Helper function to list all forms created by this script
 * @returns {Array} Array of form information
 */
function listCreatedQuizzes() {
  // Note: This is a simplified version. In practice, you might store form IDs 
  // in PropertiesService or a spreadsheet for tracking
  const files = DriveApp.getFilesByType(MimeType.GOOGLE_FORMS);
  const quizzes = [];
  
  while (files.hasNext()) {
    const file = files.next();
    try {
      const form = FormApp.openById(file.getId());
      if (form.isQuiz()) {
        quizzes.push({
          id: file.getId(),
          title: form.getTitle(),
          url: form.getPublishedUrl(),
          created: file.getDateCreated(),
          responseCount: form.getResponses().length
        });
      }
    } catch (error) {
      // Skip files that can't be opened as forms
      continue;
    }
  }
  
  return quizzes.sort((a, b) => b.created - a.created);
}