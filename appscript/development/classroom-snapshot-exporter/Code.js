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
    
    // Safety check: Ensure selectedClassrooms is provided and not empty
    if (!options.selectedClassrooms || options.selectedClassrooms.length === 0) {
      console.warn('No classrooms selected for export - blocking export for safety');
      return {
        success: false,
        error: 'No classrooms selected',
        message: 'Please select at least one classroom to export'
      };
    }
    
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
    
    // Sort classrooms by updateTime (most recent first)
    const sortedClassrooms = classrooms.sort((a, b) => {
      const dateA = new Date(a.updateTime || a.creationTime || 0);
      const dateB = new Date(b.updateTime || b.creationTime || 0);
      return dateB - dateA; // Descending order (newest first)
    });
    
    return {
      success: true,
      classrooms: sortedClassrooms.map((classroom, index) => ({
        id: classroom.id,
        name: classroom.name,
        section: classroom.section,
        studentCount: classroom.enrollmentCode ? 'Active' : 'Archived',
        courseState: classroom.courseState,
        updateTime: classroom.updateTime,
        creationTime: classroom.creationTime,
        isRecent: index < 3 // Mark first 3 as recent
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
    
    // For test export, get the first selected classroom or use the first available classroom
    const classroomListResult = getClassroomList();
    if (!classroomListResult.success || !classroomListResult.classrooms.length) {
      return {
        success: false,
        error: 'No classrooms available for testing'
      };
    }
    
    // Use the first classroom for testing
    const firstClassroom = classroomListResult.classrooms[0];
    
    // Test with limited data first
    const result = exportClassroomSnapshot({
      maxClassrooms: 1,
      maxStudentsPerClass: 5,
      maxSubmissionsPerAssignment: 3,
      includeSubmissions: true, // Include submissions to test complete functionality
      selectedClassrooms: [firstClassroom.id] // Always select at least one classroom for testing
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
 * Test Forms extraction specifically
 */
function testFormsExtraction() {
  try {
    console.log('🔍 === Testing Forms Extraction ===');
    
    // Get ALL classrooms to find one with assignments
    const classrooms = DataCollectors.collectClassrooms();
    console.log(`Found ${classrooms.length} total classrooms`);
    
    if (!classrooms || classrooms.length === 0) {
      console.error('❌ No classrooms found');
      return { success: false, error: 'No classrooms available' };
    }
    
    // Try each classroom until we find one with assignments
    for (const classroom of classrooms) {
      console.log(`\n📚 Checking classroom: ${classroom.name} (${classroom.id})`);
      
      // Get assignments with materials - IMPORTANT: Must include materials to get Forms
      const assignments = DataCollectors.collectAssignments(classroom.id, {
        includeMaterials: true
      });
      
      console.log(`  📝 Found ${assignments.length} assignments`);
      
      if (assignments.length === 0) {
        console.log('  ⏭️ Skipping - no assignments');
        continue;
      }
      
      // Debug: Log first assignment's structure
      if (assignments[0]) {
        console.log('  🔍 First assignment structure:', {
          title: assignments[0].title,
          hasMaterials: !!assignments[0].materials,
          materialsCount: assignments[0].materials?.length || 0,
          materialsTypes: assignments[0].materials?.map(m => Object.keys(m)).flat() || [],
          hasEnhancedMaterials: !!assignments[0].enhancedMaterials,
          enhancedMaterialsCount: assignments[0].enhancedMaterials?.length || 0
        });
      }
      
      // Look for Forms assignments - check both regular materials and enhancedMaterials
      const formsAssignments = assignments.filter(a => {
        // Check regular materials
        const hasFormInMaterials = a.materials && a.materials.some(m => m.form);
        // Check enhanced materials (after processing) - handle both array and object structures
        let hasFormInEnhanced = false;
        if (a.enhancedMaterials) {
          if (Array.isArray(a.enhancedMaterials)) {
            hasFormInEnhanced = a.enhancedMaterials.some(m => m.form);
          } else if (typeof a.enhancedMaterials === 'object' && a.enhancedMaterials.forms) {
            hasFormInEnhanced = a.enhancedMaterials.forms && a.enhancedMaterials.forms.length > 0;
          }
        }
        
        if (hasFormInMaterials || hasFormInEnhanced) {
          console.log(`  ✅ Found Forms assignment: ${a.title}`);
          console.log(`    - Materials form: ${hasFormInMaterials}`);
          console.log(`    - Enhanced form: ${hasFormInEnhanced}`);
          if (a.materials) {
            console.log(`    - Materials structure:`, JSON.stringify(a.materials, null, 2));
          }
          if (a.enhancedMaterials) {
            console.log(`    - Enhanced materials structure:`, JSON.stringify(a.enhancedMaterials, null, 2));
          }
        }
        
        return hasFormInMaterials || hasFormInEnhanced;
      });
      
      console.log(`  📋 Found ${formsAssignments.length} Forms assignments`);
      
      if (formsAssignments.length > 0) {
        // Test with this classroom
        const testAssignment = formsAssignments[0];
        console.log(`\n🎯 Testing Forms extraction with: ${testAssignment.title}`);
        
        // Get the form ID
        let formId = null;
        let material = null;
        
        // Try to find form from materials first
        if (testAssignment.materials) {
          material = testAssignment.materials.find(m => m.form);
        }
        
        // If not found, try enhancedMaterials (handle both array and object structures)
        if (!material && testAssignment.enhancedMaterials) {
          if (Array.isArray(testAssignment.enhancedMaterials)) {
            material = testAssignment.enhancedMaterials.find(m => m.form);
          } else if (testAssignment.enhancedMaterials.forms && testAssignment.enhancedMaterials.forms.length > 0) {
            // If enhancedMaterials is object with forms array
            material = { form: testAssignment.enhancedMaterials.forms[0] };
          }
        }
        
        if (material?.form?.formUrl) {
          formId = DataCollectors.extractFormIdFromUrl(material.form.formUrl);
          console.log(`  📋 Form ID: ${formId}`);
        } else {
          console.log(`  ❌ Could not find form URL in materials`);
          console.log(`  📋 Assignment materials:`, JSON.stringify(testAssignment.materials, null, 2));
          console.log(`  📋 Assignment enhancedMaterials:`, JSON.stringify(testAssignment.enhancedMaterials, null, 2));
        }
        
        // Test extraction
        if (formId) {
          try {
            const form = FormApp.openById(formId);
            console.log(`  ✅ Successfully opened form: ${form.getTitle()}`);
            console.log(`  📧 Collects emails: ${form.collectsEmail()}`);
            // Note: Skipping requiresLogin() check as it requires edit permissions
            
            const responses = form.getResponses();
            console.log(`  📊 Total responses: ${responses.length}`);
            
            if (responses.length > 0) {
              const firstResponse = responses[0];
              console.log(`  👤 First response email: ${firstResponse.getRespondentEmail() || 'anonymous'}`);
            }
          } catch (formError) {
            console.error(`  ❌ Error accessing form:`, formError.message);
          }
        }
        
        // Adapt the assignment to our schema
        const adaptedAssignment = SchemaAdapters.adaptAssignment(testAssignment, classroom.id);
        console.log(`🔄 Adapted assignment type: ${adaptedAssignment.type}, HasForms: ${adaptedAssignment.materials?.forms?.length > 0}`);
        
        // Get students for this classroom
        const students = DataCollectors.collectStudents(classroom.id);
        console.log(`👥 Found ${students.length} students`);
        
        if (students.length === 0) {
          console.warn('⚠️ No students found in this classroom');
          return { success: true, warning: 'No students to test with' };
        }
        
        // Test Forms extraction with first student
        const testStudent = students[0];
        console.log(`👤 Testing with student: ${testStudent.profile?.name?.fullName} (${testStudent.profile?.emailAddress})`);
        
        // Create mock submission for testing
        const mockSubmission = {
          id: 'test-submission-123',
          userId: testStudent.userId,
          courseWorkId: testAssignment.id,
          state: 'TURNED_IN',
          creationTime: new Date().toISOString()
        };
        
        // Test the extraction
        console.log('🧪 Testing extractSubmissionContent...');
        const extractedContent = SchemaAdapters.extractSubmissionContent(
          mockSubmission, 
          adaptedAssignment, 
          testStudent
        );
        
        console.log('📊 Extraction Results:', {
          hasText: extractedContent.text ? extractedContent.text.length : 0,
          hasStructuredData: Object.keys(extractedContent.structuredData).length,
          submissionType: extractedContent.metadata?.submissionType,
          errors: extractedContent.metadata?.extractionErrors?.length || 0,
          formsMatchInfo: extractedContent.metadata?.formsMatchInfo
        });
        
        if (extractedContent.metadata?.extractionErrors?.length > 0) {
          console.warn('⚠️ Extraction errors:', extractedContent.metadata.extractionErrors);
        }
        
        console.log('✅ Forms extraction test completed');
        return { 
          success: true, 
          data: {
            classroom: classroom.name,
            assignment: testAssignment.title,
            student: testStudent.profile?.emailAddress,
            extractedContent: extractedContent,
            formId: formId
          }
        };
      }
    }
    
    console.warn('⚠️ No Forms assignments found in any classroom');
    return { success: false, error: 'No Forms assignments found in any classroom' };
    
  } catch (error) {
    console.error('❌ Forms extraction test failed:', error);
    return { success: false, error: error.message, stack: error.stack };
  }
}

/**
 * Test complete quiz data extraction integration
 * Tests QuizExtractor + ContentExtractor + DataCollectors integration
 */
function testCompleteQuizIntegration() {
  try {
    console.log('🧪 === Testing Complete Quiz Integration ===');
    
    // Get classrooms to find assignments with forms
    const classrooms = DataCollectors.collectClassrooms();
    console.log(`Found ${classrooms.length} classrooms`);
    
    if (!classrooms || classrooms.length === 0) {
      console.error('❌ No classrooms found');
      return { success: false, error: 'No classrooms available' };
    }
    
    // Look for assignments with forms
    let testAssignment = null;
    let testClassroom = null;
    
    for (const classroom of classrooms) {
      console.log(`\n📚 Checking classroom: ${classroom.name}`);
      
      const assignments = DataCollectors.collectAssignments(classroom.id, {
        includeMaterials: true,
        includeQuizData: true
      });
      
      // Find assignment with forms
      const formsAssignment = assignments.find(a => 
        a.materials && a.materials.some(m => m.form && m.form.formUrl)
      );
      
      if (formsAssignment) {
        testAssignment = formsAssignment;
        testClassroom = classroom;
        break;
      }
    }
    
    if (!testAssignment) {
      console.log('⚠️ No assignments with forms found in accessible classrooms');
      return { success: false, error: 'No form assignments found' };
    }
    
    console.log(`\n🎯 Testing with assignment: ${testAssignment.title}`);
    console.log(`📋 Assignment has quizData: ${!!testAssignment.quizData}`);
    
    if (testAssignment.quizData) {
      console.log(`✅ Quiz extraction successful:`);
      console.log(`  📝 Questions: ${testAssignment.quizData.totalQuestions}`);
      console.log(`  📊 Points: ${testAssignment.quizData.totalPoints}`);
      console.log(`  🤖 Auto-gradable: ${testAssignment.quizData.autoGradableQuestions}`);
      console.log(`  ✋ Manual grading needed: ${testAssignment.quizData.manualGradingRequired}`);
      
      // Show first few questions as example
      if (testAssignment.quizData.questions && testAssignment.quizData.questions.length > 0) {
        console.log(`\n📝 Sample questions:`);
        testAssignment.quizData.questions.slice(0, 3).forEach((q, i) => {
          console.log(`  ${i + 1}. ${q.title} (${q.points}pts, ID: ${q.id})`);
          if (q.correctAnswers && q.correctAnswers.length > 0) {
            console.log(`     ✅ Correct: ${q.correctAnswers.join(', ')}`);
          }
        });
      }
      
      // Test student response matching
      const students = DataCollectors.collectStudents(testClassroom.id);
      if (students && students.length > 0) {
        console.log(`\n👥 Testing with ${students.length} students...`);
        
        const firstStudent = students[0];
        console.log(`🧑‍🎓 Testing student: ${firstStudent.profile?.name?.fullName || firstStudent.profile?.emailAddress || 'Unknown'}`);
        console.log(`🔍 Student data structure:`, JSON.stringify(firstStudent, null, 2));
        
        // Test content extraction - try different possible email paths
        const formUrl = testAssignment.materials.find(m => m.form).form.formUrl;
        const formId = ContentExtractor.extractFormIdFromUrl(formUrl);
        
        // Try different ways to get student email
        const studentEmail = firstStudent.profile?.emailAddress || 
                           firstStudent.profile?.email || 
                           firstStudent.emailAddress ||
                           firstStudent.email;
                           
        console.log(`📧 Using student email: ${studentEmail}`);
        const extractedContent = ContentExtractor.extractFormResponse(formId, studentEmail);
        
        if (extractedContent && extractedContent.structuredData) {
          console.log(`✅ Content extraction successful:`);
          console.log(`  📝 Questions answered: ${Object.keys(extractedContent.structuredData).length}`);
          
          // Check if question IDs match
          const questionIds = Object.keys(extractedContent.structuredData);
          const quizQuestionIds = testAssignment.quizData.questions.map(q => q.id);
          
          const matchingIds = questionIds.filter(id => quizQuestionIds.includes(id));
          console.log(`  🔗 Matching question IDs: ${matchingIds.length}/${questionIds.length}`);
          
          if (matchingIds.length > 0) {
            console.log(`✅ Integration successful - questions can be matched between quiz structure and student responses!`);
          } else {
            console.log(`⚠️ No matching question IDs - check ID extraction logic`);
          }
        } else {
          console.log(`⚠️ No content extracted for student (may not have submitted)`);
        }
      }
      
      return {
        success: true,
        quizData: testAssignment.quizData,
        message: 'Quiz integration test completed successfully'
      };
      
    } else {
      console.log(`❌ Quiz extraction failed - form may not be configured as quiz`);
      return { success: false, error: 'Quiz extraction failed' };
    }
    
  } catch (error) {
    console.error('❌ Quiz integration test failed:', error.toString());
    return { success: false, error: error.toString() };
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

/**
 * Comprehensive form diagnostics test - finds accessible forms and tests them
 * Run this to diagnose why emails can't be accessed
 */
function testFormOwnership() {
  try {
    console.log('🧪 Starting Comprehensive Form Diagnostic Test');
    
    const currentUser = Session.getActiveUser().getEmail();
    console.log(`👤 Running as: ${currentUser}`);
    
    // Step 1: Find classrooms and forms accessible to current user
    console.log('🔍 Step 1: Finding accessible classrooms and forms...');
    const classrooms = DataCollectors.collectClassrooms();
    console.log(`Found ${classrooms.length} accessible classrooms`);
    
    let foundForms = [];
    let testedForms = [];
    
    // Look through ALL classrooms for forms
    for (let i = 0; i < classrooms.length; i++) {
      const classroom = classrooms[i];
      console.log(`\n📚 Checking classroom: ${classroom.name}`);
      
      try {
        const assignments = DataCollectors.collectAssignments(classroom.id, { includeMaterials: true });
        console.log(`  Found ${assignments.length} assignments`);
        
        if (assignments.length === 0) {
          console.log(`  ⚪ Skipping ${classroom.name} - no assignments`);
          continue;
        }
        
        // Find assignments with Forms
        for (const assignment of assignments) {
          if (assignment.materials && assignment.materials.length > 0) {
            const formsInAssignment = assignment.materials.filter(material => 
              material.form && material.form.formUrl
            );
            
            if (formsInAssignment.length > 0) {
              console.log(`  ✅ Assignment "${assignment.title}" has ${formsInAssignment.length} form(s)`);
              
              formsInAssignment.forEach(formMaterial => {
                const formId = ContentExtractor.extractFormIdFromUrl(formMaterial.form.formUrl);
                if (formId) {
                  foundForms.push({
                    formId: formId,
                    formTitle: formMaterial.form.title || assignment.title,
                    assignmentTitle: assignment.title,
                    classroomName: classroom.name,
                    formUrl: formMaterial.form.formUrl
                  });
                }
              });
            }
          }
        }
        
      } catch (classroomError) {
        console.log(`  ⚠️ Error processing classroom ${classroom.name}: ${classroomError.message}`);
      }
    }
    
    console.log(`\n📋 Found ${foundForms.length} forms across classrooms`);
    
    if (foundForms.length === 0) {
      console.log('❌ No forms found in accessible classrooms');
      return { success: false, error: 'No forms found' };
    }
    
    // Step 2: Test each found form
    console.log('\n🔬 Step 2: Testing each form for ownership and email access...');
    
    for (let i = 0; i < Math.min(foundForms.length, 10); i++) {
      const formInfo = foundForms[i];
      console.log(`\n🎯 Testing Form ${i + 1}/${Math.min(foundForms.length, 10)}`);
      console.log(`   Form: ${formInfo.formTitle}`);
      console.log(`   Assignment: ${formInfo.assignmentTitle}`);
      console.log(`   Classroom: ${formInfo.classroomName}`);
      console.log(`   Form ID: ${formInfo.formId}`);
      
      try {
        const diagnosis = ContentExtractor.diagnoseFormOwnership(formInfo.formId);
        
        const testResult = {
          ...formInfo,
          diagnosis: diagnosis,
          canAccess: !diagnosis.error,
          isOwner: diagnosis.isOwner || false,
          hasEmails: (diagnosis.responsesWithEmails || 0) > 0,
          totalResponses: diagnosis.totalResponses || 0
        };
        
        testedForms.push(testResult);
        
        // Detailed logging for this form
        console.log('   📊 Results:');
        console.log(`     Accessible: ${testResult.canAccess ? 'YES' : 'NO'}`);
        console.log(`     Owner: ${diagnosis.isOwner ? 'YES' : 'NO'} (Owner: ${diagnosis.formOwner || 'Unknown'})`);
        console.log(`     Collects Emails: ${diagnosis.collectsEmail ? 'YES' : 'NO'}`);
        console.log(`     Total Responses: ${diagnosis.totalResponses || 0}`);
        console.log(`     With Emails: ${diagnosis.responsesWithEmails || 0}`);
        console.log(`     Anonymous: ${diagnosis.anonymousResponses || 0}`);
        
        if (diagnosis.dateRange) {
          console.log(`     Response Range: ${diagnosis.dateRange.earliest} to ${diagnosis.dateRange.latest}`);
        }
        
        if (diagnosis.uniqueEmails && diagnosis.uniqueEmails.length > 0) {
          console.log(`     Sample Emails: ${diagnosis.uniqueEmails.slice(0, 3).join(', ')}`);
        }
        
      } catch (formError) {
        console.log(`   ❌ Error testing form: ${formError.message}`);
        testedForms.push({
          ...formInfo,
          error: formError.message,
          canAccess: false
        });
      }
    }
    
    // Step 3: Summary and recommendations
    console.log('\n📈 DIAGNOSTIC SUMMARY');
    console.log('═══════════════════════════════════════════');
    
    const accessibleForms = testedForms.filter(f => f.canAccess);
    const ownedForms = testedForms.filter(f => f.isOwner);
    const formsWithEmails = testedForms.filter(f => f.hasEmails);
    
    console.log(`Current User: ${currentUser}`);
    console.log(`Forms Found: ${foundForms.length}`);
    console.log(`Forms Accessible: ${accessibleForms.length}`);
    console.log(`Forms Owned by You: ${ownedForms.length}`);
    console.log(`Forms with Emails: ${formsWithEmails.length}`);
    
    if (ownedForms.length > 0) {
      console.log('\n✅ OWNED FORMS (should have email access):');
      ownedForms.forEach(form => {
        console.log(`  • ${form.formTitle}: ${form.hasEmails ? 'HAS EMAILS' : 'NO EMAILS'} (${form.totalResponses} responses)`);
      });
    }
    
    if (formsWithEmails.length > 0) {
      console.log('\n📧 FORMS WITH EMAILS:');
      formsWithEmails.forEach(form => {
        console.log(`  • ${form.formTitle}: ${form.diagnosis.responsesWithEmails}/${form.totalResponses} responses have emails`);
      });
    } else {
      console.log('\n❌ NO FORMS HAVE EMAIL DATA');
      console.log('   This suggests either:');
      console.log('   1. Forms were created without email collection');
      console.log('   2. Responses were collected before email setting was enabled');
      console.log('   3. Domain policy prevents email collection');
    }
    
    console.log('\n✅ Comprehensive form diagnostic completed');
    
    return {
      success: true,
      currentUser: currentUser,
      formsFound: foundForms.length,
      formsAccessible: accessibleForms.length,
      formsOwned: ownedForms.length,
      formsWithEmails: formsWithEmails.length,
      results: testedForms
    };
    
  } catch (error) {
    console.error('❌ Form diagnostic test failed:', error);
    return { success: false, error: error.message };
  }
}