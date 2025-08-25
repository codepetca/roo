/**
 * EnhancedData.js - Advanced data processing and enhancement functions
 * Extracted from ApiGateway.js for better modularity
 */

/**
 * Enhanced Assignment Data Fetching
 * Fetch assignment with materials, rubrics, and quiz data for AI grading
 */

/**
 * Fetch assignment materials (Drive files, forms, links, YouTube videos)
 * @param {Object} assignment - Assignment object from Google Classroom
 * @param {string} token - OAuth token
 * @returns {Object} Materials object matching assignmentMaterialsSchema
 */
function fetchAssignmentMaterials(assignment, token) {
  debugLog(`Fetching materials for assignment: ${assignment.title}`);
  
  try {
    const materials = {
      driveFiles: [],
      links: [],
      youtubeVideos: [],
      forms: []
    };
    
    // Process assignment materials
    if (assignment.materials && assignment.materials.length > 0) {
      assignment.materials.forEach(material => {
        if (material.driveFile) {
          materials.driveFiles.push({
            id: material.driveFile.driveFile.id,
            title: material.driveFile.driveFile.title,
            alternateLink: material.driveFile.driveFile.alternateLink,
            thumbnailUrl: material.driveFile.driveFile.thumbnailUrl
          });
        } else if (material.link) {
          materials.links.push({
            url: material.link.url,
            title: material.link.title || material.link.url,
            thumbnailUrl: material.link.thumbnailUrl
          });
        } else if (material.youtubeVideo) {
          materials.youtubeVideos.push({
            id: material.youtubeVideo.id,
            title: material.youtubeVideo.title,
            alternateLink: material.youtubeVideo.alternateLink,
            thumbnailUrl: material.youtubeVideo.thumbnailUrl
          });
        } else if (material.form) {
          materials.forms.push({
            formUrl: material.form.formUrl,
            responseUrl: material.form.responseUrl,
            title: material.form.title,
            thumbnailUrl: material.form.thumbnailUrl
          });
        }
      });
    }
    
    debugLog(`Found materials for ${assignment.title}:`, {
      driveFiles: materials.driveFiles.length,
      links: materials.links.length,
      youtubeVideos: materials.youtubeVideos.length,
      forms: materials.forms.length
    });
    
    return materials;
  } catch (error) {
    debugLog(`Error fetching materials for assignment ${assignment.id}:`, error.toString());
    return { driveFiles: [], links: [], youtubeVideos: [], forms: [] };
  }
}

/**
 * Fetch rubric data for an assignment
 * @param {string} courseId - Course ID
 * @param {string} assignmentId - Assignment ID  
 * @param {string} token - OAuth token
 * @returns {Object|null} Rubric object or null if no rubric
 */
function fetchAssignmentRubric(courseId, assignmentId, token) {
  debugLog(`Fetching rubric for assignment: ${assignmentId}`);
  
  try {
    // Fetch the assignment details to get rubric
    const response = UrlFetchApp.fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork/${assignmentId}`,
      {
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      }
    );
    
    if (response.getResponseCode() !== 200) {
      debugLog(`Failed to fetch assignment details for rubric: ${response.getResponseCode()}`);
      return null;
    }
    
    const assignment = JSON.parse(response.getContentText());
    
    // Check if assignment has a rubric
    if (!assignment.gradeCategory || !assignment.gradeCategory.rubric) {
      debugLog(`No rubric found for assignment ${assignmentId}`);
      return null;
    }
    
    const rubricData = assignment.gradeCategory.rubric;
    
    // Transform to our rubric schema
    const rubric = {
      id: rubricData.id || assignmentId + '_rubric',
      title: rubricData.title || 'Assignment Rubric',
      criteria: rubricData.criteria.map(criterion => ({
        title: criterion.title,
        description: criterion.description || '',
        levels: criterion.levels.map(level => ({
          title: level.title,
          description: level.description || '',
          points: level.points || 0
        })),
        weight: criterion.weight || 1
      })),
      totalPoints: rubricData.criteria.reduce((sum, criterion) => {
        const maxPoints = Math.max(...criterion.levels.map(level => level.points || 0));
        return sum + maxPoints;
      }, 0),
      useForGrading: true,
      showToStudents: true,
      source: 'google-classroom'
    };
    
    debugLog(`Fetched rubric for assignment ${assignmentId}:`, {
      criteriaCount: rubric.criteria.length,
      totalPoints: rubric.totalPoints
    });
    
    return rubric;
  } catch (error) {
    debugLog(`Error fetching rubric for assignment ${assignmentId}:`, error.toString());
    return null;
  }
}

/**
 * Fetch Google Forms quiz data
 * @param {string} formUrl - Google Forms URL
 * @param {string} token - OAuth token
 * @returns {Object|null} Quiz data object or null if not a quiz
 */
function fetchFormQuizData(formUrl, token) {
  debugLog(`Fetching quiz data from form: ${formUrl}`);
  
  try {
    // Extract form ID from URL
    const formIdMatch = formUrl.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
    if (!formIdMatch) {
      debugLog(`Could not extract form ID from URL: ${formUrl}`);
      return null;
    }
    
    const formId = formIdMatch[1];
    
    // Fetch form data using Google Forms API
    const response = UrlFetchApp.fetch(
      `https://forms.googleapis.com/v1/forms/${formId}`,
      {
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      }
    );
    
    if (response.getResponseCode() !== 200) {
      debugLog(`Failed to fetch form data: ${response.getResponseCode()}`);
      return null;
    }
    
    const form = JSON.parse(response.getContentText());
    
    // Check if it's a quiz
    if (!form.settings || !form.settings.quizSettings) {
      debugLog(`Form ${formId} is not configured as a quiz`);
      return null;
    }
    
    // Transform to our quiz schema (simplified)
    const quizData = {
      formId: formId,
      formUrl: formUrl,
      title: form.info.title,
      description: form.info.description || '',
      isQuiz: true,
      totalQuestions: form.items ? form.items.length : 0,
      totalPoints: 0  // Would need to calculate from form items
    };
    
    debugLog(`Fetched quiz data for form ${formId}:`, {
      totalQuestions: quizData.totalQuestions,
      totalPoints: quizData.totalPoints
    });
    
    return quizData;
  } catch (error) {
    debugLog(`Error fetching quiz data from form ${formUrl}:`, error.toString());
    return null;
  }
}

