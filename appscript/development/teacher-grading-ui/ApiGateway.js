/**
 * API Gateway - Central point for all data access
 * Toggle USE_MOCK to switch between mock data and real APIs
 */

// Configuration using CONSTANTS.js
function getApiGatewayConfig() {
  return CONSTANTS.API_CONFIG;
}

/**
 * Log debug messages if debugging is enabled
 */
function debugLog(message, data) {
  const config = getApiGatewayConfig();
  if (config.DEBUG) {
    console.log(`[ApiGateway] ${message}`, data || '');
  }
}

/**
 * Simulate network delay for mock calls
 */
function simulateDelay(ms = 1) {
  if (getApiGatewayConfig().USE_MOCK) {
    Utilities.sleep(ms);
  }
}

/**
 * Fetch classroom data from Google Classroom API or mock
 */
function fetchClassrooms() {
  debugLog('fetchClassrooms called', { useMock: getApiGatewayConfig().USE_MOCK });
  
  try {
    if (getApiGatewayConfig().USE_MOCK) {
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
      source: getApiGatewayConfig().USE_MOCK ? 'mock' : 'google-classroom',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Fetch assignments for a specific classroom
 */
function fetchAssignments(classroomId) {
  debugLog('fetchAssignments called', { classroomId, useMock: getApiGatewayConfig().USE_MOCK });
  
  try {
    if (getApiGatewayConfig().USE_MOCK) {
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
      source: getApiGatewayConfig().USE_MOCK ? 'mock' : 'google-classroom',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Fetch student submissions for an assignment
 */
function fetchSubmissions(classroomId, assignmentId) {
  debugLog('fetchSubmissions called', { classroomId, assignmentId, useMock: getApiGatewayConfig().USE_MOCK });
  
  try {
    if (getApiGatewayConfig().USE_MOCK) {
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
      source: getApiGatewayConfig().USE_MOCK ? 'mock' : 'google-classroom',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Fetch complete dashboard data (all classrooms with nested assignments, students, submissions)
 * This is the main function that populates the teacher dashboard cache
 */
function fetchFullDashboardData() {
  debugLog('fetchFullDashboardData called', { useMock: getApiGatewayConfig().USE_MOCK });
  
  try {
    if (getApiGatewayConfig().USE_MOCK) {
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
      source: getApiGatewayConfig().USE_MOCK ? 'mock' : 'google-classroom',
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
      debugLog(`Assignment ${assignment.id} submissions:`, {
        count: assignmentSubmissions.length,
        firstSubmission: assignmentSubmissions[0] ? {
          id: assignmentSubmissions[0].id,
          assignmentId: assignmentSubmissions[0].assignmentId,
          studentName: assignmentSubmissions[0].studentName
        } : 'none'
      });
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
  
  debugLog('Calling CacheManager.createClassroomSnapshot', {
    classroomCount: classrooms.length,
    totalAssignments: classrooms.reduce((sum, c) => sum + c.assignments.length, 0)
  });
  
  // Use server-side CacheManager to create proper structure
  const result = CacheManager.createClassroomSnapshot(teacher, classrooms, 'mock');
  
  debugLog('CacheManager.createClassroomSnapshot result', {
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
    
    debugLog(`Found ${courses.length} active classrooms for teacher`);
    
    if (courses.length === 0) {
      debugLog('No active classrooms found. Teacher may need to create classrooms or check permissions.');
    }
    
    // Step 3: For each classroom, fetch assignments, students, and submissions
    const classrooms = courses.map(course => {
      debugLog('Processing classroom', { id: course.id, name: course.name });
      
      try {
        // For enhanced assignments, basic assignments are used (enhanced processing in EnhancedData.js)
        const assignments = [];
        
        // Fetch basic assignments
        const assignmentsResponse = UrlFetchApp.fetch(
          `https://classroom.googleapis.com/v1/courses/${course.id}/courseWork`,
          {
            headers: { 'Authorization': 'Bearer ' + token },
            muteHttpExceptions: true
          }
        );
        
        const transformedAssignments = assignmentsResponse.getResponseCode() === 200
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
          
        debugLog(`Fetched ${students.length} students for classroom ${course.id}`);
        
        // Transform students to match our expected format
        const transformedStudents = students.map(student => ({
          id: student.userId,
          email: student.profile?.emailAddress || '',
          name: student.profile?.name?.fullName || 'Unknown Student',
          photoUrl: student.profile?.photoUrl || '',
          displayName: student.profile?.name?.fullName || student.profile?.emailAddress || 'Unknown'
        }));
        
        // Batch fetch all submissions for this classroom
        debugLog(`Fetching submissions for ${transformedAssignments.length} assignments in classroom ${course.id}`);
        const submissions = fetchAllSubmissionsForClassroom(course.id, transformedAssignments, transformedStudents, token);
        
        // Calculate ungraded submissions
        const ungradedSubmissions = submissions.filter(s => 
          s.status === 'submitted' || s.status === 'pending'
        ).length;
        
        debugLog(`Classroom ${course.id} data complete:`, {
          students: transformedStudents.length,
          assignments: transformedAssignments.length,
          submissions: submissions.length,
          ungraded: ungradedSubmissions
        });
        
        return {
          ...course,
          studentCount: transformedStudents.length,
          assignmentCount: transformedAssignments.length,
          totalSubmissions: submissions.length,
          ungradedSubmissions: ungradedSubmissions,
          assignments: transformedAssignments,
          students: transformedStudents,
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
    const dashboardData = CacheManager.createClassroomSnapshot(teacher, classrooms, 'google-classroom');
    
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
 * Grade a single submission with AI
 * @param {Object} submissionData - Enhanced submission data
 * @param {Object} assignmentData - Enhanced assignment data  
 * @param {Object} gradingOptions - Grading preferences
 * @returns {Object} Grading result
 */
async function gradeSubmissionWithAI(submissionData, assignmentData, gradingOptions = {}) {
  debugLog('gradeSubmissionWithAI called', { 
    submissionId: submissionData.id, 
    assignmentId: assignmentData.id,
    useMock: getApiGatewayConfig().USE_MOCK 
  });
  
  try {
    if (getApiGatewayConfig().USE_MOCK) {
      // Simulate AI processing with enhanced mock response
      simulateDelay(3000);
      
      const baseScore = Math.floor(Math.random() * 30) + 70;  // 70-100
      const feedback = generateEnhancedMockFeedback(assignmentData.type, baseScore);
      
      return {
        success: true,
        data: {
          requestId: `mock_${Date.now()}`,
          grade: {
            score: baseScore,
            maxScore: assignmentData.maxScore || 100,
            percentage: Math.round((baseScore / (assignmentData.maxScore || 100)) * 100)
          },
          feedback: feedback,
          metadata: {
            model: 'mock-gemini-1.5-flash',
            confidence: 0.85 + (Math.random() * 0.15),
            processingTime: 3000,
            needsReview: Math.random() < 0.1, // 10% chance needs review
            provider: 'mock',
            gradedAt: new Date().toISOString()
          }
        },
        source: 'mock',
        timestamp: new Date().toISOString()
      };
    } else {
      // Real AI grading using AIGradingAPI
      const gradingContext = await buildGradingContext(submissionData, assignmentData, gradingOptions);
      const gradingResult = await AIGradingAPI.gradeSubmission(gradingContext);
      
      return {
        success: true,
        data: gradingResult,
        source: 'ai-grading-api',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    debugLog('gradeSubmissionWithAI error', error.toString());
    return {
      success: false,
      error: error.toString(),
      source: getApiGatewayConfig().USE_MOCK ? 'mock' : 'ai-grading-api',
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Build complete grading context from submission and assignment data
 * @param {Object} submission - Enhanced submission data
 * @param {Object} assignment - Enhanced assignment data
 * @param {Object} options - Grading options
 * @returns {Object} Complete grading context matching aiGradingContextSchema
 */
async function buildGradingContext(submission, assignment, options = {}) {
  debugLog('Building grading context', {
    submissionId: submission?.id || 'unknown',
    assignmentId: assignment?.id || 'unknown',
    hasRubric: !!(assignment?.rubric),
    hasQuizData: !!(assignment?.quizData)
  });
  
  try {
    // Validate required inputs
    if (!submission || !assignment) {
      throw new Error('Missing required submission or assignment data');
    }
    
    if (!submission.id || !assignment.id) {
      throw new Error('Missing required ID fields in submission or assignment');
    }
    
    // Extract content from submission attachments
    const extractedContent = ContentExtractor.extractSubmissionContent(submission);
    
    // Build assignment context with safe property access
    const assignmentContext = {
      id: assignment.id,
      title: assignment.title || 'Untitled Assignment',
      description: assignment.description || '',
      type: assignment.type || 'assignment',
      maxScore: assignment.maxScore || 100,
      instructions: assignment.description || '',
      materials: assignment.materials ? formatMaterialsForAI(assignment.materials) : undefined
    };
    
    // Build grading criteria based on available data
    let gradingCriteria;
    
    if (assignment.rubric) {
      gradingCriteria = {
        type: 'rubric',
        rubric: assignment.rubric,
        gradingInstructions: 'Grade according to the rubric criteria and performance levels.'
      };
    } else if (assignment.quizData) {
      gradingCriteria = {
        type: 'quiz',
        questions: assignment.quizData.questions,
        gradingInstructions: 'Grade based on correct answers and sample solutions provided.'
      };
    } else {
      gradingCriteria = {
        type: 'points',
        maxPoints: assignment.maxScore || 100,
        gradingInstructions: 'Provide a holistic assessment of this assignment based on the description and requirements.',
        keyPoints: extractKeyPointsFromDescription(assignment.description)
      };
    }
    
    // Build submission content for AI with safe property access
    const submissionContent = {
      studentId: submission.studentId || 'unknown',
      studentName: submission.studentName || 'Unknown Student',
      contentType: determineContentType(submission, extractedContent),
      text: extractedContent?.text || submission.studentWork || '',
      sections: extractedContent?.sections || [],
      images: extractedContent?.images || [],
      wordCount: (extractedContent?.text || submission.studentWork || '').split(/\s+/).filter(w => w.length > 0).length,
      attachmentCount: submission.attachments?.length || 0,
      submittedAt: submission.submittedAt || new Date().toISOString(),
      extractedAt: extractedContent?.metadata?.extractedAt || new Date().toISOString(),
      extractionMethod: extractedContent?.metadata?.extractionMethod || 'none',
      extractionQuality: extractedContent?.metadata?.extractionQuality || 'unknown'
    };
    
    // Add quiz responses if available
    if (submission.quizResponse?.answers) {
      submissionContent.quizAnswers = submission.quizResponse.answers;
    }
    
    // Build complete grading context
    const gradingContext = {
      requestId: AIGradingAPI.generateRequestId(),
      assignment: assignmentContext,
      criteria: gradingCriteria,
      submission: submissionContent,
      gradingOptions: {
        strictness: options.strictness || 'moderate',
        focusAreas: options.focusAreas || ['accuracy', 'completeness', 'clarity'],
        feedbackStyle: options.feedbackStyle || 'constructive',
        includePositives: options.includePositives !== false,
        includeSuggestions: options.includeSuggestions !== false,
        model: options.model || 'gemini-1.5-flash',
        temperature: options.temperature || 0.3
      },
      metadata: {
        classroomId: options.classroomId,
        teacherId: Session.getActiveUser().getEmail(),
        gradingTimestamp: new Date().toISOString()
      }
    };
    
    debugLog('Grading context built successfully', {
      criteriaType: gradingCriteria.type,
      contentLength: submissionContent.text?.length || 0,
      hasExtractedSections: submissionContent.sections?.length > 0
    });
    
    return gradingContext;
    
  } catch (error) {
    debugLog('Error building grading context', error.toString());
    throw error;
  }
}

/**
 * Format assignment materials for AI consumption
 */
function formatMaterialsForAI(materials) {
  const formattedMaterials = [];
  
  // Add Drive files
  if (materials.driveFiles) {
    materials.driveFiles.forEach(file => {
      formattedMaterials.push({
        title: file.title,
        type: 'driveFile',
        url: file.alternateLink,
        content: `Google Drive file: ${file.title}`
      });
    });
  }
  
  // Add links
  if (materials.links) {
    materials.links.forEach(link => {
      formattedMaterials.push({
        title: link.title,
        type: 'link',
        url: link.url,
        content: `Web resource: ${link.title}`
      });
    });
  }
  
  // Add YouTube videos
  if (materials.youtubeVideos) {
    materials.youtubeVideos.forEach(video => {
      formattedMaterials.push({
        title: video.title,
        type: 'video',
        url: video.alternateLink,
        content: `Video resource: ${video.title}`
      });
    });
  }
  
  // Add Forms
  if (materials.forms) {
    materials.forms.forEach(form => {
      formattedMaterials.push({
        title: form.title,
        type: 'form',
        url: form.formUrl,
        content: `Google Form: ${form.title}`
      });
    });
  }
  
  return formattedMaterials;
}

/**
 * Extract key points from assignment description for grading
 */
function extractKeyPointsFromDescription(description) {
  if (!description) return [];
  
  const keyPoints = [];
  
  // Look for bullet points or numbered lists
  const bulletRegex = /[•\-\*]\s*(.+)/g;
  const numberRegex = /\d+\.\s*(.+)/g;
  
  let match;
  while ((match = bulletRegex.exec(description)) !== null) {
    keyPoints.push(match[1].trim());
  }
  
  while ((match = numberRegex.exec(description)) !== null) {
    keyPoints.push(match[1].trim());
  }
  
  // If no structured points found, extract sentences that might be requirements
  if (keyPoints.length === 0) {
    const sentences = description.split(/[.!?]+/);
    sentences.forEach(sentence => {
      const trimmed = sentence.trim();
      if (trimmed.length > 20 && (
        trimmed.toLowerCase().includes('should') ||
        trimmed.toLowerCase().includes('must') ||
        trimmed.toLowerCase().includes('need') ||
        trimmed.toLowerCase().includes('require')
      )) {
        keyPoints.push(trimmed);
      }
    });
  }
  
  return keyPoints.slice(0, 5); // Limit to 5 key points
}

/**
 * Determine content type for AI processing
 */
function determineContentType(submission, extractedContent) {
  // Safe property access with defaults
  if (submission?.quizResponse) {
    return 'quiz_response';
  }
  
  if (extractedContent?.sections && extractedContent.sections.length > 1) {
    return 'mixed';
  }
  
  if (submission?.attachments && submission.attachments.length > 0) {
    const primaryAttachment = submission.attachments[0];
    if (primaryAttachment?.contentType) {
      switch (primaryAttachment.contentType) {
        case 'document': return 'document';
        case 'spreadsheet': return 'spreadsheet';
        case 'presentation': return 'presentation';
        default: return 'mixed';
      }
    }
  }
  
  return 'text';
}

/**
 * Generate enhanced mock feedback based on assignment type
 */
function generateEnhancedMockFeedback(type, score) {
  const feedbackTemplates = {
    assignment: {
      high: {
        summary: "Excellent work! Your submission demonstrates strong understanding and meets all requirements.",
        strengths: ["Clear structure and organization", "Thorough analysis and explanation", "Follows instructions precisely"],
        improvements: ["Consider adding more specific examples", "Minor formatting improvements possible"],
        suggestions: ["Great foundation - consider exploring advanced concepts", "Share your approach with classmates"]
      },
      medium: {
        summary: "Good effort! Your work shows understanding but could be strengthened in a few areas.",
        strengths: ["Shows understanding of key concepts", "Meets most requirements", "Clear writing style"],
        improvements: ["Provide more detailed explanations", "Double-check all requirements", "Improve organization"],
        suggestions: ["Review the rubric carefully", "Consider peer feedback", "Expand on your main points"]
      },
      low: {
        summary: "Your submission shows effort but needs significant improvement to meet expectations.",
        strengths: ["Shows initiative in attempting the assignment", "Some understanding evident"],
        improvements: ["Address all assignment requirements", "Provide more thorough explanations", "Improve overall structure"],
        suggestions: ["Review assignment instructions carefully", "Seek help during office hours", "Consider submitting a revised version"]
      }
    },
    quiz: {
      high: {
        summary: "Excellent performance! You demonstrate strong mastery of the material.",
        strengths: ["Accurate answers throughout", "Clear understanding of concepts", "Thorough responses"],
        improvements: ["Minor clarifications on complex topics"],
        suggestions: ["Help other students who are struggling", "Explore advanced applications"]
      },
      medium: {
        summary: "Good work! You show solid understanding with room for improvement in some areas.",
        strengths: ["Most answers are correct", "Shows good grasp of fundamentals", "Clear reasoning"],
        improvements: ["Review questions you missed", "Provide more complete explanations", "Study key concepts more thoroughly"],
        suggestions: ["Review class materials", "Form a study group", "Practice similar problems"]
      },
      low: {
        summary: "Your responses show some understanding but indicate areas that need more study.",
        strengths: ["Shows effort and engagement", "Some correct responses"],
        improvements: ["Review fundamental concepts", "Study incorrect answers", "Seek additional help"],
        suggestions: ["Attend office hours", "Use additional study resources", "Form study groups with classmates"]
      }
    }
  };
  
  const assignmentType = type === 'quiz' ? 'quiz' : 'assignment';
  const scoreCategory = score >= 90 ? 'high' : score >= 70 ? 'medium' : 'low';
  
  return feedbackTemplates[assignmentType][scoreCategory];
}

/**
 * Legacy function for backward compatibility
 */
function callGradingAPI(submissionData) {
  // Convert legacy call to new AI grading system
  return gradeSubmissionWithAI(submissionData, {
    id: submissionData.assignmentId,
    title: submissionData.assignmentTitle || 'Assignment',
    description: submissionData.assignmentDescription || '',
    type: submissionData.type || 'assignment',
    maxScore: submissionData.maxScore || 100
  });
}

/**
 * Batch grade multiple submissions with AI
 * @param {Array} submissions - Array of enhanced submission objects
 * @param {Object} assignment - Enhanced assignment object
 * @param {Object} gradingOptions - Grading preferences
 * @returns {Object} Batch grading results
 */
async function batchGradeSubmissions(submissions, assignment, gradingOptions = {}) {
  debugLog('batchGradeSubmissions called', { 
    count: submissions.length, 
    assignmentId: assignment.id,
    useMock: getApiGatewayConfig().USE_MOCK 
  });
  
  try {
    if (getApiGatewayConfig().USE_MOCK) {
      // Enhanced mock batch processing
      simulateDelay(1000 * submissions.length);
      
      const results = submissions.map(submission => {
        const baseScore = Math.floor(Math.random() * 30) + 70;
        const feedback = generateEnhancedMockFeedback(assignment.type, baseScore);
        
        return {
          requestId: `mock_batch_${Date.now()}_${submission.id}`,
          submissionId: submission.id,
          studentId: submission.studentId,
          studentName: submission.studentName,
          grade: {
            score: baseScore,
            maxScore: assignment.maxScore || 100,
            percentage: Math.round((baseScore / (assignment.maxScore || 100)) * 100)
          },
          feedback: feedback,
          metadata: {
            model: 'mock-gemini-1.5-flash',
            confidence: 0.8 + (Math.random() * 0.2),
            processingTime: 1000,
            needsReview: Math.random() < 0.15, // 15% chance needs review
            provider: 'mock',
            gradedAt: new Date().toISOString()
          },
          status: 'graded'
        };
      });
      
      const successful = results.filter(r => !r.metadata.needsReview).length;
      const failed = results.length - successful;
      
      return {
        success: true,
        data: {
          batchId: `mock_batch_${Date.now()}`,
          results: results,
          successful: successful,
          failed: failed,
          totalTime: 1000 * submissions.length,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString()
        },
        source: 'mock',
        timestamp: new Date().toISOString()
      };
    } else {
      // Real AI batch grading using AIGradingAPI
      const gradingContexts = [];
      
      // Build grading context for each submission with improved error handling
      for (const submission of submissions) {
        try {
          // Validate submission before processing
          if (!submission || !submission.id) {
            throw new Error('Invalid submission: missing ID or submission data');
          }
          
          const context = await buildGradingContext(submission, assignment, gradingOptions);
          gradingContexts.push(context);
        } catch (error) {
          const submissionId = submission?.id || 'unknown';
          const studentName = submission?.studentName || 'Unknown Student';
          debugLog('Error building context for submission', `${submissionId} (${studentName}): ${error.toString()}`);
          
          // Create error context that can be processed by AI grading API
          gradingContexts.push({
            requestId: AIGradingAPI.generateRequestId(),
            submissionId: submissionId,
            studentName: studentName,
            error: error.toString(),
            isError: true, // Flag to identify error contexts
            metadata: {
              errorType: 'context_building_failed',
              originalError: error.toString(),
              gradedAt: new Date().toISOString()
            }
          });
        }
      }
      
      // Use AI grading API for batch processing
      const batchResult = await AIGradingAPI.batchGradeSubmissions(gradingContexts);
      
      return {
        success: true,
        data: batchResult,
        source: 'ai-grading-api',
        timestamp: new Date().toISOString()
      };
    }
  } catch (error) {
    debugLog('batchGradeSubmissions error', error.toString());
    return {
      success: false,
      error: error.toString(),
      source: getApiGatewayConfig().USE_MOCK ? 'mock' : 'ai-grading-api',
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
    if (getApiGatewayConfig().USE_MOCK) {
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
        `${getApiGatewayConfig().API_BASE_URL}/grades/save`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': getApiGatewayConfig().API_KEY
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
      source: getApiGatewayConfig().USE_MOCK ? 'mock' : 'firebase-functions',
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
      source: getApiGatewayConfig().USE_MOCK ? 'mock' : 'api',
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

/**
 * Batch fetch all submissions for all assignments in a classroom
 * @param {string} courseId - The classroom/course ID
 * @param {Array} assignments - Array of assignments to fetch submissions for
 * @param {Array} students - Array of students to map names
 * @param {string} token - OAuth token for API calls
 * @returns {Array} All submissions for the classroom
 */
function fetchAllSubmissionsForClassroom(courseId, assignments, students, token) {
  debugLog(`Starting batch submission fetch for classroom ${courseId}`);
  
  const allSubmissions = [];
  let totalApiCalls = 0;
  
  // Create a student map for quick lookups
  const studentMap = {};
  students.forEach(student => {
    studentMap[student.id] = student;
  });
  
  // Fetch submissions for each assignment
  assignments.forEach((assignment, index) => {
    try {
      debugLog(`Fetching submissions for assignment ${index + 1}/${assignments.length}: ${assignment.title}`);
      
      // Add small delay to avoid rate limits (200ms between calls)
      if (index > 0) {
        Utilities.sleep(200);
      }
      
      const response = UrlFetchApp.fetch(
        `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignment.id}/studentSubmissions`,
        {
          headers: { 'Authorization': 'Bearer ' + token },
          muteHttpExceptions: true
        }
      );
      
      totalApiCalls++;
      
      if (response.getResponseCode() === 200) {
        const data = JSON.parse(response.getContentText());
        const submissions = data.studentSubmissions || [];
        
        debugLog(`Found ${submissions.length} submissions for assignment ${assignment.id}`);
        
        // Basic submission transformation with enhanced validation
        const transformedSubmissions = submissions.map(submission => {
          const student = studentMap[submission.userId] || {};
          
          // Validate required fields
          if (!submission.id || !submission.userId) {
            debugLog('⚠️ Invalid submission data - missing id or userId', submission);
            return null;
          }
          
          // Determine status more accurately
          let status = 'pending';
          if (submission.state === 'TURNED_IN') {
            status = submission.assignedGrade !== undefined ? 'graded' : 'submitted';
          } else if (submission.state === 'CREATED' || submission.state === 'NEW') {
            status = 'pending';
          }
          
          return {
            id: submission.id,
            assignmentId: assignment.id,
            studentId: submission.userId,
            studentName: student.name || student.displayName || `Student ${submission.userId}`,
            studentEmail: student.email || '',
            studentWork: extractSubmissionText(submission) || '',
            status: status,
            submittedAt: submission.lastModifiedTime || submission.creationTime || new Date().toISOString(),
            late: submission.late || false,
            attachments: submission.assignmentSubmission?.attachments || [],
            // Add Google Classroom specific fields for debugging
            originalState: submission.state,
            assignedGrade: submission.assignedGrade,
            draftGrade: submission.draftGrade
          };
        }).filter(submission => submission !== null); // Remove invalid submissions
        
        allSubmissions.push(...transformedSubmissions);
        
      } else {
        debugLog(`Failed to fetch submissions for assignment ${assignment.id}: ${response.getResponseCode()}`);
      }
      
    } catch (error) {
      debugLog(`Error fetching submissions for assignment ${assignment.id}:`, error.toString());
    }
  });
  
  // Deduplicate submissions - keep latest submission per student-assignment pair
  const uniqueSubmissions = {};
  allSubmissions.forEach(submission => {
    const key = `${submission.assignmentId}-${submission.studentId}`;
    if (!uniqueSubmissions[key] || 
        new Date(submission.submittedAt) > new Date(uniqueSubmissions[key].submittedAt)) {
      uniqueSubmissions[key] = submission;
    }
  });
  
  const deduplicatedSubmissions = Object.values(uniqueSubmissions);
  
  debugLog(`Batch submission fetch complete:`, {
    totalAssignments: assignments.length,
    totalApiCalls: totalApiCalls,
    totalSubmissions: allSubmissions.length,
    uniqueSubmissions: deduplicatedSubmissions.length,
    duplicatesRemoved: allSubmissions.length - deduplicatedSubmissions.length,
    submissionsByStatus: {
      pending: deduplicatedSubmissions.filter(s => s.status === 'pending').length,
      submitted: deduplicatedSubmissions.filter(s => s.status === 'submitted').length,
      graded: deduplicatedSubmissions.filter(s => s.status === 'graded').length
    }
  });
  
  return deduplicatedSubmissions;
}

// Enhanced data processing functions moved to EnhancedData.js
// This keeps ApiGateway.js focused on core data fetching

/**
 * Extract submission text from various submission types
 */
function extractSubmissionText(submission) {
  if (submission.shortAnswerSubmission && submission.shortAnswerSubmission.answer) {
    return submission.shortAnswerSubmission.answer;
  }
  if (submission.multipleChoiceSubmission && submission.multipleChoiceSubmission.answer) {
    return submission.multipleChoiceSubmission.answer;
  }
  return '';
}