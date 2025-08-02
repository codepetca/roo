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
    courseState: "ACTIVE"
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
function createDriveFolders() {
  console.log("Creating Drive folder structure...");
  
  try {
    // Create main folder
    const mainFolder = Drive.Files.insert({
      title: CONFIG.DRIVE_FOLDERS.mainFolder,
      mimeType: 'application/vnd.google-apps.folder'
    });
    
    // Create assignments subfolder
    const assignmentsFolder = Drive.Files.insert({
      title: CONFIG.DRIVE_FOLDERS.assignments,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [{id: mainFolder.id}]
    });
    
    // Create quizzes subfolder
    const quizzesFolder = Drive.Files.insert({
      title: CONFIG.DRIVE_FOLDERS.quizzes,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [{id: mainFolder.id}]
    });
    
    console.log(`✅ Created folder structure:`);
    console.log(`   Main: ${mainFolder.title} (${mainFolder.id})`);
    console.log(`   Assignments: ${assignmentsFolder.title} (${assignmentsFolder.id})`);
    console.log(`   Quizzes: ${quizzesFolder.title} (${quizzesFolder.id})`);
    
    return {
      main: mainFolder,
      assignments: assignmentsFolder,
      quizzes: quizzesFolder
    };
    
  } catch (error) {
    console.error("❌ Error creating folders:", error);
    throw error;
  }
}

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