/**
 * Enhanced assignment fetching with materials, rubrics, and quiz data
 * @param {string} courseId - Course ID
 * @param {string} token - OAuth token
 * @returns {Array} Enhanced assignments with full context for AI grading
 */
function fetchEnhancedAssignments(courseId, token) {
  debugLog(`Fetching enhanced assignments for course: ${courseId}`);
  
  try {
    // First fetch basic assignments
    const response = UrlFetchApp.fetch(
      `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`,
      {
        headers: { 'Authorization': 'Bearer ' + token },
        muteHttpExceptions: true
      }
    );
    
    if (response.getResponseCode() !== 200) {
      debugLog(`Failed to fetch assignments: ${response.getResponseCode()}`);
      return [];
    }
    
    const data = JSON.parse(response.getContentText());
    const assignments = data.courseWork || [];
    
    debugLog(`Processing ${assignments.length} assignments for enhancement`);
    
    // Enhance each assignment with additional data
    const enhancedAssignments = assignments.map((assignment, index) => {
      debugLog(`Enhancing assignment ${index + 1}/${assignments.length}: ${assignment.title}`);
      
      // Add delay between API calls to avoid rate limits
      if (index > 0) {
        Utilities.sleep(300);
      }
      
      // Base assignment data
      const enhancedAssignment = {
        // Base fields
        id: assignment.id,
        title: assignment.title || 'Untitled Assignment',
        description: assignment.description || '',
        type: assignment.workType === 'ASSIGNMENT' ? 'assignment' : 
              assignment.workType === 'SHORT_ANSWER_QUESTION' ? 'quiz' :
              assignment.workType === 'MULTIPLE_CHOICE_QUESTION' ? 'quiz' : 'assignment',
        state: assignment.state || 'PUBLISHED',
        maxPoints: assignment.maxPoints || 100,
        dueDate: assignment.dueDate ? 
          new Date(assignment.dueDate.year, assignment.dueDate.month - 1, assignment.dueDate.day).toISOString() : 
          undefined,
        creationTime: assignment.creationTime,
        updateTime: assignment.updateTime,
        workType: assignment.workType,
        alternateLink: assignment.alternateLink,
        
        // Enhanced data (optional)
        materials: fetchAssignmentMaterials(assignment, token),
        rubric: fetchAssignmentRubric(courseId, assignment.id, token),
        quizData: undefined, // Will be populated if assignment has a form
        
        // Legacy fields for backward compatibility
        status: 'published',
        submissionStats: {
          total: 0,
          submitted: 0,
          graded: 0,
          pending: 0
        }
      };
      
      // Check if assignment has a form and fetch quiz data
      if (enhancedAssignment.materials.forms.length > 0) {
        const formUrl = enhancedAssignment.materials.forms[0].formUrl;
        enhancedAssignment.quizData = fetchFormQuizData(formUrl, token);
        
        // Update type if it's a quiz form
        if (enhancedAssignment.quizData) {
          enhancedAssignment.type = 'quiz';
        }
      }
      
      return enhancedAssignment;
    });
    
    debugLog(`Enhanced assignment processing complete:`, {
      totalAssignments: enhancedAssignments.length,
      withMaterials: enhancedAssignments.filter(a => 
        Object.values(a.materials).some(arr => arr.length > 0)
      ).length,
      withRubrics: enhancedAssignments.filter(a => a.rubric).length,
      withQuizData: enhancedAssignments.filter(a => a.quizData).length
    });
    
    return enhancedAssignments;
  } catch (error) {
    debugLog(`Error fetching enhanced assignments:`, error.toString());
    return [];
  }
}

/**
 * Enhanced submission processing with detailed attachment information
 * @param {Object} submission - Raw Google Classroom submission
 * @param {Object} assignment - Enhanced assignment object
 * @param {Object} student - Student information
 * @returns {Object} Enhanced submission matching the new schema
 */
