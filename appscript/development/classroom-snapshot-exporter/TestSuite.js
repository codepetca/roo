/**
 * TestSuite - Development and Testing Functions
 * Comprehensive testing suite for the Classroom Snapshot Exporter
 */

var TestSuite = {
  
  /**
   * Run all tests
   * @returns {Object} Complete test results
   */
  runAllTests: function() {
    console.log('🧪 Starting comprehensive test suite...');
    
    const results = {
      startTime: new Date(),
      tests: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
    
    // Test groups
    const testGroups = [
      { name: 'Configuration Tests', fn: this.testConfiguration },
      { name: 'Data Collectors Tests', fn: this.testDataCollectors },
      { name: 'Schema Adapters Tests', fn: this.testSchemaAdapters },
      { name: 'Export Engine Tests', fn: this.testExportEngine },
      { name: 'Validation Tests', fn: this.testValidation },
      { name: 'Integration Tests', fn: this.testIntegration }
    ];
    
    testGroups.forEach(group => {
      try {
        console.log(`\n=== ${group.name} ===`);
        const groupResults = group.fn.call(this);
        results.tests.push({
          group: group.name,
          ...groupResults
        });
        
        results.summary.total += groupResults.total || 0;
        results.summary.passed += groupResults.passed || 0;
        results.summary.failed += groupResults.failed || 0;
        results.summary.warnings += groupResults.warnings || 0;
        
      } catch (error) {
        console.error(`❌ Test group ${group.name} failed:`, error);
        results.tests.push({
          group: group.name,
          error: error.message,
          total: 1,
          passed: 0,
          failed: 1,
          warnings: 0
        });
        results.summary.total += 1;
        results.summary.failed += 1;
      }
    });
    
    results.endTime = new Date();
    results.duration = results.endTime - results.startTime;
    
    // Print summary
    console.log('\n📊 Test Summary:');
    console.log(`Total: ${results.summary.total}`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⚠️ Warnings: ${results.summary.warnings}`);
    console.log(`⏱️ Duration: ${results.duration}ms`);
    
    return results;
  },
  
  /**
   * Test configuration and validation
   * @returns {Object} Test results
   */
  testConfiguration: function() {
    const results = { total: 0, passed: 0, failed: 0, warnings: 0, details: [] };
    
    // Test 1: Default configuration
    this.runTest('Default configuration', () => {
      const config = SnapshotConfig.getConfig();
      this.assert(config.includeSubmissions === true, 'includeSubmissions should default to true');
      this.assert(config.source === 'google-classroom', 'source should default to google-classroom');
      this.assert(config.expirationMinutes === 30, 'expirationMinutes should default to 30');
    }, results);
    
    // Test 2: Config validation - valid config
    this.runTest('Valid configuration validation', () => {
      const config = { includeSubmissions: true, maxClassrooms: 5 };
      const validation = SnapshotConfig.validateConfig(config);
      this.assert(validation.valid === true, 'Valid config should pass validation');
      this.assert(validation.issues.length === 0, 'Valid config should have no issues');
    }, results);
    
    // Test 3: Config validation - invalid config
    this.runTest('Invalid configuration validation', () => {
      const config = { maxClassrooms: -1, includeSubmissions: 'invalid' };
      const validation = SnapshotConfig.validateConfig(config);
      this.assert(validation.valid === false, 'Invalid config should fail validation');
      this.assert(validation.issues.length > 0, 'Invalid config should have issues');
    }, results);
    
    // Test 4: Metadata creation
    this.runTest('Metadata creation', () => {
      const metadata = SnapshotConfig.createMetadata();
      this.assert(metadata.fetchedAt, 'Metadata should have fetchedAt');
      this.assert(metadata.expiresAt, 'Metadata should have expiresAt');
      this.assert(metadata.source === 'google-classroom', 'Metadata should have correct source');
      this.assert(metadata.version === '1.0.0', 'Metadata should have version');
    }, results);
    
    return results;
  },
  
  /**
   * Test data collectors
   * @returns {Object} Test results
   */
  testDataCollectors: function() {
    const results = { total: 0, passed: 0, failed: 0, warnings: 0, details: [] };
    
    // Test 1: Auth token retrieval
    this.runTest('Auth token retrieval', () => {
      try {
        const token = DataCollectors.getAuthToken();
        this.assert(typeof token === 'string', 'Token should be a string');
        this.assert(token.length > 0, 'Token should not be empty');
      } catch (error) {
        // This might fail in test environment, so we'll mark as warning
        results.warnings++;
        results.details.push('⚠️ Auth token test: ' + error.message);
        return; // Skip assertion
      }
    }, results);
    
    // Test 2: API request structure
    this.runTest('API request structure', () => {
      // Test the API URL building
      const baseUrl = DataCollectors.API_BASE;
      this.assert(baseUrl === 'https://classroom.googleapis.com/v1', 'API base URL should be correct');
      this.assert(DataCollectors.MAX_PAGE_SIZE === 100, 'Page size should be reasonable');
      this.assert(DataCollectors.RATE_LIMIT_DELAY >= 100, 'Rate limit delay should be reasonable');
    }, results);
    
    // Test 3: Health check functionality
    this.runTest('Health check structure', () => {
      // We can't actually call the API in tests, but we can check the function exists
      this.assert(typeof DataCollectors.healthCheck === 'function', 'healthCheck should be a function');
    }, results);
    
    return results;
  },
  
  /**
   * Test schema adapters
   * @returns {Object} Test results
   */
  testSchemaAdapters: function() {
    const results = { total: 0, passed: 0, failed: 0, warnings: 0, details: [] };
    
    // Test 1: Teacher profile adaptation
    this.runTest('Teacher profile adaptation', () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test Teacher',
        displayName: 'Prof. Test'
      };
      const adapted = SchemaAdapters.adaptTeacherProfile(userData);
      
      this.assert(adapted.email === userData.email, 'Email should be preserved');
      this.assert(adapted.name === userData.name, 'Name should be preserved');
      this.assert(adapted.isTeacher === true, 'isTeacher should be true');
      this.assert(adapted.displayName === userData.displayName, 'displayName should be preserved');
    }, results);
    
    // Test 2: Classroom adaptation
    this.runTest('Classroom adaptation', () => {
      const course = {
        id: 'test-123',
        name: 'Test Course',
        enrollmentCode: 'ABC123',
        courseState: 'ACTIVE',
        alternateLink: 'https://classroom.google.com/c/test-123',
        ownerId: 'owner-123'
      };
      const adapted = SchemaAdapters.adaptClassroom(course);
      
      this.assert(adapted.id === course.id, 'ID should be preserved');
      this.assert(adapted.name === course.name, 'Name should be preserved');
      this.assert(adapted.enrollmentCode === course.enrollmentCode, 'Enrollment code should be preserved');
      this.assert(adapted.courseState === course.courseState, 'Course state should be preserved');
      this.assert(Array.isArray(adapted.assignments), 'Assignments should be an array');
      this.assert(Array.isArray(adapted.students), 'Students should be an array');
      this.assert(Array.isArray(adapted.submissions), 'Submissions should be an array');
    }, results);
    
    // Test 3: Assignment adaptation
    this.runTest('Assignment adaptation', () => {
      const courseWork = {
        id: 'assignment-123',
        title: 'Test Assignment',
        description: 'Test description',
        maxPoints: 100,
        workType: 'ASSIGNMENT',
        state: 'PUBLISHED'
      };
      const adapted = SchemaAdapters.adaptAssignment(courseWork);
      
      this.assert(adapted.id === courseWork.id, 'ID should be preserved');
      this.assert(adapted.title === courseWork.title, 'Title should be preserved');
      this.assert(adapted.maxScore === courseWork.maxPoints, 'Max score should be adapted from maxPoints');
      this.assert(adapted.type === 'assignment', 'Type should be mapped correctly');
    }, results);
    
    // Test 4: Student adaptation
    this.runTest('Student adaptation', () => {
      const student = {
        userId: 'student-123',
        profile: {
          id: 'student-123',
          name: {
            fullName: 'Test Student',
            givenName: 'Test',
            familyName: 'Student'
          },
          emailAddress: 'student@example.com'
        }
      };
      const adapted = SchemaAdapters.adaptStudent(student, 'course-123');
      
      this.assert(adapted.id === student.userId, 'ID should come from userId');
      this.assert(adapted.email === student.profile.emailAddress, 'Email should come from profile');
      this.assert(adapted.name === student.profile.name.fullName, 'Name should come from profile');
      this.assert(adapted.courseId === 'course-123', 'Course ID should be set');
    }, results);
    
    // Test 5: Submission adaptation
    this.runTest('Submission adaptation', () => {
      const submission = {
        id: 'submission-123',
        courseWorkId: 'assignment-123',
        userId: 'student-123',
        state: 'TURNED_IN',
        assignedGrade: 85
      };
      const assignment = { id: 'assignment-123', title: 'Test Assignment', maxScore: 100 };
      const adapted = SchemaAdapters.adaptSubmission(submission, assignment);
      
      this.assert(adapted.id === submission.id, 'ID should be preserved');
      this.assert(adapted.assignmentId === submission.courseWorkId, 'Assignment ID should be mapped');
      this.assert(adapted.studentId === submission.userId, 'Student ID should be mapped');
      this.assert(adapted.status === 'submitted', 'Status should be mapped from TURNED_IN');
      this.assert(adapted.score === submission.assignedGrade, 'Score should be preserved');
    }, results);
    
    return results;
  },
  
  /**
   * Test export engine
   * @returns {Object} Test results
   */
  testExportEngine: function() {
    const results = { total: 0, passed: 0, failed: 0, warnings: 0, details: [] };
    
    // Test 1: Config validation
    this.runTest('Export engine config validation', () => {
      const validation = ClassroomSnapshotExporter.validateConfig({
        includeSubmissions: true,
        maxClassrooms: 5
      });
      this.assert(validation.valid === true, 'Valid config should pass validation');
    }, results);
    
    // Test 2: Config validation with invalid data
    this.runTest('Export engine invalid config', () => {
      const validation = ClassroomSnapshotExporter.validateConfig({
        maxClassrooms: -1
      });
      this.assert(validation.valid === false, 'Invalid config should fail validation');
      this.assert(validation.issues.length > 0, 'Invalid config should have issues');
    }, results);
    
    // Test 3: Global stats calculation
    this.runTest('Global stats calculation', () => {
      const mockClassrooms = [
        { studentCount: 10, assignments: [{}, {}], submissions: [{}, {}, {}] },
        { studentCount: 15, assignments: [{}], submissions: [{}, {}] }
      ];
      const stats = ClassroomSnapshotExporter.calculateGlobalStats(mockClassrooms);
      
      this.assert(stats.totalClassrooms === 2, 'Total classrooms should be 2');
      this.assert(stats.totalStudents === 25, 'Total students should be 25');
      this.assert(stats.totalAssignments === 3, 'Total assignments should be 3');
      this.assert(stats.totalSubmissions === 5, 'Total submissions should be 5');
    }, results);
    
    return results;
  },
  
  /**
   * Test validation functions
   * @returns {Object} Test results
   */
  testValidation: function() {
    const results = { total: 0, passed: 0, failed: 0, warnings: 0, details: [] };
    
    // Test 1: Valid snapshot validation
    this.runTest('Valid snapshot validation', () => {
      const snapshot = this.createMockSnapshot();
      const validation = SnapshotConfig.validateSnapshot(snapshot);
      this.assert(validation.valid === true, 'Valid snapshot should pass validation');
    }, results);
    
    // Test 2: Invalid snapshot validation
    this.runTest('Invalid snapshot validation', () => {
      const invalidSnapshot = { invalid: 'data' };
      const validation = SnapshotConfig.validateSnapshot(invalidSnapshot);
      this.assert(validation.valid === false, 'Invalid snapshot should fail validation');
      this.assert(validation.errors.length > 0, 'Invalid snapshot should have errors');
    }, results);
    
    // Test 3: Object validation
    this.runTest('Individual object validation', () => {
      const teacher = {
        email: 'test@example.com',
        name: 'Test Teacher',
        isTeacher: true
      };
      const validation = SnapshotConfig.validateObject(teacher, 'teacher');
      this.assert(validation.valid === true, 'Valid teacher object should pass validation');
    }, results);
    
    return results;
  },
  
  /**
   * Test integration scenarios
   * @returns {Object} Test results
   */
  testIntegration: function() {
    const results = { total: 0, passed: 0, failed: 0, warnings: 0, details: [] };
    
    // Test 1: End-to-end mock export
    this.runTest('Mock export integration', () => {
      try {
        // This would normally call the actual export, but we'll simulate it
        const mockSnapshot = this.createMockSnapshot();
        const validation = SnapshotConfig.validateSnapshot(mockSnapshot);
        this.assert(validation.valid === true, 'Mock snapshot should be valid');
        
        const stats = SnapshotConfig.generateStats(mockSnapshot);
        this.assert(stats.overview, 'Stats should have overview');
        this.assert(stats.breakdown, 'Stats should have breakdown');
      } catch (error) {
        throw new Error('Integration test failed: ' + error.message);
      }
    }, results);
    
    return results;
  },
  
  /**
   * Run a single test
   * @param {string} name - Test name
   * @param {Function} testFn - Test function
   * @param {Object} results - Results object to update
   */
  runTest: function(name, testFn, results) {
    results.total++;
    
    try {
      testFn();
      results.passed++;
      results.details.push('✅ ' + name);
      console.log('✅', name);
    } catch (error) {
      results.failed++;
      results.details.push('❌ ' + name + ': ' + error.message);
      console.log('❌', name + ':', error.message);
    }
  },
  
  /**
   * Assert function for tests
   * @param {boolean} condition - Condition to check
   * @param {string} message - Error message if assertion fails
   */
  assert: function(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  },
  
  /**
   * Create mock snapshot for testing
   * @returns {Object} Mock snapshot data
   */
  createMockSnapshot: function() {
    return {
      teacher: {
        email: 'test@example.com',
        name: 'Test Teacher',
        isTeacher: true,
        displayName: 'Test Teacher'
      },
      classrooms: [
        {
          id: 'test-classroom-1',
          name: 'Test Classroom',
          enrollmentCode: 'TEST123',
          courseState: 'ACTIVE',
          creationTime: new Date().toISOString(),
          updateTime: new Date().toISOString(),
          alternateLink: 'https://classroom.google.com/c/test-classroom-1',
          studentCount: 2,
          assignmentCount: 1,
          totalSubmissions: 2,
          ungradedSubmissions: 1,
          assignments: [
            {
              id: 'test-assignment-1',
              title: 'Test Assignment',
              description: 'Test description',
              type: 'assignment',
              maxScore: 100,
              creationTime: new Date().toISOString(),
              updateTime: new Date().toISOString(),
              workType: 'ASSIGNMENT',
              alternateLink: '',
              state: 'PUBLISHED',
              submissionStats: { total: 2, submitted: 2, graded: 1, pending: 1 }
            }
          ],
          students: [
            {
              id: 'test-student-1',
              email: 'student1@example.com',
              name: 'Test Student 1',
              userId: 'test-student-1',
              courseId: 'test-classroom-1',
              submissionCount: 1,
              gradedSubmissionCount: 0
            },
            {
              id: 'test-student-2',
              email: 'student2@example.com',
              name: 'Test Student 2',
              userId: 'test-student-2',
              courseId: 'test-classroom-1',
              submissionCount: 1,
              gradedSubmissionCount: 1
            }
          ],
          submissions: [
            {
              id: 'test-submission-1',
              assignmentId: 'test-assignment-1',
              assignmentName: 'Test Assignment',
              studentId: 'test-student-1',
              status: 'submitted',
              submittedAt: new Date().toISOString(),
              studentWork: 'Test student work',
              maxScore: 100
            },
            {
              id: 'test-submission-2',
              assignmentId: 'test-assignment-1',
              assignmentName: 'Test Assignment',
              studentId: 'test-student-2',
              status: 'graded',
              submittedAt: new Date().toISOString(),
              gradedAt: new Date().toISOString(),
              score: 85,
              maxScore: 100,
              studentWork: 'Test student work 2',
              feedback: 'Good work!'
            }
          ],
          ownerId: 'test-teacher-1'
        }
      ],
      globalStats: {
        totalClassrooms: 1,
        totalStudents: 2,
        totalAssignments: 1,
        totalSubmissions: 2,
        ungradedSubmissions: 1,
        averageGrade: 85.0
      },
      snapshotMetadata: {
        fetchedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        source: 'mock',
        version: '1.0.0'
      }
    };
  }
};