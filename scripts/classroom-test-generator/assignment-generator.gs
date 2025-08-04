/**
 * New assignment generator that creates submission-based assignments
 * Location: new-assignment-generator.gs
 */

/**
 * Create assignments where students submit their own work
 */
function createStudentSubmissionAssignments(classroomId) {
  console.log("Creating student submission assignments...");
  
  const assignments = CONFIG.ASSIGNMENTS;
  const createdAssignments = [];
  
  assignments.forEach((assignment, index) => {
    try {
      const dueDate = getDueDate(assignment.dueInDays);
      
      const assignmentData = {
        title: assignment.title,
        description: assignment.description,
        workType: "ASSIGNMENT",
        state: "PUBLISHED",
        maxPoints: assignment.maxPoints,
        dueDate: {
          year: dueDate.getFullYear(),
          month: dueDate.getMonth() + 1,
          day: dueDate.getDate()
        },
        dueTime: {
          hours: 23,
          minutes: 59
        },
        assigneeMode: "ALL_STUDENTS",
        submissionModificationMode: "MODIFIABLE_UNTIL_TURNED_IN"
      };
      
      const createdAssignment = Classroom.Courses.CourseWork.create(assignmentData, classroomId);
      
      console.log(`✅ Created assignment: ${assignment.title} (${assignment.submissionType})`);
      
      createdAssignments.push({
        ...createdAssignment,
        submissionType: assignment.submissionType
      });
      
      // Add delay to avoid rate limiting
      if (index % 3 === 0 && index > 0) {
        Utilities.sleep(1000);
      }
      
    } catch (error) {
      console.error(`❌ Error creating assignment ${assignment.title}:`, error);
    }
  });
  
  console.log(`✅ Created ${createdAssignments.length} student submission assignments`);
  return createdAssignments;
}

/**
 * Create quiz forms with improved error handling
 */
function createImprovedQuizForms() {
  console.log("Creating improved quiz forms with answer keys...");
  
  const quizQuestions = generateQuizQuestions();
  const createdForms = [];
  
  // Multiple Choice Only Quiz
  try {
    const mcForm = createFormWithFixedAnswerKey(
      "Quiz: Python Fundamentals",
      "Multiple choice test covering basic programming concepts",
      quizQuestions.multipleChoiceOnly
    );
    
    createdForms.push({
      type: 'multiple_choice_only',
      formId: mcForm.formId,
      title: "Quiz: Python Fundamentals",
      questionCount: quizQuestions.multipleChoiceOnly.length,
      totalPoints: quizQuestions.multipleChoiceOnly.reduce((sum, q) => sum + q.points, 0)
    });
    
    console.log(`✅ Created Multiple Choice Quiz: ${mcForm.formId}`);
    
  } catch (error) {
    console.error("❌ Error creating Multiple Choice Quiz:", error);
  }
  
  // Mixed Format Quiz with enhanced error logging
  try {
    console.log("🔍 Starting Mixed Format Quiz creation with detailed logging...");
    console.log(`📊 Mixed format questions count: ${quizQuestions.mixedFormat.length}`);
    
    // Log each question for debugging
    quizQuestions.mixedFormat.forEach((q, i) => {
      console.log(`Question ${i+1}: ${q.type} - "${q.question.substring(0, 60)}..."`);
      if (q.correctAnswer !== undefined && q.correctAnswer !== null) {
        if (q.type === 'MULTIPLE_CHOICE') {
          console.log(`  Correct answer index: ${q.correctAnswer} (${q.options ? q.options[q.correctAnswer] : 'undefined'})`);
        } else {
          const answerStr = String(q.correctAnswer);
          console.log(`  Correct answer length: ${answerStr.length} chars`);
          if (answerStr.includes('\n')) {
            console.log(`  ⚠️ Contains newlines: ${answerStr.split('\n').length} lines`);
          }
        }
      } else {
        console.log(`  No correct answer defined`);
      }
    });
    
    const mixedForm = createFormWithFixedAnswerKey(
      "Quiz: Programming Concepts",
      "Mixed format test with multiple choice, short answer, and essay questions",
      quizQuestions.mixedFormat
    );
    
    createdForms.push({
      type: 'mixed_format',
      formId: mixedForm.formId,
      title: "Quiz: Programming Concepts",
      questionCount: quizQuestions.mixedFormat.length,
      totalPoints: quizQuestions.mixedFormat.reduce((sum, q) => sum + q.points, 0)
    });
    
    console.log(`✅ Created Mixed Format Quiz: ${mixedForm.formId}`);
    
  } catch (error) {
    console.error("❌ Error creating Mixed Format Quiz:", error);
    
    // Enhanced error logging
    if (error.message && error.message.includes('500')) {
      console.error("🔍 This is a 500 Internal Server Error from Google Forms API");
      console.error("🔧 Possible causes:");
      console.error("  1. Complex question payload exceeding API limits");
      console.error("  2. Invalid characters in question text or answers");
      console.error("  3. Malformed grading configuration");
      console.error("  4. Rate limiting or temporary API issues");
    }
    
    // Log the specific error details if available
    if (error.toString) {
      console.error("Full error details:", error.toString());
    }
  }
  
  console.log(`✅ Created ${createdForms.length} quiz forms with answer keys`);
  return createdForms;
}

