/**
 * Roo Teacher Grading Portal
 * Main server-side code for AppScript
 */

// Global debug configuration
const DEBUG_CONFIG = {
  ENABLED: true,
  LOG_TIMING: true,
  LOG_DATA_SIZES: true,
  LOG_ERRORS: true
};

/**
 * Enhanced logging function with emojis and context
 */
function debugLog(component, action, details, data) {
  if (!DEBUG_CONFIG.ENABLED) return;
  
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const logMessage = `[${timestamp}] [${component}] ${action}`;
  
  if (details) {
    console.log(`${logMessage}: ${details}`);
  } else {
    console.log(logMessage);
  }
  
  if (data && DEBUG_CONFIG.LOG_DATA_SIZES) {
    try {
      const dataSize = JSON.stringify(data).length;
      console.log(`  📏 Data size: ${Math.round(dataSize / 1024)}KB`);
    } catch (e) {
      console.log(`  📏 Data size: unable to calculate`);
    }
  }
}

/**
 * Log function performance timing
 */
function logTiming(functionName, startTime, success = true) {
  if (!DEBUG_CONFIG.LOG_TIMING) return;
  
  const duration = Date.now() - startTime;
  const status = success ? '✅' : '❌';
  console.log(`⏱️ ${functionName}: ${duration}ms ${status}`);
}

// Web App entry point
function doGet() {
  debugLog('AppScript', '🚀 Starting web app', 'doGet() called');
  
  try {
    const startTime = Date.now();
    const template = HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Roo Teacher Grading Portal')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .setWidth(1400)
      .setHeight(900)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    
    logTiming('doGet', startTime, true);
    debugLog('AppScript', '🎉 Web app initialized successfully');
    
    return template;
  } catch (error) {
    debugLog('AppScript', '❌ Web app initialization failed', error.toString());
    throw error;
  }
}

// Include HTML files in templates
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Get current user information
 */
