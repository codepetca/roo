/**
 * Complete AppScript template for board account auto-grading system
 * Location: functions/src/services/appscript-template.ts
 */

/**
 * Roo Auto-Grading System - Board Account Apps Script (Dynamic Version)
 *
 * This script runs in your board Google account and:
 * 1. Finds Google Sheets with "(responses)" pattern for Google Forms submissions
 * 2. Extracts all student responses from these sheets
 * 3. Writes all data to a single "Submissions" tab in the specified Google Sheets
 *
 * Setup Instructions:
 * 1. Deploy this script as a web app with "Execute as: Me" and "Access: Anyone"
 * 2. Get the web app URL from deployment
 * 3. Call the web app URL with your spreadsheet ID as parameter:
 *    https://script.google.com/...exec?spreadsheetId=YOUR_SPREADSHEET_ID
 * 4. Ensure your board account has edit access to the target spreadsheet
 *
 * For automatic processing, you can also set up time-based triggers that will
 * use the last provided spreadsheet ID.
 */

/**
 * Get spreadsheet ID from URL parameters when script is run as web app
 * Usage: https://script.google.com/...exec?spreadsheetId=YOUR_SHEET_ID
 */
function getSpreadsheetIdFromUrl() {
  try {
    // Try to get from URL parameters (when run as web app)
    var params = getUrlParameters();
    if (params && params.spreadsheetId) {
      return params.spreadsheetId;
    }

    // Fallback: try to get from script properties (can be set manually)
    var properties = PropertiesService.getScriptProperties();
    var storedId = properties.getProperty('SPREADSHEET_ID');
    if (storedId) {
      return storedId;
    }

    return null;
  } catch (error) {
    console.error("Error getting spreadsheet ID:", error);
    return null;
  }
}

/**
 * Helper function to parse URL parameters
 */
