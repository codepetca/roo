/**
 * Google Forms quiz generator with answer keys and auto-grading
 * Location: quiz-generator.gs
 */

/**
 * Create Google Forms with quiz questions and answer keys
 */
function createQuizForms(quizzesFolderId) {
  console.log("Creating quiz forms with answer keys...");
  
  const quizQuestions = generateQuizQuestions();
  const createdForms = [];
  
  // Programming Concepts Quiz
  try {
    const programmingForm = createFormWithAnswerKey(
      "Programming Concepts Quiz",
      "Test your understanding of variables, data types, and basic syntax",
      quizQuestions.programmingConcepts,
      quizzesFolderId
    );
    
    createdForms.push({
      type: 'programming_concepts',
      formId: programmingForm.formId,
      title: "Programming Concepts Quiz",
      questionCount: quizQuestions.programmingConcepts.length,
      totalPoints: quizQuestions.programmingConcepts.reduce((sum, q) => sum + q.points, 0)
    });
    
    console.log(`✅ Created Programming Concepts Quiz: ${programmingForm.formId}`);
    
  } catch (error) {
    console.error("❌ Error creating Programming Concepts Quiz:", error);
  }
  
  // Logic and Control Structures Quiz
  try {
    const logicForm = createFormWithAnswerKey(
      "Logic and Control Structures Quiz",
      "Quiz on if statements, loops, and boolean logic",
      quizQuestions.logicAndControl,
      quizzesFolderId
    );
    
    createdForms.push({
      type: 'logic_control',
      formId: logicForm.formId,
      title: "Logic and Control Structures Quiz",
      questionCount: quizQuestions.logicAndControl.length,
      totalPoints: quizQuestions.logicAndControl.reduce((sum, q) => sum + q.points, 0)
    });
    
    console.log(`✅ Created Logic and Control Quiz: ${logicForm.formId}`);
    
  } catch (error) {
    console.error("❌ Error creating Logic and Control Quiz:", error);
  }
  
  // Functions and Parameters Quiz
  try {
    const functionsForm = createFormWithAnswerKey(
      "Functions and Parameters Quiz",
      "Understanding function definitions, parameters, and return values",
      quizQuestions.functionsAndParameters,
      quizzesFolderId
    );
    
    createdForms.push({
      type: 'functions_parameters',
      formId: functionsForm.formId,
      title: "Functions and Parameters Quiz",
      questionCount: quizQuestions.functionsAndParameters.length,
      totalPoints: quizQuestions.functionsAndParameters.reduce((sum, q) => sum + q.points, 0)
    });
    
    console.log(`✅ Created Functions and Parameters Quiz: ${functionsForm.formId}`);
    
  } catch (error) {
    console.error("❌ Error creating Functions and Parameters Quiz:", error);
  }
  
  console.log(`✅ Created ${createdForms.length} quiz forms with answer keys`);
  return createdForms;
}

/**
 * Create a single form with questions and answer key using Forms API
 */
function createFormWithAnswerKey(title, description, questions, folderId) {
  const token = ScriptApp.getOAuthToken();
  
  // Step 1: Create the form
  const createFormUrl = CONFIG.FORMS_API.baseUrl;
  const createFormPayload = {
    info: {
      title: title,
      description: description
    }
  };
  
  const createFormResponse = UrlFetchApp.fetch(createFormUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(createFormPayload)
  });
  
  const form = JSON.parse(createFormResponse.getContentText());
  
  // Step 2: Convert to quiz
  const batchUpdateUrl = `${CONFIG.FORMS_API.baseUrl}/${form.formId}:batchUpdate`;
  const quizSettingsRequests = [
    {
      updateSettings: {
        settings: {
          quizSettings: {
            isQuiz: true
          }
        },
        updateMask: "quizSettings.isQuiz"
      }
    }
  ];
  
  UrlFetchApp.fetch(batchUpdateUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ requests: quizSettingsRequests })
  });
  
  // Step 3: Add questions with answer keys
  const questionRequests = [];
  
  questions.forEach((question, index) => {
    const location = { index: index };
    
    if (question.type === 'MULTIPLE_CHOICE') {
      const questionItem = {
        title: question.question,
        questionItem: {
          question: {
            required: true,
            choiceQuestion: {
              type: 'RADIO',
              options: question.options.map(option => ({ value: option })),
              shuffle: false
            }
          }
        }
      };
      
      // Add question
      questionRequests.push({
        createItem: {
          item: questionItem,
          location: location
        }
      });
      
      // Add grading (answer key)
      const grading = {
        pointValue: question.points,
        correctAnswers: {
          answers: [{ value: question.options[question.correctAnswer] }]
        },
        whenRight: {
          text: question.feedback
        },
        whenWrong: {
          text: "Incorrect. " + question.feedback
        }
      };
      
      questionRequests.push({
        updateItem: {
          item: {
            questionItem: {
              question: {
                grading: grading
              }
            }
          },
          location: location,
          updateMask: "questionItem.question.grading"
        }
      });
      
    } else if (question.type === 'SHORT_ANSWER') {
      const questionItem = {
        title: question.question,
        questionItem: {
          question: {
            required: true,
            textQuestion: {
              paragraph: false
            }
          }
        }
      };
      
      // Add question
      questionRequests.push({
        createItem: {
          item: questionItem,
          location: location
        }
      });
      
      // Add grading (answer key)
      const grading = {
        pointValue: question.points,
        correctAnswers: {
          answers: [{ value: question.correctAnswer }]
        },
        whenRight: {
          text: question.feedback
        },
        whenWrong: {
          text: "Incorrect. " + question.feedback
        }
      };
      
      questionRequests.push({
        updateItem: {
          item: {
            questionItem: {
              question: {
                grading: grading
              }
            }
          },
          location: location,
          updateMask: "questionItem.question.grading"
        }
      });
    }
  });
  
  // Execute all question requests
  if (questionRequests.length > 0) {
    UrlFetchApp.fetch(batchUpdateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify({ requests: questionRequests })
    });
  }
  
  // Step 4: Move form to folder
  if (folderId) {
    try {
      Drive.Files.update({}, form.formId, null, {
        addParents: folderId,
        removeParents: "root"
      });
    } catch (error) {
      console.log(`Warning: Could not move form to folder: ${error}`);
    }
  }
  
  return {
    formId: form.formId,
    title: title,
    description: description,
    questionCount: questions.length,
    editUrl: form.editUrl,
    publishedUrl: form.publishedUrl
  };
}

