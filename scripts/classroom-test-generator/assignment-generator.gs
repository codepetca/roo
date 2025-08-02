/**
 * Programming assignment generation with Google Drive document links
 * Location: assignment-generator.gs
 */

/**
 * Create Google Drive documents for programming assignments
 */
function createProgrammingDocuments(assignmentsFolderId) {
  console.log("Creating programming assignment documents...");
  
  const assignmentContent = generateProgrammingContent();
  const createdDocs = [];
  
  // Karel Assignment - Google Doc
  try {
    const karelDoc = Docs.Documents.create({
      title: "Karel Navigation Challenge - Instructions"
    });
    
    // Move to assignments folder
    Drive.Files.update({}, karelDoc.documentId, null, {
      addParents: assignmentsFolderId,
      removeParents: "root"
    });
    
    // Add content to document
    const karelRequests = [
      {
        insertText: {
          location: { index: 1 },
          text: assignmentContent.karel.content
        }
      }
    ];
    
    Docs.Documents.batchUpdate({ requests: karelRequests }, karelDoc.documentId);
    
    createdDocs.push({
      type: 'docs',
      assignmentKey: 'karel',
      fileId: karelDoc.documentId,
      title: assignmentContent.karel.title,
      mimeType: 'application/vnd.google-apps.document'
    });
    
    console.log(`✅ Created Karel Doc: ${karelDoc.documentId}`);
    
  } catch (error) {
    console.error("❌ Error creating Karel document:", error);
  }
  
  // Grade Calculator - Google Sheets
  try {
    const gradeSheet = Sheets.Spreadsheets.create({
      properties: {
        title: "Grade Calculator Template"
      },
      sheets: [{
        properties: {
          title: "Instructions"
        }
      }, {
        properties: {
          title: "Grade Calculator"
        }
      }, {
        properties: {
          title: "Sample Data"
        }
      }]
    });
    
    // Move to assignments folder
    Drive.Files.update({}, gradeSheet.spreadsheetId, null, {
      addParents: assignmentsFolderId,
      removeParents: "root"
    });
    
    // Add instructions to first sheet
    const instructionsData = [
      ["Grade Calculator Project"],
      [""],
      ["Instructions:"],
      [assignmentContent.gradeCalculator.content]
    ];
    
    Sheets.Spreadsheets.Values.update({
      values: instructionsData
    }, gradeSheet.spreadsheetId, "Instructions!A1");
    
    // Add sample data structure
    const sampleHeaders = [
      ["Student Name", "HW1", "HW2", "HW3", "HW4", "HW5", "Quiz1", "Quiz2", "Quiz3", "Midterm", "Final", "Weighted Average", "Letter Grade"]
    ];
    
    Sheets.Spreadsheets.Values.update({
      values: sampleHeaders
    }, gradeSheet.spreadsheetId, "Grade Calculator!A1");
    
    // Add sample student data
    const sampleData = [
      ["Alice Johnson", 85, 92, 78, 88, 90, 82, 85, 79, 86, 88],
      ["Bob Smith", 78, 85, 82, 76, 84, 88, 82, 85, 82, 80],
      ["Carol Davis", 92, 88, 85, 90, 87, 90, 88, 92, 89, 91]
    ];
    
    Sheets.Spreadsheets.Values.update({
      values: sampleData
    }, gradeSheet.spreadsheetId, "Sample Data!A1");
    
    createdDocs.push({
      type: 'sheets',
      assignmentKey: 'gradeCalculator',
      fileId: gradeSheet.spreadsheetId,
      title: assignmentContent.gradeCalculator.title,
      mimeType: 'application/vnd.google-apps.spreadsheet'
    });
    
    console.log(`✅ Created Grade Calculator Sheet: ${gradeSheet.spreadsheetId}`);
    
  } catch (error) {
    console.error("❌ Error creating grade calculator sheet:", error);
  }
  
  // Algorithm Presentation - Google Slides
  try {
    const algoSlides = Slides.Presentations.create({
      title: "Algorithm Visualization Template"
    });
    
    // Move to assignments folder
    Drive.Files.update({}, algoSlides.presentationId, null, {
      addParents: assignmentsFolderId,
      removeParents: "root"
    });
    
    // Add title slide content
    const titleSlideRequests = [
      {
        insertText: {
          objectId: algoSlides.slides[0].pageElements[0].objectId,
          text: "Algorithm Visualization Project"
        }
      },
      {
        insertText: {
          objectId: algoSlides.slides[0].pageElements[1].objectId,
          text: "Compare and visualize sorting algorithms\n\nInstructions:\n" + assignmentContent.algorithmPresentation.content.substring(0, 200) + "..."
        }
      }
    ];
    
    Slides.Presentations.batchUpdate({
      requests: titleSlideRequests
    }, algoSlides.presentationId);
    
    createdDocs.push({
      type: 'slides',
      assignmentKey: 'algorithmPresentation',
      fileId: algoSlides.presentationId,
      title: assignmentContent.algorithmPresentation.title,
      mimeType: 'application/vnd.google-apps.presentation'
    });
    
    console.log(`✅ Created Algorithm Slides: ${algoSlides.presentationId}`);
    
  } catch (error) {
    console.error("❌ Error creating algorithm slides:", error);
  }
  
  // Python Basics - Colab Notebook (as Google Doc)
  try {
    const pythonDoc = Docs.Documents.create({
      title: "Python Basics Notebook - Instructions"
    });
    
    // Move to assignments folder
    Drive.Files.update({}, pythonDoc.documentId, null, {
      addParents: assignmentsFolderId,
      removeParents: "root"
    });
    
    // Add Python content
    const pythonRequests = [
      {
        insertText: {
          location: { index: 1 },
          text: assignmentContent.pythonBasics.content + "\n\nColab Link: https://colab.research.google.com/\n\nCreate a new notebook and complete the exercises above."
        }
      }
    ];
    
    Docs.Documents.batchUpdate({ requests: pythonRequests }, pythonDoc.documentId);
    
    createdDocs.push({
      type: 'colab',
      assignmentKey: 'pythonBasics',
      fileId: pythonDoc.documentId,
      title: assignmentContent.pythonBasics.title,
      mimeType: 'application/vnd.google-apps.document'
    });
    
    console.log(`✅ Created Python Doc: ${pythonDoc.documentId}`);
    
  } catch (error) {
    console.error("❌ Error creating Python document:", error);
  }
  
  // Data Analysis - Google Sheets
  try {
    const dataSheet = Sheets.Spreadsheets.create({
      properties: {
        title: "Student Survey Data Analysis"
      },
      sheets: [{
        properties: {
          title: "Instructions"
        }
      }, {
        properties: {
          title: "Survey Data"
        }
      }, {
        properties: {
          title: "Analysis"
        }
      }]
    });
    
    // Move to assignments folder
    Drive.Files.update({}, dataSheet.spreadsheetId, null, {
      addParents: assignmentsFolderId,
      removeParents: "root"
    });
    
    // Add instructions
    const dataInstructions = [
      ["Student Survey Data Analysis Project"],
      [""],
      [assignmentContent.dataAnalysis.content]
    ];
    
    Sheets.Spreadsheets.Values.update({
      values: dataInstructions
    }, dataSheet.spreadsheetId, "Instructions!A1");
    
    // Add sample survey data
    const surveyHeaders = [
      ["Student ID", "Grade Level", "Favorite Subject", "Study Hours/Week", "GPA", "Extracurriculars", "Sleep Hours/Night"]
    ];
    
    const surveyData = generateSampleSurveyData(50);
    
    Sheets.Spreadsheets.Values.update({
      values: surveyHeaders.concat(surveyData)
    }, dataSheet.spreadsheetId, "Survey Data!A1");
    
    createdDocs.push({
      type: 'sheets',
      assignmentKey: 'dataAnalysis',
      fileId: dataSheet.spreadsheetId,
      title: assignmentContent.dataAnalysis.title,
      mimeType: 'application/vnd.google-apps.spreadsheet'
    });
    
    console.log(`✅ Created Data Analysis Sheet: ${dataSheet.spreadsheetId}`);
    
  } catch (error) {
    console.error("❌ Error creating data analysis sheet:", error);
  }
  
  console.log(`✅ Created ${createdDocs.length} programming assignment documents`);
  return createdDocs;
}

