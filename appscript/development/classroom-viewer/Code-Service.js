/**
 * Classroom Viewer MVP
 * Simple dashboard to view teacher's classrooms and students
 */

// Web App entry point
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Roo Classroom Viewer')
    .setWidth(1200)
    .setHeight(800);
}

// Include other HTML files
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get all classrooms for the current teacher with student details
 * @returns {Object} Success status and array of classrooms
 */
function getClassroomsWithStudents() {
  try {
    console.log('Fetching classrooms...');
    
    // Get all active courses where user is a teacher
    const coursesResponse = Classroom.Courses.list({
      teacherId: 'me',
      courseStates: ['ACTIVE'],
      pageSize: 50
    });
    
    const courses = coursesResponse.courses || [];
    console.log(`Found ${courses.length} courses`);
    
    // Process each course
    const classroomsData = courses.map(course => {
      // Get students for this course
      let students = [];
      let studentCount = 0;
      
      try {
        const studentsResponse = Classroom.Courses.Students.list(course.id);
        
        if (studentsResponse.students) {
          students = studentsResponse.students.map(student => {
            const email = student.profile.emailAddress;
            const studentNumber = email.split('@')[0];
            
            return {
              userId: student.userId,
              email: email,
              studentNumber: studentNumber,
              fullName: student.profile.name.fullName,
              firstName: student.profile.name.givenName || '',
              lastName: student.profile.name.familyName || '',
              photoUrl: student.profile.photoUrl || ''
            };
          });
          
          studentCount = students.length;
        }
      } catch (error) {
        console.error(`Error fetching students for course ${course.name}:`, error);
        // Continue with empty students array
      }
      
      return {
        id: course.id,
        name: course.name,
        section: course.section || '',
        description: course.descriptionHeading || '',
        enrollmentCode: course.enrollmentCode || '',
        courseState: course.courseState,
        creationTime: course.creationTime,
        studentCount: studentCount,
        students: students,
        alternateLink: course.alternateLink || ''
      };
    });
    
    // Sort by name
    classroomsData.sort((a, b) => a.name.localeCompare(b.name));
    
    return {
      success: true,
      data: classroomsData,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Error in getClassroomsWithStudents:', error);
    return {
      success: false,
      error: error.toString(),
      message: 'Failed to fetch classrooms. Make sure Classroom API is enabled.'
    };
  }
}

/**
 * Get summary statistics across all classrooms
 * @returns {Object} Summary statistics
 */
function getClassroomStats() {
  try {
    const result = getClassroomsWithStudents();
    
    if (!result.success) {
      return result;
    }
    
    const classrooms = result.data;
    
    // Calculate statistics
    const totalStudents = classrooms.reduce((sum, classroom) => sum + classroom.studentCount, 0);
    const uniqueStudents = new Set();
    
    classrooms.forEach(classroom => {
      classroom.students.forEach(student => {
        uniqueStudents.add(student.email);
      });
    });
    
    return {
      success: true,
      data: {
        totalClassrooms: classrooms.length,
        totalEnrollments: totalStudents,
        uniqueStudents: uniqueStudents.size,
        averageClassSize: classrooms.length > 0 ? Math.round(totalStudents / classrooms.length) : 0
      }
    };
    
  } catch (error) {
    console.error('Error in getClassroomStats:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Export classroom data as CSV
 * @returns {Object} CSV data
 */
function exportClassroomData() {
  try {
    const result = getClassroomsWithStudents();
    
    if (!result.success) {
      return result;
    }
    
    // Create CSV header
    let csv = 'Course Name,Course Code,Student Name,Student Email,Student Number\n';
    
    // Add data rows
    result.data.forEach(classroom => {
      classroom.students.forEach(student => {
        csv += `"${classroom.name}","${classroom.enrollmentCode}","${student.fullName}","${student.email}","${student.studentNumber}"\n`;
      });
    });
    
    return {
      success: true,
      data: csv,
      filename: `classroom_export_${new Date().toISOString().split('T')[0]}.csv`
    };
    
  } catch (error) {
    console.error('Error in exportClassroomData:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}