function processEnhancedSubmission(submission, assignment, student) {
  try {
    // Process attachments with detailed information
    const attachments = [];
    
    if (submission.assignmentSubmission && submission.assignmentSubmission.attachments) {
      submission.assignmentSubmission.attachments.forEach(attachment => {
        if (attachment.driveFile) {
          const driveFile = attachment.driveFile;
          attachments.push({
            type: 'driveFile',
            id: driveFile.id,
            title: driveFile.title,
            alternateLink: driveFile.alternateLink,
            thumbnailUrl: driveFile.thumbnailUrl,
            mimeType: driveFile.mimeType || 'application/octet-stream',
            contentType: classifyContentType(driveFile.mimeType),
            textExtractable: isTextExtractable(driveFile.mimeType)
          });
        } else if (attachment.link) {
          attachments.push({
            type: 'link',
            url: attachment.link.url,
            title: attachment.link.title || attachment.link.url,
            thumbnailUrl: attachment.link.thumbnailUrl,
            linkType: classifyLinkType(attachment.link.url)
          });
        }
      });
    }
    
    // Map Google Classroom state to our status
    let status = 'pending';
    if (submission.state === 'TURNED_IN') {
      status = submission.assignedGrade !== undefined ? 'graded' : 'submitted';
    } else if (submission.state === 'RETURNED') {
      status = 'returned';
    }
    
    // Enhanced submission object
    const enhancedSubmission = {
      id: submission.id,
      assignmentId: assignment.id,
      studentId: submission.userId,
      studentEmail: student.email || '',
      studentName: student.name || student.displayName || 'Unknown Student',
      studentWork: extractSubmissionText(submission),
      attachments: attachments,
      status: status,
      submittedAt: submission.lastModifiedTime || submission.creationTime,
      updatedAt: submission.updateTime || submission.lastModifiedTime || new Date().toISOString(),
      late: submission.late || false,
      assignedGrade: submission.assignedGrade,
      
      // AI processing status
      aiProcessingStatus: {
        contentExtracted: false,
        readyForGrading: attachments.length > 0 || !!extractSubmissionText(submission),
        processingErrors: []
      }
    };
    
    return enhancedSubmission;
  } catch (error) {
    debugLog(`Error processing enhanced submission ${submission.id}:`, error.toString());
    
    // Return basic submission on error
    return {
      id: submission.id,
      assignmentId: assignment.id,
      studentId: submission.userId,
      studentEmail: student.email || '',
      studentName: student.name || 'Unknown Student',
      studentWork: '',
      attachments: [],
      status: 'error',
      submittedAt: submission.creationTime,
      updatedAt: new Date().toISOString(),
      late: false,
      aiProcessingStatus: {
        contentExtracted: false,
        readyForGrading: false,
        processingErrors: [error.toString()]
      }
    };
  }
}

/**
 * Classify content type based on MIME type
 */
function classifyContentType(mimeType) {
  if (!mimeType) return 'other';
  
  if (mimeType.includes('document') || mimeType.includes('text')) {
    return 'document';
  } else if (mimeType.includes('spreadsheet')) {
    return 'spreadsheet';
  } else if (mimeType.includes('presentation')) {
    return 'presentation';
  } else if (mimeType.includes('pdf')) {
    return 'pdf';
  } else if (mimeType.includes('image')) {
    return 'image';
  }
  
  return 'other';
}

/**
 * Check if content is text extractable
 */
function isTextExtractable(mimeType) {
  if (!mimeType) return false;
  
  const extractable = [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/pdf',
    'text/'
  ];
  
  return extractable.some(type => mimeType.includes(type));
}

/**
 * Classify link type
 */
function classifyLinkType(url) {
  try {
    const domain = extractDomainFromUrl(url).toLowerCase();
    
    if (domain.includes('github')) return 'repository';
    if (domain.includes('youtube') || domain.includes('vimeo')) return 'video';
    if (domain.includes('docs.google') || domain.includes('drive.google')) return 'document';
    
    return 'webpage';
  } catch (error) {
    return 'other';
  }
}

/**
 * Extract domain from URL
 */
function extractDomainFromUrl(url) {
  try {
    if (!url) return '';
    
    // Remove protocol
    let domain = url.replace(/^https?:\/\//, '');
    
    // Remove path and query parameters
    domain = domain.split('/')[0];
    domain = domain.split('?')[0];
    
    return domain;
  } catch (error) {
    return '';
  }
}

/**
 * Extract submission text from various submission types
 */
function extractSubmissionText(submission) {
  // Try to get text from shortAnswerSubmission
  if (submission.shortAnswerSubmission && submission.shortAnswerSubmission.answer) {
    return submission.shortAnswerSubmission.answer;
  }
  
  // Try to get text from multipleChoiceSubmission
  if (submission.multipleChoiceSubmission && submission.multipleChoiceSubmission.answer) {
    return submission.multipleChoiceSubmission.answer;
  }
  
  return '';
}