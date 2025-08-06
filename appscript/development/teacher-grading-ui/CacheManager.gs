/**
 * Snapshot Manager - Server-side AppScript storage for classroom snapshot data
 * Uses PropertiesService for persistent storage across sessions
 * Implements the ClassroomSnapshot schema for consistent data structure
 * 
 * Note: Previously called "CacheManager" - backward compatibility methods provided
 */

const CacheManager = {
  // Snapshot configuration  
  DEFAULT_EXPIRATION_MINUTES: 30,
  SNAPSHOT_VERSION: '3.1.0', // Enhanced data fetching with materials, rubrics, and quiz data + snapshot terminology
  

  /**
   * Get cache key for a specific teacher
   */
  getSnapshotKey(teacherEmail) {
    return `roo_classroom_snapshot_${teacherEmail}`;
  },

  /**
   * Log debug messages if debugging is enabled
   */
  debugLog(message, data) {
    if (getApiGatewayConfig().DEBUG) {
      console.log(`[CacheManager] ${message}`, data || '');
    }
  },

  /**
   * Create snapshot metadata with expiration
   */
  createSnapshotMetadata(source, expirationMinutes = null) {
    expirationMinutes = expirationMinutes || this.DEFAULT_EXPIRATION_MINUTES;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);
    
    return {
      fetchedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      source: source,
      version: this.SNAPSHOT_VERSION
    };
  },

  /**
   * Check if snapshot metadata indicates expiration
   */
  isSnapshotExpired(metadata) {
    if (!metadata || !metadata.expiresAt) {
      return true;
    }
    return new Date() > new Date(metadata.expiresAt);
  },

  /**
   * Save classroom snapshot to PropertiesService
   */
  saveClassroomSnapshot(teacherEmail, snapshotData) {
    try {
      this.debugLog('Saving classroom snapshot', { 
        teacher: teacherEmail,
        classrooms: snapshotData.classrooms?.length || 0,
        source: snapshotData.snapshotMetadata?.source 
      });
      
      const snapshotKey = this.getSnapshotKey(teacherEmail);
      const snapshotString = JSON.stringify(snapshotData);
      
      // Use PropertiesService for server-side storage
      PropertiesService.getUserProperties().setProperty(snapshotKey, snapshotString);
      
      this.debugLog('Snapshot saved successfully', { 
        teacher: teacherEmail,
        size: `${Math.round(snapshotString.length / 1024)}KB` 
      });
      
      return {
        success: true,
        message: 'Snapshot saved successfully'
      };
    } catch (error) {
      console.error('[CacheManager] Failed to save snapshot:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * Load classroom snapshot from PropertiesService
   */
  loadClassroomSnapshot(teacherEmail) {
    try {
      const snapshotKey = this.getSnapshotKey(teacherEmail);
      const snapshotString = PropertiesService.getUserProperties().getProperty(snapshotKey);
      
      if (!snapshotString) {
        this.debugLog('No snapshot found for teacher', { teacher: teacherEmail });
        return null;
      }

      const snapshotData = JSON.parse(snapshotString);
      this.debugLog('Snapshot loaded successfully', { 
        teacher: teacherEmail,
        classrooms: snapshotData.classrooms?.length || 0,
        fetchedAt: snapshotData.snapshotMetadata?.fetchedAt 
      });

      return snapshotData;
    } catch (error) {
      console.error('[CacheManager] Failed to load snapshot:', error);
      return null;
    }
  },

  /**
   * Check if snapshot exists and is valid for a teacher
   */
  isSnapshotValid(teacherEmail) {
    const snapshot = this.loadClassroomSnapshot(teacherEmail);
    if (!snapshot || !snapshot.snapshotMetadata) {
      this.debugLog('Snapshot invalid: missing or no metadata', { teacher: teacherEmail });
      return false;
    }

    const isExpired = this.isSnapshotExpired(snapshot.snapshotMetadata);
    const isVersionMismatch = snapshot.snapshotMetadata.version !== this.SNAPSHOT_VERSION;

    this.debugLog('Snapshot validation result', {
      teacher: teacherEmail,
      exists: !!snapshot,
      expired: isExpired,
      versionMismatch: isVersionMismatch,
      expiresAt: snapshot.snapshotMetadata.expiresAt
    });

    return !isExpired && !isVersionMismatch;
  },

  /**
   * Clear snapshot for a teacher
   */
  clearSnapshot(teacherEmail) {
    try {
      const snapshotKey = this.getSnapshotKey(teacherEmail);
      PropertiesService.getUserProperties().deleteProperty(snapshotKey);
      this.debugLog('Snapshot cleared successfully', { teacher: teacherEmail });
      return {
        success: true,
        message: 'Snapshot cleared successfully'
      };
    } catch (error) {
      console.error('[CacheManager] Failed to clear snapshot:', error);
      return {
        success: false,
        error: error.toString()
      };
    }
  },

  /**
   * Transform Google Classroom courses to snapshot format
   */
  transformClassroomsToSnapshotFormat(courses, source = 'google-classroom') {
    if (!courses || !Array.isArray(courses)) {
      this.debugLog('transformClassroomsToSnapshotFormat: no courses provided');
      return [];
    }

    this.debugLog('transformClassroomsToSnapshotFormat: transforming courses', {
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
    
    this.debugLog('transformClassroomsToSnapshotFormat: transformation complete', {
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
   * Create a complete classroom snapshot structure
   */
  createClassroomSnapshot(teacher, classrooms, source = 'mock') {
    const transformedClassrooms = this.transformClassroomsToSnapshotFormat(classrooms, source);
    const globalStats = this.calculateGlobalStats(transformedClassrooms);
    const snapshotMetadata = this.createSnapshotMetadata(source);

    return {
      teacher: {
        email: teacher.email || '',
        name: teacher.name || '',
        isTeacher: teacher.isTeacher !== false,
        displayName: teacher.displayName || teacher.name || ''
      },
      classrooms: transformedClassrooms,
      globalStats: globalStats,
      snapshotMetadata: snapshotMetadata
    };
  },

  /**
   * Update snapshot with additional data for a specific classroom
   */
  updateClassroomData(teacherEmail, classroomId, updates) {
    const snapshot = this.loadClassroomSnapshot(teacherEmail);
    if (!snapshot || !snapshot.classrooms) {
      this.debugLog('Cannot update classroom data: no snapshot found', { teacher: teacherEmail });
      return {
        success: false,
        error: 'No snapshot found for teacher'
      };
    }

    const classroomIndex = snapshot.classrooms.findIndex(c => c.id === classroomId);
    if (classroomIndex === -1) {
      this.debugLog('Cannot update classroom data: classroom not found', { 
        teacher: teacherEmail, 
        classroomId 
      });
      return {
        success: false,
        error: 'Classroom not found in snapshot'
      };
    }

    // Update the classroom with new data
    const classroom = snapshot.classrooms[classroomIndex];
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
    snapshot.globalStats = this.calculateGlobalStats(snapshot.classrooms);

    // Save updated snapshot
    return this.saveClassroomSnapshot(teacherEmail, snapshot);
  }
};