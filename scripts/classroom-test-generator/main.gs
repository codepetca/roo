/**
 * Main orchestration script for Classroom Test Data Generator
 * Location: main.gs
 */

/**
 * Main function to generate complete test classroom
 * Run this function to create everything
 */
function generateTestClassroom() {
  console.log("🚀 Starting Classroom Test Data Generation...");
  
  try {
    // Step 1: Create main Drive folder structure
    console.log("📁 Creating Drive folder structure...");
    const folders = createDriveFolders();
    
    // Step 2: Create the classroom
    console.log("🏫 Creating test classroom...");
    const classroom = createTestClassroom();
    
    // Step 3: Add fake students
    console.log("👥 Adding fake students...");
    const students = addFakeStudents(classroom.id);
    
    // Step 4: Create programming assignment documents
    console.log("📝 Creating programming assignment documents...");
    const assignmentDocs = createProgrammingDocuments(folders.assignments);
    
    // Step 5: Create programming assignments in classroom
    console.log("💻 Creating programming assignments...");
    const programmingAssignments = createProgrammingAssignments(classroom.id, assignmentDocs);
    
    // Step 6: Create quiz forms with answer keys
    console.log("📋 Creating quiz forms with answer keys...");
    const quizForms = createQuizForms(folders.quizzes);
    
    // Step 7: Create quiz assignments in classroom
    console.log("🧮 Creating quiz assignments...");
    const quizAssignments = createQuizAssignments(classroom.id, quizForms);
    
    // Step 8: Generate summary
    console.log("📊 Generating summary...");
    const summary = generateSummary(classroom, students, programmingAssignments, quizAssignments);
    
    console.log("✅ Test classroom generation complete!");
    console.log("📋 Summary:", summary);
    
    return {
      classroom: classroom,
      students: students,
      programmingAssignments: programmingAssignments,
      quizAssignments: quizAssignments,
      summary: summary
    };
    
  } catch (error) {
    console.error("❌ Error generating test classroom:", error);
    throw error;
  }
}

/**
 * Test function to verify API access
 */
function testApiAccess() {
  console.log("🔧 Testing API access...");
  
  try {
    // Test Classroom API
    const courses = Classroom.Courses.list();
    console.log("✅ Classroom API: Working");
    
    // Test Drive API
    const files = Drive.Files.list({q: "name='test'", maxResults: 1});
    console.log("✅ Drive API: Working");
    
    // Test Forms API via REST
    const token = ScriptApp.getOAuthToken();
    console.log("✅ OAuth Token: Obtained");
    
    console.log("🎉 All APIs accessible!");
    return true;
    
  } catch (error) {
    console.error("❌ API Access Error:", error);
    console.log("Please ensure all APIs are enabled in Google Cloud Console");
    return false;
  }
}

/**
 * Utility function to clean up test data (use carefully!)
 */
function cleanupTestData() {
  const confirmation = Browser.msgBox(
    "⚠️ Warning", 
    "This will delete all test classrooms and documents. Are you sure?", 
    Browser.Buttons.YES_NO
  );
  
  if (confirmation === "yes") {
    console.log("🧹 Cleaning up test data...");
    
    // Find and archive test classrooms
    const courses = Classroom.Courses.list();
    if (courses.courses) {
      courses.courses.forEach(course => {
        if (course.name && course.name.includes("CS101 Test")) {
          try {
            course.courseState = "ARCHIVED";
            Classroom.Courses.patch(course, course.id);
            console.log(`📚 Archived classroom: ${course.name}`);
          } catch (error) {
            console.error(`Failed to archive classroom ${course.name}:`, error);
          }
        }
      });
    }
    
    // Find and delete test folders
    const folders = Drive.Files.list({
      q: "name='CS101 Test Materials' and mimeType='application/vnd.google-apps.folder'"
    });
    
    if (folders.files) {
      folders.files.forEach(folder => {
        try {
          Drive.Files.remove(folder.id);
          console.log(`📁 Deleted folder: ${folder.name}`);
        } catch (error) {
          console.error(`Failed to delete folder ${folder.name}:`, error);
        }
      });
    }
    
    console.log("✅ Cleanup complete!");
  }
}

/**
 * Get classroom invite link for sharing
 */
function getClassroomInfo() {
  const courses = Classroom.Courses.list();
  if (courses.courses) {
    const testCourse = courses.courses.find(course => 
      course.name && course.name.includes("CS101 Test")
    );
    
    if (testCourse) {
      console.log("📚 Test Classroom Found:");
      console.log(`   Name: ${testCourse.name}`);
      console.log(`   ID: ${testCourse.id}`);
      console.log(`   Enrollment Code: ${testCourse.enrollmentCode}`);
      console.log(`   Link: https://classroom.google.com/c/${testCourse.id}`);
      
      return testCourse;
    }
  }
  
  console.log("No test classroom found. Run generateTestClassroom() first.");
  return null;
}