/**
 * Create a form with fixed answer key handling
 */
function createFormWithFixedAnswerKey(title, description, questions) {
  const token = ScriptApp.getOAuthToken();
  
  // Step 1: Create the form
  const createFormUrl = CONFIG.FORMS_API.baseUrl;
  const createFormPayload = {
    info: {
      title: title,           // Form title for respondents
      documentTitle: title    // File name in Google Drive
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
  
  // Step 2: Convert to quiz and add description
  const batchUpdateUrl = `${CONFIG.FORMS_API.baseUrl}/${form.formId}:batchUpdate`;
  const quizSettingsRequests = [
    {
      updateFormInfo: {
        info: {
          description: description
        },
        updateMask: "description"
      }
    },
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
  
  const quizSetupResponse = UrlFetchApp.fetch(batchUpdateUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ requests: quizSettingsRequests }),
    muteHttpExceptions: true
  });
  
  if (quizSetupResponse.getResponseCode() !== 200) {
    console.error(`❌ Failed to setup quiz settings: ${quizSetupResponse.getContentText()}`);
    throw new Error(`Quiz setup failed: ${quizSetupResponse.getResponseCode()}`);
  }
  
  console.log("✅ Quiz settings configured successfully");
  
  // Small delay to ensure quiz settings are applied
  Utilities.sleep(1000);
  
  // Verify form state before adding questions
  console.log("🔍 Verifying form state...");
  const verifyResponse = UrlFetchApp.fetch(`${CONFIG.FORMS_API.baseUrl}/${form.formId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    muteHttpExceptions: true
  });
  
  if (verifyResponse.getResponseCode() === 200) {
    const formData = JSON.parse(verifyResponse.getContentText());
    console.log(`✅ Form verified: ${formData.info.title}`);
    console.log(`📊 Current items count: ${formData.items ? formData.items.length : 0}`);
    console.log(`🧮 Quiz mode: ${formData.settings?.quizSettings?.isQuiz ? 'enabled' : 'disabled'}`);
  } else {
    console.warn(`⚠️ Could not verify form state: ${verifyResponse.getContentText()}`);
  }
  
  // Step 3: Create questions with grading included (correct Forms API usage)
  console.log(`Adding ${questions.length} questions with integrated grading...`);
  
  const createRequests = [];
  
  questions.forEach((question, index) => {
    const location = { index: index };
    
    if (question.type === 'MULTIPLE_CHOICE') {
      // Create MC question WITH grading - following exact API structure
      const questionItem = {
        title: question.question,
        questionItem: {
          question: {
            required: true,
            choiceQuestion: {
              type: 'RADIO',
              options: question.options.map(option => ({ value: option })),
              shuffle: false
            },
            grading: {
              pointValue: question.points,
              correctAnswers: {
                answers: [{ value: question.options[question.correctAnswer] }]
              }
            }
          }
        }
      };
      
      // Add feedback if present - proper structure
      if (question.feedback) {
        questionItem.questionItem.question.grading.whenRight = { text: question.feedback };
        questionItem.questionItem.question.grading.whenWrong = { text: "Incorrect. " + question.feedback };
      }
      
      createRequests.push({
        createItem: {
          item: questionItem,
          location: { index: index }
        }
      });
      
    } else {
      // Create text questions - following exact API structure
      const questionItem = {
        title: question.question,
        questionItem: {
          question: {
            required: true,
            textQuestion: {
              paragraph: question.type === 'PARAGRAPH'
            },
            grading: {
              pointValue: question.points
            }
          }
        }
      };
      
      // Add correctAnswers only for SHORT_ANSWER (not PARAGRAPH)
      if (question.type === 'SHORT_ANSWER' && question.correctAnswer) {
        questionItem.questionItem.question.grading.correctAnswers = {
          answers: [{ value: question.correctAnswer }]
        };
      }
      
      // Add general feedback for manual grading guidance
      if (question.feedback) {
        questionItem.questionItem.question.grading.generalFeedback = { text: question.feedback };
      }
      
      createRequests.push({
        createItem: {
          item: questionItem,
          location: { index: index }
        }
      });
    }
  });
  
  // Validate requests before sending
  console.log("🔍 Validating question structure...");
  createRequests.forEach((req, i) => {
    const item = req.createItem.item;
    const location = req.createItem.location;
    
    // Validate location index
    if (typeof location.index !== 'number' || location.index < 0) {
      throw new Error(`Invalid location index for question ${i + 1}: ${location.index}`);
    }
    
    // Validate question structure
    if (!item.title || !item.questionItem || !item.questionItem.question) {
      throw new Error(`Invalid question structure for question ${i + 1}`);
    }
    
    // Validate grading structure if present
    const grading = item.questionItem.question.grading;
    if (grading && typeof grading.pointValue !== 'number') {
      throw new Error(`Invalid point value for question ${i + 1}: ${grading.pointValue}`);
    }
    
    // Check for problematic characters
    if (item.title.includes('\n') || item.title.includes('\r')) {
      console.warn(`⚠️ Question ${i + 1} title contains newline characters, removing...`);
      item.title = item.title.replace(/[\n\r]/g, ' ');
    }
  });
  
  console.log("✅ Question validation passed");
  
  // Send all creation requests with improved error handling
  const batchSize = title.includes("Mixed") ? 1 : 5; // Even smaller batches for mixed format
  let successCount = 0;
  
  for (let i = 0; i < createRequests.length; i += batchSize) {
    const batch = createRequests.slice(i, i + batchSize);
    const batchNum = Math.floor(i/batchSize) + 1;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount <= maxRetries) {
      try {
        if (retryCount > 0) {
          console.log(`🔄 Retry ${retryCount}/${maxRetries} for batch ${batchNum}...`);
          Utilities.sleep(2000 * retryCount); // Exponential backoff
        } else {
          console.log(`Sending batch ${batchNum} with ${batch.length} questions...`);
        }
        
        const response = UrlFetchApp.fetch(batchUpdateUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          payload: JSON.stringify({ requests: batch }),
          muteHttpExceptions: true
        });
        
        const responseCode = response.getResponseCode();
        const responseText = response.getContentText();
        
        if (responseCode === 200) {
          successCount += batch.length;
          console.log(`✅ Batch ${batchNum} completed: Created ${batch.length} questions`);
          break; // Success, exit retry loop
          
        } else if (responseCode === 500 && retryCount < maxRetries) {
          console.log(`⚠️ 500 error on batch ${batchNum}, will retry...`);
          retryCount++;
          continue; // Retry the batch
          
        } else {
          // Handle other errors or max retries exceeded
          console.error(`❌ Batch ${batchNum} failed with HTTP ${responseCode} after ${retryCount} retries`);
          console.error(`📄 Full response: ${responseText}`);
          
          // Try to parse the error response for more details
          try {
            const errorResponse = JSON.parse(responseText);
            if (errorResponse.error) {
              console.error(`🔍 Error code: ${errorResponse.error.code}`);
              console.error(`🔍 Error message: ${errorResponse.error.message}`);
              console.error(`🔍 Error status: ${errorResponse.error.status}`);
              
              if (errorResponse.error.details) {
                console.error(`🔍 Error details:`, JSON.stringify(errorResponse.error.details, null, 2));
              }
            }
          } catch (parseError) {
            console.error("Could not parse error response as JSON");
          }
          
          // For debugging, try individual questions if batch failed
          if (batch.length > 1 && responseCode === 500) {
            console.log("🔧 Attempting to create questions individually...");
            let individualSuccesses = 0;
            
            for (let j = 0; j < batch.length; j++) {
              try {
                const singleRequest = [batch[j]];
                const singleResponse = UrlFetchApp.fetch(batchUpdateUrl, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                  },
                  payload: JSON.stringify({ requests: singleRequest }),
                  muteHttpExceptions: true
                });
                
                if (singleResponse.getResponseCode() === 200) {
                  individualSuccesses++;
                  console.log(`✅ Individual question ${i + j + 1} created successfully`);
                } else {
                  const q = questions[i + j];
                  console.error(`❌ Individual question ${i + j + 1} failed: ${q.type} - "${q.question.substring(0, 50)}..."`);
                  console.error(`   Response: ${singleResponse.getContentText()}`);
                }
                
                Utilities.sleep(200); // Small delay between individual requests
              } catch (singleError) {
                console.error(`❌ Error creating individual question ${i + j + 1}:`, singleError);
              }
            }
            
            successCount += individualSuccesses;
            console.log(`📊 Individual creation results: ${individualSuccesses}/${batch.length} questions created`);
            break; // Exit retry loop after individual attempts
          }
          
          throw new Error(`Failed to create questions in batch ${batchNum}: HTTP ${responseCode} - ${responseText}`);
        }
        
      } catch (error) {
        if (retryCount < maxRetries && error.message.includes('500')) {
          console.log(`⚠️ Network error on batch ${batchNum}, will retry...`);
          retryCount++;
          continue;
        } else {
          console.error(`❌ Final error in batch ${batchNum}:`, error);
          throw error;
        }
      }
    }
    
    // Longer delay between batches for mixed format
    if (i + batchSize < createRequests.length) {
      const delay = title.includes("Mixed") ? 1000 : 500;
      Utilities.sleep(delay);
    }
  }
  
  console.log(`✅ Successfully created all ${successCount} questions with integrated grading`);
  
  // Forms will be organized automatically by Google Classroom
  return {
    formId: form.formId,
    title: title,
    description: description,
    questionCount: questions.length,
    publishedUrl: `https://docs.google.com/forms/d/${form.formId}/viewform`
  };
}

