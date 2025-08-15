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
   * OPTIMIZED: Adapt classroom data with minimal bloat
   * Converts Google Classroom Course to clean classroom format for Firebase
   * @param {Object} course - Google Classroom course object
   * @returns {Object} Clean classroom object with minimal fields
   */
  adaptClassroom: function(course) {
    try {
      const now = new Date().toISOString();
      
      return {
        // Core classroom information (ESSENTIAL ONLY)
        id: course.id || '',
        name: course.name || 'Untitled Course',
        section: course.section || undefined,
        description: course.description || undefined,
        
        // Basic metadata (STRIPPED DOWN)
        courseState: course.courseState || 'ACTIVE',
        creationTime: course.creationTime || now,
        updateTime: course.updateTime || now,
        
        // Essential reference (simplified)
        ownerId: course.ownerId || '',
        
        // Counts (calculated separately - no nested data)
        studentCount: 0,
        assignmentCount: 0,
        totalSubmissions: 0,
        ungradedSubmissions: 0
        
        // REMOVED Google Classroom bloat:
        // - enrollmentCode (not needed for Firebase)
        // - alternateLink (Google-specific URL)
        // - teacherGroupEmail/courseGroupEmail (Google-specific)
        // - teacherFolder (Google Drive specific) 
        // - calendarId (Google Calendar specific)
        // - guardianNotificationSettings (Google-specific)
        // - room (not essential)
        // - descriptionHeading (redundant)
        // - assignments/students/submissions (now separate entities)
      };
    } catch (error) {
      console.error('Error adapting classroom:', error);
      // Return minimal valid classroom object
      return {
        id: course.id || 'unknown',
        name: course.name || 'Unknown Course',
        courseState: 'ACTIVE',
        creationTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        ownerId: course.ownerId || '',
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
   * OPTIMIZED: Adapt assignment data with minimal bloat
   * Converts Google Classroom CourseWork to clean assignment format for Firebase
   * @param {Object} courseWork - Google Classroom courseWork object
   * @returns {Object} Clean assignment object with minimal fields
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
        // Core assignment data (ESSENTIAL ONLY)
        id: courseWork.id || '',
        title: courseWork.title || 'Untitled Assignment',
        description: courseWork.description || '',
        
        // Assignment classification
        type: workTypeMapping[courseWork.workType] || 'assignment',
        maxScore: courseWork.maxPoints || 100,
        status: (courseWork.state || 'PUBLISHED').toLowerCase(),
        
        // Timing information (essential)
        dueDate: courseWork.dueDate ? this.convertGoogleDateTime(courseWork.dueDate, courseWork.dueTime) : undefined,
        creationTime: courseWork.creationTime || now,
        updateTime: courseWork.updateTime || now,
        
        // Classroom reference (set by parent)
        classroomId: courseWork.courseId || '',
        
        // Simplified materials (if available)
        materials: courseWork.enhancedMaterials || undefined
        
        // REMOVED Google Classroom bloat:
        // - workType (Google-specific enum)
        // - alternateLink (Google-specific URL)
        // - submissionStats (calculated separately)
        // - quizData (too complex for initial version)
        // - rubric (not commonly used)
        // - points (duplicate of maxScore)
        // - gradingPeriodId (Google-specific)
        // - categoryId/topicId (Google-specific)
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
        status: 'published',
        creationTime: new Date().toISOString(),
        updateTime: new Date().toISOString(),
        classroomId: courseWork.courseId || ''
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
   * OPTIMIZED: Adapt student enrollment data (NEW - for entity-based structure)
   * Creates clean enrollment entity linking student to classroom
   * @param {Object} student - Google Classroom student object
   * @param {string} classroomId - Classroom ID for enrollment
   * @returns {Object} Clean student enrollment object
   */
  adaptStudentEnrollment: function(student, classroomId) {
    try {
      const now = new Date().toISOString();
      
      return {
        // Core enrollment data
        id: `enrollment-${student.userId || 'unknown'}-${classroomId}`,
        studentId: student.userId || student.profile?.id || '',
        classroomId: classroomId || '',
        
        // Student reference data (for easy access)
        studentEmail: student.profile?.emailAddress || '',
        studentName: student.profile?.name?.fullName || 'Unknown Student',
        
        // Enrollment status
        status: 'active', // Google Classroom students are active by default
        enrolledAt: student.creationTime || now,
        updatedAt: student.updateTime || now
      };
    } catch (error) {
      console.error('Error adapting student enrollment:', error);
      // Return minimal valid enrollment object
      return {
        id: `enrollment-${student.userId || 'unknown'}-${classroomId}`,
        studentId: student.userId || 'unknown',
        classroomId: classroomId || '',
        studentEmail: student.profile?.emailAddress || 'unknown@example.com',
        studentName: student.profile?.name?.fullName || 'Unknown Student',
        status: 'active',
        enrolledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
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
          
        case 'enrollment':
          if (!data.id) errors.push('Enrollment ID is required');
          if (!data.studentId) errors.push('Enrollment studentId is required');
          if (!data.classroomId) errors.push('Enrollment classroomId is required');
          if (!data.studentEmail) errors.push('Enrollment studentEmail is required');
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