/**
 * Google Classroom ID Tester
 * Tests availability and access patterns for various Google Classroom API IDs
 * 
 * Location: appscript/development/classroom-id-tester/Code.gs
 */

/**
 * Main function to test all accessible Google Classroom IDs
 * Run this function to see what IDs are available through the Classroom API
 */
function testClassroomIds() {
  Logger.log("===============================================");
  Logger.log("       GOOGLE CLASSROOM ID ACCESSIBILITY TEST");
  Logger.log("===============================================");
  
  // Test user identification
  testUserIds();
  
  // Test course access and IDs  
  testCourseIds();
  
  Logger.log("===============================================");
  Logger.log("              TEST COMPLETE");
  Logger.log("===============================================");
}

/**
 * Test user identification methods
 * Tests Session API and People API for user ID access
 */
function testUserIds() {
  Logger.log("");
  Logger.log("=== USER IDENTIFICATION ===");
  
  // Session API - Active user
  try {
    const activeUser = Session.getActiveUser();
    Logger.log("✓ Session Active User Email: " + activeUser.getEmail());
    Logger.log("✓ Session Effective User Email: " + Session.getEffectiveUser().getEmail());
  } catch (err) {
    Logger.log("✗ Session API Error: " + err.message);
  }

  // People API - Get immutable user ID
  try {
    const me = People.People.get("people/me", {
      personFields: "names,emailAddresses"
    });
    Logger.log("✓ People API Resource Name: " + me.resourceName);
    Logger.log("✓ People API Display Name: " + (me.names && me.names[0] ? me.names[0].displayName : "N/A"));
    Logger.log("✓ People API Email: " + (me.emailAddresses && me.emailAddresses[0] ? me.emailAddresses[0].value : "N/A"));
  } catch (err) {
    Logger.log("✗ People API Error: " + err.message);
  }
  
  // Test Classroom profile access
  try {
    const profile = Classroom.UserProfiles.get("me");
    Logger.log("✓ Classroom Profile ID: " + profile.id);
    Logger.log("✓ Classroom Profile Name: " + profile.name.fullName);
    Logger.log("✓ Classroom Profile Email: " + profile.emailAddress);
  } catch (err) {
    Logger.log("✗ Classroom Profile Error: " + err.message);
  }
}

/**
 * Test course access and related IDs
 * Tests courses, students, assignments, and submissions
 */
function testCourseIds() {
  Logger.log("");
  Logger.log("=== COURSE ACCESS ===");
  
  let totalCourses = 0;
  let totalStudents = 0;
  let totalAssignments = 0;
  let totalSubmissions = 0;
  
  try {
    // Get courses where user is a teacher
    const courses = Classroom.Courses.list({ 
      teacherId: "me",
      courseStates: ["ACTIVE", "ARCHIVED"]
    }).courses || [];
    
    totalCourses = courses.length;
    Logger.log("✓ Total Accessible Courses: " + totalCourses);
    
    if (totalCourses === 0) {
      Logger.log("  No courses found where you are a teacher");
      return;
    }
    
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      Logger.log("");
      Logger.log("--- Course " + (i + 1) + " ---");
      Logger.log("  Name: " + course.name);
      Logger.log("  Course ID: " + course.id);
      Logger.log("  State: " + course.courseState);
      Logger.log("  Owner ID: " + course.ownerId);
      Logger.log("  Creation Time: " + (course.creationTime || "N/A"));
      
      // Test student access
      const studentCount = testStudentIds(course.id);
      totalStudents += studentCount;
      
      // Test assignment access
      const assignmentCount = testAssignmentIds(course.id);
      totalAssignments += assignmentCount;
    }
    
  } catch (err) {
    Logger.log("✗ Course List Error: " + err.message);
  }
  
  Logger.log("");
  Logger.log("=== SUMMARY ===");
  Logger.log("Total Courses: " + totalCourses);
  Logger.log("Total Students: " + totalStudents);  
  Logger.log("Total Assignments: " + totalAssignments);
  Logger.log("Total Submissions: " + totalSubmissions);
}

/**
 * Test student ID access for a specific course
 * @param {string} courseId - The course ID to test
 * @return {number} Number of students found
 */