/**
 * Create programming assignments in Google Classroom with Drive links
 */
function createProgrammingAssignments(classroomId, assignmentDocs) {
  console.log("Creating programming assignments in classroom...");
  
  const assignments = CONFIG.PROGRAMMING_ASSIGNMENTS;
  const createdAssignments = [];
  
  assignments.forEach((assignment, index) => {
    try {
      // Find matching document
      const doc = assignmentDocs.find(d => {
        return assignment.title.toLowerCase().includes(d.assignmentKey.toLowerCase().replace(/([A-Z])/g, ' $1').trim().toLowerCase());
      });
      
      if (!doc) {
        console.log(`⚠️ No document found for assignment: ${assignment.title}`);
        return;
      }
      
      const dueDate = getDueDate(assignment.dueInDays);
      
      const assignmentData = {
        title: assignment.title,
        description: assignment.description,
        materials: [{
          driveFile: {
            driveFile: {
              id: doc.fileId,
              title: doc.title
            },
            shareMode: "VIEW"
          }
        }],
        workType: "ASSIGNMENT",
        state: "PUBLISHED",
        maxPoints: 100,
        dueDate: {
          year: dueDate.getFullYear(),
          month: dueDate.getMonth() + 1,
          day: dueDate.getDate()
        },
        dueTime: {
          hours: 23,
          minutes: 59
        }
      };
      
      const createdAssignment = Classroom.Courses.CourseWork.create(assignmentData, classroomId);
      
      console.log(`✅ Created assignment: ${assignment.title} (ID: ${createdAssignment.id})`);
      
      createdAssignments.push({
        ...createdAssignment,
        documentId: doc.fileId,
        documentType: doc.type
      });
      
      // Add delay to avoid rate limiting
      if (index % 3 === 0 && index > 0) {
        Utilities.sleep(1000);
      }
      
    } catch (error) {
      console.error(`❌ Error creating assignment ${assignment.title}:`, error);
    }
  });
  
  console.log(`✅ Created ${createdAssignments.length} programming assignments`);
  return createdAssignments;
}

/**
 * Helper function to generate sample survey data
 */
function generateSampleSurveyData(count) {
  const subjects = ["Math", "Science", "English", "History", "Computer Science", "Art", "Music"];
  const grades = [9, 10, 11, 12];
  const extracurriculars = ["Sports", "Drama", "Band", "Debate", "Robotics", "Art Club", "None"];
  
  const data = [];
  
  for (let i = 1; i <= count; i++) {
    const studyHours = Math.floor(Math.random() * 25) + 5; // 5-30 hours
    const sleepHours = Math.floor(Math.random() * 4) + 6; // 6-10 hours
    const gpa = (Math.random() * 2 + 2.5).toFixed(2); // 2.5-4.5 GPA
    
    data.push([
      `S${i.toString().padStart(3, '0')}`,
      grades[Math.floor(Math.random() * grades.length)],
      subjects[Math.floor(Math.random() * subjects.length)],
      studyHours,
      parseFloat(gpa),
      extracurriculars[Math.floor(Math.random() * extracurriculars.length)],
      sleepHours
    ]);
  }
  
  return data;
}