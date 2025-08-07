/**
 * DataCollectors - Google Classroom API Integration
 * Handles all data collection from Google Classroom APIs
 * Includes rate limiting and error handling
 */

var DataCollectors = {
  
  // API configuration
  API_BASE: 'https://classroom.googleapis.com/v1',
  MAX_PAGE_SIZE: 100,
  
  // Adaptive rate limiter
  RateLimiter: {
    currentDelay: 50,  // Start optimistic at 50ms
    minDelay: 25,      // Minimum delay
    maxDelay: 500,     // Maximum delay for severe rate limiting
    consecutiveSuccesses: 0,
    
    // Get current delay
    getDelay: function() {
      return this.currentDelay;
    },
    
    // Called after successful API call
    onSuccess: function() {
      this.consecutiveSuccesses++;
      // Reduce delay after multiple successes
      if (this.consecutiveSuccesses >= 3 && this.currentDelay > this.minDelay) {
        this.currentDelay = Math.max(this.minDelay, this.currentDelay - 5);
        this.consecutiveSuccesses = 0;
        console.log(`Rate limiter optimized: reduced to ${this.currentDelay}ms`);
      }
    },
    
    // Called when rate limited (429 error)
    onRateLimit: function() {
      this.consecutiveSuccesses = 0;
      this.currentDelay = Math.min(this.maxDelay, this.currentDelay * 2);
      console.log(`Rate limited - increasing delay to ${this.currentDelay}ms`);
    },
    
    // Called on other API errors
    onError: function() {
      this.consecutiveSuccesses = 0;
      // Slight increase on errors
      if (this.currentDelay < 100) {
        this.currentDelay = Math.min(this.maxDelay, this.currentDelay + 10);
      }
    }
  },
  
  /**
   * Get OAuth token for API calls
   * @returns {string} OAuth token
   */
  getAuthToken: function() {
    try {
      const token = ScriptApp.getOAuthToken();
      if (!token) {
        throw new Error('No OAuth token available');
      }
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      throw new Error('Failed to get authentication token');
    }
  },
  
  /**
   * Make authenticated API request with error handling
   * @param {string} url - API endpoint URL
   * @param {Object} options - Additional fetch options
   * @returns {Object} Parsed JSON response
   */
  makeApiRequest: function(url, options = {}) {
    try {
      const token = this.getAuthToken();
      
      const fetchOptions = {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        },
        ...options
      };
      
      console.log(`API Request: ${url}`);
      const response = UrlFetchApp.fetch(url, fetchOptions);
      const responseCode = response.getResponseCode();
      
      if (responseCode === 200) {
        const data = JSON.parse(response.getContentText());
        this.RateLimiter.onSuccess(); // Track successful call
        return data;
      } else if (responseCode === 404) {
        console.warn(`Resource not found: ${url}`);
        this.RateLimiter.onSuccess(); // 404 is not a rate limit issue
        return null;
      } else if (responseCode === 429) {
        console.warn(`Rate limited: ${url}`);
        this.RateLimiter.onRateLimit();
        // Wait longer and retry once
        Utilities.sleep(this.RateLimiter.getDelay() * 2);
        const retryResponse = UrlFetchApp.fetch(url, fetchOptions);
        if (retryResponse.getResponseCode() === 200) {
          return JSON.parse(retryResponse.getContentText());
        } else {
          throw new Error(`Rate limited - retry failed with code ${retryResponse.getResponseCode()}`);
        }
      } else {
        console.error(`API request failed: ${responseCode} - ${response.getContentText()}`);
        this.RateLimiter.onError();
        throw new Error(`API request failed with code ${responseCode}`);
      }
      
    } catch (error) {
      console.error(`API request error for ${url}:`, error);
      this.RateLimiter.onError();
      throw error;
    }
  },
  
  /**
   * Add adaptive rate limiting delay
   */
  rateLimitDelay: function() {
    const delay = this.RateLimiter.getDelay();
    Utilities.sleep(delay);
  },
  
  /**
   * Collect all active classrooms for the current teacher
   * @returns {Array} Array of classroom objects
   */
  collectClassrooms: function() {
    try {
      console.log('Collecting classrooms...');
      
      const url = `${this.API_BASE}/courses?teacherId=me&courseStates=ACTIVE&pageSize=${this.MAX_PAGE_SIZE}`;
      const response = this.makeApiRequest(url);
      
      if (!response || !response.courses) {
        console.warn('No courses found for teacher');
        return [];
      }
      
      console.log(`Found ${response.courses.length} active classrooms`);
      return response.courses;
      
    } catch (error) {
      console.error('Error collecting classrooms:', error);
      throw new Error(`Failed to collect classrooms: ${error.message}`);
    }
  },
  
  /**
   * Collect assignments for a specific classroom
   * @param {string} courseId - Google Classroom course ID
   * @param {Object} config - Configuration options
   * @returns {Array} Array of assignment objects
   */
  collectAssignments: function(courseId, config = {}) {
    try {
      console.log(`Collecting assignments for course ${courseId}...`);
      
      const url = `${this.API_BASE}/courses/${courseId}/courseWork?pageSize=${this.MAX_PAGE_SIZE}`;
      const response = this.makeApiRequest(url);
      
      if (!response || !response.courseWork) {
        console.log(`No assignments found for course ${courseId}`);
        return [];
      }
      
      let assignments = response.courseWork;
      
      // Enhance assignments with additional data if requested
      if (config.includeMaterials || config.includeQuizData || config.includeRubrics) {
        assignments = assignments.map(assignment => {
          this.rateLimitDelay(); // Rate limiting
          return this.enhanceAssignment(assignment, courseId, config);
        });
      }
      
      console.log(`Collected ${assignments.length} assignments for course ${courseId}`);
      return assignments;
      
    } catch (error) {
      console.error(`Error collecting assignments for course ${courseId}:`, error);
      throw new Error(`Failed to collect assignments: ${error.message}`);
    }
  },
  
  /**
   * Enhance assignment with materials, quiz data, and rubrics
   * @param {Object} assignment - Basic assignment object
   * @param {string} courseId - Course ID
   * @param {Object} config - Configuration options
   * @returns {Object} Enhanced assignment object
   */
  enhanceAssignment: function(assignment, courseId, config) {
    try {
      const enhanced = { ...assignment };
      
      // Add materials if requested
      if (config.includeMaterials && assignment.materials) {
        enhanced.enhancedMaterials = this.processAssignmentMaterials(assignment.materials);
      }
      
      // Add quiz data if this is a quiz assignment
      if (config.includeQuizData && assignment.workType === 'SHORT_ANSWER_QUESTION' || assignment.workType === 'MULTIPLE_CHOICE_QUESTION') {
        try {
          enhanced.quizData = this.collectQuizData(courseId, assignment.id);
        } catch (quizError) {
          console.warn(`Could not get quiz data for ${assignment.title}:`, quizError.message);
        }
      }
      
      // Add submission statistics
      enhanced.submissionStats = this.getAssignmentSubmissionStats(courseId, assignment.id);
      
      return enhanced;
      
    } catch (error) {
      console.warn(`Error enhancing assignment ${assignment.title}:`, error.message);
      return assignment; // Return basic assignment if enhancement fails
    }
  },
  
  /**
   * Process assignment materials into structured format
   * @param {Array} materials - Raw materials from Google Classroom
   * @returns {Object} Structured materials object
   */
  processAssignmentMaterials: function(materials) {
    const processed = {
      driveFiles: [],
      links: [],
      youtubeVideos: [],
      forms: []
    };
    
    materials.forEach(material => {
      if (material.driveFile) {
        processed.driveFiles.push({
          id: material.driveFile.driveFile.id,
          title: material.driveFile.driveFile.title,
          alternateLink: material.driveFile.driveFile.alternateLink,
          thumbnailUrl: material.driveFile.driveFile.thumbnailUrl
        });
      } else if (material.link) {
        processed.links.push({
          url: material.link.url,
          title: material.link.title || material.link.url,
          thumbnailUrl: material.link.thumbnailUrl
        });
      } else if (material.youtubeVideo) {
        processed.youtubeVideos.push({
          id: material.youtubeVideo.id,
          title: material.youtubeVideo.title,
          alternateLink: material.youtubeVideo.alternateLink,
          thumbnailUrl: material.youtubeVideo.thumbnailUrl
        });
      } else if (material.form) {
        processed.forms.push({
          formUrl: material.form.formUrl,
          responseUrl: material.form.responseUrl,
          title: material.form.title,
          thumbnailUrl: material.form.thumbnailUrl
        });
      }
    });
    
    return processed;
  },
  
  /**
   * Get assignment submission statistics
   * @param {string} courseId - Course ID
   * @param {string} assignmentId - Assignment ID
   * @returns {Object} Submission statistics
   */
  getAssignmentSubmissionStats: function(courseId, assignmentId) {
    try {
      const url = `${this.API_BASE}/courses/${courseId}/courseWork/${assignmentId}/studentSubmissions?pageSize=${this.MAX_PAGE_SIZE}`;
      const response = this.makeApiRequest(url);
      
      if (!response || !response.studentSubmissions) {
        return { total: 0, submitted: 0, graded: 0, pending: 0 };
      }
      
      const submissions = response.studentSubmissions;
      const stats = {
        total: submissions.length,
        submitted: 0,
        graded: 0,
        pending: 0
      };
      
      submissions.forEach(submission => {
        const state = submission.state || 'NEW';
        if (state === 'TURNED_IN' || state === 'RETURNED') {
          stats.submitted++;
        }
        if (submission.assignedGrade !== undefined) {
          stats.graded++;
        } else if (state === 'TURNED_IN') {
          stats.pending++;
        }
      });
      
      return stats;
      
    } catch (error) {
      console.warn(`Error getting submission stats for assignment ${assignmentId}:`, error.message);
      return { total: 0, submitted: 0, graded: 0, pending: 0 };
    }
  },
  
  /**
   * Collect quiz data for quiz assignments
   * @param {string} courseId - Course ID
   * @param {string} assignmentId - Assignment ID
   * @returns {Object} Quiz data
   */
  collectQuizData: function(courseId, assignmentId) {
    // Note: Google Classroom API doesn't expose quiz questions directly
    // This would require Google Forms API access for form-based quizzes
    // For now, return placeholder structure
    return {
      questions: [],
      settings: {
        shuffleQuestions: false,
        allowMultipleSubmissions: false
      }
    };
  },
  
  /**
   * Collect students for a specific classroom
   * @param {string} courseId - Google Classroom course ID
   * @returns {Array} Array of student objects
   */
  collectStudents: function(courseId) {
    try {
      console.log(`Collecting students for course ${courseId}...`);
      
      const url = `${this.API_BASE}/courses/${courseId}/students?pageSize=${this.MAX_PAGE_SIZE}`;
      const response = this.makeApiRequest(url);
      
      if (!response || !response.students) {
        console.log(`No students found for course ${courseId}`);
        return [];
      }
      
      console.log(`Collected ${response.students.length} students for course ${courseId}`);
      return response.students;
      
    } catch (error) {
      console.error(`Error collecting students for course ${courseId}:`, error);
      throw new Error(`Failed to collect students: ${error.message}`);
    }
  },
  
  /**
   * Collect submissions for a specific assignment
   * @param {string} courseId - Course ID
   * @param {string} assignmentId - Assignment ID
   * @param {Object} config - Configuration options
   * @returns {Array} Array of submission objects
   */
  collectSubmissions: function(courseId, assignmentId, config = {}) {
    try {
      console.log(`Collecting submissions for assignment ${assignmentId}...`);
      
      const url = `${this.API_BASE}/courses/${courseId}/courseWork/${assignmentId}/studentSubmissions?pageSize=${this.MAX_PAGE_SIZE}`;
      const response = this.makeApiRequest(url);
      
      if (!response || !response.studentSubmissions) {
        console.log(`No submissions found for assignment ${assignmentId}`);
        return [];
      }
      
      let submissions = response.studentSubmissions;
      
      // Filter out non-submitted work if requested
      submissions = submissions.filter(submission => {
        const state = submission.state || 'NEW';
        return state !== 'NEW' && state !== 'CREATED';
      });
      
      // Limit number of submissions if specified
      if (config.maxSubmissionsPerAssignment && submissions.length > config.maxSubmissionsPerAssignment) {
        submissions = submissions.slice(0, config.maxSubmissionsPerAssignment);
        console.log(`Limited to ${submissions.length} submissions for assignment ${assignmentId}`);
      }
      
      // Enhance submissions with student work content
      submissions = submissions.map(submission => {
        this.rateLimitDelay(); // Rate limiting
        return this.enhanceSubmission(submission, courseId);
      });
      
      console.log(`Collected ${submissions.length} submissions for assignment ${assignmentId}`);
      return submissions;
      
    } catch (error) {
      console.error(`Error collecting submissions for assignment ${assignmentId}:`, error);
      throw new Error(`Failed to collect submissions: ${error.message}`);
    }
  },
  
  /**
   * Enhance submission with student work content
   * @param {Object} submission - Basic submission object
   * @param {string} courseId - Course ID
   * @returns {Object} Enhanced submission with student work
   */
  enhanceSubmission: function(submission, courseId) {
    try {
      const enhanced = { ...submission };
      
      // Process attachments to get student work
      if (submission.assignmentSubmission && submission.assignmentSubmission.attachments) {
        enhanced.studentWork = this.extractStudentWork(submission.assignmentSubmission.attachments);
      }
      
      // Add grade information if available
      if (submission.assignedGrade !== undefined) {
        enhanced.grade = {
          score: submission.assignedGrade,
          maxScore: submission.courseWorkType === 'ASSIGNMENT' ? 100 : undefined, // Default, should be from assignment
          feedback: submission.feedback || '',
          gradedAt: submission.updateTime
        };
      }
      
      return enhanced;
      
    } catch (error) {
      console.warn(`Error enhancing submission ${submission.id}:`, error.message);
      return submission;
    }
  },
  
  /**
   * Extract student work content from submission attachments
   * @param {Array} attachments - Submission attachments
   * @returns {string} Extracted student work content
   */
  extractStudentWork: function(attachments) {
    try {
      let studentWork = '';
      
      attachments.forEach(attachment => {
        if (attachment.driveFile) {
          // For Drive files, we can include file info but not content
          studentWork += `[Drive File: ${attachment.driveFile.title}]\n`;
        } else if (attachment.link) {
          studentWork += `[Link: ${attachment.link.url}]\n`;
        } else if (attachment.youTubeVideo) {
          studentWork += `[YouTube Video: ${attachment.youTubeVideo.title}]\n`;
        }
      });
      
      // If no attachments, check for short answer submissions
      if (!studentWork && attachments.length === 0) {
        studentWork = '[Text submission - content not accessible via API]';
      }
      
      return studentWork || '[No student work content available]';
      
    } catch (error) {
      console.warn('Error extracting student work:', error.message);
      return '[Error extracting student work]';
    }
  },
  
  /**
   * Get detailed user profile
   * @param {string} userId - User ID (optional, defaults to 'me')
   * @returns {Object} User profile
   */
  getUserProfile: function(userId = 'me') {
    try {
      const url = `${this.API_BASE}/userProfiles/${userId}`;
      const response = this.makeApiRequest(url);
      
      return response;
      
    } catch (error) {
      console.warn('Error getting user profile:', error.message);
      return null;
    }
  },
  
  /**
   * Health check - test API connectivity
   * @returns {Object} Health check result
   */
  healthCheck: function() {
    try {
      const url = `${this.API_BASE}/courses?pageSize=1`;
      const response = this.makeApiRequest(url);
      
      return {
        success: true,
        message: 'API connectivity verified',
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
};