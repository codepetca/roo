/**
 * Classroom Snapshot Exporter - Web App Entry Point
 * Exports Google Classroom data in Roo-compatible format
 * 
 * Deploy as web app for teachers to export their classroom data
 * Compatible with @shared/schemas/classroom-snapshot.ts
 */

/**
 * Web app entry point - serves the main interface
 */
function doGet(request) {
  try {
    // Check if user is authenticated
    const user = Session.getActiveUser().getEmail();
    if (!user) {
      return HtmlService.createHtmlOutput(`
        <h2>Authentication Required</h2>
        <p>Please sign in to access the Classroom Snapshot Exporter.</p>
      `);
    }

    // Serve the main web app interface
    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Classroom Snapshot Exporter')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
      
  } catch (error) {
    console.error('Error in doGet:', error);
    return HtmlService.createHtmlOutput(`
      <h2>Error</h2>
      <p>Failed to load the application: ${error.message}</p>
    `);
  }
}

/**
 * Handle POST requests from web interface
 */
function doPost(request) {
  try {
    const action = request.parameter.action;
    
    switch (action) {
      case 'export':
        return handleExportRequest(request);
      case 'test':
        return handleTestRequest(request);
      case 'validate':
        return handleValidationRequest(request);
      default:
        return ContentService
          .createTextOutput(JSON.stringify({ error: 'Unknown action' }))
          .setMimeType(ContentService.MimeType.JSON);
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ error: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Include HTML files in templates
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Main export function - called from web interface
 */
function exportClassroomSnapshot(options = {}) {
  try {
    console.log('Starting classroom snapshot export...', options);
    
    // Get current user info
    const user = Session.getActiveUser();
    if (!user.getEmail()) {
      throw new Error('User not authenticated');
    }

    // Use the ClassroomSnapshotExporter
    const snapshot = ClassroomSnapshotExporter.export(options);
    
    console.log('Export completed successfully');
    return {
      success: true,
      data: snapshot,
      message: `Exported ${snapshot.classrooms.length} classrooms with ${snapshot.globalStats.totalStudents} students`
    };
    
  } catch (error) {
    console.error('Export error:', error);
    return {
      success: false,
      error: error.message,
      details: error.stack
    };
  }
}

/**
 * Get teacher info - called from web interface
 */
function getTeacherInfo() {
  try {
    const user = Session.getActiveUser();
    const email = user.getEmail();
    
    if (!email) {
      throw new Error('User not authenticated');
    }

    return {
      success: true,
      teacher: {
        email: email,
        name: email.split('@')[0], // Fallback name
        isTeacher: true,
        displayName: email.split('@')[0]
      }
    };
    
  } catch (error) {
    console.error('Error getting teacher info:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get list of available classrooms - called from web interface
 */
function getClassroomList() {
  try {
    const classrooms = DataCollectors.collectClassrooms();
    
    return {
      success: true,
      classrooms: classrooms.map(classroom => ({
        id: classroom.id,
        name: classroom.name,
        section: classroom.section,
        studentCount: classroom.enrollmentCode ? 'Active' : 'Archived',
        courseState: classroom.courseState
      }))
    };
    
  } catch (error) {
    console.error('Error getting classroom list:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Test the export functionality - called from web interface
 */
function testExport() {
  try {
    console.log('Running export test...');
    
    // Test with limited data first
    const result = exportClassroomSnapshot({
      maxClassrooms: 1,
      maxStudentsPerClass: 5,
      maxSubmissionsPerAssignment: 3,
      includeSubmissions: false // Start without submissions for faster testing
    });
    
    if (result.success) {
      // Validate the schema
      const validation = SnapshotConfig.validateSnapshot(result.data);
      return {
        success: true,
        message: 'Test export completed successfully',
        validation: validation,
        sampleData: {
          classroomCount: result.data.classrooms.length,
          studentCount: result.data.globalStats.totalStudents,
          assignmentCount: result.data.globalStats.totalAssignments
        }
      };
    } else {
      return result;
    }
    
  } catch (error) {
    console.error('Test export error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Check API permissions and setup
 */
function checkPermissions() {
  try {
    // Try to access Google Classroom API
    const token = ScriptApp.getOAuthToken();
    
    // Test API call
    const response = UrlFetchApp.fetch(
      'https://classroom.googleapis.com/v1/courses?pageSize=1',
      {
        headers: { 
          'Authorization': 'Bearer ' + token 
        }
      }
    );
    
    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      return {
        success: true,
        message: 'API permissions verified',
        classroomCount: data.courses ? data.courses.length : 0
      };
    } else {
      return {
        success: false,
        error: 'API permission denied',
        code: response.getResponseCode()
      };
    }
    
  } catch (error) {
    console.error('Permission check error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Handle export request from POST
 */
function handleExportRequest(request) {
  const options = {
    includeSubmissions: request.parameter.includeSubmissions === 'true',
    includeMaterials: request.parameter.includeMaterials === 'true',
    selectedClassrooms: request.parameter.selectedClassrooms ? 
      request.parameter.selectedClassrooms.split(',') : null
  };
  
  const result = exportClassroomSnapshot(options);
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle test request from POST
 */
function handleTestRequest(request) {
  const result = testExport();
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle validation request from POST
 */
function handleValidationRequest(request) {
  const result = checkPermissions();
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Development and testing functions
 * These can be run directly in Apps Script editor
 */

/**
 * Quick test function for development
 */
function quickTest() {
  try {
    console.log('=== Quick Test Started ===');
    
    // Test teacher info
    const teacherInfo = getTeacherInfo();
    console.log('Teacher info:', teacherInfo);
    
    // Test classroom list
    const classrooms = getClassroomList();
    console.log('Classrooms:', classrooms);
    
    // Test permissions
    const permissions = checkPermissions();
    console.log('Permissions:', permissions);
    
    if (permissions.success) {
      // Test small export
      const exportResult = testExport();
      console.log('Export test:', exportResult);
    }
    
    console.log('=== Quick Test Completed ===');
    return true;
    
  } catch (error) {
    console.error('Quick test failed:', error);
    return false;
  }
}

/**
 * Development function to test full export
 */
function devFullExport() {
  try {
    console.log('=== Development Full Export ===');
    
    const result = exportClassroomSnapshot({
      includeSubmissions: true,
      includeMaterials: true,
      includeQuizData: true
    });
    
    if (result.success) {
      console.log('Full export successful:', {
        classrooms: result.data.classrooms.length,
        students: result.data.globalStats.totalStudents,
        assignments: result.data.globalStats.totalAssignments,
        submissions: result.data.globalStats.totalSubmissions
      });
      
      // Log the JSON data for copying (no Drive needed)
      console.log('=== EXPORT DATA (Copy from logs) ===');
      console.log(JSON.stringify(result.data, null, 2));
      console.log('=== END EXPORT DATA ===');
      
      return result;
    } else {
      console.error('Full export failed:', result.error);
      return result;
    }
    
  } catch (error) {
    console.error('Development export error:', error);
    return { success: false, error: error.message };
  }
}