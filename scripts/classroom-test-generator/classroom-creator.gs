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
 * DEPRECATED: Creates complex Drive folder structure
 * The simplified approach lets Google Classroom handle organization automatically
 */
function createDriveFolders(classroomName) {
  console.log("Creating Drive folder structure...");
  
  try {
    // Create or find /Classrooms folder (Google's default)
    let classroomsFolder = findOrCreateFolder(CONFIG.DRIVE_FOLDERS.classroomsFolder, null);
    
    // Create folder for this specific classroom (just the class name, no timestamp)
    const classroomFolderName = classroomName || CONFIG.CLASSROOM.name;
    
    // Check if classroom folder already exists
    let classroomFolder = findExistingFolder(classroomFolderName, classroomsFolder.id);
    
    if (!classroomFolder) {
      // Create new classroom folder
      classroomFolder = Drive.Files.create({
        name: classroomFolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [classroomsFolder.id]
      });
      
      // Make folder shareable
      Drive.Permissions.create({
        role: 'reader',
        type: 'anyone',
        allowFileDiscovery: false
      }, classroomFolder.id);
      
      console.log(`✅ Created new classroom folder: ${classroomFolderName}`);
    } else {
      console.log(`📁 Using existing classroom folder: ${classroomFolderName}`);
    }
    
    console.log(`✅ Folder structure ready:`);
    console.log(`   Path: /Classrooms/${classroomFolderName}`);
    console.log(`   Folder ID: ${classroomFolder.id}`);
    console.log(`   View in Drive: https://drive.google.com/drive/folders/${classroomFolder.id}`);
    
    return {
      classroomFolder: classroomFolder,
      classroomsFolder: classroomsFolder,
      folderUrl: `https://drive.google.com/drive/folders/${classroomFolder.id}`
    };
    
  } catch (error) {
    console.error("❌ Error creating folders:", error);
    throw error;
  }
}

/**
 * Helper function to find existing folder (returns null if not found)
 */
function findExistingFolder(folderName, parentId) {
  let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  } else {
    query += ` and 'root' in parents`;
  }
  
  const folders = Drive.Files.list({
    q: query,
    fields: 'files(id, name)'
  });
  
  return (folders.files && folders.files.length > 0) ? folders.files[0] : null;
}

/**
 * Find Google Classroom's automatically created folder (in root)
 */
function findClassroomAutoFolder(classroomName) {
  console.log(`Looking for Classroom's auto-created folder: ${classroomName}`);
  
  // Look in root for the classroom folder (Google's default)
  let classroomFolder = findExistingFolder(classroomName, null);
  
  if (!classroomFolder) {
    // If not found, create a simple folder in root (matching Google's behavior)
    console.log("📁 Classroom folder not found, creating in root...");
    classroomFolder = Drive.Files.create({
      name: classroomName,
      mimeType: 'application/vnd.google-apps.folder'
      // No parents = root folder
    });
    
    console.log(`✅ Created classroom folder in root: ${classroomName}`);
  } else {
    console.log(`✅ Found existing classroom folder: ${classroomName}`);
  }
  
  console.log(`   Folder ID: ${classroomFolder.id}`);
  console.log(`   View in Drive: https://drive.google.com/drive/folders/${classroomFolder.id}`);
  
  return {
    classroomFolder: classroomFolder,
    folderUrl: `https://drive.google.com/drive/folders/${classroomFolder.id}`
  };
}

/**
 * Helper function to find or create a folder
 */
function findOrCreateFolder(folderName, parentId) {
  // Build query
  let query = `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  } else {
    query += ` and 'root' in parents`;
  }
  
  // Search for existing folder
  const folders = Drive.Files.list({
    q: query,
    fields: 'files(id, name)'
  });
  
  if (folders.files && folders.files.length > 0) {
    console.log(`📁 Found existing folder: ${folderName}`);
    return folders.files[0];
  }
  
  // Create new folder if not found
  const folderMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  
  if (parentId) {
    folderMetadata.parents = [parentId];
  }
  
  const newFolder = Drive.Files.create(folderMetadata);
  console.log(`📁 Created new folder: ${folderName}`);
  return newFolder;
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