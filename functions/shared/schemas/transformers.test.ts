import { describe, it, expect } from 'vitest';
import {
  snapshotToCore,
  StableIdGenerator,
  mergeSnapshotWithExisting,
  extractGradeFromSubmission,
  calculatePercentage
} from './transformers';
import { ClassroomSnapshot } from './classroom-snapshot';
import { Classroom, Assignment, Submission, Grade, StudentEnrollment, DashboardUser, DashboardUserInput } from './core';

/**
 * Tests for transformation pipeline and stable ID generation
 * Location: shared/schemas/transformers.test.ts
 */

describe('StableIdGenerator', () => {
  it('generates consistent classroom IDs', () => {
    const id1 = StableIdGenerator.classroom('12345');
    const id2 = StableIdGenerator.classroom('12345');
    expect(id1).toBe('classroom_12345');
    expect(id2).toBe(id1);
  });

  it('generates consistent assignment IDs', () => {
    const id = StableIdGenerator.assignment('classroom_12345', 'assignment_67890');
    expect(id).toBe('classroom_12345_assignment_assignment_67890');
  });

  it('generates consistent submission IDs', () => {
    const id = StableIdGenerator.submission('classroom_1', 'assignment_1', 'student_1');
    expect(id).toBe('classroom_1_assignment_1_student_1');
  });

  it('generates student IDs from emails', () => {
    const id = StableIdGenerator.student('john@school.edu');
    expect(id).toBe('student_john_at_school_edu');
  });
});

describe('snapshotToCore transformation', () => {
  const mockSnapshot: ClassroomSnapshot = {
    teacher: {
      email: 'teacher@school.edu',
      name: 'Test Teacher',
      isTeacher: true
    },
    classrooms: [{
      id: 'classroom_123',
      name: 'Test Classroom',
      enrollmentCode: 'abc123',
      courseState: 'ACTIVE',
      creationTime: '2024-01-01T00:00:00Z',
      updateTime: '2024-01-01T00:00:00Z',
      alternateLink: 'https://classroom.google.com/c/123',
      studentCount: 2,
      assignmentCount: 1,
      totalSubmissions: 2,
      ungradedSubmissions: 1,
      ownerId: 'teacher123',
      assignments: [{
        id: 'assignment_456',
        title: 'Test Assignment',
        description: 'A test assignment',
        type: 'assignment',
        status: 'published',
        maxScore: 100,
        creationTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z',
        submissionStats: {
          total: 2,
          submitted: 1,
          graded: 0,
          pending: 1
        }
      }],
      students: [{
        id: 'student_789',
        email: 'student@school.edu',
        name: 'Test Student',
        courseId: 'classroom_123',
        submissionCount: 1,
        gradedSubmissionCount: 0
      }],
      submissions: [{
        id: 'submission_101',
        assignmentId: 'assignment_456',
        studentId: 'student_789',
        studentEmail: 'student@school.edu',
        studentName: 'Test Student',
        status: 'submitted',
        submittedAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        attachments: []
      }]
    }],
    globalStats: {
      totalClassrooms: 1,
      totalStudents: 1,
      totalAssignments: 1,
      totalSubmissions: 1,
      ungradedSubmissions: 1
    },
    snapshotMetadata: {
      fetchedAt: '2024-01-01T00:00:00Z',
      expiresAt: '2024-01-01T01:00:00Z',
      source: 'google-classroom',
      version: '1.0.0'
    }
  };

  it('transforms snapshot to core entities', () => {
    const result = snapshotToCore(mockSnapshot);

    // Check teacher transformation
    expect(result.teacher.email).toBe('teacher@school.edu');
    expect(result.teacher.displayName).toBe('Test Teacher');
    expect(result.teacher.role).toBe('teacher');

    // Check classroom transformation
    expect(result.classrooms).toHaveLength(1);
    expect(result.classrooms[0].name).toBe('Test Classroom');
    expect(result.classrooms[0].externalId).toBe('classroom_123');

    // Check assignment transformation
    expect(result.assignments).toHaveLength(1);
    expect(result.assignments[0].title).toBe('Test Assignment');
    expect(result.assignments[0].type).toBe('written');

    // Check submission transformation
    expect(result.submissions).toHaveLength(1);
    expect(result.submissions[0].studentEmail).toBe('student@school.edu');
    expect(result.submissions[0].status).toBe('submitted');

    // Check enrollment transformation
    expect(result.enrollments).toHaveLength(1);
    expect(result.enrollments[0].email).toBe('student@school.edu');
    expect(result.enrollments[0].status).toBe('active');
  });

  it('handles course state mapping', () => {
    const declinedSnapshot = {
      ...mockSnapshot,
      classrooms: [{
        ...mockSnapshot.classrooms[0],
        courseState: 'DECLINED' as const
      }]
    };

    const result = snapshotToCore(declinedSnapshot);
    expect(result.classrooms[0].courseState).toBe('ARCHIVED');
  });
});

