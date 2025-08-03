/**
 * DEPRECATED: Setup instructions and helpers for enabling APIs
 * Location: setup-instructions.gs
 * 
 * NOTE: Most functions in this file use the deprecated complex Drive folder approach.
 * Use the main generateTestClassroom() function instead, which uses the simplified approach.
 */

/**
 * Display setup instructions for enabling required APIs
 */
function showSetupInstructions() {
  console.log("📋 SETUP INSTRUCTIONS");
  console.log("====================");
  console.log("");
  console.log("Script ID: " + ScriptApp.getScriptId());
  console.log("");
  console.log("If Forms API is not working despite being enabled:");
  console.log("");
  console.log("1. Link Apps Script to Cloud Project:");
  console.log("   - In Apps Script editor, go to Project Settings (gear icon)");
  console.log("   - Under 'Google Cloud Platform (GCP) Project' click 'Change project'");
  console.log("   - Enter your Cloud Project number where Forms API is enabled");
  console.log("");
  console.log("2. Or use default Cloud Project:");
  console.log("   - Enable Forms API in the default project");
  console.log("   - Go to: https://console.cloud.google.com/apis/library/forms.googleapis.com");
  console.log("   - Make sure you're in the correct project");
  console.log("");
  console.log("3. Already enabled (from manifest):");
  console.log("   ✅ Google Classroom API");
  console.log("   ✅ Google Drive API");
  console.log("   ✅ Google Docs API");
  console.log("   ✅ Google Sheets API");
  console.log("   ✅ Google Slides API");
  console.log("");
  console.log("After fixing Cloud Project settings, run generateTestClassroomSimple() again.");
  console.log("");
  console.log("Your created classroom:");
  const classroomInfo = getClassroomInfo();
  
  return {
    message: "See console for setup instructions",
    scriptId: ScriptApp.getScriptId()
  };
}

/**
 * Create classroom without Forms (for when Forms API is not enabled)
 */
