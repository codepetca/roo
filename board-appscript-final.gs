/**
 * Roo Auto-Grading System - Board Account Apps Script (Final Version)
 *
 * This script runs in your board Google account and:
 * 1. Finds Google Sheets with "(responses)" pattern for Google Forms submissions
 * 2. Extracts all student responses from these sheets
 * 3. Writes all data to a single "Submissions" tab in your personal Google Sheets
 *
 * Setup: Share your personal sheets with your board account (Editor access)
 */

// Configuration - Update these values
const CONFIG = {
  // Your personal Google Sheets ID (get from sheet URL)
  PERSONAL_SPREADSHEET_ID: "119EdfrPtA3G180b2EgkzVr5v-kxjNgYQjgDkLmuN02Y",

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
    // Process all submission types
    const allData = processAllSubmissionTypes();

    // Write to personal sheets (single tab)
    writeToPersonalSheets(allData);

    console.log(`Successfully processed ${allData.length} total submissions`);
  } catch (error) {
    console.error("Error in processAllSubmissions:", error);
  }
}

/**
 * Process only Google Forms response sheets
 */
function processAllSubmissionTypes() {
  console.log("Processing Google Forms response sheets...");

  const allSubmissions = [];

  // Auto-detect classroom folders
  const classroomFolders = getActiveClassroomFolders();

  classroomFolders.forEach((classroomFolder) => {
    try {
      const courseId = classroomFolder.getName().replace(CONFIG.ROO_SUFFIX, "");
      console.log(`Processing classroom: ${courseId}`);

      // Process ONLY Google Sheets with "(responses)" pattern
      const responseSheetSubmissions = processResponseSheets(
        classroomFolder,
        courseId
      );
      allSubmissions.push(...responseSheetSubmissions);
    } catch (error) {
      console.error(
        `Error processing classroom ${classroomFolder.getName()}:`,
        error
      );
    }
  });

  console.log(
    `Processed ${allSubmissions.length} total submissions from response sheets`
  );
  return allSubmissions;
}

/**
 * Process Google Sheets with "(responses)" pattern - search more thoroughly
 */
function processResponseSheets(classroomFolder, courseId) {
  const submissions = [];

  // Search in main folder
  console.log(`Searching for response sheets in: ${classroomFolder.getName()}`);
  const mainFolderSheets = findResponseSheetsInFolder(
    classroomFolder,
    courseId
  );
  submissions.push(...mainFolderSheets);

  // Also search in subfolders (response sheets might be in subfolders)
  const subfolders = classroomFolder.getFolders();
  while (subfolders.hasNext()) {
    const subfolder = subfolders.next();
    console.log(`Searching subfolder: ${subfolder.getName()}`);
    const subfolderSheets = findResponseSheetsInFolder(subfolder, courseId);
    submissions.push(...subfolderSheets);
  }

  return submissions;
}

/**
 * Find response sheets by checking Google Forms and their destinations
 */
function findResponseSheetsInFolder(folder, courseId) {
  const submissions = [];
  const files = folder.getFiles();

  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();

    try {
      // Check if it's a Google Form by trying to access it as a form
      const form = FormApp.openById(file.getId());
      console.log(`Found Google Form: ${fileName}`);

      const destinationId = form.getDestinationId();

      if (destinationId) {
        console.log(`  Form has response sheet destination: ${destinationId}`);

        try {
          const assignmentTitle = fileName.trim();
          const sheetSubmissions = extractSubmissionsFromResponseSheet(
            destinationId,
            assignmentTitle,
            courseId,
            file.getDateCreated(),
            `${fileName} (Responses)`
          );
          submissions.push(...sheetSubmissions);
          console.log(
            `✓ Extracted ${sheetSubmissions.length} submissions from form: ${fileName}`
          );
        } catch (sheetError) {
          console.error(
            `Error processing response sheet for form ${fileName}:`,
            sheetError
          );
        }
      } else {
        console.log(`  Form ${fileName} has no response sheet configured`);
      }
    } catch (notAFormError) {
      // Not a Google Form, check if it's a response sheet
      if (fileName.toLowerCase().includes("(responses)")) {
        try {
          const contentType = file.getBlob().getContentType();
          if (contentType === "application/vnd.google-apps.spreadsheet") {
            console.log(`✓ Found standalone response sheet: ${fileName}`);

            const assignmentTitle = fileName
              .replace(/\s*\(responses\)\s*$/i, "")
              .trim();

            try {
              const sheetSubmissions = extractSubmissionsFromResponseSheet(
                file.getId(),
                assignmentTitle,
                courseId,
                file.getDateCreated(),
                fileName
              );
              submissions.push(...sheetSubmissions);
              console.log(
                `✓ Extracted ${sheetSubmissions.length} submissions from standalone sheet: ${fileName}`
              );
            } catch (sheetError) {
              console.error(
                `Error processing response sheet ${fileName}:`,
                sheetError
              );
            }
          } else {
            console.log(`✗ Skipping PDF export: ${fileName} (${contentType})`);
          }
        } catch (contentError) {
          console.log(`✗ Could not determine content type for: ${fileName}`);
        }
      }
    }
  }

  return submissions;
}

