/**
 * Main orchestration script for Classroom Test Data Generator
 * Location: main.gs
 */

/**
 * MAIN FUNCTION: Generate test classroom with simplified approach
 * This is the recommended function to use - it creates a working classroom
 * without the complex Drive folder management that causes issues.
 */
function generateTestClassroom() {
  console.log("🚀 Starting Simplified Classroom Generation...");
  
  try {
    // Step 1: Create the classroom first
    console.log("🏫 Creating test classroom...");
    const classroom = createTestClassroom();
    
    // Skip students for now - add them manually after activation
    console.log("⏭️ Skipping student enrollment (add manually after activation)");
    
    // Step 2: Create submission-based assignments (no documents needed)
    console.log("📝 Creating student submission assignments...");
    const assignments = createStudentSubmissionAssignments(classroom.id);
    
    // Step 3: Create quiz forms with answer keys (let Google handle folder organization)
    console.log("📋 Creating quiz forms with answer keys...");
    const quizForms = createImprovedQuizForms();
    
    // Step 4: Create quiz assignments in classroom (with form links)
    console.log("🧮 Creating quiz assignments...");
    const quizAssignments = createQuizAssignmentsWithLinks(classroom.id, quizForms);
    
    console.log("\n✅ Classroom generation complete!");
    console.log("\n📋 Next Steps:");
    console.log("1. Go to: https://classroom.google.com/c/" + classroom.id);
    console.log("2. Accept/Activate the classroom");
    console.log("3. Enrollment code: " + classroom.enrollmentCode);
    console.log("4. Add test students manually or share enrollment code");
    console.log("\n📁 All materials will be organized automatically by Google Classroom");
    
    return {
      classroom: classroom,
      assignments: assignments,
      quizForms: quizForms,
      quizAssignments: quizAssignments
    };
    
  } catch (error) {
    console.error("❌ Error:", error);
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
    
    // Get project info
    console.log("\n📋 Project Information:");
    console.log("Script ID: " + ScriptApp.getScriptId());
    
    // Test Forms API
    const testFormsResult = testFormsApi();
    if (testFormsResult) {
      console.log("✅ Forms API: Working");
    } else {
      console.log("❌ Forms API: Not working - check Cloud Project settings");
    }
    
    console.log("🎉 API test complete!");
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
    
    // Find and delete test folders in /roo/test-classrooms
    const testFolders = Drive.Files.list({
      q: "name contains 'CS101 Test Materials' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    });
    
    if (testFolders.files) {
      testFolders.files.forEach(folder => {
        try {
          Drive.Files.delete(folder.id);
          console.log(`📁 Deleted folder: ${folder.name}`);
        } catch (error) {
          console.error(`Failed to delete folder ${folder.name}:`, error);
        }
      });
    }
    
    // Optionally clean up empty parent folders
    console.log("💡 Tip: Empty /roo/test-classrooms/ folder remains for future tests");
    
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

/**
 * DEPRECATED: Use generateTestClassroom() instead
 * This function remains for backward compatibility but is no longer needed
 */
function generateTestClassroomSimple() {
  console.log("⚠️ generateTestClassroomSimple() is deprecated.");
  console.log("🔄 Redirecting to generateTestClassroom()...");
  return generateTestClassroom();
}

/**
 * Add fake students to an ACTIVE classroom
 * Run this AFTER you have activated your classroom manually
 * Note: Only works on ACTIVE classrooms, not PROVISIONED ones
 */
function addFakeStudentsToActiveClassroom(classroomId = null) {
  console.log("👥 Adding fake students to active classroom...");
  
  // If no classroom ID provided, find the test classroom
  if (!classroomId) {
    const courses = Classroom.Courses.list();
    if (courses.courses) {
      const testCourse = courses.courses.find(course => 
        course.name && course.name.includes("CS101 Test") && course.courseState === "ACTIVE"
      );
      
      if (testCourse) {
        classroomId = testCourse.id;
        console.log(`📚 Found active classroom: ${testCourse.name}`);
      } else {
        console.error("❌ No active test classroom found. Please activate your classroom first.");
        console.log("💡 Go to https://classroom.google.com and activate your classroom, then try again.");
        return null;
      }
    }
  }
  
  try {
    // Get classroom info to verify it's active
    const classroom = Classroom.Courses.get(classroomId);
    if (classroom.courseState !== "ACTIVE") {
      console.error("❌ Classroom is not ACTIVE. Current state:", classroom.courseState);
      console.log("💡 Please activate your classroom first:");
      console.log("1. Go to: https://classroom.google.com/c/" + classroomId);
      console.log("2. Click 'Accept' to activate");
      return null;
    }
    
    // Add a small number of fake students (5 instead of 20)
    const studentCount = 5;
    const students = generateFakeStudents(studentCount);
    const addedStudents = [];
    
    console.log(`📧 Adding ${studentCount} fake students...`);
    
    students.forEach((student, index) => {
      try {
        // Add student to classroom using invitation
        const invitation = {
          courseId: classroomId,
          userId: student.email,
          role: "STUDENT"
        };
        
        const sentInvitation = Classroom.Invitations.create(invitation);
        console.log(`✉️  Invited: ${student.name} (${student.email})`);
        
        addedStudents.push({
          ...student,
          invitationId: sentInvitation.id
        });
        
        // Small delay to avoid rate limiting
        Utilities.sleep(500);
        
      } catch (error) {
        console.error(`❌ Failed to invite ${student.name}:`, error.message);
      }
    });
    
    console.log(`\n✅ Successfully sent ${addedStudents.length} student invitations!`);
    console.log("\n📋 Next Steps:");
    console.log("1. Students will receive email invitations");
    console.log("2. They need to accept invitations to join");
    console.log("3. For testing, you can create test Google accounts with these emails");
    console.log("\n👥 Added Students:");
    addedStudents.forEach(student => {
      console.log(`   • ${student.name} - ${student.email}`);
    });
    
    return {
      classroomId: classroomId,
      studentsInvited: addedStudents.length,
      students: addedStudents
    };
    
  } catch (error) {
    console.error("❌ Error adding students:", error);
    throw error;
  }
}