/**
 * SchemaAdapters - Data Transformation Layer
 * Converts Google Classroom API responses to match @shared/schemas/classroom-snapshot.ts
 * Ensures compatibility with Roo platform's snapshot import feature
 */

var SchemaAdapters = {
  
  /**
   * Adapt teacher profile data
   * Converts user data to TeacherProfile schema format
   * @param {Object} userData - User data object
   * @returns {Object} TeacherProfile compatible object
   */
  adaptTeacherProfile: function(userData) {
    try {
      return {
        email: userData.email || '',
        name: userData.name || userData.displayName || userData.email.split('@')[0],
        isTeacher: true,
        displayName: userData.displayName || userData.name || userData.email.split('@')[0]
      };
    } catch (error) {
      console.error('Error adapting teacher profile:', error);
      return {
        email: 'unknown@example.com',
        name: 'Unknown Teacher',
        isTeacher: true,
        displayName: 'Unknown Teacher'
      };
    }
  },
  
  /**
   * Adapt classroom data
   * Converts Google Classroom Course to ClassroomWithData schema format
   * @param {Object} course - Google Classroom course object
   * @param {string} teacherEmail - Teacher's email address
   * @returns {Object} ClassroomWithData compatible object
   */
  adaptClassroom: function(course, teacherEmail) {
    try {
      const now = new Date().toISOString();
      
      return {
        // Core classroom information
        id: course.id || '',
        name: course.name || 'Untitled Course',
        section: course.section || undefined,
        description: course.description || undefined,
        descriptionHeading: course.descriptionHeading || undefined,
        room: course.room || undefined,
        
        // Classroom metadata
        enrollmentCode: course.enrollmentCode || '',
        courseState: course.courseState || 'ACTIVE',
        creationTime: course.creationTime || now,
        updateTime: course.updateTime || now,
        
        // Links and access
        alternateLink: course.alternateLink || `https://classroom.google.com/c/${course.id}`,
        teacherGroupEmail: course.teacherGroupEmail || undefined,
        courseGroupEmail: course.courseGroupEmail || undefined,
        
        // Counts (will be updated by the main export process)
        studentCount: 0,
        assignmentCount: 0,
        totalSubmissions: 0,
        ungradedSubmissions: 0,
        
        // Nested data arrays (will be populated by main export process)
        assignments: [],
        students: [],
        submissions: [],
        
        // Teacher-specific settings
        teacherFolder: course.teacherFolder ? {
          id: course.teacherFolder.id,
          title: course.teacherFolder.title,
          alternateLink: course.teacherFolder.alternateLink
        } : undefined,
        
        // Calendar integration
        calendarId: course.calendarId || undefined,
        
        // Permissions and ownership
        ownerId: course.ownerId || '',
        teacherEmail: teacherEmail || '',
        guardianNotificationSettings: course.guardiansEnabled ? {
          enabled: course.guardiansEnabled
        } : undefined
      };
    } catch (error) {
      console.error('Error adapting classroom:', error);
      // Return minimal valid classroom object
      return {
        id: course.id || 'unknown',
        name: course.name || 'Unknown Course',
        enrollmentCode: course.enrollmentCode || '',
        courseState: 'ACTIVE',
        creationTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        alternateLink: `https://classroom.google.com/c/${course.id || 'unknown'}`,
        studentCount: 0,
        assignmentCount: 0,
        totalSubmissions: 0,
        ungradedSubmissions: 0,
        assignments: [],
        students: [],
        submissions: [],
        ownerId: '',
        teacherEmail: teacherEmail || ''
      };
    }
  },
  
  /**
   * Adapt assignment data
   * Converts Google Classroom CourseWork to AssignmentWithStats schema format
   * @param {Object} courseWork - Google Classroom courseWork object
   * @returns {Object} AssignmentWithStats compatible object
   */
  adaptAssignment: function(courseWork) {
    try {
      const now = new Date().toISOString();
      
      // Determine assignment type with title-based coding detection
      let assignmentType = 'written'; // Default for regular assignments
      
      if (courseWork.workType === 'SHORT_ANSWER_QUESTION' || 
          courseWork.workType === 'MULTIPLE_CHOICE_QUESTION' ||
          courseWork.materials?.some(m => m.form)) {
        
        // Check assignment title for coding keywords
        const title = (courseWork.title || '').toLowerCase();
        const codingKeywords = ['program', 'code', 'karel', 'function', 'algorithm', 'coding'];
        
        const isCodingQuiz = codingKeywords.some(keyword => 
          title.includes(keyword)
        );
        
        assignmentType = isCodingQuiz ? 'coding' : 'quiz';
      } else if (courseWork.workType === 'ASSIGNMENT') {
        assignmentType = 'written';
      }
      
      return {
        // Core assignment data
        id: courseWork.id || '',
        title: courseWork.title || 'Untitled Assignment',
        description: courseWork.description || '',
        
        // Assignment classification with title-based coding detection
        type: assignmentType,
        maxScore: courseWork.maxPoints || 100,
        
        // Timing information
        dueDate: courseWork.dueDate ? this.convertGoogleDateTime(courseWork.dueDate, courseWork.dueTime) : undefined,
        creationTime: courseWork.creationTime || now,
        updateTime: courseWork.updateTime || now,
        
        // Google Classroom specific
        workType: courseWork.workType || 'ASSIGNMENT',
        alternateLink: courseWork.alternateLink || '',
        
        // Status and state
        state: courseWork.state || 'PUBLISHED',
        
        // Submission statistics (from enhanced data if available)
        submissionStats: courseWork.submissionStats || {
          total: 0,
          submitted: 0,
          graded: 0,
          pending: 0
        },
        
        // Enhanced data (optional)
        materials: courseWork.enhancedMaterials || (courseWork.materials ? {
          driveFiles: [],
          links: [],
          youtubeVideos: [],
          forms: []
        } : undefined),
        
        // Quiz data (if available)
        quizData: courseWork.quizData || undefined,
        
        // Rubric data (placeholder for future enhancement)
        rubric: undefined,
        
        // Legacy compatibility fields
        points: courseWork.maxPoints || undefined,
        gradingPeriodId: courseWork.gradingPeriodId || undefined,
        categoryId: courseWork.topicId || undefined
      };
    } catch (error) {
      console.error('Error adapting assignment:', error);
      // Return minimal valid assignment object
      return {
        id: courseWork.id || 'unknown',
        title: courseWork.title || 'Unknown Assignment',
        description: courseWork.description || '',
        type: 'assignment',
        maxScore: courseWork.maxPoints || 100,
        creationTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        workType: courseWork.workType || 'ASSIGNMENT',
        alternateLink: courseWork.alternateLink || '',
        state: 'PUBLISHED',
        submissionStats: { total: 0, submitted: 0, graded: 0, pending: 0 }
      };
    }
  },
  
  /**
   * Adapt student data
   * Converts Google Classroom Student to StudentSnapshot schema format
   * @param {Object} student - Google Classroom student object
   * @param {string} courseId - Course ID for enrollment info
   * @returns {Object} StudentSnapshot compatible object
   */
  adaptStudent: function(student, courseId) {
    try {
      return {
        // Core student information
        id: student.userId || student.profile?.id || '',
        email: student.profile?.emailAddress || '',
        name: student.profile?.name?.fullName || 'Unknown Student',
        firstName: student.profile?.name?.givenName || undefined,
        lastName: student.profile?.name?.familyName || undefined,
        displayName: student.profile?.name?.fullName || student.profile?.emailAddress || 'Unknown Student',
        
        // Google Classroom specific
        userId: student.userId || student.profile?.id || '',
        profile: student.profile ? {
          id: student.profile.id,
          name: {
            givenName: student.profile.name?.givenName || '',
            familyName: student.profile.name?.familyName || '',
            fullName: student.profile.name?.fullName || ''
          },
          emailAddress: student.profile.emailAddress || '',
          photoUrl: student.profile.photoUrl || undefined
        } : undefined,
        
        // Enrollment info
        courseId: courseId || '',
        joinTime: student.creationTime || undefined,
        
        // Academic data (placeholders - would need additional API calls to populate)
        overallGrade: undefined,
        submissionCount: 0,
        gradedSubmissionCount: 0
      };
    } catch (error) {
      console.error('Error adapting student:', error);
      // Return minimal valid student object
      return {
        id: student.userId || 'unknown',
        email: student.profile?.emailAddress || 'unknown@example.com',
        name: student.profile?.name?.fullName || 'Unknown Student',
        displayName: student.profile?.name?.fullName || 'Unknown Student',
        userId: student.userId || 'unknown',
        courseId: courseId || '',
        submissionCount: 0,
        gradedSubmissionCount: 0
      };
    }
  },
  
  /**
   * Adapt submission data
   * Converts Google Classroom StudentSubmission to SubmissionSnapshot schema format
   * @param {Object} submission - Google Classroom studentSubmission object
   * @param {Object} assignment - Assignment object for context
   * @param {Object} studentData - Student object for email and name (optional)
   * @returns {Object} SubmissionSnapshot compatible object
   */
  adaptSubmission: function(submission, assignment, studentData) {
    try {
      const now = new Date().toISOString();
      
      // Map Google Classroom submission states to our schema
      const stateMapping = {
        'NEW': 'pending',
        'CREATED': 'pending',
        'TURNED_IN': 'submitted',
        'RETURNED': 'graded'
      };
      
      const status = stateMapping[submission.state] || 'pending';
      
      return {
        // Core submission information
        id: submission.id || '',
        assignmentId: submission.courseWorkId || assignment?.id || '',
        assignmentName: assignment?.title || 'Unknown Assignment',
        studentId: submission.userId || '',
        
        // Student information (required by enhanced submission schema)
        studentEmail: studentData?.email || studentData?.profile?.emailAddress || 'unknown@example.com',
        studentName: studentData?.name || studentData?.displayName || studentData?.profile?.name?.fullName || 'Unknown Student',
        
        // Submission status and timing
        status: status,
        submittedAt: submission.creationTime || submission.updateTime || now,
        gradedAt: (submission.assignedGrade !== undefined) ? submission.updateTime : undefined,
        
        // Grade information
        score: submission.assignedGrade || undefined,
        maxScore: assignment?.maxScore || 100,
        feedback: this.extractFeedback(submission),
        
        // Student work content
        studentWork: submission.studentWork || this.extractStudentWork(submission) || '',
        
        // Additional submission data
        alternateLink: submission.alternateLink || '',
        
        // Grade object (enhanced format)
        grade: (submission.assignedGrade !== undefined) ? {
          score: submission.assignedGrade,
          maxScore: assignment?.maxScore || 100,
          percentage: assignment?.maxScore ? 
            Math.round((submission.assignedGrade / assignment.maxScore) * 100) : undefined,
          feedback: this.extractFeedback(submission),
          gradedAt: submission.updateTime || now,
          gradedBy: 'teacher' // Default, could be enhanced with actual teacher info
        } : undefined,
        
        // Submission metadata
        late: submission.late || false,
        draftGrade: submission.draftGrade || undefined,
        
        // Enhanced submission data
        submissionHistory: submission.submissionHistory || undefined,
        attachmentCount: this.countAttachments(submission),
        
        // Content extraction from attachments
        extractedContent: this.extractSubmissionContent(submission, assignment),
        
        // AI processing status
        aiProcessingStatus: this.createAiProcessingStatus(submission, assignment)
      };
    } catch (error) {
      console.error('Error adapting submission:', error);
      // Return minimal valid submission object
      return {
        id: submission.id || 'unknown',
        assignmentId: submission.courseWorkId || assignment?.id || '',
        assignmentName: assignment?.title || 'Unknown Assignment',
        studentId: submission.userId || '',
        studentEmail: studentData?.email || studentData?.profile?.emailAddress || 'unknown@example.com',
        studentName: studentData?.name || studentData?.displayName || studentData?.profile?.name?.fullName || 'Unknown Student',
        status: 'pending',
        submittedAt: new Date().toISOString(),
        studentWork: '',
        maxScore: assignment?.maxScore || 100
      };
    }
  },
  
  /**
   * Convert Google DateTime format to ISO string
   * @param {Object} date - Google date object
   * @param {Object} time - Google time object (optional)
   * @returns {string} ISO datetime string
   */
  convertGoogleDateTime: function(date, time) {
    try {
      if (!date) return undefined;
      
      // Handle Google's date format: { year: 2024, month: 12, day: 25 }
      const year = date.year || new Date().getFullYear();
      const month = (date.month || 1) - 1; // JavaScript months are 0-based
      const day = date.day || 1;
      
      // Handle optional time: { hours: 23, minutes: 59 }
      const hours = time?.hours || 0;
      const minutes = time?.minutes || 0;
      
      const dateObj = new Date(year, month, day, hours, minutes);
      return dateObj.toISOString();
      
    } catch (error) {
      console.warn('Error converting Google DateTime:', error);
      return new Date().toISOString(); // Fallback to current time
    }
  },
  
  /**
   * Extract feedback from submission
   * @param {Object} submission - Submission object
   * @returns {string} Feedback text
   */
  extractFeedback: function(submission) {
    try {
      if (submission.feedback) {
        return submission.feedback;
      }
      
      // Check for feedback in draft grade
      if (submission.draftGrade?.feedback) {
        return submission.draftGrade.feedback;
      }
      
      // Check for feedback in submission history
      if (submission.submissionHistory) {
        const feedbackEntries = submission.submissionHistory.filter(entry => entry.feedback);
        if (feedbackEntries.length > 0) {
          return feedbackEntries[feedbackEntries.length - 1].feedback; // Get latest feedback
        }
      }
      
      return '';
    } catch (error) {
      console.warn('Error extracting feedback:', error);
      return '';
    }
  },
  
  /**
   * Extract student work content from submission
   * @param {Object} submission - Submission object
   * @returns {string} Student work content
   */
  extractStudentWork: function(submission) {
    try {
      let content = '';
      
      // Check assignment submission attachments
      if (submission.assignmentSubmission?.attachments) {
        const attachments = submission.assignmentSubmission.attachments;
        
        attachments.forEach(attachment => {
          if (attachment.driveFile) {
            content += `[Drive File: ${attachment.driveFile.title}]\n`;
          } else if (attachment.link) {
            content += `[Link: ${attachment.link.url}]\n`;
          } else if (attachment.youTubeVideo) {
            content += `[YouTube Video: ${attachment.youTubeVideo.title}]\n`;
          }
        });
      }
      
      // Check for short answer submissions
      if (submission.shortAnswerSubmission?.answer) {
        content += submission.shortAnswerSubmission.answer;
      }
      
      // Check for multiple choice submissions
      if (submission.multipleChoiceSubmission?.answer) {
        content += `Selected: ${submission.multipleChoiceSubmission.answer}`;
      }
      
      return content || '[No content available]';
      
    } catch (error) {
      console.warn('Error extracting student work:', error);
      return '[Error extracting content]';
    }
  },
  
  /**
   * Count attachments in submission
   * @param {Object} submission - Submission object
   * @returns {number} Number of attachments
   */
  countAttachments: function(submission) {
    try {
      if (submission.assignmentSubmission?.attachments) {
        return submission.assignmentSubmission.attachments.length;
      }
      return 0;
    } catch (error) {
      console.warn('Error counting attachments:', error);
      return 0;
    }
  },
  
  /**
   * Validate adapted data against basic schema requirements
   * @param {string} type - Type of object (teacher, classroom, assignment, student, submission)
   * @param {Object} data - Adapted data object
   * @returns {Object} Validation result
   */
  validateAdaptedData: function(type, data) {
    const errors = [];
    
    try {
      switch (type) {
        case 'teacher':
          if (!data.email) errors.push('Teacher email is required');
          if (!data.name) errors.push('Teacher name is required');
          break;
          
        case 'classroom':
          if (!data.id) errors.push('Classroom ID is required');
          if (!data.name) errors.push('Classroom name is required');
          break;
          
        case 'assignment':
          if (!data.id) errors.push('Assignment ID is required');
          if (!data.title) errors.push('Assignment title is required');
          if (typeof data.maxScore !== 'number') errors.push('Assignment maxScore must be a number');
          break;
          
        case 'student':
          if (!data.id) errors.push('Student ID is required');
          if (!data.email) errors.push('Student email is required');
          break;
          
        case 'submission':
          if (!data.id) errors.push('Submission ID is required');
          if (!data.assignmentId) errors.push('Submission assignmentId is required');
          if (!data.studentId) errors.push('Submission studentId is required');
          break;
      }
      
      return {
        valid: errors.length === 0,
        errors: errors
      };
      
    } catch (error) {
      return {
        valid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  },
  
  /**
   * Extract content from submission attachments
   * @param {Object} submission - Google Classroom submission object
   * @param {Object} assignment - Assignment object for context
   * @returns {Object} Extracted content object
   */
  extractSubmissionContent: function(submission, assignment) {
    const extractedContent = {
      text: '',
      structuredData: {},
      images: [],
      metadata: {
        attachmentTypes: [],
        totalAttachments: 0,
        extractionErrors: []
      }
    };
    
    try {
      // Handle short answer and multiple choice submissions first
      if (submission.shortAnswerSubmission?.answer) {
        extractedContent.text = submission.shortAnswerSubmission.answer;
        extractedContent.metadata.submissionType = 'short_answer';
        return extractedContent;
      }
      
      if (submission.multipleChoiceSubmission?.answer) {
        extractedContent.structuredData.selectedAnswer = submission.multipleChoiceSubmission.answer;
        extractedContent.text = `Selected: ${submission.multipleChoiceSubmission.answer}`;
        extractedContent.metadata.submissionType = 'multiple_choice';
        return extractedContent;
      }
      
      // Handle assignment submissions with attachments
      if (submission.assignmentSubmission?.attachments) {
        const attachments = submission.assignmentSubmission.attachments;
        extractedContent.metadata.totalAttachments = attachments.length;
        
        let combinedText = '';
        
        for (const attachment of attachments) {
          try {
            if (attachment.driveFile) {
              // Extract content from Google Drive files
              const fileId = attachment.driveFile.id;
              const mimeType = attachment.driveFile.mimeType || '';
              
              extractedContent.metadata.attachmentTypes.push({
                type: 'driveFile',
                mimeType: mimeType,
                title: attachment.driveFile.title
              });
              
              // Use ContentExtractor to get file content
              const content = ContentExtractor.extractContentByMimeType(fileId, mimeType);
              
              if (content.text) {
                combinedText += `\n[${attachment.driveFile.title}]\n${content.text}\n`;
              }
              
              if (content.structuredData) {
                extractedContent.structuredData[attachment.driveFile.title] = content.structuredData;
              }
              
              // Store metadata
              if (content.metadata) {
                extractedContent.metadata[`file_${fileId}`] = content.metadata;
              }
              
            } else if (attachment.link) {
              // Handle external links
              extractedContent.metadata.attachmentTypes.push({
                type: 'link',
                url: attachment.link.url,
                title: attachment.link.title
              });
              combinedText += `\n[Link: ${attachment.link.title}] ${attachment.link.url}\n`;
              
            } else if (attachment.youTubeVideo) {
              // Handle YouTube videos
              extractedContent.metadata.attachmentTypes.push({
                type: 'youtube',
                url: attachment.youTubeVideo.alternateLink,
                title: attachment.youTubeVideo.title
              });
              combinedText += `\n[YouTube Video: ${attachment.youTubeVideo.title}] ${attachment.youTubeVideo.alternateLink}\n`;
            }
            
          } catch (attachmentError) {
            console.warn(`Error processing attachment:`, attachmentError);
            extractedContent.metadata.extractionErrors.push({
              attachment: attachment.driveFile?.title || attachment.link?.url || 'unknown',
              error: attachmentError.message
            });
          }
        }
        
        extractedContent.text = combinedText.trim();
        extractedContent.metadata.submissionType = 'assignment';
      }
      
      // Handle form submissions (for quiz assignments)
      if (assignment?.type === 'quiz' || assignment?.type === 'coding') {
        // Try to extract form response data if available
        const formId = assignment?.materials?.forms?.[0]?.formId;
        if (formId && submission.id) {
          try {
            const formContent = ContentExtractor.extractFormResponse(formId, submission.id);
            if (formContent.responses) {
              extractedContent.structuredData = formContent.responses;
              extractedContent.text = formContent.text || extractedContent.text;
              extractedContent.metadata.submissionType = 'form_response';
            }
          } catch (formError) {
            console.warn('Error extracting form response:', formError);
            extractedContent.metadata.extractionErrors.push({
              type: 'form_extraction',
              error: formError.message
            });
          }
        }
      }
      
      return extractedContent;
      
    } catch (error) {
      console.error('Error extracting submission content:', error);
      extractedContent.metadata.extractionErrors.push({
        type: 'general_extraction',
        error: error.message
      });
      return extractedContent;
    }
  },
  
  /**
   * Create AI processing status object
   * @param {Object} submission - Google Classroom submission object
   * @param {Object} assignment - Assignment object for context
   * @returns {Object} AI processing status
   */
  createAiProcessingStatus: function(submission, assignment) {
    try {
      const hasContent = !!(
        submission.shortAnswerSubmission?.answer ||
        submission.multipleChoiceSubmission?.answer ||
        (submission.assignmentSubmission?.attachments && 
         submission.assignmentSubmission.attachments.length > 0)
      );
      
      const hasAttachments = !!(submission.assignmentSubmission?.attachments?.length);
      const isQuizType = assignment?.type === 'quiz' || assignment?.type === 'coding';
      
      return {
        contentExtracted: hasContent,
        readyForGrading: hasContent && (
          // Ready if it's a quiz/coding with responses
          (isQuizType && (submission.shortAnswerSubmission || submission.multipleChoiceSubmission)) ||
          // Ready if it's an assignment with attachments
          (!isQuizType && hasAttachments) ||
          // Ready if there's any text content
          !!(submission.shortAnswerSubmission?.answer)
        ),
        processingErrors: [],
        lastProcessedAt: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error creating AI processing status:', error);
      return {
        contentExtracted: false,
        readyForGrading: false,
        processingErrors: [error.message],
        lastProcessedAt: new Date().toISOString()
      };
    }
  }
};