/**
 * Extract submissions from a Google Sheets response file
 */
function extractSubmissionsFromResponseSheet(
  fileId,
  assignmentTitle,
  courseId,
  createdDate,
  fileName
) {
  const submissions = [];

  try {
    const spreadsheet = SpreadsheetApp.openById(fileId);
    const sheet = spreadsheet.getActiveSheet();
    const data = sheet.getDataRange().getValues();

    if (data.length < 2) {
      console.log("Response sheet appears to be empty or has no data rows");
      return submissions;
    }

    // First row should be headers
    const headers = data[0];
    console.log(`Response sheet headers: ${headers.join(", ")}`);

    // Process each response row (skip header)
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      try {
        // Extract basic info
        const timestamp = row[0] || new Date();
        let studentEmail = "";
        let studentName = "";

        // Try to intelligently identify email and name fields
        let firstName = "";
        let lastName = "";
        let fullName = "";
        
        for (let j = 0; j < headers.length; j++) {
          const header = headers[j].toLowerCase().trim();
          const value = row[j] || "";
          
          // Email detection - fairly reliable patterns
          if (header.includes("email") || 
              header.includes("e-mail") || 
              header.includes("address") ||
              header === "email") {
            studentEmail = value;
          }
          
          // Name detection - try various patterns
          // First name variations
          if (header === "first name" || 
              header === "firstname" || 
              header === "first" ||
              header === "fname" ||
              header === "given name") {
            firstName = value;
          }
          // Last name variations
          else if (header === "last name" || 
                   header === "lastname" || 
                   header === "last" ||
                   header === "lname" ||
                   header === "surname" ||
                   header === "family name") {
            lastName = value;
          }
          // Full name variations
          else if ((header === "name" || 
                    header === "full name" ||
                    header === "fullname" ||
                    header === "student name" ||
                    header === "your name") && 
                   !header.includes("email")) {
            fullName = value;
          }
        }
        
        // Build student name from available parts
        if (firstName && lastName) {
          studentName = `${firstName} ${lastName}`.trim();
        } else if (fullName) {
          studentName = fullName;
        } else if (firstName) {
          studentName = firstName;
        } else if (lastName) {
          studentName = lastName;
        }

        // Combine ALL response columns as submission content (except timestamp)
        const contentParts = [];
        for (let j = 1; j < row.length; j++) {  // Skip j=0 (timestamp)
          const value = row[j];
          
          if (value && value.toString().trim()) {
            contentParts.push(`${headers[j]}: ${value}`);
          }
        }

        // If we couldn't find a name, try to extract from email
        if (!firstName && !lastName && !fullName && studentEmail) {
          const emailName = getStudentName(studentEmail);
          if (emailName) {
            firstName = emailName;
          }
        }
        
        const submission = {
          submissionId: `sheet_${fileId}_${i}`,
          assignmentTitle: assignmentTitle,
          courseId: courseId,
          studentFirstName: firstName || "Unknown",
          studentLastName: lastName || "",
          studentEmail: studentEmail || `student${i}@unknown.com`,
          submissionText: contentParts.join("\n\n"),
          submissionDate: new Date(timestamp).toISOString(),
          submissionType: "forms",
          sourceFileId: fileId,
          sourceFileName: fileName,
          currentGrade: "", // Empty = needs grading
          gradingStatus: "pending",
          maxPoints: 100, // Default
          assignmentDescription: `Google Forms responses: ${assignmentTitle}`,
          lastProcessed: new Date().toISOString(),
        };

        submissions.push(submission);
      } catch (rowError) {
        console.error(
          `Error processing row ${i + 1} in response sheet:`,
          rowError
        );
      }
    }
  } catch (error) {
    console.error(`Error reading response sheet ${fileId}:`, error);
  }

  return submissions;
}