function getUrlParameters() {
  try {
    // This works when the script is called via doGet/doPost
    // For time-based triggers, parameters won't be available
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Web app entry point - allows passing spreadsheet ID as URL parameter
 */
function doGet(e) {
  var spreadsheetId = e.parameter.spreadsheetId;

  if (!spreadsheetId) {
    return ContentService
      .createTextOutput("Error: spreadsheetId parameter is required. Usage: ?spreadsheetId=YOUR_SHEET_ID")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  // Store the spreadsheet ID for use by other functions
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);

  // Run the main processing function
  try {
    processAllSubmissions();
    return ContentService
      .createTextOutput("Success: Processed all submissions and wrote to spreadsheet")
      .setMimeType(ContentService.MimeType.TEXT);
  } catch (error) {
    console.error("Error in doGet:", error);
    return ContentService
      .createTextOutput("Error processing submissions: " + error.toString())
      .setMimeType(ContentService.MimeType.TEXT);
  }
}


/**
   * Test function to simulate doGet with parameters
   */
function testDoGet() {
  // Simulate the parameter object that would come from URL
  var mockEvent = {
    parameter: {
      spreadsheetId: "1Fgjm8Dz_LsjU36Wh8Va0nwo1y4aDWgm6hliW-01Q7_g" // Use your test spreadsheet ID
    }
  };

  // Call doGet with the mock event
  var result = doGet(mockEvent);

  // Log the result
  console.log("Test result:", result.getContent());

  return result;
}


// Configuration - Update these values
var CONFIG = {
  // Dynamic spreadsheet ID - will be retrieved from URL parameters or script properties
  get PERSONAL_SPREADSHEET_ID() {
    var id = getSpreadsheetIdFromUrl();
    if (!id) {
      throw new Error("Spreadsheet ID not provided. Please run as web app with ?spreadsheetId=YOUR_SHEET_ID parameter");
    }
    return id;
  },

  // Auto-detect classroom folders from this parent folder
  CLASSROOMS_PARENT_FOLDER_NAME: "classrooms",

  // Only process classroom folders ending with this suffix
  ROO_SUFFIX: "-roo",

  // Folders to exclude from processing (in addition to suffix filtering)
  EXCLUDED_FOLDER_NAMES: ["_old_classrooms", "staff", "clubs"],
};

/**
 * Main orchestrator function - called by scheduled trigger
 */
function processAllSubmissions() {
  console.log("Starting complete submission processing...");

  try {
    // Validate spreadsheet access before processing
    try {
      var spreadsheetId = CONFIG.PERSONAL_SPREADSHEET_ID;
      console.log("Using spreadsheet ID: " + spreadsheetId);
    } catch (configError) {
      console.error("Configuration error:", configError);
      throw new Error("Cannot proceed without valid spreadsheet ID: " + configError.message);
    }

    // Process all submission types
    var allData = processAllSubmissionTypes();

    if (allData.length === 0) {
      console.log("No submissions found to process");
      return;
    }

    // Write to personal sheets (single tab)
    writeToPersonalSheets(allData);

    console.log("Successfully processed " + allData.length + " total submissions");
  } catch (error) {
    console.error("Error in processAllSubmissions:", error);
    throw error; // Re-throw for web app error handling
  }
}

/**
 * Process only Google Forms response sheets
 */
function processAllSubmissionTypes() {
  console.log("Processing Google Forms response sheets...");

  var allSubmissions = [];

  // Auto-detect classroom folders
  var classroomFolders = getActiveClassroomFolders();

  classroomFolders.forEach(function (classroomFolder) {
    try {
      var courseId = classroomFolder.getName().replace(CONFIG.ROO_SUFFIX, "");
      console.log("Processing classroom: " + courseId);

      // Process ONLY Google Sheets with "(responses)" pattern
      var responseSheetData = processResponseSheets(classroomFolder, courseId);
      allSubmissions.push.apply(allSubmissions, responseSheetData.submissions);
    } catch (error) {
      console.error("Error processing classroom " + classroomFolder.getName() + ":", error);
    }
  });

  console.log("Processed " + allSubmissions.length + " total submissions from response sheets");
  return allSubmissions;
}

/**
 * Process Google Sheets with "(responses)" pattern - search more thoroughly
 */
function processResponseSheets(classroomFolder, courseId) {
  var result = {
    submissions: [],
    answerKeys: [],
  };

  // Search in main folder
  console.log("Searching for response sheets in: " + classroomFolder.getName());
  var mainFolderData = findResponseSheetsInFolder(classroomFolder, courseId);
  result.submissions.push.apply(result.submissions, mainFolderData.submissions);
  result.answerKeys.push.apply(result.answerKeys, mainFolderData.answerKeys);

  // Also search in subfolders (response sheets might be in subfolders)
  var subfolders = classroomFolder.getFolders();
  while (subfolders.hasNext()) {
    var subfolder = subfolders.next();
    console.log("Searching subfolder: " + subfolder.getName());
    var subfolderData = findResponseSheetsInFolder(subfolder, courseId);
    result.submissions.push.apply(result.submissions, subfolderData.submissions);
    result.answerKeys.push.apply(result.answerKeys, subfolderData.answerKeys);
  }

  return result;
}

/**
 * Find response sheets by checking Google Forms and their destinations
 */
function findResponseSheetsInFolder(folder, courseId) {
  var submissions = [];
  var answerKeys = [];
  var files = folder.getFiles();

  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName();

    try {
      // Check if it's a Google Form by trying to access it as a form
      var form = FormApp.openById(file.getId());
      console.log("Found Google Form: " + fileName);

      // Extract answer key if it's a quiz
      if (form.isQuiz()) {
        console.log("  Form is a quiz - extracting answer key");
        var answerKey = extractQuizAnswerKey(form, file.getId(), fileName, courseId);
        if (answerKey) {
          answerKeys.push(answerKey);
        }
      }

      var destinationId = form.getDestinationId();

      if (destinationId) {
        console.log("  Form has response sheet destination: " + destinationId);

        try {
          var assignmentTitle = fileName.trim();
          var sheetSubmissions = extractSubmissionsFromResponseSheet(
            destinationId,
            assignmentTitle,
            courseId,
            file.getDateCreated(),
            fileName + " (Responses)",
            form.isQuiz(),
            file.getId()
          );
          submissions.push.apply(submissions, sheetSubmissions);
          console.log("✓ Extracted " + sheetSubmissions.length + " submissions from form: " + fileName);
        } catch (sheetError) {
          console.error("Error processing response sheet for form " + fileName + ":", sheetError);
        }
      } else {
        console.log("  Form " + fileName + " has no response sheet configured");
      }
    } catch (notAFormError) {
      // Not a Google Form, check if it's a response sheet
      if (fileName.toLowerCase().includes("(responses)")) {
        try {
          var contentType = file.getBlob().getContentType();
          if (contentType === "application/vnd.google-apps.spreadsheet") {
            console.log("✓ Found standalone response sheet: " + fileName);

            var assignmentTitle = fileName.replace(/\s*\(responses\)\s*$/i, "").trim();

            try {
              var sheetSubmissions = extractSubmissionsFromResponseSheet(
                file.getId(),
                assignmentTitle,
                courseId,
                file.getDateCreated(),
                fileName
              );
              submissions.push.apply(submissions, sheetSubmissions);
              console.log("✓ Extracted " + sheetSubmissions.length + " submissions from standalone sheet: " + fileName);
            } catch (sheetError) {
              console.error("Error processing response sheet " + fileName + ":", sheetError);
            }
          } else {
            console.log("✗ Skipping PDF export: " + fileName + " (" + contentType + ")");
          }
        } catch (contentError) {
          console.log("✗ Could not determine content type for: " + fileName);
        }
      }
    }
  }

  // Write answer keys to personal sheets if any were found
  if (answerKeys.length > 0) {
    writeAnswerKeysToSheets(answerKeys);
  }

  return {
    submissions: submissions,
    answerKeys: answerKeys,
  };
}

/**
 * Extract answer key from a Google Form quiz
 */
function extractQuizAnswerKey(form, formId, formTitle, courseId) {
  var answerKeyData = {
    formId: formId,
    assignmentTitle: formTitle,
    courseId: courseId,
    totalPoints: 0,
    questions: [],
  };

  try {
    var items = form.getItems();
    var questionCounter = 0;

    items.forEach(function (item, index) {
      var questionType = item.getType();

      // Skip non-question items
      if (
        questionType === FormApp.ItemType.PAGE_BREAK ||
        questionType === FormApp.ItemType.SECTION_HEADER ||
        questionType === FormApp.ItemType.IMAGE ||
        questionType === FormApp.ItemType.VIDEO
      ) {
        return; // Skip this item
      }

      // Skip items without titles (like name/email fields)
      var questionTitle = item.getTitle();
      if (!questionTitle || questionTitle.trim() === "") {
        return;
      }

      // Skip name and email fields
      var titleLower = questionTitle.toLowerCase();
      if (
        titleLower.includes("first name") ||
        titleLower.includes("last name") ||
        titleLower.includes("email") ||
        titleLower === "name"
      ) {
        return;
      }

      questionCounter++;
      var questionNumber = questionCounter;
      var points = 0;
      var correctAnswer = "";
      var answerExplanation = "";

      // Try to get points (might not be available for all question types)
      try {
        if (item.asMultipleChoiceItem) {
          points = item.asMultipleChoiceItem().getPoints() || 0;
        } else if (item.asCheckboxItem) {
          points = item.asCheckboxItem().getPoints() || 0;
        } else if (item.asTextItem) {
          points = item.asTextItem().getPoints() || 0;
        } else if (item.asParagraphTextItem) {
          points = item.asParagraphTextItem().getPoints() || 0;
        } else if (item.asScaleItem) {
          points = item.asScaleItem().getPoints() || 0;
        } else if (item.asGridItem) {
          points = item.asGridItem().getPoints() || 0;
        }
      } catch (e) {
        // Points might not be available
        points = 0;
      }

      // Extract answer based on question type
      if (questionType === FormApp.ItemType.MULTIPLE_CHOICE) {
        var mcItem = item.asMultipleChoiceItem();
        var choices = mcItem.getChoices();
        var correctChoice = choices.find(function (choice) { return choice.isCorrectAnswer(); });
        if (correctChoice) {
          correctAnswer = correctChoice.getValue();
          // Get feedback for correct answer if available
          try {
            var feedback = correctChoice.getFeedback();
            if (feedback && feedback.getText) {
              answerExplanation = feedback.getText();
            }
          } catch (feedbackError) {
            // Feedback might not be available for this choice
          }
        }
      } else if (questionType === FormApp.ItemType.CHECKBOX) {
        var cbItem = item.asCheckboxItem();
        var choices = cbItem.getChoices();
        var correctChoices = choices.filter(function (choice) { return choice.isCorrectAnswer(); });
        correctAnswer = correctChoices.map(function (c) { return c.getValue(); }).join("; ");
      } else if (questionType === FormApp.ItemType.TEXT) {
        // For text questions, we can't get the exact answer
        correctAnswer = "[Short answer - AI grading]";
      } else if (questionType === FormApp.ItemType.PARAGRAPH_TEXT) {
        correctAnswer = "[Long answer/Code - AI grading]";
      } else if (questionType === FormApp.ItemType.SCALE) {
        // For scale questions
        correctAnswer = "[Scale question]";
      } else if (questionType === FormApp.ItemType.GRID) {
        // For grid questions
        correctAnswer = "[Grid question]";
      } else {
        // Other question types
        correctAnswer = "[" + questionType + " - check manually]";
      }

      answerKeyData.totalPoints += points;
      answerKeyData.questions.push({
        questionNumber: questionNumber,
        questionText: questionTitle,
        questionType: questionType.toString(),
        points: points,
        correctAnswer: correctAnswer,
        answerExplanation: answerExplanation,
        gradingStrictness: "generous", // Default for all questions
      });

      console.log("    Q" + questionNumber + ": " + points + " points - " + questionType);
    });

    return answerKeyData;
  } catch (error) {
    console.error("Error extracting answer key from form " + formTitle + ":", error);
    return null;
  }
}

/**
 * Extract submissions from a Google Sheets response file
 */
function extractSubmissionsFromResponseSheet(
  fileId,
  assignmentTitle,
  courseId,
  createdDate,
  fileName,
  isQuiz,
  formId
) {
  isQuiz = isQuiz || false;
  formId = formId || null;
  var submissions = [];

  try {
    var spreadsheet = SpreadsheetApp.openById(fileId);
    var sheet = spreadsheet.getActiveSheet();
    var data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      console.log("Response sheet appears to be empty or has no data rows");
      return submissions;
    }

    // First row should be headers
    var headers = data[0];
    console.log("Response sheet headers: " + headers.join(", "));

    // Process each response row (skip header)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];

      try {
        // Extract basic info
        var timestamp = row[0] || new Date();
        var studentEmail = "";
        var studentName = "";

        // Try to intelligently identify email and name fields
        var firstName = "";
        var lastName = "";
        var fullName = "";

        for (var j = 0; j < headers.length; j++) {
          var header = headers[j].toLowerCase().trim();
          var value = row[j] || "";

          // Email detection - fairly reliable patterns
          if (
            header.includes("email") ||
            header.includes("e-mail") ||
            header.includes("address") ||
            header === "email"
          ) {
            studentEmail = value;
          }

          // Name detection - try various patterns
          // First name variations
          if (
            header === "first name" ||
            header === "firstname" ||
            header === "first" ||
            header === "fname" ||
            header === "given name"
          ) {
            firstName = value;
          }
          // Last name variations
          else if (
            header === "last name" ||
            header === "lastname" ||
            header === "last" ||
            header === "lname" ||
            header === "surname" ||
            header === "family name"
          ) {
            lastName = value;
          }
          // Full name variations
          else if (
            (header === "name" ||
              header === "full name" ||
              header === "fullname" ||
              header === "student name" ||
              header === "your name") &&
            !header.includes("email")
          ) {
            fullName = value;
          }
        }

        // Build student name from available parts
        if (firstName && lastName) {
          studentName = (firstName + " " + lastName).trim();
        } else if (fullName) {
          studentName = fullName;
        } else if (firstName) {
          studentName = firstName;
        } else if (lastName) {
          studentName = lastName;
        }

        // Combine ALL response columns as submission content (except timestamp)
        var contentParts = [];
        for (var j = 1; j < row.length; j++) {
          // Skip j=0 (timestamp)
          var value = row[j];

          if (value && value.toString().trim()) {
            contentParts.push(headers[j] + ": " + value);
          }
        }

        // If we couldn't find a name, try to extract from email
        if (!firstName && !lastName && !fullName && studentEmail) {
          var emailName = getStudentName(studentEmail);
          if (emailName) {
            firstName = emailName;
          }
        }

        var submission = {
          submissionId: "sheet_" + fileId + "_" + i,
          assignmentTitle: assignmentTitle,
          courseId: courseId,
          studentFirstName: firstName || "Unknown",
          studentLastName: lastName || "",
          studentEmail: studentEmail || ("student" + i + "@unknown.com"),
          studentWork: contentParts.join("\n\n"),
          submissionDate: new Date(timestamp).toISOString(),
          submissionType: "forms",
          sourceFileId: fileId,
          sourceFileName: fileName,
          currentGrade: "", // Empty = needs grading
          gradingStatus: "pending",
          maxPoints: 100, // Default - will be updated if quiz
          assignmentDescription: "Google Forms responses: " + assignmentTitle,
          lastProcessed: new Date().toISOString(),
          isQuiz: isQuiz,
          formId: formId || fileId,
        };

        submissions.push(submission);
      } catch (rowError) {
        console.error("Error processing row " + (i + 1) + " in response sheet:", rowError);
      }
    }
  } catch (error) {
    console.error("Error reading response sheet " + fileId + ":", error);
  }

  return submissions;
}

