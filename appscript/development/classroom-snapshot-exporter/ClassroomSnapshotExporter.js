/**
 * ClassroomSnapshotExporter - Core Export Engine
 * Orchestrates the complete snapshot export process
 * Produces data compatible with @shared/schemas/classroom-snapshot.ts
 */

var ClassroomSnapshotExporter = {
  
  /**
   * Main export function - orchestrates the complete snapshot export using optimized entity collection
   * @param {Object} options - Export configuration options
   * @returns {Object} Optimized classroom snapshot with entity references
   */
  export: function(options = {}) {
    const startTime = new Date();
    console.log('Starting optimized classroom snapshot export with options:', options);
    
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
      
      // Step 2: Collect all entities in parallel (OPTIMIZED APPROACH)
      console.log('Step 2: Collecting all entities in parallel...');
      const entities = this.collectAllEntitiesParallel(config);
      
      // Step 3: Calculate global statistics from entities
      console.log('Step 3: Calculating global statistics...');
      const globalStats = this.calculateGlobalStatsFromEntities(entities);
      
      // Step 4: Create snapshot metadata
      console.log('Step 4: Creating snapshot metadata...');
      const snapshotMetadata = this.createSnapshotMetadata(config.source);
      
      // Step 5: Assemble optimized snapshot with entity references
      const snapshot = {
        teacher: teacher,
        entities: entities, // Changed from nested structure to flat entities
        globalStats: globalStats,
        snapshotMetadata: snapshotMetadata
      };
      
      const endTime = new Date();
      const duration = endTime - startTime;
      
      console.log(`Optimized export completed successfully in ${duration}ms:`, {
        classrooms: entities.classrooms.length,
        assignments: entities.assignments.length,
        submissions: entities.submissions.length,
        enrollments: entities.enrollments.length,
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
   * OPTIMIZED: Collect all entities in parallel using reference-based linking
   * @param {Object} config - Export configuration
   * @returns {Object} Object containing separate entity collections
   */
  collectAllEntitiesParallel: function(config) {
    try {
      console.log('Starting optimized parallel entity collection...');
      
      // Step 1: Get basic classroom list first
      console.log('  Collecting classrooms...');
      let rawClassrooms = DataCollectors.collectClassrooms();
      
      // Apply classroom filtering if specified
      if (config.selectedClassrooms) {
        rawClassrooms = rawClassrooms.filter(c => config.selectedClassrooms.includes(c.id));
      }
      if (config.maxClassrooms) {
        rawClassrooms = rawClassrooms.slice(0, config.maxClassrooms);
      }
      
      if (rawClassrooms.length === 0) {
        console.log('No classrooms found or selected');
        return {
          classrooms: [],
          assignments: [],
          submissions: [],
          enrollments: []
        };
      }
      
      const classroomIds = rawClassrooms.map(c => c.id);
      console.log(`  Found ${classroomIds.length} classrooms to process`);
      
      // Step 2: Collect all entities in parallel - NO NESTING!
      console.log('  Collecting all entities in parallel...');
      const [allAssignments, allStudents, allSubmissions] = this.collectAllEntitiesFromClassrooms(classroomIds, config);
      
      // Step 3: Calculate submission stats from collected data (avoid double API calls)
      console.log('  Calculating submission statistics from collected data...');
      this.calculateSubmissionStats(allAssignments, allSubmissions);
      
      // Step 4: Transform to clean entity format with references only
      console.log('  Transforming entities to reference-based format...');
      
      // Clean classrooms (no nested data)
      const cleanClassrooms = rawClassrooms.map(classroom => {
        const adapted = SchemaAdapters.adaptClassroom(classroom);
        // Remove any nested data - use counts only
        delete adapted.assignments;
        delete adapted.students; 
        delete adapted.submissions;
        return adapted;
      });
      
      // Clean assignments with classroom references only
      const cleanAssignments = allAssignments.map(assignment => {
        const adapted = SchemaAdapters.adaptAssignment(assignment);
        // Ensure classroom reference is set
        adapted.classroomId = assignment.courseId;
        return adapted;
      });
      
      // Clean submissions with references only  
      const cleanSubmissions = allSubmissions.map(submission => {
        // Find assignment to get proper context
        const assignment = allAssignments.find(a => a.id === submission.courseWorkId);
        const student = allStudents.find(s => (s.userId || s.profile?.id) === submission.userId);
        
        const adapted = SchemaAdapters.adaptSubmission(submission, assignment, student);
        // Ensure all references are set
        adapted.classroomId = submission.courseId;
        adapted.assignmentId = submission.courseWorkId;
        adapted.studentId = submission.userId;
        return adapted;
      });
      
      // Clean enrollments (student-classroom relationships)
      const cleanEnrollments = [];
      for (const student of allStudents) {
        const studentId = student.userId || student.profile?.id;
        if (studentId) {
          const enrollment = SchemaAdapters.adaptStudentEnrollment(student, student.classroomId);
          enrollment.studentId = studentId;
          enrollment.classroomId = student.classroomId;
          cleanEnrollments.push(enrollment);
        }
      }
      
      console.log(`  Entity collection complete:`, {
        classrooms: cleanClassrooms.length,
        assignments: cleanAssignments.length, 
        submissions: cleanSubmissions.length,
        enrollments: cleanEnrollments.length
      });
      
      return {
        classrooms: cleanClassrooms,
        assignments: cleanAssignments,
        submissions: cleanSubmissions,
        enrollments: cleanEnrollments
      };
      
    } catch (error) {
      console.error('Error in parallel entity collection:', error);
      throw new Error(`Failed to collect entities: ${error.message}`);
    }
  },
  
  /**
   * Collect all assignments, students, and submissions from multiple classrooms
   * @param {Array} classroomIds - Array of classroom IDs
   * @param {Object} config - Configuration options
   * @returns {Array} [allAssignments, allStudents, allSubmissions]
   */
  collectAllEntitiesFromClassrooms: function(classroomIds, config) {
    const allAssignments = [];
    const allStudents = [];
    const allSubmissions = [];
    
    for (const classroomId of classroomIds) {
      console.log(`    Processing classroom ${classroomId}...`);
      
      try {
        // Collect assignments for this classroom
        const assignments = DataCollectors.collectAssignments(classroomId, config);
        assignments.forEach(assignment => {
          assignment.courseId = classroomId; // Ensure classroom reference
          allAssignments.push(assignment);
        });
        
        // Collect students for this classroom  
        let students = DataCollectors.collectStudents(classroomId);
        if (config.maxStudentsPerClass && students.length > config.maxStudentsPerClass) {
          students = students.slice(0, config.maxStudentsPerClass);
        }
        students.forEach(student => {
          student.classroomId = classroomId; // Add classroom reference
          allStudents.push(student);
        });
        
        // Collect submissions for this classroom if requested (OPTIMIZED: Use parallel collection)
        if (config.includeSubmissions && assignments.length > 0) {
          try {
            console.log(`    Collecting submissions for ${assignments.length} assignments using parallel method...`);
            const submissions = DataCollectors.collectSubmissionsParallel(classroomId, assignments, config);
            submissions.forEach(submission => {
              submission.courseId = classroomId; // Ensure classroom reference
              allSubmissions.push(submission);
            });
            console.log(`    Collected ${submissions.length} submissions in parallel`);
          } catch (submissionError) {
            console.warn(`    Failed to collect submissions for classroom ${classroomId}: ${submissionError.message}`);
          }
        }
        
      } catch (classroomError) {
        console.error(`    Error processing classroom ${classroomId}: ${classroomError.message}`);
      }
    }
    
    return [allAssignments, allStudents, allSubmissions];
  },
  
  /**
   * Calculate submission statistics from collected data (avoids double API calls)
   * @param {Array} assignments - All collected assignments
   * @param {Array} submissions - All collected submissions
   */
  calculateSubmissionStats: function(assignments, submissions) {
    try {
      // Group submissions by assignment ID
      const submissionsByAssignment = {};
      submissions.forEach(submission => {
        const assignmentId = submission.courseWorkId || submission.assignmentId;
        if (!submissionsByAssignment[assignmentId]) {
          submissionsByAssignment[assignmentId] = [];
        }
        submissionsByAssignment[assignmentId].push(submission);
      });
      
      // Calculate stats for each assignment
      assignments.forEach(assignment => {
        const assignmentSubmissions = submissionsByAssignment[assignment.id] || [];
        
        const stats = {
          total: assignmentSubmissions.length,
          submitted: 0,
          graded: 0,
          pending: 0
        };
        
        assignmentSubmissions.forEach(submission => {
          const state = submission.state || 'NEW';
          if (state === 'TURNED_IN' || state === 'RETURNED') {
            stats.submitted++;
          }
          if (submission.assignedGrade !== undefined) {
            stats.graded++;
          }
          if (state === 'NEW' || state === 'CREATED') {
            stats.pending++;
          }
        });
        
        // Update the assignment's submissionStats
        if (assignment.submissionStats) {
          assignment.submissionStats = stats;
        }
      });
      
      console.log(`  Calculated stats for ${assignments.length} assignments`);
      
    } catch (error) {
      console.warn('Error calculating submission stats:', error);
    }
  },
  
  /**
   * Calculate global statistics from entity collections
   * @param {Object} entities - Entity collections object
   * @returns {Object} Global statistics
   */
  calculateGlobalStatsFromEntities: function(entities) {
    const ungradedCount = entities.submissions.filter(sub => 
      sub.status === 'pending' || sub.status === 'submitted'
    ).length;
    
    const gradedSubmissions = entities.submissions.filter(sub => sub.grade && sub.grade.score !== undefined);
    const averageGrade = gradedSubmissions.length > 0 
      ? gradedSubmissions.reduce((sum, sub) => sum + (sub.grade.percentage || 0), 0) / gradedSubmissions.length
      : undefined;
    
    return {
      totalClassrooms: entities.classrooms.length,
      totalStudents: entities.enrollments.length,
      totalAssignments: entities.assignments.length,
      totalSubmissions: entities.submissions.length,
      ungradedSubmissions: ungradedCount,
      averageGrade: averageGrade
    };
  },
  
  /**
   * LEGACY: Get all classrooms with complete nested data (DEPRECATED - use collectAllEntitiesParallel instead)
   * @param {Object} config - Export configuration
   * @returns {Array} Array of classroom objects with nested data
   */
  getAllClassroomsWithData: function(config) {
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
          const enrichedClassroom = this.enrichClassroomWithData(classroom, config);
          enrichedClassrooms.push(enrichedClassroom);
          
        } catch (classroomError) {
          console.error(`Error processing classroom ${classroom.name}:`, classroomError);
          // Include classroom with minimal data rather than failing completely
          enrichedClassrooms.push(SchemaAdapters.adaptClassroom(classroom));
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
   * @returns {Object} Enriched classroom with nested data
   */
  enrichClassroomWithData: function(classroom, config) {
    try {
      // Start with adapted classroom structure
      const enrichedClassroom = SchemaAdapters.adaptClassroom(classroom);
      
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