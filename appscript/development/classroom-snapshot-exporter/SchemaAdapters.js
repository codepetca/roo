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
   * @returns {Object} ClassroomWithData compatible object
   */
  adaptClassroom: function(course) {
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
        ownerId: ''
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
      
      // Map Google Classroom work types to our schema types
      const workTypeMapping = {
        'ASSIGNMENT': 'assignment',
        'SHORT_ANSWER_QUESTION': 'quiz',
        'MULTIPLE_CHOICE_QUESTION': 'quiz'
      };
      
      return {
        // Core assignment data
        id: courseWork.id || '',
        title: courseWork.title || 'Untitled Assignment',
        description: courseWork.description || '',
        
        // Assignment classification
        type: workTypeMapping[courseWork.workType] || 'assignment',
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
   * @returns {Object} SubmissionSnapshot compatible object
   */
  adaptSubmission: function(submission, assignment) {
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
        attachmentCount: this.countAttachments(submission)
      };
    } catch (error) {
      console.error('Error adapting submission:', error);
      // Return minimal valid submission object
      return {
        id: submission.id || 'unknown',
        assignmentId: submission.courseWorkId || assignment?.id || '',
        assignmentName: assignment?.title || 'Unknown Assignment',
        studentId: submission.userId || '',
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
  }
};