/**
 * Validate that the spreadsheet is accessible
 */
function validateSpreadsheetAccess(spreadsheetId) {
  try {
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    // Try to get the name to verify access
    var name = spreadsheet.getName();
    console.log("✓ Successfully validated access to spreadsheet: " + name);
    return true;
  } catch (error) {
    console.error("✗ Cannot access spreadsheet with ID: " + spreadsheetId);
    console.error("Error details:", error);
    throw new Error("Spreadsheet access failed: " + error.toString() + ". Please ensure the spreadsheet exists and you have edit permissions.");
  }
}

/**
 * Write all submissions to single "Submissions" tab with rich metadata - OPTIMIZED VERSION
 */
function writeToPersonalSheets(submissions) {
  console.log("Writing to personal Google Sheets...");

  try {
    var spreadsheetId = CONFIG.PERSONAL_SPREADSHEET_ID;
    validateSpreadsheetAccess(spreadsheetId);
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);

    var sheet = spreadsheet.getSheetByName("Submissions");

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet("Submissions");
      console.log('Created new "Submissions" sheet');
    }

    // Clear existing data
    sheet.clear();

    // Rich headers for teacher frontend
    var headers = [
      "Submission ID", // A - Unique identifier
      "Assignment Title", // B - What assignment is this
      "Course ID", // C - Which class
      "First Name", // D - Student first name
      "Last Name", // E - Student last name
      "Email", // F - Student contact
      "Submission Text", // G - The actual content
      "Submission Date", // H - When submitted
      "Current Grade", // I - Grade (empty = needs grading)
      "Grading Status", // J - pending/graded/reviewed
      "Max Points", // K - Total possible points
      "Source Sheet Name", // L - Original response sheet name
      "Assignment Description", // M - Context about assignment
      "Last Processed", // N - When we last updated this
      "Source File ID", // O - For linking back to original
      "Is Quiz", // P - Whether this is a quiz with answer key
      "Form ID", // Q - Form ID for quiz answer key lookup
    ];

    // Pre-process all data and collect formatting ranges
    var pendingRanges = [];
    var gradedRanges = [];
    var allData = [headers]; // Start with headers
    
    if (submissions.length > 0) {
      // Process all rows and collect formatting info
      submissions.forEach(function(s, index) {
        var rowData = [
          s.submissionId,
          s.assignmentTitle,
          s.courseId,
          s.studentFirstName,
          s.studentLastName,
          s.studentEmail,
          s.studentWork,
          s.submissionDate,
          s.currentGrade,
          s.gradingStatus,
          s.maxPoints,
          s.sourceFileName,
          s.assignmentDescription,
          s.lastProcessed,
          s.sourceFileId,
          s.isQuiz || false,
          s.formId || "",
        ];
        
        allData.push(rowData);
        
        // Collect cells that need formatting (row index + 2 because of header)
        var rowNum = index + 2;
        if (s.gradingStatus === "pending") {
          pendingRanges.push("J" + rowNum); // Column J for grading status
        } else if (s.gradingStatus === "graded") {
          gradedRanges.push("J" + rowNum);
        }
      });
    }

    // Single write operation for all data
    if (allData.length > 1) { // More than just headers
      sheet.getRange(1, 1, allData.length, headers.length).setValues(allData);
    } else {
      // Just write headers if no data
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Batch formatting operations
    
    // Format headers in one operation
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold")
              .setBackground("#4285f4")
              .setFontColor("white");

    // Apply conditional formatting in batch
    if (pendingRanges.length > 0) {
      sheet.getRangeList(pendingRanges).setBackground("#ffcccc"); // Light red
    }
    if (gradedRanges.length > 0) {
      sheet.getRangeList(gradedRanges).setBackground("#ccffcc"); // Light green
    }

    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);

    // Freeze header row
    sheet.setFrozenRows(1);

    console.log("Successfully wrote " + submissions.length + " submissions to Submissions sheet");
  } catch (error) {
    console.error("Error writing to personal sheets:", error);
    throw error;
  }
}