describe('extractGradeFromSubmission', () => {
  it('extracts grade from submission with grade data', () => {
    const submissionWithGrade = {
      id: 'submission_1',
      assignmentId: 'assignment_1',
      studentEmail: 'student@test.com',
      studentName: 'Test Student',
      status: 'graded' as const,
      submittedAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z',
      attachments: [],
      grade: {
        score: 85,
        maxScore: 100,
        feedback: 'Good work!',
        gradedAt: '2024-01-01T13:00:00Z',
        gradedBy: 'ai' as const,
        gradingMethod: 'points' as const
      }
    };

    const grade = extractGradeFromSubmission(submissionWithGrade, 'classroom_1');

    expect(grade).not.toBeNull();
    expect(grade!.score).toBe(85);
    expect(grade!.maxScore).toBe(100);
    expect(grade!.feedback).toBe('Good work!');
    expect(grade!.gradedBy).toBe('ai');
    expect(grade!.isLocked).toBe(false);
  });

  it('returns null for submission without grade', () => {
    const submissionWithoutGrade = {
      id: 'submission_1',
      assignmentId: 'assignment_1',
      studentEmail: 'student@test.com',
      studentName: 'Test Student',
      status: 'submitted' as const,
      submittedAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z',
      attachments: []
    };

    const grade = extractGradeFromSubmission(submissionWithoutGrade, 'classroom_1');
    expect(grade).toBeNull();
  });

  it('locks manual grades', () => {
    const submissionWithManualGrade = {
      id: 'submission_1',
      assignmentId: 'assignment_1',
      studentEmail: 'student@test.com',
      studentName: 'Test Student',
      status: 'graded' as const,
      submittedAt: '2024-01-01T12:00:00Z',
      updatedAt: '2024-01-01T12:00:00Z',
      attachments: [],
      grade: {
        score: 90,
        maxScore: 100,
        gradedBy: 'manual' as const,
        gradedAt: '2024-01-01T13:00:00Z',
        gradingMethod: 'points' as const
      }
    };

    const grade = extractGradeFromSubmission(submissionWithManualGrade, 'classroom_1');
    expect(grade!.isLocked).toBe(true);
    expect(grade!.lockedReason).toBe('Manual grade');
  });
});

