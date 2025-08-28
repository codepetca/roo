/**
 * DataCollectors - Google Classroom API Integration
 * Handles all data collection from Google Classroom APIs
 * Includes rate limiting and error handling
 */

var DataCollectors = {
  
  // API configuration
  API_BASE: 'https://classroom.googleapis.com/v1',
  MAX_PAGE_SIZE: 100,
  
  // Performance cache
  Cache: {
    authToken: null,
    authTokenExpiry: 0,
    students: new Map(), // courseId -> students
    forms: new Map(),    // formId -> form instance
    quizData: new Map(), // formUrl -> quiz data
    
    // Clear expired items
    cleanup: function() {
      const now = Date.now();
      if (this.authTokenExpiry < now) {
        this.authToken = null;
        this.authTokenExpiry = 0;
      }
    },
    
    // Get cached auth token or fetch new one
    getAuthToken: function() {
      this.cleanup();
      if (this.authToken && this.authTokenExpiry > Date.now()) {
        return this.authToken;
      }
      
      try {
        this.authToken = ScriptApp.getOAuthToken();
        this.authTokenExpiry = Date.now() + (55 * 60 * 1000); // Cache for 55 minutes
        return this.authToken;
      } catch (error) {
        console.error('Error getting auth token:', error);
        throw new Error('Failed to get authentication token');
      }
    }
  },
  
  // Adaptive rate limiter
  RateLimiter: {
    currentDelay: 25,  // Start more aggressive at 25ms  
    minDelay: 15,      // Minimum delay - very aggressive
    maxDelay: 500,     // Maximum delay for severe rate limiting
    consecutiveSuccesses: 0,
    
    // Get current delay
    getDelay: function() {
      return this.currentDelay;
    },
    
    // Called after successful API call
    onSuccess: function() {
      this.consecutiveSuccesses++;
      // More aggressive optimization - reduce delay faster
      if (this.consecutiveSuccesses >= 2 && this.currentDelay > this.minDelay) {
        this.currentDelay = Math.max(this.minDelay, this.currentDelay - 10);
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
   * Get OAuth token for API calls (cached for performance)
   * @returns {string} OAuth token
   */
  getAuthToken: function() {
    return this.Cache.getAuthToken();
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
      
      const url = `${this.API_BASE}/courses?teacherId=me&courseStates=ACTIVE&pageSize=${this.MAX_PAGE_SIZE}&fields=courses(id,name,section,description,room,ownerId,creationTime,updateTime,alternateLink,teacherGroupEmail,courseGroupEmail,guardiansEnabled,calendarId)`;
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
      
      const url = `${this.API_BASE}/courses/${courseId}/courseWork?pageSize=${this.MAX_PAGE_SIZE}&fields=courseWork(id,title,description,materials,state,alternateLink,creationTime,updateTime,dueDate,dueTime,maxPoints,workType,submissionModificationMode)`;
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
      
      // Add quiz data if assignment has forms (any assignment type can have Google Forms)
      const hasFormMaterials = assignment.materials && 
                               assignment.materials.some(material => material.form && material.form.formUrl);
      
      if (config.includeQuizData && hasFormMaterials) {
        try {
          console.log(`Attempting to collect quiz data for assignment: ${assignment.title}`);
          enhanced.quizData = this.collectQuizData(courseId, assignment.id, assignment);
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
    if (!materials || !Array.isArray(materials)) {
      console.log('  📋 No materials to process');
      return {
        driveFiles: [],
        links: [],
        youtubeVideos: [],
        forms: []
      };
    }
    
    console.log(`  📋 Processing ${materials.length} materials`);
    
    const processed = {
      driveFiles: [],
      links: [],
      youtubeVideos: [],
      forms: []
    };
    
    materials.forEach((material, index) => {
      // Log what type of material this is
      const materialType = Object.keys(material).filter(k => k !== 'title' && k !== 'description');
      console.log(`    [${index}] Material type: ${materialType.join(', ')}`);
      
      if (material.driveFile) {
        console.log(`    [${index}] 📁 Drive file: ${material.driveFile.driveFile?.title || 'Untitled'}`);
        processed.driveFiles.push({
          id: material.driveFile.driveFile.id,
          title: material.driveFile.driveFile.title,
          alternateLink: material.driveFile.driveFile.alternateLink,
          thumbnailUrl: material.driveFile.driveFile.thumbnailUrl
        });
      } else if (material.link) {
        console.log(`    [${index}] 🔗 Link: ${material.link.title || material.link.url}`);
        processed.links.push({
          url: material.link.url,
          title: material.link.title || material.link.url,
          thumbnailUrl: material.link.thumbnailUrl
        });
      } else if (material.youtubeVideo) {
        console.log(`    [${index}] 📺 YouTube: ${material.youtubeVideo.title || 'Untitled'}`);
        processed.youtubeVideos.push({
          id: material.youtubeVideo.id,
          title: material.youtubeVideo.title,
          alternateLink: material.youtubeVideo.alternateLink,
          thumbnailUrl: material.youtubeVideo.thumbnailUrl
        });
      } else if (material.form) {
        // Extract form ID from URL for proper form response access
        const formId = this.extractFormIdFromUrl(material.form.formUrl);
        console.log(`    [${index}] 📋 Form: ${material.form.title || 'Untitled'} - ID: ${formId}`);
        console.log(`    [${index}] 📋 Form URL: ${material.form.formUrl}`);
        processed.forms.push({
          formUrl: material.form.formUrl,
          formId: formId,
          responseUrl: material.form.responseUrl,
          title: material.form.title,
          thumbnailUrl: material.form.thumbnailUrl
        });
      } else {
        console.log(`    [${index}] ❓ Unknown material type:`, materialType);
        console.log(`    [${index}] ❓ Full material:`, JSON.stringify(material, null, 2));
      }
    });
    
    console.log(`  📋 Processed result:`, {
      driveFiles: processed.driveFiles.length,
      links: processed.links.length,
      youtubeVideos: processed.youtubeVideos.length,
      forms: processed.forms.length
    });
    
    return processed;
  },
  
  /**
   * Extract Google Form ID from a form URL
   * @param {string} formUrl - Form URL from Google Classroom
   * @returns {string|null} Form ID or null if not found
   */
  extractFormIdFromUrl: function(formUrl) {
    if (!formUrl) return null;
    
    try {
      // Form URLs look like: https://docs.google.com/forms/d/FORM_ID/edit
      const match = formUrl.match(/\/forms\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : null;
    } catch (error) {
      console.warn('Error extracting form ID from URL:', formUrl, error);
      return null;
    }
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
   * Collect quiz data for quiz assignments with Google Forms
   * @param {string} courseId - Course ID
   * @param {string} assignmentId - Assignment ID
   * @param {Object} assignment - Assignment object (optional, for optimization)
   * @returns {Object} Quiz data extracted from Google Form or null if no form
   */
  collectQuizData: function(courseId, assignmentId, assignment = null) {
    try {
      // If assignment not provided, fetch it
      if (!assignment) {
        const url = `${this.API_BASE}/courses/${courseId}/courseWork/${assignmentId}`;
        const response = this.makeApiRequest(url);
        assignment = response;
      }
      
      // Check if assignment has forms in materials
      if (!assignment.materials) {
        console.log(`No materials found for assignment ${assignmentId}`);
        return null;
      }
      
      // Find form material
      const formMaterial = assignment.materials.find(material => material.form);
      if (!formMaterial || !formMaterial.form.formUrl) {
        console.log(`No form found in materials for assignment ${assignmentId}`);
        return null;
      }
      
      const formUrl = formMaterial.form.formUrl;
      console.log(`Extracting quiz data from form: ${formUrl}`);
      
      // Check cache first for quiz data
      if (this.Cache.quizData.has(formUrl)) {
        const cached = this.Cache.quizData.get(formUrl);
        console.log(`Using cached quiz data for form: ${formUrl} (${cached?.totalQuestions || 0} questions)`);
        return cached;
      }
      
      // Use QuizExtractor to get quiz data with robust error handling
      const quizData = extractQuizData(formUrl);
      
      // Cache the result (even if null)
      this.Cache.quizData.set(formUrl, quizData);
      
      if (quizData) {
        console.log(`Successfully extracted quiz data: ${quizData.totalQuestions} questions, ${quizData.totalPoints} points`);
        return quizData;
      } else {
        console.log(`Form at ${formUrl} is not configured as a quiz or extraction failed`);
        return null;
      }
      
    } catch (error) {
      console.error(`Error collecting quiz data for assignment ${assignmentId}:`, error.toString());
      return null;
    }
  },
  
  /**
   * Collect students for a specific classroom (cached for performance)
   * @param {string} courseId - Google Classroom course ID
   * @returns {Array} Array of student objects
   */
  collectStudents: function(courseId) {
    try {
      // Check cache first
      if (this.Cache.students.has(courseId)) {
        const cached = this.Cache.students.get(courseId);
        console.log(`Using cached students for course ${courseId} (${cached.length} students)`);
        return cached;
      }
      
      console.log(`Collecting students for course ${courseId}...`);
      
      const url = `${this.API_BASE}/courses/${courseId}/students?pageSize=${this.MAX_PAGE_SIZE}&fields=students(courseId,userId,profile)`;
      const response = this.makeApiRequest(url);
      
      if (!response || !response.students) {
        console.log(`No students found for course ${courseId}`);
        const emptyResult = [];
        this.Cache.students.set(courseId, emptyResult);
        return emptyResult;
      }
      
      console.log(`Collected ${response.students.length} students for course ${courseId}`);
      
      // Cache the result
      this.Cache.students.set(courseId, response.students);
      
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
      console.log(`🔍 [Submission Debug] Raw API returned ${submissions.length} submissions for assignment ${assignmentId}`);
      
      // Debug: Log submission states
      submissions.forEach((sub, i) => {
        console.log(`🔍 [Submission Debug] Submission ${i}: state=${sub.state}, userId=${sub.userId}, hasWork=${!!(sub.assignmentSubmission || sub.shortAnswerSubmission || sub.multipleChoiceSubmission)}`);
      });
      
      // Filter out non-submitted work if requested
      const originalCount = submissions.length;
      submissions = submissions.filter(submission => {
        const state = submission.state || 'NEW';
        return state !== 'NEW' && state !== 'CREATED';
      });
      console.log(`🔍 [Submission Debug] After filtering NEW/CREATED states: ${submissions.length}/${originalCount} submissions remain`);
      
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
   * Collect submissions for multiple assignments in parallel using batched requests
   * Much faster than sequential collection for classrooms with many assignments
   * @param {string} courseId - Course ID
   * @param {Array} assignments - Array of assignment objects
   * @param {Object} config - Configuration options
   * @returns {Array} Array of all submission objects across all assignments
   */
  collectSubmissionsParallel: function(courseId, assignments, config = {}) {
    try {
      if (!assignments || assignments.length === 0) {
        console.log('No assignments provided for parallel collection');
        return [];
      }
      
      const totalAssignments = assignments.length;
      const batchSize = Math.min(15, Math.max(3, Math.floor(80 / Math.max(1, totalAssignments / 10)))); // More aggressive batching
      const allSubmissions = [];
      
      console.log(`Starting parallel submission collection for ${totalAssignments} assignments (batch size: ${batchSize})`);
      
      // Process assignments in batches
      for (let i = 0; i < assignments.length; i += batchSize) {
        const batch = assignments.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;
        const totalBatches = Math.ceil(assignments.length / batchSize);
        
        console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} assignments)`);
        
        try {
          const batchSubmissions = this.processBatchParallel(courseId, batch, config);
          allSubmissions.push(...batchSubmissions);
          
          // Reduced delay between batches for better performance
          if (i + batchSize < assignments.length) {
            Utilities.sleep(50);
          }
          
        } catch (batchError) {
          console.error(`Error processing batch ${batchNumber}:`, batchError.message);
          // Continue with next batch rather than failing completely
        }
      }
      
      console.log(`Parallel collection completed: ${allSubmissions.length} submissions from ${totalAssignments} assignments`);
      return allSubmissions;
      
    } catch (error) {
      console.error('Error in parallel submission collection:', error);
      throw error;
    }
  },
  
  /**
   * Process a batch of assignments in parallel using UrlFetchApp.fetchAll
   * @param {string} courseId - Course ID
   * @param {Array} assignments - Batch of assignments to process
   * @param {Object} config - Configuration options
   * @returns {Array} Array of submissions from this batch
   */
  processBatchParallel: function(courseId, assignments, config) {
    try {
      const token = this.getAuthToken();
      const batchSubmissions = [];
      
      // Prepare parallel requests for all assignments in this batch
      const requests = assignments.map(assignment => {
        const url = `${this.API_BASE}/courses/${courseId}/courseWork/${assignment.id}/studentSubmissions?pageSize=${this.MAX_PAGE_SIZE}`;
        return {
          url: url,
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          method: 'GET'
        };
      });
      
      // Make all requests in parallel
      console.log(`  Making ${requests.length} parallel API calls...`);
      const responses = UrlFetchApp.fetchAll(requests);
      
      // Process responses
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        const assignment = assignments[i];
        
        try {
          const responseCode = response.getResponseCode();
          
          if (responseCode === 200) {
            const data = JSON.parse(response.getContentText());
            this.RateLimiter.onSuccess(); // Track successful call
            
            if (data && data.studentSubmissions) {
              let submissions = data.studentSubmissions;
              console.log(`🔍 [Parallel Debug] Assignment ${assignment.title}: Raw API returned ${submissions.length} submissions`);
              
              // Debug: Log submission states
              submissions.forEach((sub, idx) => {
                console.log(`🔍 [Parallel Debug] Assignment ${assignment.title}, Submission ${idx}: state=${sub.state}, userId=${sub.userId}, hasWork=${!!(sub.assignmentSubmission || sub.shortAnswerSubmission || sub.multipleChoiceSubmission)}`);
              });
              
              // Filter to only submitted work
              const originalCount = submissions.length;
              submissions = submissions.filter(submission => {
                const state = submission.state || 'NEW';
                return state !== 'NEW' && state !== 'CREATED';
              });
              console.log(`🔍 [Parallel Debug] Assignment ${assignment.title}: After filtering NEW/CREATED states: ${submissions.length}/${originalCount} submissions remain`);
              
              // Apply max submissions limit if specified
              if (config.maxSubmissionsPerAssignment && submissions.length > config.maxSubmissionsPerAssignment) {
                submissions = submissions.slice(0, config.maxSubmissionsPerAssignment);
                console.log(`    Limited to ${submissions.length} submissions for assignment ${assignment.title}`);
              }
              
              // Enhance submissions (but without individual rate limiting since we're batching)
              const enhancedSubmissions = submissions.map(submission => {
                return this.enhanceSubmissionQuick(submission, courseId);
              });
              
              batchSubmissions.push(...enhancedSubmissions);
              console.log(`    Collected ${enhancedSubmissions.length} submissions for ${assignment.title}`);
            }
            
          } else if (responseCode === 404) {
            console.warn(`    Assignment not found: ${assignment.title}`);
            this.RateLimiter.onSuccess(); // 404 is not a rate limit issue
            
          } else if (responseCode === 429) {
            console.warn(`    Rate limited for assignment: ${assignment.title}`);
            this.RateLimiter.onRateLimit();
            // For parallel requests, we can't easily retry individual items
            // The next batch will have increased delays
            
          } else {
            console.error(`    API error ${responseCode} for assignment ${assignment.title}: ${response.getContentText()}`);
            this.RateLimiter.onError();
          }
          
        } catch (parseError) {
          console.error(`    Error processing response for assignment ${assignment.title}:`, parseError.message);
        }
      }
      
      return batchSubmissions;
      
    } catch (error) {
      console.error('Error in batch parallel processing:', error);
      throw error;
    }
  },
  
  /**
   * Quick submission enhancement without rate limiting (for use in parallel processing)
   * @param {Object} submission - Basic submission object
   * @param {string} courseId - Course ID
   * @returns {Object} Enhanced submission
   */
  enhanceSubmissionQuick: function(submission, courseId) {
    try {
      const enhanced = { ...submission };
      
      // Process attachments to get student work (simplified version)
      if (submission.assignmentSubmission && submission.assignmentSubmission.attachments) {
        enhanced.studentWork = this.extractStudentWork(submission.assignmentSubmission.attachments);
      }
      
      // Add grade information if available
      if (submission.assignedGrade !== undefined) {
        enhanced.grade = {
          score: submission.assignedGrade,
          maxScore: submission.courseWorkType === 'ASSIGNMENT' ? 100 : undefined,
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