/**
 * Write answer keys to personal sheets - OPTIMIZED VERSION
 */
function writeAnswerKeysToSheets(answerKeys) {
  console.log("Writing answer keys to personal Google Sheets...");

  try {
    var spreadsheetId = CONFIG.PERSONAL_SPREADSHEET_ID;
    validateSpreadsheetAccess(spreadsheetId);
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);

    var sheet = spreadsheet.getSheetByName("Answer Keys");

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet("Answer Keys");
      console.log('Created new "Answer Keys" sheet');
    }

    // Clear existing data
    sheet.clear();

    // Headers for answer keys
    var headers = [
      "Form ID",
      "Assignment Title",
      "Course ID",
      "Question Number",
      "Question Text",
      "Question Type",
      "Points",
      "Correct Answer",
      "Answer Explanation",
      "Grading Strictness",
    ];

    // Pre-process all data
    var allData = [headers]; // Start with headers
    var summaryData = []; // Collect summary rows
    
    // Flatten answer keys into rows
    answerKeys.forEach(function (answerKey) {
      answerKey.questions.forEach(function (question) {
        allData.push([
          answerKey.formId,
          answerKey.assignmentTitle,
          answerKey.courseId,
          question.questionNumber,
          question.questionText,
          question.questionType,
          question.points,
          question.correctAnswer,
          question.answerExplanation || "",
          question.gradingStrictness,
        ]);
      });
      
      // Collect summary info for later
      summaryData.push({
        title: answerKey.assignmentTitle,
        totalPoints: answerKey.totalPoints
      });
    });

    // Single write operation for all data
    if (allData.length > 1) { // More than just headers
      sheet.getRange(1, 1, allData.length, headers.length).setValues(allData);
      
      // Batch write summary rows
      if (summaryData.length > 0) {
        var summaryStartRow = allData.length + 2; // Leave a blank row
        var summaryValues = summaryData.map(function(summary) {
          return ["Total points for " + summary.title + ": " + summary.totalPoints];
        });
        
        // Write all summaries in one operation
        sheet.getRange(summaryStartRow, 1, summaryValues.length, 1).setValues(summaryValues);
      }
    } else {
      // Just write headers if no data
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }

    // Batch formatting operations
    
    // Format headers in one operation
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold")
              .setBackground("#4285f4")
              .setFontColor("white");

    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);

    // Freeze header row
    sheet.setFrozenRows(1);

    console.log("Successfully wrote " + (allData.length - 1) + " answer key questions to Answer Keys sheet");
  } catch (error) {
    console.error("Error writing answer keys to sheets:", error);
    throw error;
  }
}

