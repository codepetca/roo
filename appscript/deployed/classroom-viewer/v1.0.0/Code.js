/**
 * Alternative Classroom Viewer using UrlFetchApp
 * Use this if Classroom service is not available
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
 * Get classrooms using REST API
 */
function getClassroomsWithStudents() {
  try {
    const token = ScriptApp.getOAuthToken();
    
    // Get courses
    const coursesUrl = 'https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE';
    const coursesResponse = UrlFetchApp.fetch(coursesUrl, {
      headers: {
        'Authorization': 'Bearer ' + token
      }
    });
    
    const coursesData = JSON.parse(coursesResponse.getContentText());
    const courses = coursesData.courses || [];
    
    // Process each course
    const classroomsData = courses.map(course => {
      let students = [];
      let studentCount = 0;
      
      try {
        // Get students for this course
        const studentsUrl = `https://classroom.googleapis.com/v1/courses/${course.id}/students`;
        const studentsResponse = UrlFetchApp.fetch(studentsUrl, {
          headers: {
            'Authorization': 'Bearer ' + token
          },
          muteHttpExceptions: true
        });
        
        if (studentsResponse.getResponseCode() === 200) {
          const studentsData = JSON.parse(studentsResponse.getContentText());
          
          if (studentsData.students) {
            students = studentsData.students.map(student => {
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
        }
      } catch (error) {
        console.error(`Error fetching students for course ${course.name}:`, error);
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
      message: 'Failed to fetch classrooms. Make sure you have the necessary permissions.'
    };
  }
}

/**
 * Get summary statistics
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