function getCurrentUser() {
  const startTime = Date.now();
  debugLog('Auth', '👤 Getting current user info');
  
  try {
    const email = Session.getActiveUser().getEmail();
    debugLog('Auth', '✅ User email retrieved', email);
    
    const userData = {
      email: email,
      name: email.split('@')[0], // Simple name extraction
      isTeacher: true // In real app, check against teacher database
    };
    
    logTiming('getCurrentUser', startTime, true);
    
    return {
      success: true,
      data: userData
    };
  } catch (error) {
    debugLog('Auth', '❌ Failed to get user info', error.toString());
    logTiming('getCurrentUser', startTime, false);
    
    return {
      success: false,
      error: 'Unable to get user information: ' + error.toString()
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

// Get complete dashboard data (classrooms with nested assignments, students, submissions)
function getDashboardData() {
  const startTime = Date.now();
  debugLog('Dashboard', '📊 Getting complete dashboard data');
  
  try {
    const result = fetchFullDashboardData();
    logTiming('getDashboardData', startTime, result.success);
    return result;
  } catch (error) {
    debugLog('Dashboard', '❌ Dashboard data fetch failed', error.toString());
    logTiming('getDashboardData', startTime, false);
    throw error;
  }
}

// Server-side cache management functions
function getCachedDashboardData() {
  const startTime = Date.now();
  const teacherEmail = Session.getActiveUser().getEmail();
  debugLog('Cache', '🔍 Checking server cache', `for ${teacherEmail}`);
  
  try {
    // Check if cache is valid
    debugLog('Cache', '🔧 Validating cache');
    const isValid = CacheManager.isSnapshotValid(teacherEmail);
    debugLog('Cache', isValid ? '✅ Cache is valid' : '⚠️ Cache invalid/expired');
    
    if (isValid) {
      debugLog('Cache', '📥 Loading cached data');
      const cachedData = CacheManager.loadClassroomSnapshot(teacherEmail);
      
      if (cachedData) {
        debugLog('Cache', '🎉 Cache data loaded successfully', null, cachedData);
        logTiming('getCachedDashboardData', startTime, true);
        
        return {
          success: true,
          data: cachedData,
          source: 'server-cache',
          timestamp: new Date().toISOString()
        };
      } else {
        debugLog('Cache', '❌ Cache data is null despite valid check');
        return {
          success: false,
          error: 'Cache data is null',
          needsRefresh: true
        };
      }
    } else {
      debugLog('Cache', '🔄 Cache needs refresh');
      logTiming('getCachedDashboardData', startTime, false);
      
      return {
        success: false,
        error: 'Cache invalid or expired',
        needsRefresh: true
      };
    }
  } catch (error) {
    debugLog('Cache', '❌ Error loading cached data', error.toString());
    logTiming('getCachedDashboardData', startTime, false);
    
    return {
      success: false,
      error: error.toString(),
      needsRefresh: true
    };
  }
}

// Fetch and cache dashboard data
function fetchAndCacheDashboardData() {
  const startTime = Date.now();
  const teacherEmail = Session.getActiveUser().getEmail();
  debugLog('Dashboard', '🚀 Fetching fresh data and caching', `for ${teacherEmail}`);
  
  try {
    // Fetch fresh data
    debugLog('Dashboard', '📡 Calling fetchFullDashboardData');
    const result = fetchFullDashboardData();
    
    if (result.success) {
      debugLog('Dashboard', '✅ Fresh data fetch successful', `source: ${result.source}`, result.data);
      
      // Save to cache
      debugLog('Cache', '💾 Saving data to server cache');
      const cacheResult = CacheManager.saveClassroomSnapshot(teacherEmail, result.data);
      debugLog('Cache', cacheResult.success ? '✅ Cache save successful' : '❌ Cache save failed', cacheResult.success ? null : cacheResult.error);
      
      logTiming('fetchAndCacheDashboardData', startTime, true);
      
      return {
        success: true,
        data: result.data,
        source: result.source,
        cached: cacheResult.success,
        cacheError: cacheResult.success ? null : cacheResult.error,
        timestamp: new Date().toISOString()
      };
    } else {
      debugLog('Dashboard', '❌ Fresh data fetch failed', result.error);
      logTiming('fetchAndCacheDashboardData', startTime, false);
      return result;
    }
  } catch (error) {
    debugLog('Dashboard', '❌ Exception in fetchAndCacheDashboardData', error.toString());
    logTiming('fetchAndCacheDashboardData', startTime, false);
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Clear cache for current teacher
function clearDashboardCache() {
  console.log('Code.js: clearDashboardCache called');
  const teacherEmail = Session.getActiveUser().getEmail();
  
  try {
    const result = CacheManager.clearSnapshot(teacherEmail);
    console.log('Cache clear result:', result);
    return result;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

// Update graded submissions in cache
function updateGradedSubmissionsInCache(classroomId, gradedSubmissions) {
  const startTime = Date.now();
  const teacherEmail = Session.getActiveUser().getEmail();
  debugLog('Cache', '💾 Updating graded submissions in cache', `Classroom: ${classroomId}, Count: ${gradedSubmissions.length}`);
  
  try {
    // Load current cache
    const snapshot = CacheManager.loadClassroomSnapshot(teacherEmail);
    if (!snapshot || !snapshot.classrooms) {
      debugLog('Cache', '❌ No snapshot found for teacher');
      return { success: false, error: 'No snapshot found' };
    }
    
    // Find the classroom
    const classroom = snapshot.classrooms.find(c => c.id === classroomId);
    if (!classroom) {
      debugLog('Cache', '❌ Classroom not found in snapshot', classroomId);
      return { success: false, error: 'Classroom not found in snapshot' };
    }
    
    // Update each graded submission
    let updatedCount = 0;
    gradedSubmissions.forEach(gradedSub => {
      const index = classroom.submissions.findIndex(s => s.id === gradedSub.id);
      if (index !== -1) {
        // Merge the graded data with existing submission
        classroom.submissions[index] = {
          ...classroom.submissions[index],
          score: gradedSub.score,
          feedback: gradedSub.feedback,
          status: gradedSub.status || 'graded',
          gradedAt: gradedSub.gradedAt || new Date().toISOString(),
          gradedBy: gradedSub.gradedBy || 'ai'
        };
        updatedCount++;
      } else {
        debugLog('Cache', '⚠️ Submission not found in cache', gradedSub.id);
      }
    });
    
    debugLog('Cache', `✅ Updated ${updatedCount}/${gradedSubmissions.length} submissions`);
    
    // Recalculate ungraded count
    const previousUngraded = classroom.ungradedSubmissions;
    classroom.ungradedSubmissions = classroom.submissions.filter(
      s => s.status === 'pending' || s.status === 'submitted'
    ).length;
    
    debugLog('Cache', `📊 Ungraded submissions: ${previousUngraded} → ${classroom.ungradedSubmissions}`);
    
    // Update the classroom in cache using CacheManager
    const updateResult = CacheManager.updateClassroomData(teacherEmail, classroomId, {
      submissions: classroom.submissions
    });
    
    logTiming('updateGradedSubmissionsInCache', startTime, updateResult.success);
    
    return {
      success: updateResult.success,
      updatedCount: updatedCount,
      error: updateResult.error,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    debugLog('Cache', '❌ Error updating graded submissions', error.toString());
    logTiming('updateGradedSubmissionsInCache', startTime, false);
    
    return {
      success: false,
      error: error.toString()
    };
  }
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
  if (getApiGatewayConfig().USE_MOCK) {
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
  
  // Validate submissions
  if (!submissions || submissions.length === 0) {
    return {
      success: false,
      error: 'No submissions provided for batch grading'
    };
  }
  
  // Extract assignment information from the first submission
  // All submissions in a batch should be for the same assignment
  const firstSubmission = submissions[0];
  const assignment = {
    id: firstSubmission.assignmentId || 'unknown',
    title: firstSubmission.assignmentTitle || 'Assignment',
    type: firstSubmission.type || 'assignment',
    maxScore: firstSubmission.maxScore || 100,
    description: firstSubmission.assignmentDescription || ''
  };
  
  console.log('Code.js: Constructed assignment object:', assignment);
  
  // Call the actual batch grading function with both submissions and assignment
  return batchGradeSubmissions(submissions, assignment);
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

// ============================================
// DEBUG AND HEALTH CHECK FUNCTIONS
// ============================================

/**
 * Simple health check to verify all components are working
 */
function healthCheck() {
  const startTime = Date.now();
  debugLog('Health', '🏥 Starting health check');
  
  const results = {
    timestamp: new Date().toISOString(),
    components: {},
    overall: 'unknown'
  };
  
  try {
    // Test 1: User authentication
    debugLog('Health', '👤 Testing user auth');
    try {
      const userResult = getCurrentUser();
      results.components.auth = {
        status: userResult.success ? 'healthy' : 'unhealthy',
        details: userResult.success ? `User: ${userResult.data.email}` : userResult.error
      };
    } catch (error) {
      results.components.auth = { status: 'error', details: error.toString() };
    }
    
    // Test 2: Configuration
    debugLog('Health', '⚙️ Testing configuration');
    results.components.config = {
      status: 'healthy',
      details: `Mock mode: ${getApiGatewayConfig().USE_MOCK}, Debug: ${getApiGatewayConfig().DEBUG}`
    };
    
    // Test 3: Cache system
    debugLog('Health', '💾 Testing cache system');
    try {
      const teacherEmail = Session.getActiveUser().getEmail();
      const cacheValid = CacheManager.isSnapshotValid(teacherEmail);
      results.components.cache = {
        status: 'healthy',
        details: `Cache valid: ${cacheValid}`
      };
    } catch (error) {
      results.components.cache = { status: 'error', details: error.toString() };
    }
    
    // Test 4: Mock data availability
    debugLog('Health', '📋 Testing mock data');
    results.components.mockData = {
      status: (typeof MOCK_CLASSROOMS !== 'undefined' && MOCK_CLASSROOMS.length > 0) ? 'healthy' : 'unhealthy',
      details: `Mock classrooms: ${typeof MOCK_CLASSROOMS !== 'undefined' ? MOCK_CLASSROOMS.length : 0}`
    };
    
    // Overall health
    const healthyCount = Object.values(results.components).filter(c => c.status === 'healthy').length;
    const totalCount = Object.keys(results.components).length;
    
    if (healthyCount === totalCount) {
      results.overall = 'healthy';
      debugLog('Health', '✅ All systems healthy');
    } else if (healthyCount > totalCount / 2) {
      results.overall = 'degraded';
      debugLog('Health', '⚠️ Some systems unhealthy');
    } else {
      results.overall = 'unhealthy';
      debugLog('Health', '❌ Multiple systems failing');
    }
    
    logTiming('healthCheck', startTime, true);
    return results;
    
  } catch (error) {
    debugLog('Health', '❌ Health check failed', error.toString());
    logTiming('healthCheck', startTime, false);
    
    results.overall = 'error';
    results.error = error.toString();
    return results;
  }
}

// ============================================
// ESSENTIAL TEST FUNCTIONS ONLY
// ============================================
// See TESTING.md for comprehensive test documentation

/**
 * Quick test to verify basic functionality
 */
function testBasicFunctionality() {
  console.log('Testing basic functionality...');
  
  const tests = {
    user: getCurrentUser(),
    classrooms: getClassrooms(),
    mockData: typeof MOCK_CLASSROOMS !== 'undefined'
  };
  
  console.log('Test results:', {
    userAuth: tests.user.success ? '✅' : '❌',
    classroomsLoad: tests.classrooms.success ? '✅' : '❌',
    mockDataAvailable: tests.mockData ? '✅' : '❌'
  });
  
  return tests;
}

/**
 * Test with real Google Classroom data (minimal version)
 */
function testRealData() {
  const originalMock = getApiGatewayConfig().USE_MOCK;
  getApiGatewayConfig().USE_MOCK = false;
  
  try {
    const result = fetchFullDashboardData();
    console.log('Real data test:', result.success ? '✅ Success' : '❌ Failed');
    return result;
  } finally {
    getApiGatewayConfig().USE_MOCK = originalMock;
  }
}

/**
 * Utility functions
 */

// Get assignment statistics
function getAssignmentStatistics(assignmentId) {
  console.log('Code.js: getAssignmentStatistics called for:', assignmentId);
  
  if (getApiGatewayConfig().USE_MOCK) {
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
  
  if (getApiGatewayConfig().USE_MOCK) {
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
    
    if (getApiGatewayConfig().USE_MOCK) {
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

// API key setup moved to CONFIG.js - see documentation there