/**
 * Clear existing data from personal sheets
 */
function clearPersonalSheets() {
  console.log("Clearing existing data from personal sheets...");

  try {
    var spreadsheetId = CONFIG.PERSONAL_SPREADSHEET_ID;
    validateSpreadsheetAccess(spreadsheetId);
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var submissionsSheet = spreadsheet.getSheetByName("Submissions");
    var answerKeysSheet = spreadsheet.getSheetByName("Answer Keys");

    if (submissionsSheet) {
      submissionsSheet.clear();
    }
    if (answerKeysSheet) {
      answerKeysSheet.clear();
    }
  } catch (error) {
    console.error("Error clearing sheets:", error);
  }
}

/**
 * Set up automated triggers (requires spreadsheet ID to be set first)
 */
function setupTriggers() {
  try {
    // Verify we have a valid spreadsheet ID before setting up triggers
    var spreadsheetId = CONFIG.PERSONAL_SPREADSHEET_ID;
    console.log("Setting up triggers for spreadsheet: " + spreadsheetId);

    // Delete existing triggers
    var triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(function (trigger) {
      ScriptApp.deleteTrigger(trigger);
    });

    // Daily full sync at 10 PM
    ScriptApp.newTrigger("processAllSubmissions").timeBased().everyDays(1).atHour(22).create();

    console.log("Triggers set up successfully");
  } catch (error) {
    console.error("Cannot set up triggers without valid spreadsheet ID:", error);
    throw new Error("Please run the script with a spreadsheet ID parameter first, then set up triggers");
  }
}

