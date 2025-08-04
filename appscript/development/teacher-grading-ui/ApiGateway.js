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