function generateClassroomNoForms() {
  console.log("🚀 Starting Classroom Generation (no quiz forms)...");
  
  try {
    // Step 1: Create main Drive folder structure
    console.log("📁 Creating Drive folder structure...");
    const folders = createDriveFolders();
    
    // Step 2: Create the classroom
    console.log("🏫 Creating test classroom...");
    const classroom = createTestClassroom();
    
    // Step 3: Create programming assignment documents
    console.log("📝 Creating programming assignment documents...");
    const assignmentDocs = createProgrammingDocuments(folders.assignments.id);
    
    // Step 4: Create programming assignments in classroom
    console.log("💻 Creating programming assignments...");
    const programmingAssignments = createProgrammingAssignments(classroom.id, assignmentDocs);
    
    console.log("\n✅ Classroom generation complete (without quiz forms)!");
    console.log("\n📋 Created:");
    console.log(`   - Classroom: ${classroom.name}`);
    console.log(`   - ${programmingAssignments.length} programming assignments`);
    console.log(`   - ${assignmentDocs.length} Google Drive documents`);
    console.log("\n📋 Next Steps:");
    console.log("1. Go to: https://classroom.google.com/c/" + classroom.id);
    console.log("2. Accept/Activate the classroom");
    console.log("3. Enrollment code: " + classroom.enrollmentCode);
    console.log("\n⚠️ To add quiz forms:");
    console.log("1. Enable Forms API at: https://console.cloud.google.com/apis/library/forms.googleapis.com");
    console.log("2. Run addQuizFormsToClassroom('" + classroom.id + "')");
    
    return {
      classroom: classroom,
      folders: folders,
      programmingAssignments: programmingAssignments
    };
    
  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
}

/**
 * Add quiz forms to existing classroom (after enabling Forms API)
 */
function addQuizFormsToClassroom(classroomId) {
  console.log("📋 Adding quiz forms to existing classroom...");
  
  try {
    // Find the quiz folder
    const folders = Drive.Files.list({
      q: "name='CS101 Test Materials' and mimeType='application/vnd.google-apps.folder'"
    });
    
    if (!folders.files || folders.files.length === 0) {
      throw new Error("CS101 Test Materials folder not found");
    }
    
    const mainFolder = folders.files[0];
    
    // Find quiz subfolder
    const quizFolders = Drive.Files.list({
      q: `name='Quiz Forms' and '${mainFolder.id}' in parents and mimeType='application/vnd.google-apps.folder'`
    });
    
    if (!quizFolders.files || quizFolders.files.length === 0) {
      throw new Error("Quiz Forms folder not found");
    }
    
    const quizFolder = quizFolders.files[0];
    
    // Create quiz forms
    console.log("📋 Creating quiz forms with answer keys...");
    const quizForms = createQuizForms(quizFolder.id);
    
    // Create quiz assignments
    console.log("🧮 Creating quiz assignments...");
    const quizAssignments = createQuizAssignments(classroomId, quizForms);
    
    console.log("\n✅ Successfully added " + quizAssignments.length + " quiz assignments!");
    
    return {
      quizForms: quizForms,
      quizAssignments: quizAssignments
    };
    
  } catch (error) {
    console.error("❌ Error adding quiz forms:", error);
    
    if (error.toString().includes("Forms API has not been used")) {
      console.log("\n⚠️ Forms API is not enabled!");
      console.log("Enable it at: https://console.cloud.google.com/apis/library/forms.googleapis.com");
    }
    
    throw error;
  }
}

/**
 * Organize existing test files in Drive root into proper folder structure
 */
function organizeExistingTestFiles() {
  console.log("🧹 Organizing existing test files...");
  
  try {
    // Create folder structure if needed
    const folders = createDriveFolders();
    
    // Find CS101 test materials in root
    const testMaterials = Drive.Files.list({
      q: "'root' in parents and (name contains 'Karel' or name contains 'Grade Calculator' or name contains 'Algorithm' or name contains 'Python' or name contains 'Survey Data') and trashed=false",
      fields: 'files(id, name, mimeType)'
    });
    
    if (!testMaterials.files || testMaterials.files.length === 0) {
      console.log("No test materials found in root to organize.");
      return;
    }
    
    console.log(`Found ${testMaterials.files.length} files to organize...`);
    
    testMaterials.files.forEach(file => {
      try {
        // Determine target folder based on file type
        let targetFolderId = folders.assignments.id;
        
        if (file.mimeType === 'application/vnd.google-apps.form') {
          targetFolderId = folders.quizzes.id;
        }
        
        // Move file to appropriate folder
        Drive.Files.update({
          addParents: targetFolderId,
          removeParents: 'root'
        }, file.id);
        
        console.log(`✅ Moved: ${file.name} → ${targetFolderId === folders.quizzes.id ? 'Quizzes' : 'Assignments'}`);
        
      } catch (error) {
        console.error(`Failed to move ${file.name}:`, error);
      }
    });
    
    console.log("\n✅ Files organized into: /roo/test-classrooms/");
    console.log(`📁 Main folder: ${folders.main.name}`);
    
    return folders;
    
  } catch (error) {
    console.error("❌ Error organizing files:", error);
    throw error;
  }
}

/**
 * Clean up Classroom-created copies from Drive root
 */
function cleanupClassroomCopies() {
  console.log("🧹 Cleaning up Classroom copies from Drive root...");
  
  try {
    // Find files in root that look like Classroom copies
    const copiesInRoot = Drive.Files.list({
      q: "'root' in parents and (name contains 'Copy of' or name contains '- Google Docs' or name contains '- Google Sheets' or name contains '- Google Slides') and trashed=false",
      fields: 'files(id, name, mimeType, createdTime)'
    });
    
    if (!copiesInRoot.files || copiesInRoot.files.length === 0) {
      console.log("No Classroom copies found in root.");
      return;
    }
    
    console.log(`Found ${copiesInRoot.files.length} files to clean up...`);
    
    // Move to trash (safer than permanent delete)
    copiesInRoot.files.forEach(file => {
      try {
        // Check if it's a recent file (created in last hour)
        const createdTime = new Date(file.createdTime);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        if (createdTime > hourAgo) {
          Drive.Files.update({
            trashed: true
          }, file.id);
          console.log(`🗑️ Trashed: ${file.name}`);
        } else {
          console.log(`⏭️ Skipped (older file): ${file.name}`);
        }
        
      } catch (error) {
        console.error(`Failed to trash ${file.name}:`, error);
      }
    });
    
    console.log("\n✅ Cleanup complete!");
    console.log("💡 Tip: Classroom creates these copies automatically when attaching files to assignments.");
    
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    throw error;
  }
}

/**
 * Create a cleaner assignment structure using links instead of attachments
 */
function createCleanAssignments(classroomId, assignmentDocs) {
  console.log("💡 Alternative: Creating assignments with links to avoid copies...");
  
  const assignments = CONFIG.PROGRAMMING_ASSIGNMENTS;
  const createdAssignments = [];
  
  assignments.forEach((assignment, index) => {
    try {
      const doc = assignmentDocs.find(d => {
        if (assignment.title.includes("Karel") && d.assignmentKey === 'karel') return true;
        if (assignment.title.includes("Grade Calculator") && d.assignmentKey === 'gradeCalculator') return true;
        if (assignment.title.includes("Algorithm") && d.assignmentKey === 'algorithmPresentation') return true;
        if (assignment.title.includes("Python") && d.assignmentKey === 'pythonBasics') return true;
        if (assignment.title.includes("Data Analysis") && d.assignmentKey === 'dataAnalysis') return true;
        return false;
      });
      
      if (!doc) {
        console.log(`⚠️ No document found for assignment: ${assignment.title}`);
        return;
      }
      
      // Get shareable link
      const file = Drive.Files.get(doc.fileId, {fields: 'webViewLink'});
      const dueDate = getDueDate(assignment.dueInDays);
      
      // Create assignment with link in description instead of attachment
      const assignmentData = {
        title: assignment.title,
        description: assignment.description + `\n\nAssignment Document: ${file.webViewLink}`,
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
      
      console.log(`✅ Created assignment with link: ${assignment.title}`);
      createdAssignments.push(createdAssignment);
      
    } catch (error) {
      console.error(`❌ Error creating assignment ${assignment.title}:`, error);
    }
  });
  
  return createdAssignments;
}