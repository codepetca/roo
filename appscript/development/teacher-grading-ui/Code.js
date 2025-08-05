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
    const isValid = CacheManager.isCacheValid(teacherEmail);
    debugLog('Cache', isValid ? '✅ Cache is valid' : '⚠️ Cache invalid/expired');
    
    if (isValid) {
      debugLog('Cache', '📥 Loading cached data');
      const cachedData = CacheManager.loadDashboardCache(teacherEmail);
      
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
      const cacheResult = CacheManager.saveDashboardCache(teacherEmail, result.data);
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
    const result = CacheManager.clearCache(teacherEmail);
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
      details: `Mock mode: ${CONFIG.USE_MOCK}, Debug: ${CONFIG.DEBUG}`
    };
    
    // Test 3: Cache system
    debugLog('Health', '💾 Testing cache system');
    try {
      const teacherEmail = Session.getActiveUser().getEmail();
      const cacheValid = CacheManager.isCacheValid(teacherEmail);
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
// SIMPLIFIED TEST FUNCTIONS - Essential only
// ============================================

/**
 * Essential test function - dashboard data with clean logging
 */
function testDashboardData() {
  const startTime = Date.now();
  debugLog('Test', '🧪 Testing dashboard data fetch');
  
  try {
    const result = fetchFullDashboardData();
    
    if (result.success && result.data) {
      const data = result.data;
      debugLog('Test', '✅ Dashboard data test successful', `${data.classrooms?.length || 0} classrooms`, data);
      
      const summary = {
        success: true,
        classrooms: data.classrooms?.length || 0,
        totalStudents: data.globalStats?.totalStudents || 0,
        totalAssignments: data.globalStats?.totalAssignments || 0,
        dataSizeKB: Math.round(JSON.stringify(data).length / 1024)
      };
      
      logTiming('testDashboardData', startTime, true);
      return summary;
    } else {
      debugLog('Test', '❌ Dashboard data test failed', result.error);
      logTiming('testDashboardData', startTime, false);
      return { success: false, error: result.error };
    }
  } catch (error) {
    debugLog('Test', '❌ Test exception', error.toString());
    logTiming('testDashboardData', startTime, false);
    return { success: false, error: error.toString() };
  }
}


/**
 * Essential test - runs health check and dashboard data test
 */
function runEssentialTests() {
  debugLog('Test', '🧪 Running essential tests');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  // Test 1: Health check
  debugLog('Test', '🏥 Running health check');
  results.tests.health = healthCheck();
  
  // Test 2: Dashboard data
  debugLog('Test', '📊 Testing dashboard data');
  results.tests.dashboardData = testDashboardData();
  
  // Summary
  const passCount = Object.values(results.tests).filter(t => t.success || t.overall === 'healthy').length;
  const totalCount = Object.keys(results.tests).length;
  
  debugLog('Test', `🏁 Test summary: ${passCount}/${totalCount} passed`);
  
  return results;
}

/**
 * Test with real Google Classroom data
 */
function testRealClassroomData() {
  console.log('=== Testing Real Google Classroom Data ===');
  
  try {
    // Temporarily switch to real data mode
    const originalMockSetting = CONFIG.USE_MOCK;
    CONFIG.USE_MOCK = false;
    
    console.log('🔄 Switched to real Google Classroom API mode');
    console.log('👤 Testing with account:', Session.getActiveUser().getEmail());
    
    // Test 1: Fetch real classroom data
    console.log('\n1️⃣ Fetching real dashboard data...');
    const result = fetchFullDashboardData();
    
    if (result.success && result.data) {
      const data = result.data;
      
      console.log('✅ Real data fetch successful!');
      console.log('📊 Data source:', result.source);
      
      console.log('\n🏫 Real Classrooms Found:');
      console.log('Total Classrooms:', data.classrooms?.length || 0);
      
      if (data.classrooms && data.classrooms.length > 0) {
        data.classrooms.forEach((classroom, index) => {
          console.log(`\n📚 Classroom ${index + 1}:`);
          console.log('  Name:', classroom.name);
          console.log('  ID:', classroom.id);
          console.log('  Course Code:', classroom.enrollmentCode);
          console.log('  State:', classroom.courseState);
          console.log('  Students:', classroom.studentCount);
          console.log('  Assignments:', classroom.assignmentCount);
          console.log('  Creation Time:', classroom.creationTime);
          console.log('  Alternate Link:', classroom.alternateLink);
          
          // Show first few assignments if any
          if (classroom.assignments && classroom.assignments.length > 0) {
            console.log('  📝 Sample Assignments:');
            classroom.assignments.slice(0, 3).forEach((assignment, idx) => {
              console.log(`    ${idx + 1}. ${assignment.title || assignment.id}`);
            });
            if (classroom.assignments.length > 3) {
              console.log(`    ... and ${classroom.assignments.length - 3} more`);
            }
          }
          
          // Show first few students if any
          if (classroom.students && classroom.students.length > 0) {
            console.log('  👥 Sample Students:');
            classroom.students.slice(0, 3).forEach((student, idx) => {
              const name = student.profile?.name?.fullName || student.displayName || student.email;
              console.log(`    ${idx + 1}. ${name}`);
            });
            if (classroom.students.length > 3) {
              console.log(`    ... and ${classroom.students.length - 3} more`);
            }
          }
        });
      } else {
        console.log('ℹ️ No classrooms found. This could mean:');
        console.log('  - Account has no teacher access to classrooms');
        console.log('  - All classrooms are archived or inactive');
        console.log('  - Permissions need to be re-authorized');
      }
      
      console.log('\n📈 Real Data Global Statistics:');
      if (data.globalStats) {
        console.log('Total Classrooms:', data.globalStats.totalClassrooms);
        console.log('Total Students:', data.globalStats.totalStudents);
        console.log('Total Assignments:', data.globalStats.totalAssignments);
        console.log('Total Submissions:', data.globalStats.totalSubmissions);
        console.log('Ungraded Submissions:', data.globalStats.ungradedSubmissions);
      }
      
      // Calculate and show data size
      const jsonString = JSON.stringify(result.data);
      const jsonSizeKB = Math.round(jsonString.length / 1024);
      console.log('\n📏 Real Data Size:', jsonSizeKB, 'KB');
      
      // Restore original setting
      CONFIG.USE_MOCK = originalMockSetting;
      console.log('🔄 Restored original mock setting:', originalMockSetting);
      
      return {
        success: true,
        source: 'real-google-classroom',
        summary: {
          classrooms: data.classrooms?.length || 0,
          totalStudents: data.globalStats?.totalStudents || 0,
          totalAssignments: data.globalStats?.totalAssignments || 0,
          dataSizeKB: jsonSizeKB
        },
        realData: result.data // Include actual data for inspection
      };
      
    } else {
      console.error('❌ Real data fetch failed:', result.error);
      
      // Restore original setting
      CONFIG.USE_MOCK = originalMockSetting;
      console.log('🔄 Restored original mock setting due to error');
      
      return {
        success: false,
        error: result.error,
        source: 'real-google-classroom'
      };
    }
    
  } catch (error) {
    console.error('❌ Real data test failed with exception:', error);
    
    // Ensure we restore the original setting even on exception
    CONFIG.USE_MOCK = true;
    console.log('🔄 Restored mock mode due to exception');
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Compare real vs mock data structures for validation
 */
function compareRealVsMockData() {
  console.log('=== Comparing Real vs Mock Data Structures ===');
  
  try {
    // Get mock data
    console.log('\n📋 Testing mock data...');
    const mockResult = testDashboardDataFetch();
    
    // Get real data
    console.log('\n🌐 Testing real data...');
    const realResult = testRealClassroomData();
    
    console.log('\n🔍 Comparison Results:');
    
    if (mockResult.success && realResult.success) {
      const mockSummary = mockResult.summary;
      const realSummary = realResult.summary;
      
      console.log('Data Type    | Mock | Real');
      console.log('-------------|------|-----');
      console.log(`Classrooms   | ${mockSummary.classrooms}    | ${realSummary.classrooms}`);
      console.log(`Students     | ${mockSummary.totalStudents}   | ${realSummary.totalStudents || 0}`);
      console.log(`Assignments  | ${mockSummary.totalAssignments}    | ${realSummary.totalAssignments || 0}`);
      console.log(`Data Size    | ${mockSummary.dataSizeKB}KB  | ${realSummary.dataSizeKB}KB`);
      
      return {
        success: true,
        mockData: mockSummary,
        realData: realSummary,
        comparison: 'completed'
      };
    } else {
      console.log('❌ Could not complete comparison due to test failures');
      return {
        success: false,
        mockSuccess: mockResult.success,
        realSuccess: realResult.success,
        errors: {
          mock: mockResult.error,
          real: realResult.error
        }
      };
    }
    
  } catch (error) {
    console.error('❌ Comparison failed:', error);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Comprehensive test of all dashboard functionality
 */
function runAllDashboardTests() {
  console.log('🧪 === RUNNING ALL DASHBOARD TESTS ===');
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  // Test 1: Mock data structure
  console.log('\n--- Test 1: Mock Data Structure ---');
  results.tests.mockData = testMockDataStructure();
  
  // Test 2: Dashboard data fetch (mock)
  console.log('\n--- Test 2: Dashboard Data Fetch (Mock) ---');
  results.tests.mockDataFetch = testDashboardDataFetch();
  
  // Test 3: Cache management
  console.log('\n--- Test 3: Cache Management ---');
  results.tests.cacheManagement = testCacheManagement();
  
  // Test 4: Real data fetch
  console.log('\n--- Test 4: Real Google Classroom Data ---');
  results.tests.realDataFetch = testRealClassroomData();
  
  // Test 5: Data comparison
  console.log('\n--- Test 5: Real vs Mock Comparison ---');
  results.tests.dataComparison = compareRealVsMockData();
  
  // Summary
  console.log('\n🏁 === TEST SUMMARY ===');
  Object.entries(results.tests).forEach(([testName, result]) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${testName}: ${status}`);
    if (!result.success && result.error) {
      console.log(`  Error: ${result.error}`);
    }
  });
  
  return results;
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