/**
 * Create quiz assignments in Google Classroom linked to Forms
 */
function createQuizAssignments(classroomId, quizForms) {
  console.log("Creating quiz assignments in classroom...");
  
  const assignments = CONFIG.QUIZ_ASSIGNMENTS;
  const createdAssignments = [];
  
  assignments.forEach((assignment, index) => {
    try {
      // Find matching form
      const form = quizForms.find(f => 
        f.title.toLowerCase().includes(assignment.title.toLowerCase().split(' ')[0])
      );
      
      if (!form) {
        console.log(`⚠️ No form found for assignment: ${assignment.title}`);
        return;
      }
      
      const dueDate = getDueDate(assignment.dueInDays);
      
      const assignmentData = {
        title: assignment.title,
        description: assignment.description,
        materials: [{
          form: {
            formUrl: `https://docs.google.com/forms/d/${form.formId}/edit`,
            responseUrl: `https://docs.google.com/forms/d/${form.formId}/edit#responses`,
            title: form.title,
            thumbnailUrl: ""
          }
        }],
        workType: "ASSIGNMENT",
        state: "PUBLISHED",
        maxPoints: form.totalPoints,
        dueDate: {
          year: dueDate.getFullYear(),
          month: dueDate.getMonth() + 1,
          day: dueDate.getDate()
        },
        dueTime: {
          hours: 23,
          minutes: 59
        },
        associatedWithDeveloper: true,
        submissionModificationMode: "MODIFIABLE_UNTIL_TURNED_IN"
      };
      
      const createdAssignment = Classroom.Courses.CourseWork.create(assignmentData, classroomId);
      
      console.log(`✅ Created quiz assignment: ${assignment.title} (ID: ${createdAssignment.id})`);
      
      createdAssignments.push({
        ...createdAssignment,
        formId: form.formId,
        questionCount: form.questionCount,
        totalPoints: form.totalPoints
      });
      
      // Add delay to avoid rate limiting
      if (index % 2 === 0 && index > 0) {
        Utilities.sleep(1000);
      }
      
    } catch (error) {
      console.error(`❌ Error creating quiz assignment ${assignment.title}:`, error);
    }
  });
  
  console.log(`✅ Created ${createdAssignments.length} quiz assignments`);
  return createdAssignments;
}

/**
 * Helper function to test Forms API access
 */
function testFormsApi() {
  const token = ScriptApp.getOAuthToken();
  
  try {
    // Test creating a simple form
    const testFormUrl = CONFIG.FORMS_API.baseUrl;
    const testPayload = {
      info: {
        title: "API Test Form",
        description: "Testing Forms API access"
      }
    };
    
    const response = UrlFetchApp.fetch(testFormUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(testPayload)
    });
    
    const result = JSON.parse(response.getContentText());
    console.log("✅ Forms API test successful:", result.formId);
    
    // Clean up test form
    try {
      Drive.Files.remove(result.formId);
      console.log("✅ Test form cleaned up");
    } catch (error) {
      console.log("Warning: Could not delete test form");
    }
    
    return true;
    
  } catch (error) {
    console.error("❌ Forms API test failed:", error);
    return false;
  }
}