/**
 * API Gateway - Central point for all data access
 * Toggle USE_MOCK to switch between mock data and real APIs
 */

// Configuration
const CONFIG = {
  USE_MOCK: true,  // Toggle between mock and real APIs
  API_BASE_URL: 'https://your-firebase-functions-url/api/v2',
  API_KEY: 'your-api-key-here',
  DEBUG: true  // Enable debug logging
};

/**
 * Log debug messages if debugging is enabled
 */
function debugLog(message, data) {
  if (CONFIG.DEBUG) {
    console.log(`[ApiGateway] ${message}`, data || '');
  }
}

/**
 * Simulate network delay for mock calls
 */
function simulateDelay(ms = 1) {
  if (CONFIG.USE_MOCK) {
    Utilities.sleep(ms);
  }
}

/**
 * Fetch classroom data from Google Classroom API or mock
 */
function fetchClassrooms() {
  debugLog('fetchClassrooms called', { useMock: CONFIG.USE_MOCK });
  
  try {
    if (CONFIG.USE_MOCK) {
      simulateDelay(300);
      return {
        success: true,
        data: MOCK_CLASSROOMS,
        source: 'mock',
        timestamp: new Date().toISOString()
      };
    } else {
      // Real implementation - Google Classroom API
      const token = ScriptApp.getOAuthToken();
      const response = UrlFetchApp.fetch(
        'https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE',
        {
          headers: { 
            'Authorization': 'Bearer ' + token 
          },
          muteHttpExceptions: true
        }
      );
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`API Error: ${response.getResponseCode()} - ${response.getContentText()}`);
      }
      
      const data = JSON.parse(response.getContentText());
      return {
        success: true,
        data: data.courses || [],
        source: 'google-classroom',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    debugLog('fetchClassrooms error', error.toString());
    return {
      success: false,
      error: error.toString(),
      source: CONFIG.USE_MOCK ? 'mock' : 'google-classroom',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Fetch assignments for a specific classroom
 */
function fetchAssignments(classroomId) {
  debugLog('fetchAssignments called', { classroomId, useMock: CONFIG.USE_MOCK });
  
  try {
    if (CONFIG.USE_MOCK) {
      simulateDelay(200);
      return {
        success: true,
        data: MOCK_ASSIGNMENTS[classroomId] || [],
        source: 'mock',
        timestamp: new Date().toISOString()
      };
    } else {
      // Real implementation - Google Classroom coursework API
      const token = ScriptApp.getOAuthToken();
      const response = UrlFetchApp.fetch(
        `https://classroom.googleapis.com/v1/courses/${classroomId}/courseWork`,
        {
          headers: { 
            'Authorization': 'Bearer ' + token 
          },
          muteHttpExceptions: true
        }
      );
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`API Error: ${response.getResponseCode()} - ${response.getContentText()}`);
      }
      
      const data = JSON.parse(response.getContentText());
      return {
        success: true,
        data: data.courseWork || [],
        source: 'google-classroom',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    debugLog('fetchAssignments error', error.toString());
    return {
      success: false,
      error: error.toString(),
      source: CONFIG.USE_MOCK ? 'mock' : 'google-classroom',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Fetch student submissions for an assignment
 */
function fetchSubmissions(classroomId, assignmentId) {
  debugLog('fetchSubmissions called', { classroomId, assignmentId, useMock: CONFIG.USE_MOCK });
  
  try {
    if (CONFIG.USE_MOCK) {
      simulateDelay(300);
      const submissions = MOCK_SUBMISSIONS[assignmentId] || [];
      return {
        success: true,
        data: submissions,
        stats: {
          total: submissions.length,
          graded: submissions.filter(s => s.status === 'graded').length,
          pending: submissions.filter(s => s.status === 'pending').length,
          grading: submissions.filter(s => s.status === 'grading').length
        },
        source: 'mock',
        timestamp: new Date().toISOString()
      };
    } else {
      // Real implementation - Google Classroom submissions API
      const token = ScriptApp.getOAuthToken();
      const response = UrlFetchApp.fetch(
        `https://classroom.googleapis.com/v1/courses/${classroomId}/courseWork/${assignmentId}/studentSubmissions`,
        {
          headers: { 
            'Authorization': 'Bearer ' + token 
          },
          muteHttpExceptions: true
        }
      );
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`API Error: ${response.getResponseCode()} - ${response.getContentText()}`);
      }
      
      const data = JSON.parse(response.getContentText());
      const submissions = data.studentSubmissions || [];
      
      return {
        success: true,
        data: submissions,
        stats: {
          total: submissions.length,
          graded: submissions.filter(s => s.state === 'TURNED_IN' && s.assignedGrade).length,
          pending: submissions.filter(s => s.state === 'TURNED_IN' && !s.assignedGrade).length,
          grading: 0  // Not applicable for real API
        },
        source: 'google-classroom',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    debugLog('fetchSubmissions error', error.toString());
    return {
      success: false,
      error: error.toString(),
      source: CONFIG.USE_MOCK ? 'mock' : 'google-classroom',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Fetch complete dashboard data (all classrooms with nested assignments, students, submissions)
 * This is the main function that populates the teacher dashboard cache
 */
function fetchFullDashboardData() {
  debugLog('fetchFullDashboardData called', { useMock: CONFIG.USE_MOCK });
  
  try {
    if (CONFIG.USE_MOCK) {
      simulateDelay(1000); // Simulate network delay for complete data fetch
      
      // Build complete dashboard structure from mock data
      const dashboardData = buildMockDashboardData();
      
      return {
        success: true,
        data: dashboardData,
        source: 'mock',
        timestamp: new Date().toISOString()
      };
    } else {
      // Real implementation - fetch from Google Classroom APIs
      return fetchRealDashboardData();
    }
  } catch (error) {
    debugLog('fetchFullDashboardData error', error.toString());
    return {
      success: false,
      error: error.toString(),
      source: CONFIG.USE_MOCK ? 'mock' : 'google-classroom',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Build complete dashboard data structure from mock data
 */
function buildMockDashboardData() {
  debugLog('Building mock dashboard data');
  
  // Get teacher info
  const teacher = {
    email: Session.getActiveUser().getEmail(),
    name: Session.getActiveUser().getEmail().split('@')[0],
    isTeacher: true
  };
  
  debugLog('Building classrooms with nested data');
  
  // Build classrooms with complete nested data
  const classrooms = MOCK_CLASSROOMS.map(classroom => {
    const assignments = MOCK_ASSIGNMENTS[classroom.id] || [];
    const students = MOCK_STUDENTS[classroom.id] || [];
    const submissions = [];
    
    debugLog(`Processing classroom ${classroom.id}`, {
      assignmentCount: assignments.length,
      studentCount: students.length,
      assignmentTitles: assignments.map(a => a.title).slice(0, 3)
    });
    
    // Collect all submissions for this classroom
    assignments.forEach(assignment => {
      const assignmentSubmissions = MOCK_SUBMISSIONS[assignment.id] || [];
      submissions.push(...assignmentSubmissions);
    });
    
    debugLog(`Classroom ${classroom.id} submissions collected`, {
      totalSubmissions: submissions.length
    });
    
    // Transform to cache format
    const transformedClassroom = {
      ...classroom,
      // Update counts based on actual data
      studentCount: students.length,
      assignmentCount: assignments.length,
      totalSubmissions: submissions.length,
      ungradedSubmissions: submissions.filter(s => s.status === 'pending' || s.status === 'submitted').length,
      
      // Add nested data
      assignments: assignments,
      students: students,
      submissions: submissions
    };
    
    debugLog(`Transformed classroom ${classroom.id}`, {
      assignmentCount: transformedClassroom.assignmentCount,
      totalSubmissions: transformedClassroom.totalSubmissions,
      hasAssignments: Array.isArray(transformedClassroom.assignments),
      actualAssignments: transformedClassroom.assignments.length
    });
    
    return transformedClassroom;
  });
  
  debugLog('Calling CacheManager.createDashboardCache', {
    classroomCount: classrooms.length,
    totalAssignments: classrooms.reduce((sum, c) => sum + c.assignments.length, 0)
  });
  
  // Use server-side CacheManager to create proper structure
  const result = CacheManager.createDashboardCache(teacher, classrooms, 'mock');
  
  debugLog('CacheManager.createDashboardCache result', {
    hasClassrooms: !!result.classrooms,
    classroomCount: result.classrooms?.length || 0,
    firstClassroomAssignments: result.classrooms?.[0]?.assignments?.length || 0
  });
  
  return result;
}

/**
 * Fetch real dashboard data from Google Classroom APIs
 */
function fetchRealDashboardData() {
  debugLog('Fetching real dashboard data from Google Classroom');
  
  try {
    const token = ScriptApp.getOAuthToken();
    
    // Step 1: Get teacher info
    const teacher = {
      email: Session.getActiveUser().getEmail(),
      name: Session.getActiveUser().getEmail().split('@')[0],
      isTeacher: true
    };
    
    // Step 2: Get all classrooms
    const classroomsResponse = UrlFetchApp.fetch(
      'https://classroom.googleapis.com/v1/courses?teacherId=me&courseStates=ACTIVE',
      {
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      }
    );
    
    if (classroomsResponse.getResponseCode() !== 200) {
      throw new Error(`Classrooms API Error: ${classroomsResponse.getResponseCode()}`);
    }
    
    const classroomsData = JSON.parse(classroomsResponse.getContentText());
    const courses = classroomsData.courses || [];
    
    // Step 3: For each classroom, fetch assignments, students, and submissions
    const classrooms = courses.map(course => {
      debugLog('Processing classroom', { id: course.id, name: course.name });
      
      try {
        // Fetch assignments for this classroom
        const assignmentsResponse = UrlFetchApp.fetch(
          `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`,
          {
            headers: { 'Authorization': 'Bearer ' + token },
            muteHttpExceptions: true
          }
        );
        
        const assignments = assignmentsResponse.getResponseCode() === 200 
          ? JSON.parse(assignmentsResponse.getContentText()).courseWork || []
          : [];
        
        // Fetch students for this classroom
        const studentsResponse = UrlFetchApp.fetch(
          `https://classroom.googleapis.com/v1/courses/${course.id}/students`,
          {
            headers: { 'Authorization': 'Bearer ' + token },
            muteHttpExceptions: true
          }
        );
        
        const students = studentsResponse.getResponseCode() === 200
          ? JSON.parse(studentsResponse.getContentText()).students || []
          : [];
        
        // For now, we'll skip fetching submissions for each assignment to avoid API limits
        // In a production system, this would be done in batches or on-demand
        const submissions = [];
        
        return {
          ...course,
          studentCount: students.length,
          assignmentCount: assignments.length,
          totalSubmissions: submissions.length,
          ungradedSubmissions: 0,
          assignments: assignments,
          students: students,
          submissions: submissions
        };
      } catch (error) {
        debugLog('Error processing classroom', { classroomId: course.id, error: error.toString() });
        // Return classroom with empty nested data on error
        return {
          ...course,
          studentCount: 0,
          assignmentCount: 0,
          totalSubmissions: 0,
          ungradedSubmissions: 0,
          assignments: [],
          students: [],
          submissions: []
        };
      }
    });
    
    // Use server-side CacheManager to create proper structure
    const dashboardData = CacheManager.createDashboardCache(teacher, classrooms, 'google-classroom');
    
    return {
      success: true,
      data: dashboardData,
      source: 'google-classroom',
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    debugLog('fetchRealDashboardData error', error.toString());
    throw error;
  }
}

/**
 * Call external API for AI grading
 */
function callGradingAPI(submissionData) {
  debugLog('callGradingAPI called', { submissionId: submissionData.id, useMock: CONFIG.USE_MOCK });
  
  try {
    if (CONFIG.USE_MOCK) {
      // Simulate AI processing time
      simulateDelay(2000);
      
      // Generate mock AI response
      const baseScore = Math.floor(Math.random() * 30) + 70;  // 70-100
      const feedback = generateMockFeedback(submissionData.type, baseScore);
      
      return {
        success: true,
        data: {
          submissionId: submissionData.id,
          score: baseScore,
          feedback: feedback,
          confidence: 0.85 + (Math.random() * 0.15),  // 0.85-1.0
          gradedAt: new Date().toISOString(),
          gradingTime: 2000  // ms
        },
        source: 'mock',
        timestamp: new Date().toISOString()
      };
    } else {
      // Real implementation - Firebase Functions API
      const startTime = Date.now();
      const response = UrlFetchApp.fetch(
        `${CONFIG.API_BASE_URL}/grade/submission`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': CONFIG.API_KEY
          },
          payload: JSON.stringify(submissionData),
          muteHttpExceptions: true
        }
      );
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`API Error: ${response.getResponseCode()} - ${response.getContentText()}`);
      }
      
      const data = JSON.parse(response.getContentText());
      return {
        success: true,
        data: {
          ...data,
          gradingTime: Date.now() - startTime
        },
        source: 'firebase-functions',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    debugLog('callGradingAPI error', error.toString());
    return {
      success: false,
      error: error.toString(),
      source: CONFIG.USE_MOCK ? 'mock' : 'firebase-functions',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Batch grade multiple submissions
 */
function batchGradeSubmissions(submissions) {
  debugLog('batchGradeSubmissions called', { count: submissions.length, useMock: CONFIG.USE_MOCK });
  
  try {
    if (CONFIG.USE_MOCK) {
      // Simulate processing time based on number of submissions
      simulateDelay(500 * submissions.length);
      
      // Generate results for each submission
      const results = submissions.map(sub => ({
        submissionId: sub.id,
        score: Math.floor(Math.random() * 30) + 70,
        feedback: generateMockFeedback(sub.type, 85),
        status: 'graded',
        gradedAt: new Date().toISOString()
      }));
      
      return {
        success: true,
        data: {
          results: results,
          successful: results.length,
          failed: 0,
          totalTime: 500 * submissions.length
        },
        source: 'mock',
        timestamp: new Date().toISOString()
      };
    } else {
      // Real implementation - Firebase Functions batch API
      const startTime = Date.now();
      const response = UrlFetchApp.fetch(
        `${CONFIG.API_BASE_URL}/grade/batch`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': CONFIG.API_KEY
          },
          payload: JSON.stringify({ submissions }),
          muteHttpExceptions: true
        }
      );
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`API Error: ${response.getResponseCode()} - ${response.getContentText()}`);
      }
      
      const data = JSON.parse(response.getContentText());
      return {
        success: true,
        data: {
          ...data,
          totalTime: Date.now() - startTime
        },
        source: 'firebase-functions',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    debugLog('batchGradeSubmissions error', error.toString());
    return {
      success: false,
      error: error.toString(),
      source: CONFIG.USE_MOCK ? 'mock' : 'firebase-functions',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Save grade updates
 */
function saveGrade(classroomId, assignmentId, submissionId, gradeData) {
  debugLog('saveGrade called', { classroomId, assignmentId, submissionId, score: gradeData.score });
  
  try {
    if (CONFIG.USE_MOCK) {
      simulateDelay(500);
      
      // Update mock data in memory
      if (MOCK_SUBMISSIONS[assignmentId]) {
        const submission = MOCK_SUBMISSIONS[assignmentId].find(s => s.id === submissionId);
        if (submission) {
          submission.score = gradeData.score;
          submission.feedback = gradeData.feedback;
          submission.status = 'graded';
          submission.gradedAt = new Date().toISOString();
        }
      }
      
      return {
        success: true,
        data: {
          ...gradeData,
          savedAt: new Date().toISOString()
        },
        source: 'mock',
        timestamp: new Date().toISOString()
      };
    } else {
      // Real implementation - Update Google Classroom and/or Firebase
      const response = UrlFetchApp.fetch(
        `${CONFIG.API_BASE_URL}/grades/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': CONFIG.API_KEY
          },
          payload: JSON.stringify({
            classroomId,
            assignmentId,
            submissionId,
            gradeData
          }),
          muteHttpExceptions: true
        }
      );
      
      if (response.getResponseCode() !== 200) {
        throw new Error(`API Error: ${response.getResponseCode()} - ${response.getContentText()}`);
      }
      
      return {
        success: true,
        data: JSON.parse(response.getContentText()),
        source: 'firebase-functions',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    debugLog('saveGrade error', error.toString());
    return {
      success: false,
      error: error.toString(),
      source: CONFIG.USE_MOCK ? 'mock' : 'firebase-functions',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Generate mock feedback based on assignment type and score
 */
function generateMockFeedback(type, score) {
  const feedbackTemplates = {
    coding: {
      high: [
        "Excellent work! Your code is well-structured and follows best practices.",
        "Great job! Your solution is elegant and efficient.",
        "Outstanding implementation! Keep up the excellent work."
      ],
      medium: [
        "Good attempt! Consider adding more comments to explain your logic.",
        "Nice work! Try to optimize your loops for better performance.",
        "Well done! Think about edge cases in your solution."
      ],
      low: [
        "Good effort! Review the assignment requirements and try again.",
        "Keep trying! Make sure your code handles all test cases.",
        "Nice start! Consider breaking down the problem into smaller steps."
      ]
    },
    quiz: {
      high: [
        "Excellent understanding of the concepts!",
        "Great job! You've mastered this material.",
        "Perfect or near-perfect score! Well done!"
      ],
      medium: [
        "Good grasp of the material. Review the questions you missed.",
        "Nice work! A bit more study will help solidify these concepts.",
        "Well done! Focus on the areas where you lost points."
      ],
      low: [
        "Keep studying! Review the material and try again.",
        "Good effort! Make sure to review all the course materials.",
        "Don't give up! Consider attending office hours for help."
      ]
    }
  };
  
  const assignmentType = type || 'quiz';
  const scoreCategory = score >= 90 ? 'high' : score >= 70 ? 'medium' : 'low';
  const templates = feedbackTemplates[assignmentType][scoreCategory];
  
  return templates[Math.floor(Math.random() * templates.length)];
}

/**
 * Export grades for a classroom/assignment
 */
function exportGrades(classroomId, assignmentId) {
  debugLog('exportGrades called', { classroomId, assignmentId });
  
  try {
    const submissionsResult = fetchSubmissions(classroomId, assignmentId);
    if (!submissionsResult.success) {
      throw new Error(submissionsResult.error);
    }
    
    // Generate CSV content
    let csv = 'Student Name,Student ID,Status,Score,Feedback,Submitted At,Graded At\n';
    
    submissionsResult.data.forEach(submission => {
      csv += `"${submission.studentName}",`;
      csv += `"${submission.studentId}",`;
      csv += `"${submission.status}",`;
      csv += `${submission.score || ''},`;
      csv += `"${(submission.feedback || '').replace(/"/g, '""')}",`;
      csv += `"${submission.submittedAt || ''}",`;
      csv += `"${submission.gradedAt || ''}"\n`;
    });
    
    return {
      success: true,
      data: csv,
      filename: `grades_${classroomId}_${assignmentId}_${new Date().toISOString().split('T')[0]}.csv`,
      source: CONFIG.USE_MOCK ? 'mock' : 'api',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    debugLog('exportGrades error', error.toString());
    return {
      success: false,
      error: error.toString(),
      timestamp: new Date().toISOString()
    };
  }
}