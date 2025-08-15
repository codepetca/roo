/**
 * ClassroomSnapshotExporter - Core Export Engine
 * Orchestrates the complete snapshot export process
 * Produces data compatible with @shared/schemas/classroom-snapshot.ts
 */

var ClassroomSnapshotExporter = {
  
  /**
   * Main export function - orchestrates the complete snapshot export
   * @param {Object} options - Export configuration options
   * @returns {Object} Complete classroom snapshot matching schema
   */
  export: function(options = {}) {
    const startTime = new Date();
    console.log('Starting classroom snapshot export with options:', options);
    
    try {
      // Set default options
      const config = {
        includeSubmissions: options.includeSubmissions !== false, // Default true
        includeMaterials: options.includeMaterials !== false,     // Default true
        includeQuizData: options.includeQuizData !== false,       // Default true
        includeRubrics: options.includeRubrics !== false,         // Default true
        selectedClassrooms: options.selectedClassrooms || null,   // null = all classrooms
        maxClassrooms: options.maxClassrooms || null,             // null = no limit
        maxStudentsPerClass: options.maxStudentsPerClass || null, // null = no limit
        maxSubmissionsPerAssignment: options.maxSubmissionsPerAssignment || null,
        source: options.source || 'google-classroom',
        ...options
      };
      
      console.log('Export configuration:', config);
      
      // Step 1: Get teacher profile
      console.log('Step 1: Getting teacher profile...');
      const teacher = this.getTeacherProfile();
      
      // Step 2: Get all classrooms with nested data
      console.log('Step 2: Collecting classrooms with data...');
      const classrooms = this.getAllClassroomsWithData(config, teacher.email);
      
      // Step 3: Calculate global statistics
      console.log('Step 3: Calculating global statistics...');
      const globalStats = this.calculateGlobalStats(classrooms);
      
      // Step 4: Create snapshot metadata
      console.log('Step 4: Creating snapshot metadata...');
      const snapshotMetadata = this.createSnapshotMetadata(config.source);
      
      // Step 5: Assemble complete snapshot
      const snapshot = {
        teacher: teacher,
        classrooms: classrooms,
        globalStats: globalStats,
        snapshotMetadata: snapshotMetadata
      };
      
      const endTime = new Date();
      const duration = endTime - startTime;
      
      console.log(`Export completed successfully in ${duration}ms:`, {
        classrooms: classrooms.length,
        totalStudents: globalStats.totalStudents,
        totalAssignments: globalStats.totalAssignments,
        totalSubmissions: globalStats.totalSubmissions
      });
      
      return snapshot;
      
    } catch (error) {
      console.error('Export failed:', error);
      throw new Error(`Snapshot export failed: ${error.message}`);
    }
  },
  
  /**
   * Get teacher profile information
   * @returns {Object} Teacher profile matching TeacherProfile schema
   */
  getTeacherProfile: function() {
    try {
      const user = Session.getActiveUser();
      const email = user.getEmail();
      
      if (!email) {
        throw new Error('No authenticated user found');
      }
      
      // Try to get more detailed user info from Google Classroom API
      let displayName = email.split('@')[0]; // Fallback
      let fullName = displayName;
      
      try {
        const token = ScriptApp.getOAuthToken();
        const response = UrlFetchApp.fetch(
          'https://classroom.googleapis.com/v1/userProfiles/me',
          {
            headers: { 'Authorization': 'Bearer ' + token }
          }
        );
        
        if (response.getResponseCode() === 200) {
          const profile = JSON.parse(response.getContentText());
          if (profile.name) {
            fullName = profile.name.fullName || fullName;
            displayName = fullName;
          }
        }
      } catch (profileError) {
        console.warn('Could not fetch detailed user profile:', profileError.message);
      }
      
      return SchemaAdapters.adaptTeacherProfile({
        email: email,
        name: fullName,
        displayName: displayName,
        isTeacher: true
      });
      
    } catch (error) {
      console.error('Error getting teacher profile:', error);
      throw new Error(`Failed to get teacher profile: ${error.message}`);
    }
  },
  
  /**
   * Get all classrooms with complete nested data
   * @param {Object} config - Export configuration
   * @param {string} teacherEmail - Teacher's email address
   * @returns {Array} Array of classroom objects with nested data
   */
  getAllClassroomsWithData: function(config, teacherEmail) {
    try {
      // Step 1: Get basic classroom list
      console.log('Fetching classroom list...');
      let classrooms = DataCollectors.collectClassrooms();
      
      // Handle classroom selection
      if (config.selectedClassrooms) {
        if (config.selectedClassrooms.length === 0) {
          // No classrooms selected - return empty array (safe behavior)
          console.log('No classrooms selected - returning empty dataset');
          return [];
        } else {
          // Filter to only selected classrooms
          classrooms = classrooms.filter(classroom => 
            config.selectedClassrooms.includes(classroom.id)
          );
          console.log(`Filtered to ${classrooms.length} selected classrooms`);
        }
      } else {
        // Fallback: if selectedClassrooms is null/undefined, default to no classrooms for safety
        console.log('No classroom selection provided - defaulting to empty for safety');
        return [];
      }
      
      // Limit number of classrooms if specified
      if (config.maxClassrooms && classrooms.length > config.maxClassrooms) {
        classrooms = classrooms.slice(0, config.maxClassrooms);
        console.log(`Limited to ${classrooms.length} classrooms`);
      }
      
      // Step 2: Enrich each classroom with nested data
      const enrichedClassrooms = [];
      
      for (let i = 0; i < classrooms.length; i++) {
        const classroom = classrooms[i];
        console.log(`Processing classroom ${i + 1}/${classrooms.length}: ${classroom.name}`);
        
        try {
          const enrichedClassroom = this.enrichClassroomWithData(classroom, config, teacherEmail);
          enrichedClassrooms.push(enrichedClassroom);
          
        } catch (classroomError) {
          console.error(`Error processing classroom ${classroom.name}:`, classroomError);
          // Include classroom with minimal data rather than failing completely
          enrichedClassrooms.push(SchemaAdapters.adaptClassroom(classroom, teacherEmail));
        }
        
        // Add small delay to avoid rate limiting
        if (i < classrooms.length - 1) {
          Utilities.sleep(100);
        }
      }
      
      console.log(`Successfully processed ${enrichedClassrooms.length} classrooms`);
      return enrichedClassrooms;
      
    } catch (error) {
      console.error('Error getting classrooms with data:', error);
      throw new Error(`Failed to get classrooms: ${error.message}`);
    }
  },
  
  /**
   * Enrich a single classroom with all nested data
   * @param {Object} classroom - Basic classroom object
   * @param {Object} config - Export configuration
   * @param {string} teacherEmail - Teacher's email address
   * @returns {Object} Enriched classroom with nested data
   */
  enrichClassroomWithData: function(classroom, config, teacherEmail) {
    try {
      // Start with adapted classroom structure
      const enrichedClassroom = SchemaAdapters.adaptClassroom(classroom, teacherEmail);
      
      // Get assignments for this classroom
      console.log(`  Fetching assignments for ${classroom.name}...`);
      const assignments = DataCollectors.collectAssignments(classroom.id, config);
      enrichedClassroom.assignments = assignments.map(assignment => 
        SchemaAdapters.adaptAssignment(assignment)
      );
      
      // Get students for this classroom
      console.log(`  Fetching students for ${classroom.name}...`);
      let students = DataCollectors.collectStudents(classroom.id);
      
      // Limit students if specified
      if (config.maxStudentsPerClass && students.length > config.maxStudentsPerClass) {
        students = students.slice(0, config.maxStudentsPerClass);
        console.log(`    Limited to ${students.length} students`);
      }
      
      enrichedClassroom.students = students.map(student => 
        SchemaAdapters.adaptStudent(student, classroom.id)
      );
      
      // Create student lookup map for efficient access when processing submissions
      const studentMap = {};
      students.forEach(student => {
        const studentId = student.userId || student.profile?.id;
        if (studentId) {
          studentMap[studentId] = student;
        }
      });
      
      // Get submissions if requested - using parallel collection for better performance
      let allSubmissions = [];
      if (config.includeSubmissions) {
        const assignmentCount = enrichedClassroom.assignments.length;
        console.log(`  Fetching submissions for ${classroom.name} (${assignmentCount} assignments)...`);
        
        if (assignmentCount >= 5) {
          // Use parallel collection for classrooms with many assignments
          console.log(`  Using parallel collection for ${assignmentCount} assignments...`);
          try {
            const parallelSubmissions = DataCollectors.collectSubmissionsParallel(
              classroom.id,
              enrichedClassroom.assignments,
              config
            );
            
            // Adapt submissions to schema format
            allSubmissions = parallelSubmissions.map(submission => {
              // Find the corresponding assignment for proper adaptation
              const assignment = enrichedClassroom.assignments.find(a => a.id === submission.courseWorkId);
              const assignmentInfo = assignment || {
                id: submission.courseWorkId,
                title: 'Unknown Assignment',
                maxPoints: submission.maxPoints || 100
              };
              // Look up student data for this submission
              const studentData = studentMap[submission.userId] || null;
              return SchemaAdapters.adaptSubmission(submission, assignmentInfo, studentData);
            });
            
          } catch (parallelError) {
            console.warn(`  Parallel collection failed, falling back to sequential: ${parallelError.message}`);
            allSubmissions = this.collectSubmissionsSequential(classroom, enrichedClassroom, config, studentMap);
          }
          
        } else {
          // Use sequential collection for small numbers of assignments
          console.log(`  Using sequential collection for ${assignmentCount} assignments...`);
          allSubmissions = this.collectSubmissionsSequential(classroom, enrichedClassroom, config, studentMap);
        }
      }
      
      enrichedClassroom.submissions = allSubmissions;
      
      // Update counts
      enrichedClassroom.studentCount = enrichedClassroom.students.length;
      enrichedClassroom.assignmentCount = enrichedClassroom.assignments.length;
      enrichedClassroom.totalSubmissions = allSubmissions.length;
      enrichedClassroom.ungradedSubmissions = allSubmissions.filter(sub => 
        sub.status === 'pending' || sub.status === 'submitted'
      ).length;
      
      return enrichedClassroom;
      
    } catch (error) {
      console.error(`Error enriching classroom ${classroom.name}:`, error);
      throw error;
    }
  },
  
  /**
   * Sequential submission collection (fallback method)
   * @param {Object} classroom - Classroom object
   * @param {Object} enrichedClassroom - Enriched classroom with assignments and students
   * @param {Object} config - Export configuration
   * @param {Object} studentMap - Map of studentId to student data
   * @returns {Array} Array of all submissions
   */
  collectSubmissionsSequential: function(classroom, enrichedClassroom, config, studentMap) {
    const allSubmissions = [];
    
    for (const assignment of enrichedClassroom.assignments) {
      try {
        const submissions = DataCollectors.collectSubmissions(
          classroom.id,
          assignment.id,
          config
        );
        
        const adaptedSubmissions = submissions.map(submission => {
          // Look up student data for this submission
          const studentData = studentMap ? studentMap[submission.userId] : null;
          return SchemaAdapters.adaptSubmission(submission, assignment, studentData);
        });
        
        allSubmissions.push(...adaptedSubmissions);
        
      } catch (submissionError) {
        console.warn(`  Error getting submissions for assignment ${assignment.title}:`, submissionError.message);
      }
    }
    
    return allSubmissions;
  },
  
  
  /**
   * Calculate global statistics across all classrooms
   * @param {Array} classrooms - Array of enriched classroom objects
   * @returns {Object} Global statistics object
   */
  calculateGlobalStats: function(classrooms) {
    try {
      const totalClassrooms = classrooms.length;
      const totalStudents = classrooms.reduce((sum, c) => sum + c.studentCount, 0);
      const totalAssignments = classrooms.reduce((sum, c) => sum + c.assignments.length, 0);
      const totalSubmissions = classrooms.reduce((sum, c) => sum + c.submissions.length, 0);
      
      const ungradedSubmissions = classrooms.reduce((sum, c) => 
        sum + c.submissions.filter(s => 
          s.status === 'pending' || s.status === 'submitted'
        ).length, 0
      );
      
      // Calculate average grade across all graded submissions
      const gradedSubmissions = classrooms.flatMap(c => 
        c.submissions.filter(s => s.grade && s.grade.score !== undefined)
      );
      
      let averageGrade = undefined;
      if (gradedSubmissions.length > 0) {
        const totalGradePercent = gradedSubmissions.reduce((sum, s) => {
          if (s.grade.maxScore > 0) {
            return sum + (s.grade.score / s.grade.maxScore * 100);
          }
          return sum;
        }, 0);
        
        averageGrade = Math.round((totalGradePercent / gradedSubmissions.length) * 100) / 100;
      }
      
      return {
        totalClassrooms,
        totalStudents,
        totalAssignments,
        totalSubmissions,
        ungradedSubmissions,
        averageGrade
      };
      
    } catch (error) {
      console.error('Error calculating global stats:', error);
      throw new Error(`Failed to calculate statistics: ${error.message}`);
    }
  },
  
  /**
   * Create snapshot metadata
   * @param {string} source - Data source identifier
   * @returns {Object} Snapshot metadata object
   */
  createSnapshotMetadata: function(source = 'google-classroom') {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    
    return {
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      source: source,
      version: '1.0.0'
    };
  },
  
  /**
   * Export a single classroom by ID
   * @param {string} classroomId - Google Classroom course ID
   * @param {Object} options - Export options
   * @returns {Object} Single classroom snapshot
   */
  exportSingleClassroom: function(classroomId, options = {}) {
    try {
      console.log(`Exporting single classroom: ${classroomId}`);
      
      const config = {
        selectedClassrooms: [classroomId],
        ...options
      };
      
      const fullSnapshot = this.export(config);
      
      if (fullSnapshot.classrooms.length === 0) {
        throw new Error(`Classroom not found: ${classroomId}`);
      }
      
      return {
        teacher: fullSnapshot.teacher,
        classroom: fullSnapshot.classrooms[0],
        snapshotMetadata: fullSnapshot.snapshotMetadata
      };
      
    } catch (error) {
      console.error(`Error exporting single classroom ${classroomId}:`, error);
      throw error;
    }
  },
  
  /**
   * Validate export configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfig: function(config = {}) {
    const issues = [];
    
    // Check authentication
    try {
      const user = Session.getActiveUser();
      if (!user.getEmail()) {
        issues.push('No authenticated user');
      }
    } catch (authError) {
      issues.push('Authentication error: ' + authError.message);
    }
    
    // Check API access
    try {
      const token = ScriptApp.getOAuthToken();
      if (!token) {
        issues.push('No OAuth token available');
      }
    } catch (tokenError) {
      issues.push('OAuth token error: ' + tokenError.message);
    }
    
    // Validate options
    if (config.maxClassrooms && config.maxClassrooms < 1) {
      issues.push('maxClassrooms must be at least 1');
    }
    
    if (config.maxStudentsPerClass && config.maxStudentsPerClass < 1) {
      issues.push('maxStudentsPerClass must be at least 1');
    }
    
    return {
      valid: issues.length === 0,
      issues: issues
    };
  }
};