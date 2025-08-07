/**
 * SnapshotConfig - Configuration and Validation
 * Central configuration and utility functions for the Classroom Snapshot Exporter
 */

var SnapshotConfig = {
  
  // Export configuration defaults
  DEFAULT_CONFIG: {
    includeSubmissions: true,
    includeMaterials: true,
    includeQuizData: false,
    includeRubrics: false,
    maxClassrooms: null, // null = no limit
    maxStudentsPerClass: null, // null = no limit
    maxSubmissionsPerAssignment: null, // null = no limit
    source: 'google-classroom',
    expirationMinutes: 30
  },
  
  // API limits and constraints
  API_LIMITS: {
    maxPageSize: 100,
    rateLimitDelay: 200, // ms
    maxRetries: 3,
    timeoutMs: 30000
  },
  
  // Schema validation rules (basic checks)
  SCHEMA_RULES: {
    teacher: {
      required: ['email', 'name', 'isTeacher'],
      types: {
        email: 'string',
        name: 'string',
        isTeacher: 'boolean',
        displayName: 'string'
      }
    },
    classroom: {
      required: ['id', 'name', 'enrollmentCode', 'courseState', 'alternateLink', 'studentCount', 'ownerId'],
      types: {
        id: 'string',
        name: 'string',
        enrollmentCode: 'string',
        courseState: 'string',
        alternateLink: 'string',
        studentCount: 'number',
        assignmentCount: 'number',
        totalSubmissions: 'number',
        ungradedSubmissions: 'number',
        assignments: 'array',
        students: 'array',
        submissions: 'array',
        ownerId: 'string'
      }
    },
    assignment: {
      required: ['id', 'title', 'type', 'maxScore', 'creationTime', 'updateTime'],
      types: {
        id: 'string',
        title: 'string',
        description: 'string',
        type: 'string',
        maxScore: 'number'
      }
    },
    student: {
      required: ['id', 'email', 'name', 'courseId'],
      types: {
        id: 'string',
        email: 'string',
        name: 'string',
        courseId: 'string',
        submissionCount: 'number',
        gradedSubmissionCount: 'number'
      }
    },
    submission: {
      required: ['id', 'assignmentId', 'studentId', 'status', 'submittedAt', 'maxScore'],
      types: {
        id: 'string',
        assignmentId: 'string',
        assignmentName: 'string',
        studentId: 'string',
        status: 'string',
        maxScore: 'number',
        studentWork: 'string'
      }
    }
  },
  
  /**
   * Get configuration with defaults applied
   * @param {Object} options - User provided options
   * @returns {Object} Complete configuration object
   */
  getConfig: function(options = {}) {
    return {
      ...this.DEFAULT_CONFIG,
      ...options
    };
  },
  
  /**
   * Validate export configuration
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfig: function(config) {
    const issues = [];
    
    try {
      // Check numeric limits
      if (config.maxClassrooms !== null && (typeof config.maxClassrooms !== 'number' || config.maxClassrooms < 1)) {
        issues.push('maxClassrooms must be a positive number or null');
      }
      
      if (config.maxStudentsPerClass !== null && (typeof config.maxStudentsPerClass !== 'number' || config.maxStudentsPerClass < 1)) {
        issues.push('maxStudentsPerClass must be a positive number or null');
      }
      
      if (config.maxSubmissionsPerAssignment !== null && (typeof config.maxSubmissionsPerAssignment !== 'number' || config.maxSubmissionsPerAssignment < 1)) {
        issues.push('maxSubmissionsPerAssignment must be a positive number or null');
      }
      
      // Check boolean flags
      const booleanFields = ['includeSubmissions', 'includeMaterials', 'includeQuizData', 'includeRubrics'];
      booleanFields.forEach(field => {
        if (config[field] !== undefined && typeof config[field] !== 'boolean') {
          issues.push(`${field} must be a boolean`);
        }
      });
      
      // Check source
      const validSources = ['google-classroom', 'mock'];
      if (config.source && !validSources.includes(config.source)) {
        issues.push(`source must be one of: ${validSources.join(', ')}`);
      }
      
      // Check selected classrooms array
      if (config.selectedClassrooms && !Array.isArray(config.selectedClassrooms)) {
        issues.push('selectedClassrooms must be an array');
      }
      
    } catch (error) {
      issues.push(`Config validation error: ${error.message}`);
    }
    
    return {
      valid: issues.length === 0,
      issues: issues,
      config: issues.length === 0 ? config : null
    };
  },
  
  /**
   * Validate snapshot data against schema requirements
   * @param {Object} snapshot - Snapshot data to validate
   * @returns {Object} Validation result with detailed errors
   */
  validateSnapshot: function(snapshot) {
    const errors = [];
    const warnings = [];
    
    try {
      // Check top-level structure
      if (!snapshot || typeof snapshot !== 'object') {
        return {
          valid: false,
          errors: ['Snapshot must be an object'],
          warnings: [],
          details: null
        };
      }
      
      // Validate teacher
      const teacherValidation = this.validateObject(snapshot.teacher, 'teacher');
      if (!teacherValidation.valid) {
        errors.push(...teacherValidation.errors.map(e => `Teacher: ${e}`));
      }
      warnings.push(...teacherValidation.warnings.map(w => `Teacher: ${w}`));
      
      // Validate classrooms array
      if (!Array.isArray(snapshot.classrooms)) {
        errors.push('Classrooms must be an array');
      } else {
        snapshot.classrooms.forEach((classroom, index) => {
          const classroomValidation = this.validateObject(classroom, 'classroom');
          if (!classroomValidation.valid) {
            errors.push(...classroomValidation.errors.map(e => `Classroom ${index + 1}: ${e}`));
          }
          warnings.push(...classroomValidation.warnings.map(w => `Classroom ${index + 1}: ${w}`));
          
          // Validate nested arrays
          if (Array.isArray(classroom.assignments)) {
            classroom.assignments.forEach((assignment, aIndex) => {
              const assignmentValidation = this.validateObject(assignment, 'assignment');
              if (!assignmentValidation.valid) {
                errors.push(...assignmentValidation.errors.map(e => `Classroom ${index + 1}, Assignment ${aIndex + 1}: ${e}`));
              }
            });
          }
          
          if (Array.isArray(classroom.students)) {
            classroom.students.forEach((student, sIndex) => {
              const studentValidation = this.validateObject(student, 'student');
              if (!studentValidation.valid) {
                errors.push(...studentValidation.errors.map(e => `Classroom ${index + 1}, Student ${sIndex + 1}: ${e}`));
              }
            });
          }
          
          if (Array.isArray(classroom.submissions)) {
            classroom.submissions.forEach((submission, subIndex) => {
              const submissionValidation = this.validateObject(submission, 'submission');
              if (!submissionValidation.valid) {
                errors.push(...submissionValidation.errors.map(e => `Classroom ${index + 1}, Submission ${subIndex + 1}: ${e}`));
              }
            });
          }
        });
      }
      
      // Validate globalStats
      if (snapshot.globalStats) {
        const requiredStats = ['totalClassrooms', 'totalStudents', 'totalAssignments', 'totalSubmissions', 'ungradedSubmissions'];
        requiredStats.forEach(stat => {
          if (typeof snapshot.globalStats[stat] !== 'number') {
            warnings.push(`Global stats: ${stat} should be a number`);
          }
        });
      } else {
        warnings.push('Global stats missing');
      }
      
      // Validate snapshotMetadata
      if (snapshot.snapshotMetadata) {
        const requiredMeta = ['fetchedAt', 'expiresAt', 'source', 'version'];
        requiredMeta.forEach(field => {
          if (!snapshot.snapshotMetadata[field]) {
            warnings.push(`Snapshot metadata: ${field} is missing`);
          }
        });
      } else {
        errors.push('Snapshot metadata is required');
      }
      
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
    }
    
    const isValid = errors.length === 0;
    const details = {
      classroomCount: snapshot.classrooms?.length || 0,
      studentCount: snapshot.globalStats?.totalStudents || 0,
      assignmentCount: snapshot.globalStats?.totalAssignments || 0,
      submissionCount: snapshot.globalStats?.totalSubmissions || 0
    };
    
    return {
      valid: isValid,
      errors: errors,
      warnings: warnings,
      details: details,
      summary: isValid ? 
        `Valid snapshot with ${details.classroomCount} classrooms, ${details.studentCount} students, ${details.assignmentCount} assignments` :
        `Validation failed with ${errors.length} errors`
    };
  },
  
  /**
   * Validate individual object against schema rules
   * @param {Object} obj - Object to validate
   * @param {string} type - Object type (teacher, classroom, assignment, student, submission)
   * @returns {Object} Validation result
   */
  validateObject: function(obj, type) {
    const errors = [];
    const warnings = [];
    
    if (!obj || typeof obj !== 'object') {
      return {
        valid: false,
        errors: [`${type} must be an object`],
        warnings: []
      };
    }
    
    const rules = this.SCHEMA_RULES[type];
    if (!rules) {
      return {
        valid: true,
        errors: [],
        warnings: [`No validation rules for type: ${type}`]
      };
    }
    
    // Check required fields
    rules.required.forEach(field => {
      if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
        errors.push(`Required field missing: ${field}`);
      }
    });
    
    // Check field types
    Object.keys(rules.types).forEach(field => {
      if (obj[field] !== undefined && obj[field] !== null) {
        const expectedType = rules.types[field];
        const actualType = Array.isArray(obj[field]) ? 'array' : typeof obj[field];
        
        if (actualType !== expectedType) {
          warnings.push(`Field ${field} expected ${expectedType}, got ${actualType}`);
        }
      }
    });
    
    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  },
  
  /**
   * Generate snapshot statistics
   * @param {Object} snapshot - Snapshot data
   * @returns {Object} Statistics summary
   */
  generateStats: function(snapshot) {
    try {
      if (!snapshot || !Array.isArray(snapshot.classrooms)) {
        return { error: 'Invalid snapshot data' };
      }
      
      const classrooms = snapshot.classrooms;
      
      const stats = {
        overview: {
          classrooms: classrooms.length,
          students: classrooms.reduce((sum, c) => sum + (c.studentCount || 0), 0),
          assignments: classrooms.reduce((sum, c) => sum + (c.assignmentCount || 0), 0),
          submissions: classrooms.reduce((sum, c) => sum + (c.totalSubmissions || 0), 0)
        },
        breakdown: classrooms.map(classroom => ({
          name: classroom.name,
          id: classroom.id,
          students: classroom.studentCount || 0,
          assignments: classroom.assignmentCount || 0,
          submissions: classroom.totalSubmissions || 0,
          ungraded: classroom.ungradedSubmissions || 0
        })),
        metadata: {
          exportedAt: snapshot.snapshotMetadata?.fetchedAt || new Date().toISOString(),
          source: snapshot.snapshotMetadata?.source || 'unknown',
          teacher: snapshot.teacher?.email || 'unknown'
        }
      };
      
      return stats;
      
    } catch (error) {
      return { error: error.message };
    }
  },
  
  /**
   * Create snapshot metadata
   * @param {string} source - Data source
   * @param {number} expirationMinutes - Minutes until expiration
   * @returns {Object} Metadata object
   */
  createMetadata: function(source = 'google-classroom', expirationMinutes = 30) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);
    
    return {
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      source: source,
      version: '1.0.0'
    };
  },
  
  /**
   * Check if snapshot is expired
   * @param {Object} metadata - Snapshot metadata
   * @returns {boolean} True if expired
   */
  isExpired: function(metadata) {
    if (!metadata || !metadata.expiresAt) {
      return true;
    }
    
    try {
      const expiryTime = new Date(metadata.expiresAt);
      const now = new Date();
      return now > expiryTime;
    } catch (error) {
      console.warn('Error checking expiration:', error);
      return true; // Assume expired if we can't parse
    }
  },
  
  /**
   * Format timestamp for display
   * @param {string} timestamp - ISO timestamp string
   * @returns {string} Formatted timestamp
   */
  formatTimestamp: function(timestamp) {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch (error) {
      return timestamp || 'Unknown';
    }
  },
  
  /**
   * Generate unique snapshot ID
   * @returns {string} Unique snapshot identifier
   */
  generateSnapshotId: function() {
    return 'snapshot_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
};