describe('mergeSnapshotWithExisting', () => {
  const simpleSnapshot = {
    teacher: {
      email: 'teacher@test.com',
      name: 'Teacher',
      role: 'teacher' as const,
      classroomIds: ['classroom_1']
    },
    classrooms: [{
      teacherId: 'teacher@test.com',
      name: 'Updated Classroom',
      externalId: 'classroom_1',
      courseState: 'ACTIVE' as const,
      studentIds: ['student_1'],
      assignmentIds: ['assignment_1']
    }],
    assignments: [{
      classroomId: 'classroom_1',
      title: 'Updated Assignment',
      description: 'Updated description',
      type: 'written' as const,
      maxScore: 100,
      status: 'published' as const,
      externalId: 'assignment_1'
    }],
    submissions: [{
      assignmentId: 'assignment_1',
      classroomId: 'classroom_1',
      studentId: 'student_1',
      studentEmail: 'student@test.com',
      studentName: 'Student',
      content: 'Updated submission content',
      attachments: [],
      status: 'submitted' as const,
      submittedAt: new Date(),
      source: 'import' as const
    }],
    enrollments: [{
      id: 'enrollment_1',
      classroomId: 'classroom_1',
      studentId: 'student_1',
      email: 'student@test.com',
      name: 'Student',
      enrolledAt: new Date(),
      status: 'active' as const,
      submissionCount: 1,
      gradedSubmissionCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    }]
  };

  const existingData = {
    classrooms: [{
      id: 'classroom_1',
      teacherId: 'teacher@test.com',
      name: 'Old Classroom',
      externalId: 'classroom_1',
      courseState: 'ACTIVE' as const,
      studentIds: ['student_1'],
      assignmentIds: ['assignment_1'],
      studentCount: 1,
      assignmentCount: 1,
      activeSubmissions: 1,
      ungradedSubmissions: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }],
    assignments: [{
      id: 'assignment_1',
      classroomId: 'classroom_1',
      title: 'Old Assignment',
      description: 'Old description',
      type: 'written' as const,
      maxScore: 100,
      status: 'published' as const,
      externalId: 'assignment_1',
      submissionCount: 1,
      gradedCount: 0,
      pendingCount: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }],
    submissions: [{
      id: 'submission_1',
      assignmentId: 'assignment_1',
      classroomId: 'classroom_1',
      studentId: 'student_1',
      studentEmail: 'student@test.com',
      studentName: 'Student',
      content: 'Old submission content',
      attachments: [],
      status: 'submitted' as const,
      submittedAt: new Date('2024-01-01'),
      source: 'import' as const,
      version: 1,
      isLatest: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }],
    enrollments: [{
      id: 'enrollment_1',
      classroomId: 'classroom_1',
      studentId: 'student_1',
      email: 'student@test.com',
      name: 'Student',
      enrolledAt: new Date('2024-01-01'),
      status: 'active' as const,
      submissionCount: 1,
      gradedSubmissionCount: 0,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    }],
    grades: []
  };

  it('updates existing entities with new data', () => {
    const result = mergeSnapshotWithExisting(simpleSnapshot, existingData);

    // Should update classroom
    expect(result.toUpdate.classrooms).toHaveLength(1);
    expect(result.toUpdate.classrooms[0].name).toBe('Updated Classroom');

    // Should update assignment
    expect(result.toUpdate.assignments).toHaveLength(1);
    expect(result.toUpdate.assignments[0].title).toBe('Updated Assignment');
  });

  it('creates new version for changed submission content', () => {
    const result = mergeSnapshotWithExisting(simpleSnapshot, existingData);

    // Should create new version due to content change
    expect(result.toCreate.submissions).toHaveLength(1);
    expect(result.toCreate.submissions[0].content).toBe('Updated submission content');
    expect(result.toCreate.submissions[0].version).toBe(2);
    expect(result.toCreate.submissions[0].isLatest).toBe(true);

    // Should mark old version as not latest
    expect(result.toUpdate.submissions).toHaveLength(1);
    expect(result.toUpdate.submissions[0].isLatest).toBe(false);
  });

  it('does not create new version for identical content', () => {
    const identicalSnapshot = {
      ...simpleSnapshot,
      submissions: [{
        ...simpleSnapshot.submissions[0],
        content: 'Old submission content' // Same as existing
      }]
    };

    const result = mergeSnapshotWithExisting(identicalSnapshot, existingData);

    // Should only update metadata, not create new version
    expect(result.toCreate.submissions).toHaveLength(0);
    expect(result.toUpdate.submissions).toHaveLength(1);
  });
});

describe('calculatePercentage', () => {
  it('calculates correct percentage', () => {
    expect(calculatePercentage(85, 100)).toBe(85);
    expect(calculatePercentage(17, 20)).toBe(85);
    expect(calculatePercentage(3, 4)).toBe(75);
  });

  it('handles zero max score', () => {
    expect(calculatePercentage(5, 0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(calculatePercentage(33, 100)).toBe(33);
    expect(calculatePercentage(33.7, 100)).toBe(34);
  });
});