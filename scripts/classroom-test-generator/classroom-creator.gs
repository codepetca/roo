/**
 * Classroom creation and student enrollment functionality
 * Location: classroom-creator.gs
 */

/**
 * Create the main test classroom
 */
function createTestClassroom() {
  console.log("Creating test classroom...");
  
  const classroomData = {
    name: CONFIG.CLASSROOM.name,
    section: CONFIG.CLASSROOM.section,
    description: CONFIG.CLASSROOM.description,
    room: CONFIG.CLASSROOM.room,
    ownerId: CONFIG.CLASSROOM.ownerId,
    courseState: "PROVISIONED"  // Changed from ACTIVE to PROVISIONED
  };
  
  try {
    const classroom = Classroom.Courses.create(classroomData);
    console.log(`✅ Created classroom: ${classroom.name} (ID: ${classroom.id})`);
    console.log(`📋 Enrollment Code: ${classroom.enrollmentCode}`);
    
    return classroom;
  } catch (error) {
    console.error("❌ Error creating classroom:", error);
    throw error;
  }
}

/**
 * Add fake students to the classroom
 */
function addFakeStudents(classroomId) {
  console.log("Adding fake students to classroom...");
  
  const students = generateFakeStudents(CONFIG.STUDENTS.count);
  const addedStudents = [];
  
  students.forEach((student, index) => {
    try {
      // Add student to classroom
      const studentData = {
        userId: student.email
      };
      
      const addedStudent = Classroom.Courses.Students.create(studentData, classroomId);
      
      console.log(`✅ Added student: ${student.fullName} (${student.email})`);
      addedStudents.push({
        ...student,
        classroomId: classroomId,
        userId: addedStudent.userId
      });
      
      // Add small delay to avoid rate limiting
      if (index % 5 === 0 && index > 0) {
        Utilities.sleep(1000);
      }
      
    } catch (error) {
      console.error(`❌ Error adding student ${student.fullName}:`, error);
      // Continue with other students even if one fails
    }
  });
  
  console.log(`✅ Successfully added ${addedStudents.length} students`);
  return addedStudents;
}

/**
 * Create Drive folder structure for storing materials
 */

/**
 * Generate summary of created classroom and contents
 */
function generateSummary(classroom, students, programmingAssignments, quizAssignments) {
  const summary = {
    classroom: {
      name: classroom.name,
      id: classroom.id,
      enrollmentCode: classroom.enrollmentCode,
      link: `https://classroom.google.com/c/${classroom.id}`
    },
    statistics: {
      studentsCount: students.length,
      programmingAssignmentsCount: programmingAssignments.length,
      quizAssignmentsCount: quizAssignments.length,
      totalAssignments: programmingAssignments.length + quizAssignments.length
    },
    students: students.map(s => ({name: s.fullName, email: s.email})),
    assignments: {
      programming: programmingAssignments.map(a => ({title: a.title, type: a.materials[0]?.driveFile?.title || 'Unknown'})),
      quizzes: quizAssignments.map(a => ({title: a.title, formId: a.associatedWithDeveloper?.id}))
    }
  };
  
  // Log summary to console
  console.log("\n📊 CLASSROOM GENERATION SUMMARY");
  console.log("================================");
  console.log(`🏫 Classroom: ${summary.classroom.name}`);
  console.log(`🔗 Link: ${summary.classroom.link}`);
  console.log(`📋 Enrollment Code: ${summary.classroom.enrollmentCode}`);
  console.log(`👥 Students: ${summary.statistics.studentsCount}`);
  console.log(`💻 Programming Assignments: ${summary.statistics.programmingAssignmentsCount}`);
  console.log(`📋 Quiz Assignments: ${summary.statistics.quizAssignmentsCount}`);
  console.log(`📚 Total Assignments: ${summary.statistics.totalAssignments}`);
  
  return summary;
}

/**
 * Helper function to get classroom by name
 */
function findClassroomByName(name) {
  const courses = Classroom.Courses.list();
  
  if (courses.courses) {
    return courses.courses.find(course => course.name === name);
  }
  
  return null;
}

/**
 * Helper function to list all students in a classroom
 */
function listClassroomStudents(classroomId) {
  try {
    const students = Classroom.Courses.Students.list(classroomId);
    return students.students || [];
  } catch (error) {
    console.error("Error listing students:", error);
    return [];
  }
}

/**
 * Helper function to get classroom assignments
 */
function listClassroomAssignments(classroomId) {
  try {
    const assignments = Classroom.Courses.CourseWork.list(classroomId);
    return assignments.courseWork || [];
  } catch (error) {
    console.error("Error listing assignments:", error);
    return [];
  }
}

/**
 * Add fake students to an existing classroom (after it's activated)
 */
function addFakeStudentsToClassroom(classroomId) {
  if (!classroomId) {
    console.log("❌ Please provide a classroom ID");
    console.log("Tip: Run getClassroomInfo() to find your classroom ID");
    return;
  }
  
  console.log(`📚 Adding fake students to classroom ${classroomId}...`);
  
  try {
    // Check if classroom exists and is active
    const classroom = Classroom.Courses.get(classroomId);
    
    if (classroom.courseState !== "ACTIVE") {
      console.log("⚠️ Classroom is not active. Please activate it first at:");
      console.log(`https://classroom.google.com/c/${classroomId}`);
      return;
    }
    
    // Add students
    const students = addFakeStudents(classroomId);
    
    console.log(`\n✅ Successfully added ${students.length} fake students!`);
    console.log("📋 Student list:");
    students.forEach(s => {
      console.log(`   - ${s.fullName} (${s.email})`);
    });
    
    return students;
    
  } catch (error) {
    console.error("❌ Error adding students:", error);
    
    if (error.toString().includes("courseState")) {
      console.log("\n⚠️ Make sure the classroom is activated first!");
    }
  }
}

/**
 * Create a complete test classroom with students (requires manual activation)
 */
function generateCompleteTestClassroom() {
  console.log("🚀 Creating complete test classroom...");
  
  // First create classroom and materials
  const result = generateTestClassroomSimple();
  
  console.log("\n📋 IMPORTANT: Manual steps required:");
  console.log("1. Activate the classroom at: https://classroom.google.com/c/" + result.classroom.id);
  console.log("2. Once activated, run: addFakeStudentsToClassroom('" + result.classroom.id + "')");
  console.log("3. Enrollment code for real test accounts: " + result.classroom.enrollmentCode);
  
  return result;
}