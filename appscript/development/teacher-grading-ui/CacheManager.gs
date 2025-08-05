/**
 * Cache Manager - Server-side AppScript cache for teacher dashboard data
 * Uses PropertiesService for persistent storage across sessions
 * Implements the TeacherDashboardCache schema for consistent data structure
 */

const CacheManager = {
  // Cache configuration
  DEFAULT_EXPIRATION_MINUTES: 30,
  CACHE_VERSION: '1.1.0', // Incremented to force cache invalidation after assignment fix

  /**
   * Get cache key for a specific teacher
   */
  getCacheKey(teacherEmail) {
    return `roo_dashboard_cache_${teacherEmail}`;
  },

  /**
   * Log debug messages if debugging is enabled
   */
  debugLog(message, data) {
    if (CONFIG && CONFIG.DEBUG) {
      console.log(`[CacheManager] ${message}`, data || '');
    }
  },

  /**
   * Create cache metadata with expiration
   */
  createCacheMetadata(source, expirationMinutes = null) {
    expirationMinutes = expirationMinutes || this.DEFAULT_EXPIRATION_MINUTES;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);
    
    return {
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      source: source,
      version: this.CACHE_VERSION
    };
  },

  /**
   * Check if cache metadata indicates expiration
   */
  isCacheExpired(metadata) {
    if (!metadata || !metadata.expiresAt) {
      return true;
    }
    return new Date() > new Date(metadata.expiresAt);
  },

  /**
   * Save dashboard cache to PropertiesService
   */
  saveDashboardCache(teacherEmail, cacheData) {
    try {
      this.debugLog('Saving dashboard cache', { 
        teacher: teacherEmail,
        classrooms: cacheData.classrooms?.length || 0,
        source: cacheData.cacheMetadata?.source 
      });
      
      const cacheKey = this.getCacheKey(teacherEmail);
      const cacheString = JSON.stringify(cacheData);
      
      // Use PropertiesService for server-side storage
      PropertiesService.getUserProperties().setProperty(cacheKey, cacheString);
      
      this.debugLog('Cache saved successfully', { 
        teacher: teacherEmail,
        size: `${Math.round(cacheString.length / 1024)}KB` 
      });
      
      return {
        success: true,
        message: 'Cache saved successfully'
      };
    } catch (error) {
      console.error('[CacheManager] Failed to save cache:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * Load dashboard cache from PropertiesService
   */
  loadDashboardCache(teacherEmail) {
    try {
      const cacheKey = this.getCacheKey(teacherEmail);
      const cacheString = PropertiesService.getUserProperties().getProperty(cacheKey);
      
      if (!cacheString) {
        this.debugLog('No cache found for teacher', { teacher: teacherEmail });
        return null;
      }

      const cacheData = JSON.parse(cacheString);
      this.debugLog('Cache loaded successfully', { 
        teacher: teacherEmail,
        classrooms: cacheData.classrooms?.length || 0,
        fetchedAt: cacheData.cacheMetadata?.fetchedAt 
      });

      return cacheData;
    } catch (error) {
      console.error('[CacheManager] Failed to load cache:', error);
      return null;
    }
  },

  /**
   * Check if cache exists and is valid for a teacher
   */
  isCacheValid(teacherEmail) {
    const cache = this.loadDashboardCache(teacherEmail);
    if (!cache || !cache.cacheMetadata) {
      this.debugLog('Cache invalid: missing or no metadata', { teacher: teacherEmail });
      return false;
    }

    const isExpired = this.isCacheExpired(cache.cacheMetadata);
    const isVersionMismatch = cache.cacheMetadata.version !== this.CACHE_VERSION;

    this.debugLog('Cache validation result', {
      teacher: teacherEmail,
      exists: !!cache,
      expired: isExpired,
      versionMismatch: isVersionMismatch,
      expiresAt: cache.cacheMetadata.expiresAt
    });

    return !isExpired && !isVersionMismatch;
  },

  /**
   * Clear cache for a teacher
   */
  clearCache(teacherEmail) {
    try {
      const cacheKey = this.getCacheKey(teacherEmail);
      PropertiesService.getUserProperties().deleteProperty(cacheKey);
      this.debugLog('Cache cleared successfully', { teacher: teacherEmail });
      return {
        success: true,
        message: 'Cache cleared successfully'
      };
    } catch (error) {
      console.error('[CacheManager] Failed to clear cache:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * Transform Google Classroom courses to cache format
   */
  transformClassroomsToCacheFormat(courses, source = 'google-classroom') {
    if (!courses || !Array.isArray(courses)) {
      this.debugLog('transformClassroomsToCacheFormat: no courses provided');
      return [];
    }

    this.debugLog('transformClassroomsToCacheFormat: transforming courses', {
      courseCount: courses.length,
      source: source,
      firstCourseAssignments: courses[0]?.assignments?.length || 0
    });

    const transformed = courses.map(course => {
      const result = {
        // Core classroom information (Google Classroom format)
        id: course.id,
        name: course.name || 'Untitled Course',
        section: course.section || undefined,
        description: course.description || undefined,
        descriptionHeading: course.descriptionHeading || undefined,
        room: course.room || undefined,
        
        // Classroom metadata
        enrollmentCode: course.enrollmentCode || '',
        courseState: course.courseState || 'ACTIVE',
        creationTime: course.creationTime || new Date().toISOString(),
        updateTime: course.updateTime || new Date().toISOString(),
        
        // Links and access
        alternateLink: course.alternateLink || '',
        teacherGroupEmail: course.teacherGroupEmail || undefined,
        courseGroupEmail: course.courseGroupEmail || undefined,
        
        // Counts and statistics (preserve existing or use defaults)
        studentCount: course.studentCount || course.students?.length || 0,
        assignmentCount: course.assignmentCount || course.assignments?.length || 0, 
        totalSubmissions: course.totalSubmissions || course.submissions?.length || 0,
        ungradedSubmissions: course.ungradedSubmissions || 0,
        
        // Nested data (preserve existing data or use empty arrays as fallback)
        assignments: course.assignments || [],
        students: course.students || [],
        submissions: course.submissions || [],
        
        // Teacher-specific settings
        teacherFolder: course.teacherFolder || undefined,
        calendarId: course.calendarId || undefined,
        
        // Permissions and ownership
        ownerId: course.ownerId || '',
        guardianNotificationSettings: course.guardianInviteEnabled ? { enabled: true } : undefined
      };
      
      this.debugLog(`Transformed course ${course.id}`, {
        inputAssignments: course.assignments?.length || 0,
        outputAssignments: result.assignments?.length || 0,
        inputStudents: course.students?.length || 0,
        outputStudents: result.students?.length || 0,
        inputSubmissions: course.submissions?.length || 0,
        outputSubmissions: result.submissions?.length || 0
      });
      
      return result;
    });
    
    this.debugLog('transformClassroomsToCacheFormat: transformation complete', {
      transformedCount: transformed.length,
      totalAssignments: transformed.reduce((sum, c) => sum + (c.assignments?.length || 0), 0)
    });
    
    return transformed;
  },

  /**
   * Calculate global statistics from classroom data
   */
  calculateGlobalStats(classrooms) {
    if (!classrooms || !Array.isArray(classrooms)) {
      return {
        totalClassrooms: 0,
        totalStudents: 0,
        totalAssignments: 0,
        totalSubmissions: 0,
        ungradedSubmissions: 0,
        averageGrade: undefined
      };
    }

    const totalClassrooms = classrooms.length;
    const totalStudents = classrooms.reduce((sum, c) => sum + (c.studentCount || 0), 0);
    const totalAssignments = classrooms.reduce((sum, c) => sum + (c.assignments?.length || 0), 0);
    const totalSubmissions = classrooms.reduce((sum, c) => sum + (c.submissions?.length || 0), 0);
    const ungradedSubmissions = classrooms.reduce((sum, c) => 
      sum + (c.submissions?.filter(s => s.status === 'pending' || s.status === 'submitted').length || 0), 0
    );
    
    // Calculate average grade across all graded submissions
    const gradedSubmissions = classrooms.flatMap(c => 
      c.submissions?.filter(s => s.grade && s.grade.score !== undefined) || []
    );
    
    const averageGrade = gradedSubmissions.length > 0 
      ? gradedSubmissions.reduce((sum, s) => sum + (s.grade.score / s.grade.maxScore * 100), 0) / gradedSubmissions.length
      : undefined;
    
    return {
      totalClassrooms,
      totalStudents,
      totalAssignments,
      totalSubmissions,
      ungradedSubmissions,
      averageGrade: averageGrade ? Math.round(averageGrade * 100) / 100 : undefined
    };
  },

  /**
   * Create a complete dashboard cache structure
   */
  createDashboardCache(teacher, classrooms, source = 'mock') {
    const transformedClassrooms = this.transformClassroomsToCacheFormat(classrooms, source);
    const globalStats = this.calculateGlobalStats(transformedClassrooms);
    const cacheMetadata = this.createCacheMetadata(source);

    return {
      teacher: {
        email: teacher.email || '',
        name: teacher.name || '',
        isTeacher: teacher.isTeacher !== false,
        displayName: teacher.displayName || teacher.name || ''
      },
      classrooms: transformedClassrooms,
      globalStats: globalStats,
      cacheMetadata: cacheMetadata
    };
  },

  /**
   * Update cache with additional data for a specific classroom
   */
  updateClassroomData(teacherEmail, classroomId, updates) {
    const cache = this.loadDashboardCache(teacherEmail);
    if (!cache || !cache.classrooms) {
      this.debugLog('Cannot update classroom data: no cache found', { teacher: teacherEmail });
      return {
        success: false,
        error: 'No cache found for teacher'
      };
    }

    const classroomIndex = cache.classrooms.findIndex(c => c.id === classroomId);
    if (classroomIndex === -1) {
      this.debugLog('Cannot update classroom data: classroom not found', { 
        teacher: teacherEmail, 
        classroomId 
      });
      return {
        success: false,
        error: 'Classroom not found in cache'
      };
    }

    // Update the classroom with new data
    const classroom = cache.classrooms[classroomIndex];
    if (updates.assignments) {
      classroom.assignments = updates.assignments;
      classroom.assignmentCount = updates.assignments.length;
    }
    if (updates.students) {
      classroom.students = updates.students;
      classroom.studentCount = updates.students.length;
    }
    if (updates.submissions) {
      classroom.submissions = updates.submissions;
      classroom.totalSubmissions = updates.submissions.length;
      classroom.ungradedSubmissions = updates.submissions.filter(
        s => s.status === 'pending' || s.status === 'submitted'
      ).length;
    }

    // Recalculate global stats
    cache.globalStats = this.calculateGlobalStats(cache.classrooms);

    // Save updated cache
    return this.saveDashboardCache(teacherEmail, cache);
  }
};