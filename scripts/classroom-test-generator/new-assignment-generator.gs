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
  
  // Mixed Format Quiz
  try {
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
  
  UrlFetchApp.fetch(batchUpdateUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify({ requests: quizSettingsRequests })
  });
  
  // Step 3: Create questions with grading included (correct Forms API usage)
  console.log(`Adding ${questions.length} questions with integrated grading...`);
  
  const createRequests = [];
  
  questions.forEach((question, index) => {
    const location = { index: index };
    
    if (question.type === 'MULTIPLE_CHOICE') {
      // Create MC question WITH grading in one request
      const questionItem = {
        title: question.question,
        questionItem: {
          question: {
            required: true,
            grading: {
              pointValue: question.points,
              correctAnswers: {
                answers: [{ value: question.options[question.correctAnswer] }]
              }
            },
            choiceQuestion: {
              type: 'RADIO',
              options: question.options.map(option => ({ value: option })),
              shuffle: false
            }
          }
        }
      };
      
      // Add feedback if present
      if (question.feedback) {
        questionItem.questionItem.question.grading.whenRight = { text: question.feedback };
        questionItem.questionItem.question.grading.whenWrong = { text: "Incorrect. " + question.feedback };
      }
      
      createRequests.push({
        createItem: {
          item: questionItem,
          location: location
        }
      });
      
    } else {
      // Create text questions WITH grading and generalFeedback
      const questionItem = {
        title: question.question,
        questionItem: {
          question: {
            required: true,
            grading: {
              pointValue: question.points
            },
            textQuestion: {
              paragraph: question.type === 'PARAGRAPH'
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
      
      // Add correct answer as general feedback for AI grading
      if (question.correctAnswer) {
        questionItem.questionItem.question.grading.generalFeedback = { text: question.correctAnswer };
      }
      
      createRequests.push({
        createItem: {
          item: questionItem,
          location: location
        }
      });
    }
  });
  
  // Send all creation requests in batches
  const batchSize = 10;
  let successCount = 0;
  
  for (let i = 0; i < createRequests.length; i += batchSize) {
    const batch = createRequests.slice(i, i + batchSize);
    const batchNum = Math.floor(i/batchSize) + 1;
    
    try {
      console.log(`Sending batch ${batchNum} with ${batch.length} questions...`);
      
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
      if (responseCode !== 200) {
        console.error(`Batch ${batchNum} failed (${responseCode}):`, response.getContentText());
        
        // Log the actual request for debugging
        console.log("Failed batch contents:");
        batch.forEach((req, idx) => {
          const q = questions[i + idx];
          console.log(`  Question ${i + idx + 1}: ${q.type} - "${q.question.substring(0, 50)}..."`);
        });
        
        throw new Error(`Failed to create questions in batch ${batchNum}`);
      }
      
      successCount += batch.length;
      console.log(`✅ Batch ${batchNum} completed: Created ${batch.length} questions`);
      
      // Small delay between batches
      if (i + batchSize < createRequests.length) {
        Utilities.sleep(500);
      }
      
    } catch (error) {
      console.error(`Error in batch ${batchNum}:`, error);
      throw error;
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