function testStudentIds(courseId) {
  try {
    const students = Classroom.Courses.Students.list(courseId).students || [];
    Logger.log("  ✓ Students in course: " + students.length);
    
    for (let i = 0; i < Math.min(students.length, 3); i++) {
      const student = students[i];
      Logger.log("    Student " + (i + 1) + ":");
      Logger.log("      User ID: " + student.userId);
      Logger.log("      Name: " + student.profile.name.fullName);
      Logger.log("      Email: " + student.profile.emailAddress);
    }
    
    if (students.length > 3) {
      Logger.log("    ... and " + (students.length - 3) + " more students");
    }
    
    return students.length;
    
  } catch (err) {
    Logger.log("  ✗ Student List Error: " + err.message);
    return 0;
  }
}

/**
 * Test assignment and submission ID access for a specific course
 * @param {string} courseId - The course ID to test
 * @return {number} Number of assignments found
 */
function testAssignmentIds(courseId) {
  try {
    const assignments = Classroom.Courses.CourseWork.list(courseId).courseWork || [];
    Logger.log("  ✓ Assignments in course: " + assignments.length);
    
    let totalSubmissions = 0;
    
    for (let i = 0; i < Math.min(assignments.length, 2); i++) {
      const assignment = assignments[i];
      Logger.log("    Assignment " + (i + 1) + ":");
      Logger.log("      CourseWork ID: " + assignment.id);
      Logger.log("      Title: " + assignment.title);
      Logger.log("      State: " + assignment.state);
      Logger.log("      Work Type: " + assignment.workType);
      Logger.log("      Max Points: " + (assignment.maxPoints || "Ungraded"));
      
      // Test submissions for this assignment
      const submissionCount = testSubmissionIds(courseId, assignment.id);
      totalSubmissions += submissionCount;
    }
    
    if (assignments.length > 2) {
      Logger.log("    ... and " + (assignments.length - 2) + " more assignments");
    }
    
    return assignments.length;
    
  } catch (err) {
    Logger.log("  ✗ Assignment List Error: " + err.message);
    return 0;
  }
}

/**
 * Test submission ID access for a specific assignment
 * @param {string} courseId - The course ID
 * @param {string} courseWorkId - The assignment ID
 * @return {number} Number of submissions found
 */
function testSubmissionIds(courseId, courseWorkId) {
  try {
    const submissions = Classroom.Courses.CourseWork.StudentSubmissions.list(
      courseId, 
      courseWorkId
    ).studentSubmissions || [];
    
    Logger.log("      ✓ Submissions: " + submissions.length);
    
    for (let i = 0; i < Math.min(submissions.length, 2); i++) {
      const submission = submissions[i];
      Logger.log("        Submission " + (i + 1) + ":");
      Logger.log("          Submission ID: " + submission.id);
      Logger.log("          Student User ID: " + submission.userId);
      Logger.log("          State: " + submission.state);
      Logger.log("          Late: " + (submission.late || false));
      Logger.log("          Assigned Grade: " + (submission.assignedGrade || "Ungraded"));
    }
    
    if (submissions.length > 2) {
      Logger.log("        ... and " + (submissions.length - 2) + " more submissions");
    }
    
    return submissions.length;
    
  } catch (err) {
    Logger.log("      ✗ Submission List Error: " + err.message);
    return 0;
  }
}

/**
 * Test specific ID access - useful for debugging specific ID types
 * @param {string} idType - Type of ID to test ("user", "course", "student", "assignment", "submission")
 */
function testSpecificId(idType) {
  Logger.log("Testing specific ID type: " + idType);
  
  switch (idType.toLowerCase()) {
    case "user":
      testUserIds();
      break;
    case "course":
      testCourseIds();
      break;
    default:
      Logger.log("Unknown ID type. Available types: user, course");
  }
}

/**
 * Get detailed permissions info - what scopes are actually available
 */
function testPermissions() {
  Logger.log("=== PERMISSION ANALYSIS ===");
  
  const tests = [
    { name: "Course List (as teacher)", test: () => Classroom.Courses.list({ teacherId: "me" }) },
    { name: "Course List (as student)", test: () => Classroom.Courses.list({ studentId: "me" }) },
    { name: "User Profile Access", test: () => Classroom.UserProfiles.get("me") },
    { name: "People API Access", test: () => People.People.get("people/me", { personFields: "names" }) }
  ];
  
  tests.forEach(function(test) {
    try {
      test.test();
      Logger.log("✓ " + test.name + ": ACCESSIBLE");
    } catch (err) {
      Logger.log("✗ " + test.name + ": " + err.message);
    }
  });
}