/**
 * Write all submissions to single "Submissions" tab with rich metadata
 */
function writeToPersonalSheets(submissions) {
  console.log("Writing to personal Google Sheets...");

  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.PERSONAL_SPREADSHEET_ID);

    let sheet = spreadsheet.getSheetByName("Submissions");

    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet("Submissions");
      console.log('Created new "Submissions" sheet');
    }

    // Clear existing data
    sheet.clear();

    // Rich headers for teacher frontend
    const headers = [
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
    ];

    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // Write submission data
    if (submissions.length > 0) {
      const rows = submissions.map((s) => [
        s.submissionId,
        s.assignmentTitle,
        s.courseId,
        s.studentFirstName,
        s.studentLastName,
        s.studentEmail,
        s.submissionText,
        s.submissionDate,
        s.currentGrade,
        s.gradingStatus,
        s.maxPoints,
        s.sourceFileName,
        s.assignmentDescription,
        s.lastProcessed,
        s.sourceFileId,
      ]);

      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);

      // Add conditional formatting for grading status
      // Color code grading status (Column J = index 9)
      for (let i = 0; i < rows.length; i++) {
        const row = i + 2;
        const gradingStatus = rows[i][9]; // Grading Status column (index 9)

        if (gradingStatus === "pending") {
          sheet.getRange(row, 10).setBackground("#ffcccc"); // Light red
        } else if (gradingStatus === "graded") {
          sheet.getRange(row, 10).setBackground("#ccffcc"); // Light green
        }
      }
    }

    // Format headers
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#4285f4");
    headerRange.setFontColor("white");

    // Auto-resize columns
    sheet.autoResizeColumns(1, headers.length);

    // Freeze header row
    sheet.setFrozenRows(1);

    console.log(
      `Successfully wrote ${submissions.length} submissions to Submissions sheet`
    );
  } catch (error) {
    console.error("Error writing to personal sheets:", error);
    throw error;
  }
}

/**
 * Clear existing data from personal sheets
 */
function clearPersonalSheets() {
  console.log("Clearing existing data from personal sheets...");

  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.PERSONAL_SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName("Submissions");

    if (sheet) {
      sheet.clear();
    }
  } catch (error) {
    console.error("Error clearing sheets:", error);
  }
}

/**
 * Set up automated triggers
 */
function setupTriggers() {
  // Delete existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  // Daily full sync at 10 PM
  ScriptApp.newTrigger("processAllSubmissions")
    .timeBased()
    .everyDays(1)
    .atHour(22)
    .create();

  console.log("Triggers set up successfully");
}

/**
 * Auto-detect active classroom folders
 */
