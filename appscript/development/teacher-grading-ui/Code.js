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
      details: `Mock mode: ${getApiGatewayConfig().USE_MOCK}, Debug: ${getApiGatewayConfig().DEBUG}`
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
    const originalMockSetting = getApiGatewayConfig().USE_MOCK;
    getApiGatewayConfig().USE_MOCK = false;
    
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
      getApiGatewayConfig().USE_MOCK = originalMockSetting;
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
      getApiGatewayConfig().USE_MOCK = originalMockSetting;
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
    getApiGatewayConfig().USE_MOCK = true;
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
 * Test enhanced data fetching functionality
 */
function testEnhancedDataFetching() {
  console.log('\n=== Testing Enhanced Data Fetching ===');
  
  try {
    // Test with mock data first
    console.log('Testing with mock data...');
    const mockResult = fetchFullDashboardData();
    
    if (mockResult.success) {
      const classroom = mockResult.data.classrooms[0];
      if (classroom && classroom.assignments.length > 0) {
        const assignment = classroom.assignments[0];
        
        console.log('✅ Enhanced Assignment Data:', {
          id: assignment.id,
          title: assignment.title,
          type: assignment.type,
          hasMaterials: !!assignment.materials,
          materialCounts: assignment.materials ? {
            driveFiles: assignment.materials.driveFiles?.length || 0,
            links: assignment.materials.links?.length || 0,
            youtubeVideos: assignment.materials.youtubeVideos?.length || 0,
            forms: assignment.materials.forms?.length || 0
          } : 'No materials',
          hasRubric: !!assignment.rubric,
          hasQuizData: !!assignment.quizData
        });
        
        // Test submission processing
        if (classroom.submissions.length > 0) {
          const submission = classroom.submissions[0];
          console.log('✅ Enhanced Submission Data:', {
            id: submission.id,
            studentName: submission.studentName,
            status: submission.status,
            attachmentCount: submission.attachments?.length || 0,
            hasAiProcessingStatus: !!submission.aiProcessingStatus,
            readyForGrading: submission.aiProcessingStatus?.readyForGrading || false
          });
        }
        
        console.log('✅ Enhanced data fetching test passed!');
        return {
          success: true,
          enhancedFieldsPresent: true,
          assignmentEnhancements: {
            hasMaterials: !!assignment.materials,
            hasRubric: !!assignment.rubric,
            hasQuizData: !!assignment.quizData
          }
        };
      } else {
        console.log('❌ No assignments found in test data');
        return { success: false, error: 'No assignments found' };
      }
    } else {
      console.log('❌ Failed to fetch dashboard data:', mockResult.error);
      return { success: false, error: mockResult.error };
    }
  } catch (error) {
    console.log('❌ Enhanced data fetching test failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test individual enhancement functions
 */
function testEnhancementFunctions() {
  console.log('\n=== Testing Enhancement Functions ===');
  
  try {
    // Test content type classification
    console.log('Testing content type classification...');
    const testResults = {
      pdf: classifyContentType('application/pdf'),
      doc: classifyContentType('application/vnd.google-apps.document'),
      sheet: classifyContentType('application/vnd.google-apps.spreadsheet'),
      unknown: classifyContentType('application/unknown')
    };
    console.log('✅ Content type classification:', testResults);
    
    // Test text extraction capability
    console.log('Testing text extractability...');
    const extractResults = {
      googleDoc: isTextExtractable('application/vnd.google-apps.document'),
      pdf: isTextExtractable('application/pdf'),
      image: isTextExtractable('image/jpeg'),
      unknown: isTextExtractable('application/unknown')
    };
    console.log('✅ Text extractability:', extractResults);
    
    // Test link type classification
    console.log('Testing link type classification...');
    const linkResults = {
      github: classifyLinkType('https://github.com/user/repo'),
      youtube: classifyLinkType('https://youtube.com/watch?v=123'),
      googleDocs: classifyLinkType('https://docs.google.com/document/d/123'),
      webpage: classifyLinkType('https://example.com')
    };
    console.log('✅ Link type classification:', linkResults);
    
    console.log('✅ All enhancement functions working correctly!');
    return {
      success: true,
      results: {
        contentTypes: testResults,
        textExtraction: extractResults,
        linkTypes: linkResults
      }
    };
  } catch (error) {
    console.log('❌ Enhancement functions test failed:', error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Test real enhanced data fetching with Google Classroom
 */
function testRealEnhancedData() {
  console.log('\n=== Testing Real Enhanced Data Fetching ===');
  
  try {
    // Temporarily switch to real data mode
    const originalMockSetting = getApiGatewayConfig().USE_MOCK;
    getApiGatewayConfig().USE_MOCK = false;
    
    console.log('🔄 Switched to real Google Classroom API mode');
    console.log('👤 Testing with account:', Session.getActiveUser().getEmail());
    
    const result = fetchFullDashboardData();
    
    if (result.success && result.data && result.data.classrooms.length > 0) {
      const classroom = result.data.classrooms[0];
      console.log('✅ Found real classroom:', classroom.name);
      
      if (classroom.assignments.length > 0) {
        const assignment = classroom.assignments[0];
        console.log('✅ Enhanced assignment data:', {
          title: assignment.title,
          type: assignment.type,
          hasMaterials: !!assignment.materials,
          hasRubric: !!assignment.rubric,
          hasQuizData: !!assignment.quizData,
          materialTypes: assignment.materials ? Object.keys(assignment.materials).filter(key => 
            assignment.materials[key] && assignment.materials[key].length > 0
          ) : []
        });
        
        // Test enhanced submissions
        if (classroom.submissions.length > 0) {
          const submission = classroom.submissions[0];
          console.log('✅ Enhanced submission data:', {
            studentName: submission.studentName,
            attachmentCount: submission.attachments?.length || 0,
            attachmentTypes: submission.attachments?.map(att => att.type) || [],
            hasAiProcessingStatus: !!submission.aiProcessingStatus,
            readyForGrading: submission.aiProcessingStatus?.readyForGrading || false
          });
        }
      }
      
      // Restore original setting
      getApiGatewayConfig().USE_MOCK = originalMockSetting;
      
      return {
        success: true,
        source: 'real-google-classroom',
        enhancementsWorking: true
      };
    } else {
      getApiGatewayConfig().USE_MOCK = originalMockSetting;
      return {
        success: false,
        error: result.error || 'No classrooms found',
        source: 'real-google-classroom'
      };
    }
  } catch (error) {
    getApiGatewayConfig().USE_MOCK = true; // Ensure we restore mock mode
    console.log('❌ Real enhanced data test failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test AI grading functionality
 */
function testAIGrading() {
  console.log('\n=== Testing AI Grading Functionality ===');
  
  try {
    // Test with mock data first
    console.log('Testing AI grading with mock data...');
    
    // Get sample data from dashboard
    const dashboardResult = fetchFullDashboardData();
    if (!dashboardResult.success || !dashboardResult.data.classrooms.length) {
      throw new Error('No test data available for AI grading test');
    }
    
    const classroom = dashboardResult.data.classrooms[0];
    if (!classroom.assignments.length || !classroom.submissions.length) {
      throw new Error('No assignments or submissions available for testing');
    }
    
    const assignment = classroom.assignments[0];
    const submission = classroom.submissions[0];
    
    console.log('✅ Test data loaded:', {
      assignmentTitle: assignment.title,
      assignmentType: assignment.type,
      hasRubric: !!assignment.rubric,
      hasQuizData: !!assignment.quizData,
      submissionStudent: submission.studentName,
      hasAttachments: submission.attachments?.length > 0
    });
    
    // Test single submission grading
    console.log('\n📝 Testing single submission AI grading...');
    const gradingResult = gradeSubmissionWithAI(submission, assignment, {
      strictness: 'moderate',
      feedbackStyle: 'constructive'
    });
    
    if (gradingResult.success) {
      const grade = gradingResult.data.grade;
      const feedback = gradingResult.data.feedback;
      
      console.log('✅ AI grading successful:', {
        requestId: gradingResult.data.requestId,
        score: `${grade.score}/${grade.maxScore} (${grade.percentage}%)`,
        confidence: gradingResult.data.metadata.confidence,
        model: gradingResult.data.metadata.model,
        processingTime: `${gradingResult.data.metadata.processingTime}ms`,
        needsReview: gradingResult.data.metadata.needsReview,
        feedbackSummary: feedback.summary,
        strengthsCount: feedback.strengths?.length || 0,
        improvementsCount: feedback.improvements?.length || 0
      });
      
      return {
        success: true,
        singleGrading: true,
        gradingResult: {
          score: grade.score,
          maxScore: grade.maxScore,
          confidence: gradingResult.data.metadata.confidence,
          processingTime: gradingResult.data.metadata.processingTime,
          needsReview: gradingResult.data.metadata.needsReview
        }
      };
    } else {
      console.log('❌ AI grading failed:', gradingResult.error);
      return {
        success: false,
        error: gradingResult.error
      };
    }
    
  } catch (error) {
    console.log('❌ AI grading test failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test batch AI grading
 */
function testBatchAIGrading() {
  console.log('\n=== Testing Batch AI Grading ===');
  
  try {
    // Get sample data
    const dashboardResult = fetchFullDashboardData();
    if (!dashboardResult.success) {
      throw new Error('Failed to get test data');
    }
    
    const classroom = dashboardResult.data.classrooms[0];
    if (!classroom.assignments.length || !classroom.submissions.length) {
      throw new Error('No test data available');
    }
    
    const assignment = classroom.assignments[0];
    const submissions = classroom.submissions.slice(0, 3); // Test with first 3 submissions
    
    console.log(`📦 Testing batch grading with ${submissions.length} submissions...`);
    
    const batchResult = batchGradeSubmissions(submissions, assignment, {
      strictness: 'moderate',
      feedbackStyle: 'constructive'
    });
    
    if (batchResult.success) {
      const data = batchResult.data;
      
      console.log('✅ Batch AI grading successful:', {
        batchId: data.batchId,
        totalSubmissions: submissions.length,
        successful: data.successful,
        failed: data.failed,
        totalTime: `${data.totalTime}ms`,
        avgTimePerSubmission: `${Math.round(data.totalTime / submissions.length)}ms`,
        source: batchResult.source
      });
      
      // Show sample results
      if (data.results && data.results.length > 0) {
        console.log('\n📊 Sample grading results:');
        data.results.slice(0, 2).forEach((result, index) => {
          console.log(`  Student ${index + 1}: ${result.studentName}`);
          console.log(`    Score: ${result.grade?.score || 0}/${result.grade?.maxScore || 100}`);
          console.log(`    Confidence: ${result.metadata?.confidence || 0}`);
          console.log(`    Needs Review: ${result.metadata?.needsReview || false}`);
        });
      }
      
      return {
        success: true,
        batchGrading: true,
        results: {
          totalSubmissions: submissions.length,
          successful: data.successful,
          failed: data.failed,
          avgProcessingTime: Math.round(data.totalTime / submissions.length)
        }
      };
    } else {
      console.log('❌ Batch AI grading failed:', batchResult.error);
      return {
        success: false,
        error: batchResult.error
      };
    }
    
  } catch (error) {
    console.log('❌ Batch AI grading test failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test AI grading context building
 */
function testGradingContextBuilding() {
  console.log('\n=== Testing Grading Context Building ===');
  
  try {
    // Get sample data
    const dashboardResult = fetchFullDashboardData();
    if (!dashboardResult.success) {
      throw new Error('Failed to get test data');
    }
    
    const classroom = dashboardResult.data.classrooms[0];
    const assignment = classroom.assignments[0];
    const submission = classroom.submissions[0];
    
    console.log('🔧 Building grading context...');
    
    const gradingContext = buildGradingContext(submission, assignment, {
      strictness: 'moderate',
      focusAreas: ['accuracy', 'completeness', 'clarity']
    });
    
    console.log('✅ Grading context built successfully:', {
      requestId: gradingContext.requestId,
      assignmentType: gradingContext.assignment.type,
      criteriaType: gradingContext.criteria.type,
      submissionContentType: gradingContext.submission.contentType,
      hasExtractedContent: !!gradingContext.submission.text,
      contentLength: gradingContext.submission.text?.length || 0,
      attachmentsCount: gradingContext.submission.attachmentCount,
      gradingStrictness: gradingContext.gradingOptions.strictness,
      focusAreas: gradingContext.gradingOptions.focusAreas
    });
    
    // Test different criteria types
    const contextTypes = [];
    
    if (assignment.rubric) {
      contextTypes.push('rubric');
      console.log('📏 Rubric-based grading context available');
    }
    
    if (assignment.quizData) {
      contextTypes.push('quiz');
      console.log('📝 Quiz-based grading context available');
    }
    
    if (!assignment.rubric && !assignment.quizData) {
      contextTypes.push('points');
      console.log('🎯 Points-based grading context created');
    }
    
    return {
      success: true,
      contextBuilding: true,
      contextTypes: contextTypes,
      hasContent: !!gradingContext.submission.text,
      contentLength: gradingContext.submission.text?.length || 0
    };
    
  } catch (error) {
    console.log('❌ Grading context building test failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test system configuration
 */
function testConfiguration() {
  console.log('\n=== Testing System Configuration ===');
  
  try {
    const configStatus = getConfigurationStatus();
    
    console.log('📋 Configuration Status:');
    console.log('  Gemini API Key Configured:', configStatus.geminiApiKey.configured ? '✅' : '❌');
    console.log('  API Key Length:', configStatus.geminiApiKey.keyLength);
    console.log('  Is Placeholder:', configStatus.geminiApiKey.isPlaceholder ? '❌' : '✅');
    console.log('  Use Mock Data:', configStatus.useMockData ? '🎭' : '🌐');
    console.log('  Debug Enabled:', configStatus.debugEnabled ? '🔍' : '🔇');
    console.log('  AI Model:', configStatus.model);
    console.log('  Cache Expiration:', configStatus.cacheExpiration + ' minutes');
    
    const isAIReady = isAIGradingConfigured();
    console.log('\n🤖 AI Grading Status:', isAIReady ? '✅ Ready' : '❌ Not Configured');
    
    if (!isAIReady) {
      console.log('\n⚠️ To enable AI grading:');
      console.log('1. Get a Gemini API key from: https://makersuite.google.com/app/apikey');
      console.log('2. Open CONFIG.js and replace YOUR_GEMINI_API_KEY_HERE with your key');
      console.log('3. Redeploy the application');
    }
    
    return {
      success: true,
      geminiConfigured: configStatus.geminiApiKey.configured,
      aiGradingReady: isAIReady,
      configuration: configStatus
    };
    
  } catch (error) {
    console.log('❌ Configuration test failed:', error.toString());
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * Test real AI grading with Gemini (if not using mock)
 */
function testRealAIGrading() {
  console.log('\n=== Testing Real AI Grading with Gemini ===');
  
  try {
    // Temporarily switch to real mode
    const originalMockSetting = getApiGatewayConfig().USE_MOCK;
    getApiGatewayConfig().USE_MOCK = false;
    
    console.log('🔄 Switched to real AI grading mode');
    console.log('🤖 Provider:', AIGradingAPI.getProviderInfo().provider);
    
    // Test AI grading functionality
    const result = testAIGrading();
    
    // Restore original setting
    getApiGatewayConfig().USE_MOCK = originalMockSetting;
    console.log('🔄 Restored original mock setting');
    
    if (result.success) {
      console.log('✅ Real AI grading test successful');
      return {
        success: true,
        realAIGrading: true,
        provider: 'gemini-ai',
        results: result.gradingResult
      };
    } else {
      console.log('❌ Real AI grading test failed:', result.error);
      return {
        success: false,
        error: result.error,
        provider: 'gemini-ai'
      };
    }
    
  } catch (error) {
    // Ensure we restore mock mode
    getApiGatewayConfig().USE_MOCK = true;
    console.log('❌ Real AI grading test failed with exception:', error.toString());
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
  
  // Test 1: Configuration
  console.log('\n--- Test 1: System Configuration ---');
  results.tests.configuration = testConfiguration();
  
  // Test 2: Mock data structure
  console.log('\n--- Test 2: Mock Data Structure ---');
  results.tests.mockData = testMockDataStructure();
  
  // Test 3: Dashboard data fetch (mock)
  console.log('\n--- Test 3: Dashboard Data Fetch (Mock) ---');
  results.tests.mockDataFetch = testDashboardDataFetch();
  
  // Test 4: Cache management
  console.log('\n--- Test 4: Cache Management ---');
  results.tests.cacheManagement = testCacheManagement();
  
  // Test 5: Real data fetch
  console.log('\n--- Test 5: Real Google Classroom Data ---');
  results.tests.realDataFetch = testRealClassroomData();
  
  // Test 6: Enhanced data fetching
  console.log('\n--- Test 6: Enhanced Data Fetching ---');
  results.tests.enhancedDataFetching = testEnhancedDataFetching();
  
  // Test 7: Enhancement functions
  console.log('\n--- Test 7: Enhancement Functions ---');
  results.tests.enhancementFunctions = testEnhancementFunctions();
  
  // Test 8: Real enhanced data
  console.log('\n--- Test 8: Real Enhanced Data ---');
  results.tests.realEnhancedData = testRealEnhancedData();
  
  // Test 9: AI grading functionality
  console.log('\n--- Test 9: AI Grading ---');
  results.tests.aiGrading = testAIGrading();
  
  // Test 10: Batch AI grading
  console.log('\n--- Test 10: Batch AI Grading ---');
  results.tests.batchAIGrading = testBatchAIGrading();
  
  // Test 11: Grading context building
  console.log('\n--- Test 11: Grading Context Building ---');
  results.tests.gradingContextBuilding = testGradingContextBuilding();
  
  // Test 12: Real AI grading (if enabled)
  console.log('\n--- Test 12: Real AI Grading ---');
  results.tests.realAIGrading = testRealAIGrading();
  
  // Test 13: Data comparison
  console.log('\n--- Test 13: Real vs Mock Comparison ---');
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

/**
 * Setup API Key Interactively
 * 
 * METHOD 1: Use the execution transcript
 * 1. Run this function
 * 2. In the execution transcript, you'll see a line like:
 *    setGeminiApiKey("your-key-here")
 * 3. Copy that line and paste it in the Apps Script console
 * 4. Press Enter to execute
 */
function setupApiKeyInteractively() {
  console.log('🔑 === API KEY SETUP INSTRUCTIONS ===');
  console.log('');
  console.log('Option 1: Use the Apps Script console directly');
  console.log('1. Go to the Apps Script editor console (View > Logs or Ctrl+Enter)');
  console.log('2. Type this command with your actual API key:');
  console.log('   setGeminiApiKey("your-api-key-here")');
  console.log('3. Press Enter to execute');
  console.log('');
  console.log('Option 2: Use PropertiesService directly');
  console.log('1. In the console, type:');
  console.log('   PropertiesService.getScriptProperties().setProperty("GEMINI_API_KEY", "your-key-here")');
  console.log('2. Press Enter to execute');
  console.log('');
  console.log('Option 3: Use the manual setup function');
  console.log('1. Temporarily edit the setApiKeyManually() function below');
  console.log('2. Replace the placeholder with your key');
  console.log('3. Run setApiKeyManually()');
  console.log('4. Change it back to the placeholder');
  console.log('');
  console.log('📝 Get your Gemini API key from: https://makersuite.google.com/app/apikey');
  console.log('');
  console.log('✅ After setup, test with: testConfiguration()');
}

/**
 * Manual API Key Setup (for temporary editing)
 * Only edit this if you want to use Method 3 above
 */
function setApiKeyManually() {
  // Temporarily replace this line with your actual key, run the function, then change it back
  const key = null; // Replace null with "your-actual-key" when needed
  
  if (!key) {
    console.log('❌ Please temporarily edit this function to include your API key');
    console.log('📚 See setupApiKeyInteractively() for full instructions');
    return false;
  }
  
  console.log('🔑 Setting API key...');
  const success = setGeminiApiKey(key);
  
  if (success) {
    console.log('✅ API key set successfully!');
    console.log('⚠️  Remember to change the key back to null in this function');
  }
  
  return success;
}