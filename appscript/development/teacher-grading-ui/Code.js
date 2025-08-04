/**
 * Roo Teacher Grading Portal
 * Main server-side code for AppScript
 */

// Web App entry point
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Roo Teacher Grading Portal')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setWidth(1400)
    .setHeight(900)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Include HTML files in templates
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get current user information
 */
function getCurrentUser() {
  try {
    const email = Session.getActiveUser().getEmail();
    return {
      success: true,
      data: {
        email: email,
        name: email.split('@')[0], // Simple name extraction
        isTeacher: true // In real app, check against teacher database
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Unable to get user information'
    };
  }
}

/**
 * API Routes - All calls go through ApiGateway
 */

// Get all classrooms for the current teacher
function getClassrooms() {
  console.log('Code.js: getClassrooms called');
  return fetchClassrooms();
}

// Get assignments for a specific classroom
function getAssignments(classroomId) {
  console.log('Code.js: getAssignments called for classroom:', classroomId);
  return fetchAssignments(classroomId);
}

// Get submissions for a specific assignment
function getSubmissions(classroomId, assignmentId) {
  console.log('Code.js: getSubmissions called', { classroomId, assignmentId });
  return fetchSubmissions(classroomId, assignmentId);
}

// Get a single submission details
function getSubmissionDetails(submissionId) {
  console.log('Code.js: getSubmissionDetails called for:', submissionId);
  
  // In mock mode, search through all submissions
  if (CONFIG.USE_MOCK) {
    for (const assignmentId in MOCK_SUBMISSIONS) {
      const submission = MOCK_SUBMISSIONS[assignmentId].find(s => s.id === submissionId);
      if (submission) {
        return {
          success: true,
          data: submission,
          source: 'mock'
        };
      }
    }
    return {
      success: false,
      error: 'Submission not found',
      source: 'mock'
    };
  }
  
  // Real implementation would fetch from API
  return {
    success: false,
    error: 'Not implemented',
    source: 'api'
  };
}

// Grade a single submission with AI
function gradeSubmission(submissionData) {
  console.log('Code.js: gradeSubmission called for:', submissionData.id);
  return callGradingAPI(submissionData);
}

// Batch grade multiple submissions
function batchGrade(submissions) {
  console.log('Code.js: batchGrade called for', submissions.length, 'submissions');
  return batchGradeSubmissions(submissions);
}

// Save/update a grade
function updateGrade(classroomId, assignmentId, submissionId, gradeData) {
  console.log('Code.js: updateGrade called', { classroomId, assignmentId, submissionId, score: gradeData.score });
  return saveGrade(classroomId, assignmentId, submissionId, gradeData);
}

// Export grades for an assignment
function exportGradesForAssignment(classroomId, assignmentId) {
  console.log('Code.js: exportGradesForAssignment called', { classroomId, assignmentId });
  return exportGrades(classroomId, assignmentId);
}

/**
 * Utility functions
 */

// Get assignment statistics
function getAssignmentStatistics(assignmentId) {
  console.log('Code.js: getAssignmentStatistics called for:', assignmentId);
  
  if (CONFIG.USE_MOCK) {
    const stats = getAssignmentStats(assignmentId);
    return {
      success: true,
      data: stats,
      source: 'mock'
    };
  }
  
  // Real implementation would calculate from API data
  return {
    success: false,
    error: 'Not implemented',
    source: 'api'
  };
}

// Get classroom summary
function getClassroomSummary(classroomId) {
  console.log('Code.js: getClassroomSummary called for:', classroomId);
  
  try {
    const assignmentsResult = fetchAssignments(classroomId);
    if (!assignmentsResult.success) {
      throw new Error(assignmentsResult.error);
    }
    
    const assignments = assignmentsResult.data;
    const summary = {
      totalAssignments: assignments.length,
      gradedAssignments: assignments.filter(a => a.status === 'graded').length,
      partialAssignments: assignments.filter(a => a.status === 'partial').length,
      pendingAssignments: assignments.filter(a => a.status === 'pending').length,
      assignments: assignments.map(a => ({
        id: a.id,
        title: a.title,
        type: a.type,
        status: a.status,
        stats: a.submissionStats || getAssignmentStats(a.id)
      }))
    };
    
    return {
      success: true,
      data: summary,
      source: assignmentsResult.source
    };
  } catch (error) {
    console.error('Error in getClassroomSummary:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Batch update submission statuses (for UI updates)
function updateSubmissionStatus(submissionId, status) {
  console.log('Code.js: updateSubmissionStatus called', { submissionId, status });
  
  if (CONFIG.USE_MOCK) {
    // Update mock data in memory
    for (const assignmentId in MOCK_SUBMISSIONS) {
      const submission = MOCK_SUBMISSIONS[assignmentId].find(s => s.id === submissionId);
      if (submission) {
        submission.status = status;
        if (status === 'grading') {
          submission.gradingStartedAt = new Date().toISOString();
        }
        return {
          success: true,
          data: { submissionId, status },
          source: 'mock'
        };
      }
    }
  }
  
  return {
    success: false,
    error: 'Submission not found'
  };
}

// Get recent activity (for dashboard)
function getRecentActivity() {
  console.log('Code.js: getRecentActivity called');
  
  try {
    const recentActivity = [];
    
    if (CONFIG.USE_MOCK) {
      // Collect recent submissions from all assignments
      for (const assignmentId in MOCK_SUBMISSIONS) {
        const submissions = MOCK_SUBMISSIONS[assignmentId];
        submissions.forEach(sub => {
          if (sub.submittedAt) {
            recentActivity.push({
              type: 'submission',
              studentName: sub.studentName,
              assignmentId: assignmentId,
              timestamp: sub.submittedAt,
              status: sub.status
            });
          }
          if (sub.gradedAt) {
            recentActivity.push({
              type: 'graded',
              studentName: sub.studentName,
              assignmentId: assignmentId,
              timestamp: sub.gradedAt,
              score: sub.score
            });
          }
        });
      }
      
      // Sort by timestamp (most recent first)
      recentActivity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      // Return top 10
      return {
        success: true,
        data: recentActivity.slice(0, 10),
        source: 'mock'
      };
    }
    
    // Real implementation would fetch from API
    return {
      success: false,
      error: 'Not implemented',
      source: 'api'
    };
  } catch (error) {
    console.error('Error in getRecentActivity:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Testing function to verify setup
function testSetup() {
  console.log('Testing Roo Teacher Grading Portal setup...');
  
  const tests = {
    mockData: typeof MOCK_CLASSROOMS !== 'undefined',
    apiGateway: typeof fetchClassrooms === 'function',
    classrooms: getClassrooms().success,
    user: getCurrentUser().success
  };
  
  console.log('Test results:', tests);
  return tests;
}