/**
 * Manual setup function - call this after providing spreadsheet ID
 */
function setupForSpreadsheet(spreadsheetId) {
  if (!spreadsheetId) {
    throw new Error("Spreadsheet ID is required");
  }

  // Store the spreadsheet ID
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);

  // Validate access
  validateSpreadsheetAccess(spreadsheetId);

  // Set up triggers
  setupTriggers();

  console.log("Successfully configured script for spreadsheet: " + spreadsheetId);
  return "Setup complete! The script will now run automatically.";
}

/**
 * Get current configuration status
 */
function getStatus() {
  try {
    var spreadsheetId = CONFIG.PERSONAL_SPREADSHEET_ID;
    var spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    var triggers = ScriptApp.getProjectTriggers();

    return {
      spreadsheetId: spreadsheetId,
      spreadsheetName: spreadsheet.getName(),
      triggersCount: triggers.length,
      status: "✓ Configured and ready"
    };
  } catch (error) {
    return {
      spreadsheetId: null,
      spreadsheetName: null,
      triggersCount: 0,
      status: "✗ Not configured - provide spreadsheet ID"
    };
  }
}

/**
 * Auto-detect active classroom folders
 */
function getActiveClassroomFolders() {
  console.log("Auto-detecting classroom folders...");

  try {
    var folders = DriveApp.getFoldersByName(CONFIG.CLASSROOMS_PARENT_FOLDER_NAME);

    if (!folders.hasNext()) {
      console.error("Parent folder \"" + CONFIG.CLASSROOMS_PARENT_FOLDER_NAME + "\" not found");
      return [];
    }

    var classroomsParent = folders.next();
    var classroomFolders = [];
    var subfolders = classroomsParent.getFolders();

    while (subfolders.hasNext()) {
      var folder = subfolders.next();
      var folderName = folder.getName();

      // Skip excluded folders
      if (CONFIG.EXCLUDED_FOLDER_NAMES.includes(folderName)) {
        console.log("Skipping excluded folder: " + folderName);
        continue;
      }

      // Only process folders ending with the ROO_SUFFIX
      if (!folder.getName().endsWith(CONFIG.ROO_SUFFIX)) {
        console.log("Skipping folder without -roo suffix: " + folderName);
        continue;
      }

      console.log("Found active classroom: " + folderName);
      classroomFolders.push(folder);
    }

    return classroomFolders;
  } catch (error) {
    console.error("Error auto-detecting classroom folders:", error);
    return [];
  }
}