/**
 * Create quiz assignments in classroom with form links (not attachments)
 */
function createQuizAssignmentsWithLinks(classroomId, quizForms) {
  console.log("Creating quiz assignments with form links...");
  
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
      const totalPoints = assignment.questionCount * assignment.pointsPerQuestion;
      
      const assignmentData = {
        title: assignment.title,
        description: assignment.description + `\n\n📋 **Take the quiz here:** ${form.publishedUrl}\n\nThis quiz has ${assignment.questionCount} questions worth ${assignment.pointsPerQuestion} points each.\n\nTotal Points: ${totalPoints}`,
        workType: "ASSIGNMENT",
        state: "PUBLISHED",
        maxPoints: totalPoints,
        dueDate: {
          year: dueDate.getFullYear(),
          month: dueDate.getMonth() + 1,
          day: dueDate.getDate()
        },
        dueTime: {
          hours: 23,
          minutes: 59
        },
        submissionModificationMode: "MODIFIABLE_UNTIL_TURNED_IN"
      };
      
      const createdAssignment = Classroom.Courses.CourseWork.create(assignmentData, classroomId);
      
      console.log(`✅ Created quiz assignment: ${assignment.title} (ID: ${createdAssignment.id})`);
      
      createdAssignments.push({
        ...createdAssignment,
        formId: form.formId,
        formUrl: form.publishedUrl,
        questionCount: assignment.questionCount,
        totalPoints: totalPoints
      });
      
      // Add delay to avoid rate limiting
      if (index % 2 === 0 && index > 0) {
        Utilities.sleep(1000);
      }
      
    } catch (error) {
      console.error(`❌ Error creating quiz assignment ${assignment.title}:`, error);
    }
  });
  
  console.log(`✅ Created ${createdAssignments.length} quiz assignments with form links`);
  return createdAssignments;
}