function getActiveClassroomFolders() {
  console.log("Auto-detecting classroom folders...");

  try {
    const folders = DriveApp.getFoldersByName(
      CONFIG.CLASSROOMS_PARENT_FOLDER_NAME
    );

    if (!folders.hasNext()) {
      console.error(
        `Parent folder "${CONFIG.CLASSROOMS_PARENT_FOLDER_NAME}" not found`
      );
      return [];
    }

    const classroomsParent = folders.next();
    const classroomFolders = [];
    const subfolders = classroomsParent.getFolders();

    while (subfolders.hasNext()) {
      const folder = subfolders.next();
      const folderName = folder.getName();

      // Skip excluded folders
      if (CONFIG.EXCLUDED_FOLDER_NAMES.includes(folderName)) {
        console.log(`Skipping excluded folder: ${folderName}`);
        continue;
      }

      // Only process folders ending with the ROO_SUFFIX
      if (!folder.getName().endsWith(CONFIG.ROO_SUFFIX)) {
        console.log(`Skipping folder without -roo suffix: ${folderName}`);
        continue;
      }

      console.log(`Found active classroom: ${folderName}`);
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
  const classrooms = getActiveClassroomFolders();
  console.log(`Found ${classrooms.length} classrooms with -roo suffix`);

  // Test response sheet processing
  if (classrooms.length > 0) {
    console.log("Testing response sheet detection...");

    classrooms.forEach((folder) => {
      const courseId = folder.getName().replace(CONFIG.ROO_SUFFIX, "");
      console.log(`\nChecking classroom: ${courseId}`);

      // Use the same search logic as the main function
      const responseSheets = findResponseSheetsInFolder(folder, courseId);
      console.log(
        `  Found ${responseSheets.length} response sheets in main folder`
      );

      // Also check subfolders
      const subfolders = folder.getFolders();
      let subfolderSheetCount = 0;
      while (subfolders.hasNext()) {
        const subfolder = subfolders.next();
        const subfolderSheets = findResponseSheetsInFolder(subfolder, courseId);
        subfolderSheetCount += subfolderSheets.length;
        if (subfolderSheets.length > 0) {
          console.log(
            `  Found ${
              subfolderSheets.length
            } response sheets in subfolder: ${subfolder.getName()}`
          );
        }
      }

      console.log(
        `  Total response sheets: ${
          responseSheets.length + subfolderSheetCount
        }`
      );
    });

    // Test full processing
    const submissions = processAllSubmissionTypes();
    console.log(`\nTotal submissions processed: ${submissions.length}`);

    // Show sample data
    if (submissions.length > 0) {
      console.log("\nSample submission data:");
      console.log("Assignment:", submissions[0].assignmentTitle);
      console.log("Course:", submissions[0].courseId);
      console.log("Student:", submissions[0].studentName);
      console.log(
        "Content length:",
        submissions[0].submissionText.length,
        "characters"
      );
    }
  }

  console.log("\nTest completed - check logs for details");
}

/**
 * Debug function to investigate response sheet locations
 */
function debugResponseSheets() {
  console.log("=== DEBUGGING RESPONSE SHEET LOCATIONS ===");

  const classrooms = getActiveClassroomFolders();

  classrooms.forEach((folder) => {
    const courseId = folder.getName().replace(CONFIG.ROO_SUFFIX, "");
    console.log(`\n--- Debugging classroom: ${courseId} ---`);

    const files = folder.getFiles();
    let foundAnyResponses = false;

    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();

      if (fileName.toLowerCase().includes("(responses)")) {
        foundAnyResponses = true;
        console.log(`\nFound file: ${fileName}`);
        console.log(`  File ID: ${file.getId()}`);
        console.log(`  Content Type: ${file.getBlob().getContentType()}`);
        console.log(`  Created: ${file.getDateCreated()}`);
        console.log(`  Modified: ${file.getLastUpdated()}`);
        console.log(`  Size: ${file.getSize()} bytes`);

        // Try to check if it's a shortcut
        try {
          const mimeType = file.getBlob().getContentType();
          if (mimeType === "application/vnd.google-apps.shortcut") {
            console.log("  *** This appears to be a shortcut! ***");
            // Try to get the target
            try {
              const targetId = file.getTargetId();
              if (targetId) {
                console.log(`  Target ID: ${targetId}`);
                const targetFile = DriveApp.getFileById(targetId);
                console.log(`  Target name: ${targetFile.getName()}`);
                console.log(
                  `  Target type: ${targetFile.getBlob().getContentType()}`
                );
              }
            } catch (shortcutError) {
              console.log(
                "  Could not resolve shortcut target:",
                shortcutError
              );
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
    const formFiles = folder.getFiles();
    let foundForms = false;

    while (formFiles.hasNext()) {
      const file = formFiles.next();
      const contentType = file.getBlob().getContentType();

      if (contentType === "application/vnd.google-apps.form") {
        foundForms = true;
        console.log(`  Found form: ${file.getName()}`);

        try {
          const form = FormApp.openById(file.getId());
          const destinationId = form.getDestinationId();

          if (destinationId) {
            console.log(`    Form has destination sheet ID: ${destinationId}`);
            try {
              const destSheet = SpreadsheetApp.openById(destinationId);
              console.log(`    Destination sheet name: ${destSheet.getName()}`);
              console.log(`    Destination sheet URL: ${destSheet.getUrl()}`);
            } catch (destError) {
              console.log(
                `    Could not access destination sheet: ${destError}`
              );
            }
          } else {
            console.log(`    Form has no destination sheet configured`);
          }
        } catch (formError) {
          console.log(`    Error accessing form: ${formError}`);
        }
      }
    }

    if (!foundForms) {
      console.log("  No Google Forms found in this folder");
    }
  });

  console.log("\n=== END DEBUG ===");
}