/**
 * Helper functions
 */
function getStudentName(email) {
  return email ? email.split("@")[0] : "Unknown";
}

/**
 * Test function - run this manually to test the system
 */
function testSystem() {
  console.log("Testing Google Forms response sheet processing...");

  // Test classroom folder detection
  var classrooms = getActiveClassroomFolders();
  console.log("Found " + classrooms.length + " classrooms with -roo suffix");

  // Test response sheet processing
  if (classrooms.length > 0) {
    console.log("Testing response sheet detection...");

    classrooms.forEach(function (folder) {
      var courseId = folder.getName().replace(CONFIG.ROO_SUFFIX, "");
      console.log("\nChecking classroom: " + courseId);

      // Use the same search logic as the main function
      var responseData = findResponseSheetsInFolder(folder, courseId);
      console.log("  Found " + responseData.submissions.length + " response sheets in main folder");
      console.log("  Found " + responseData.answerKeys.length + " quiz answer keys");

      // Also check subfolders
      var subfolders = folder.getFolders();
      var subfolderSheetCount = 0;
      var subfolderKeyCount = 0;
      while (subfolders.hasNext()) {
        var subfolder = subfolders.next();
        var subfolderData = findResponseSheetsInFolder(subfolder, courseId);
        subfolderSheetCount += subfolderData.submissions.length;
        subfolderKeyCount += subfolderData.answerKeys.length;
        if (subfolderData.submissions.length > 0) {
          console.log(
            "  Found " + subfolderData.submissions.length + " response sheets in subfolder: " + subfolder.getName()
          );
        }
      }

      console.log("  Total response sheets: " + (responseData.submissions.length + subfolderSheetCount));
      console.log("  Total answer keys: " + (responseData.answerKeys.length + subfolderKeyCount));
    });

    // Test full processing
    var submissions = processAllSubmissionTypes();
    console.log("\nTotal submissions processed: " + submissions.length);

    // Show sample data
    if (submissions.length > 0) {
      console.log("\nSample submission data:");
      console.log("Assignment:", submissions[0].assignmentTitle);
      console.log("Course:", submissions[0].courseId);
      console.log("Student:", submissions[0].studentName);
      console.log("Content length:", submissions[0].studentWork.length, "characters");
    }
  }

  console.log("\nTest completed - check logs for details");
}

/**
 * Debug function to investigate response sheet locations
 */
function debugResponseSheets() {
  console.log("=== DEBUGGING RESPONSE SHEET LOCATIONS ===");

  var classrooms = getActiveClassroomFolders();

  classrooms.forEach(function (folder) {
    var courseId = folder.getName().replace(CONFIG.ROO_SUFFIX, "");
    console.log("\n--- Debugging classroom: " + courseId + " ---");

    var files = folder.getFiles();
    var foundAnyResponses = false;

    while (files.hasNext()) {
      var file = files.next();
      var fileName = file.getName();

      if (fileName.toLowerCase().includes("(responses)")) {
        foundAnyResponses = true;
        console.log("\nFound file: " + fileName);
        console.log("  File ID: " + file.getId());
        console.log("  Content Type: " + file.getBlob().getContentType());
        console.log("  Created: " + file.getDateCreated());
        console.log("  Modified: " + file.getLastUpdated());
        console.log("  Size: " + file.getSize() + " bytes");

        // Try to check if it's a shortcut
        try {
          var mimeType = file.getBlob().getContentType();
          if (mimeType === "application/vnd.google-apps.shortcut") {
            console.log("  *** This appears to be a shortcut! ***");
            // Try to get the target
            try {
              var targetId = file.getTargetId();
              if (targetId) {
                console.log("  Target ID: " + targetId);
                var targetFile = DriveApp.getFileById(targetId);
                console.log("  Target name: " + targetFile.getName());
                console.log("  Target type: " + targetFile.getBlob().getContentType());
              }
            } catch (shortcutError) {
              console.log("  Could not resolve shortcut target:", shortcutError);
            }
          }
        } catch (error) {
          console.log("  Error checking file properties:", error);
        }
      }
    }

    if (!foundAnyResponses) {
      console.log("  No files with '(responses)' found in this folder");
    }

    // Also check if we can find any Google Forms and check their response destinations
    console.log("\n  Checking for Google Forms in this folder...");
    var formFiles = folder.getFiles();
    var foundForms = false;

    while (formFiles.hasNext()) {
      var file = formFiles.next();
      var contentType = file.getBlob().getContentType();

      if (contentType === "application/vnd.google-apps.form") {
        foundForms = true;
        console.log("  Found form: " + file.getName());

        try {
          var form = FormApp.openById(file.getId());
          var destinationId = form.getDestinationId();

          if (destinationId) {
            console.log("    Form has destination sheet ID: " + destinationId);
            try {
              var destSheet = SpreadsheetApp.openById(destinationId);
              console.log("    Destination sheet name: " + destSheet.getName());
              console.log("    Destination sheet URL: " + destSheet.getUrl());
            } catch (destError) {
              console.log("    Could not access destination sheet: " + destError);
            }
          } else {
            console.log("    Form has no destination sheet configured");
          }
        } catch (formError) {
          console.log("    Error accessing form: " + formError);
        }
      }
    }

    if (!foundForms) {
      console.log("  No Google Forms found in this folder");
    }
  });

  console.log("\n=== END DEBUG ===");
}