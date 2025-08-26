import { 
  ClassroomSnapshot, 
  ClassroomWithData, 
  AssignmentWithStats, 
  StudentSnapshot, 
  SubmissionSnapshot 
} from './classroom-snapshot';
import {
  DashboardUser,
  Classroom,
  Assignment,
  Submission,
  Grade,
  StudentEnrollment,
  AssignmentClassification,
  DashboardUserInput,
  ClassroomInput,
  AssignmentInput,
  SubmissionInput,
  GradeInput
} from './core';

/**
 * Transformation utilities for converting between ClassroomSnapshot and Core schemas
 * Location: shared/schemas/transformers.ts
 * 
 * These functions handle the transformation from the Google Classroom snapshot format
 * to our normalized DataConnect-ready schemas.
 */

/**
 * Generate stable IDs for entities to ensure consistency across snapshots
 */
export class StableIdGenerator {
  static classroom(externalId: string): string {
    return `classroom_${externalId}`;
  }

  static assignment(classroomId: string, externalId: string): string {
    return `${classroomId}_assignment_${externalId}`;
  }

  static submission(classroomId: string, assignmentId: string, studentId: string): string {
    return `${classroomId}_${assignmentId}_${studentId}`;
  }

  static student(studentEmail: string): string {
    // Use email as stable identifier for students
    return `student_${studentEmail.replace('@', '_at_').replace('.', '_')}`;
  }

  static enrollment(classroomId: string, studentId: string): string {
    return `${classroomId}_${studentId}`;
  }

  static grade(submissionId: string, version: number): string {
    return `${submissionId}_grade_v${version}`;
  }
}

/**
 * Transform a ClassroomSnapshot into normalized core entities
 */
export function snapshotToCore(snapshot: ClassroomSnapshot): {
  teacher: DashboardUserInput;
  classrooms: ClassroomInput[];
  assignments: AssignmentInput[];
  submissions: SubmissionInput[];
  enrollments: StudentEnrollment[];
} {
  const teacher = transformTeacher(snapshot.teacher, snapshot.classrooms);
  const classrooms: ClassroomInput[] = [];
  const assignments: AssignmentInput[] = [];
  const submissions: SubmissionInput[] = [];
  const enrollments: StudentEnrollment[] = [];

  for (const classroomData of snapshot.classrooms) {
    console.log(`[TRANSFORM DEBUG] Processing classroom: ${classroomData.name}`);
    console.log(`[TRANSFORM DEBUG] Raw submissions in classroom: ${classroomData.submissions.length}`);
    
    // Transform classroom
    const classroom = transformClassroom(classroomData, classroomData.teacherEmail);
    classrooms.push(classroom);

    // Transform assignments for this classroom
    for (const assignmentData of classroomData.assignments) {
      const assignment = transformAssignment(
        assignmentData,
        StableIdGenerator.classroom(classroomData.id)
      );
      assignments.push(assignment);
    }

    // Transform students/enrollments for this classroom
    for (const studentData of classroomData.students) {
      const enrollment = transformStudentEnrollment(
        studentData,
        StableIdGenerator.classroom(classroomData.id)
      );
      enrollments.push(enrollment);
    }

    // Transform submissions for this classroom
    let processedSubmissions = 0;
    for (const submissionData of classroomData.submissions) {
      try {
        const submission = transformSubmission(
          submissionData,
          StableIdGenerator.classroom(classroomData.id)
        );
        submissions.push(submission);
        processedSubmissions++;
      } catch (error) {
        console.error(`[TRANSFORM ERROR] Failed to transform submission ${submissionData.id}:`, error);
      }
    }
    console.log(`[TRANSFORM DEBUG] Successfully transformed ${processedSubmissions} submissions`);
    console.log(`[TRANSFORM DEBUG] Total submissions array length: ${submissions.length}`);
  }

  return {
    teacher,
    classrooms,
    assignments,
    submissions,
    enrollments
  };
}

/**
 * Transform teacher profile from snapshot to core schema
 */
function transformTeacher(
  teacherProfile: ClassroomSnapshot['teacher'],
  classrooms: ClassroomWithData[]
): DashboardUserInput {
  const classroomIds = classrooms.map(c => StableIdGenerator.classroom(c.id));
  
  // Extract teacher's school email from classroom data (teacherEmail field)
  // This is the authoritative source for the teacher's school board email
  const schoolEmail = classrooms.length > 0 ? classrooms[0].teacherEmail : teacherProfile.email;
  
  return {
    email: teacherProfile.email,
    displayName: teacherProfile.name,
    role: 'teacher' as const,
    schoolEmail,
    classroomIds
  };
}

/**
 * Transform classroom from snapshot to core schema
 */
function transformClassroom(
  classroom: ClassroomWithData,
  teacherEmail: string
): ClassroomInput {
  const classroomId = StableIdGenerator.classroom(classroom.id);
  const studentIds = classroom.students.map(s => StableIdGenerator.student(s.email));
  const assignmentIds = classroom.assignments.map(a => 
    StableIdGenerator.assignment(classroomId, a.id)
  );

  return {
    teacherId: teacherEmail, // Will be resolved to teacher ID in repository
    name: classroom.name,
    section: classroom.section,
    description: classroom.description,
    externalId: classroom.id,
    enrollmentCode: classroom.enrollmentCode,
    alternateLink: classroom.alternateLink,
    courseState: classroom.courseState === 'DECLINED' || classroom.courseState === 'SUSPENDED' 
      ? 'ARCHIVED' 
      : classroom.courseState as 'ACTIVE' | 'ARCHIVED' | 'PROVISIONED',
    studentIds,
    assignmentIds
  };
}

/**
 * Create assignment classification based on Google Classroom data
 */
function createAssignmentClassification(assignment: AssignmentWithStats): AssignmentClassification {
  // Determine platform based on submission method
  let platform: AssignmentClassification['platform'] = 'google_classroom';
  
  // Check for materials structure - handle both schema and actual data formats
  const materials = assignment.materials as any;
  
  // Check for Google Form (could be in forms array or materials array with form type)
  if (materials?.forms && materials.forms.length > 0) {
    platform = 'google_form';
  } else if (materials?.materials?.some((m: any) => m.type === 'form')) {
    platform = 'google_form';
  }
  // Check for Google Drive files  
  else if (materials?.driveFiles && materials.driveFiles.length > 0) {
    platform = 'google_docs';
  } else if (materials?.materials?.some((m: any) => m.type === 'driveFile')) {
    platform = 'google_docs';
  }
  // Check for external links
  else if (materials?.links && materials.links.length > 0) {
    // Check if it's a GitHub/CodeHS link
    const hasCodeLink = materials.links.some((link: any) => 
      link.url?.includes('github.com') || 
      link.url?.includes('codehs.com') ||
      link.url?.includes('repl.it')
    );
    platform = hasCodeLink ? 'external_link' : 'google_classroom';
  } else if (materials?.materials?.some((m: any) => m.type === 'link')) {
    // Check links in the materials array
    const hasCodeLink = materials.materials
      .filter((m: any) => m.type === 'link')
      .some((m: any) => 
        m.link?.url?.includes('github.com') || 
        m.link?.url?.includes('codehs.com') ||
        m.link?.url?.includes('repl.it')
      );
    platform = hasCodeLink ? 'external_link' : 'google_classroom';
  }
  
  // Determine content type
  let contentType: AssignmentClassification['contentType'] = 'text';
  const title = (assignment.title || '').toLowerCase();
  const description = (assignment.description || '').toLowerCase();
  
  // Check for coding content
  const codingKeywords = ['karel', 'function', 'algorithm', 'programming', 'code', 'coding', 'program'];
  const hasCodingContent = codingKeywords.some(keyword => 
    title.includes(keyword) || description.includes(keyword)
  );
  
  if (hasCodingContent) {
    contentType = 'code';
  } else if (assignment.workType === 'MULTIPLE_CHOICE_QUESTION') {
    contentType = 'choice';
  } else if (assignment.workType === 'SHORT_ANSWER_QUESTION') {
    contentType = 'short_answer';
  } else if (platform === 'google_docs' || assignment.description) {
    contentType = 'text';
  }
  
  // Determine grading approach
  let gradingApproach: AssignmentClassification['gradingApproach'] = 'ai_analysis';
  
  if (contentType === 'code' && platform === 'google_form') {
    gradingApproach = 'generous_code';
  } else if (contentType === 'choice') {
    gradingApproach = 'auto_grade';
  } else if (platform === 'google_form' && contentType !== 'code') {
    gradingApproach = 'standard_quiz';
  } else if (platform === 'google_docs' && contentType === 'text') {
    gradingApproach = 'essay_rubric';
  }
  
  // Generate tags
  const tags = [
    assignment.type || 'unknown',
    platform,
    contentType,
    'auto_classified'
  ].filter(Boolean);
  
  return {
    platform,
    contentType, 
    gradingApproach,
    tags,
    confidence: 0.85 // High confidence for auto-classification
  };
}

/**
 * Transform assignment from snapshot to core schema
 */
function transformAssignment(
  assignment: AssignmentWithStats,
  classroomId: string
): AssignmentInput {
  // Map assignment type with title-based coding detection (matching AppScript logic)
  let type: 'coding' | 'quiz' | 'written' | 'form' = 'written';
  
  // Use type from AppScript if already determined
  if (assignment.type === 'assignment') {
    // assignment.type is 'assignment' after transformation from 'coding'/'written'
    type = 'written'; // Default assignment type
  } else if (assignment.type === 'quiz') {
    type = 'quiz';
  } else if (assignment.type === 'form') {
    type = 'form';
  } else {
    // Fallback detection if not set during import (should match AppScript logic)
    if (assignment.workType === 'SHORT_ANSWER_QUESTION' || 
        assignment.workType === 'MULTIPLE_CHOICE_QUESTION' ||
        assignment.quizData) {
      
      // Check assignment title for coding keywords
      const title = (assignment.title || '').toLowerCase();
      const codingKeywords = ['program', 'code', 'karel', 'function', 'algorithm', 'coding'];
      
      const isCodingQuiz = codingKeywords.some(keyword => 
        title.includes(keyword)
      );
      
      type = isCodingQuiz ? 'coding' : 'quiz';
    } else {
      type = 'written'; // Default for regular assignments
    }
  }

  // Map status
  let status: 'draft' | 'published' | 'closed' = 'published';
  if (assignment.status === 'draft') {
    status = 'draft';
  } else if (assignment.status === 'closed') {
    status = 'closed';
  }

  // Generate classification
  const classification = createAssignmentClassification(assignment);

  return {
    classroomId,
    title: assignment.title,
    description: assignment.description || '',
    type,
    classification, // Add the new classification
    dueDate: assignment.dueDate ? new Date(assignment.dueDate) : undefined,
    maxScore: assignment.maxScore,
    rubric: assignment.rubric ? {
      enabled: true,
      criteria: assignment.rubric.criteria.map((c: any) => ({
        id: c.id || crypto.randomUUID(),
        title: c.title || '',
        description: c.description || '',
        maxPoints: c.maxPoints || c.points || 0
      }))
    } : undefined,
    status,
    externalId: assignment.id,
    alternateLink: assignment.alternateLink,
    workType: assignment.workType
  };
}

/**
 * Transform student enrollment from snapshot to core schema
 */
function transformStudentEnrollment(
  student: StudentSnapshot,
  classroomId: string
): StudentEnrollment {
  const now = new Date();
  const studentId = StableIdGenerator.student(student.email);
  const enrollmentId = StableIdGenerator.enrollment(classroomId, studentId);

  return {
    id: enrollmentId,
    classroomId,
    studentId,
    email: student.email,
    name: student.name,
    firstName: student.firstName,
    lastName: student.lastName,
    displayName: student.displayName,
    enrolledAt: student.joinTime ? new Date(student.joinTime) : now,
    status: 'active',
    submissionCount: student.submissionCount || 0,
    gradedSubmissionCount: student.gradedSubmissionCount || 0,
    averageGrade: student.overallGrade,
    externalId: student.id,
    userId: student.userId,
    createdAt: now,
    updatedAt: now
  };
}

/**
 * Transform submission from snapshot to core schema
 */
function transformSubmission(
  submission: SubmissionSnapshot,
  classroomId: string
): SubmissionInput {
  const studentId = StableIdGenerator.student(submission.studentEmail);
  const assignmentId = StableIdGenerator.assignment(classroomId, submission.assignmentId);

  // Map status
  let status: 'draft' | 'submitted' | 'graded' | 'returned' = 'submitted';
  if (submission.status === 'pending' || submission.status === 'submitted') {
    status = 'submitted';
  } else if (submission.status === 'graded') {
    status = 'graded';
  } else if (submission.status === 'returned') {
    status = 'returned';
  }

  // Transform attachments
  const attachments = submission.attachments.map(att => {
    if ('type' in att) {
      if (att.type === 'driveFile') {
        return {
          type: 'driveFile' as const,
          url: att.alternateLink,
          name: att.title,
          mimeType: att.mimeType
        };
      } else if (att.type === 'link') {
        return {
          type: 'link' as const,
          url: att.url,
          name: att.title,
          mimeType: undefined
        };
      }
    }
    // Fallback for unknown attachment types
    return {
      type: 'file' as const,
      url: 'https://unknown-attachment.placeholder',
      name: 'Unknown attachment',
      mimeType: undefined
    };
  });

  return {
    assignmentId,
    classroomId,
    studentId,
    studentEmail: submission.studentEmail,
    studentName: submission.studentName,
    content: submission.extractedContent?.text || submission.studentWork || '',
    attachments,
    status,
    submittedAt: submission.submittedAt ? new Date(submission.submittedAt) : new Date(),
    importedAt: new Date(),
    source: 'import',
    externalId: submission.id,
    late: submission.late || false,
    
    // Preserve AI processing fields if present (enhanced schema support)
    aiProcessingStatus: submission.aiProcessingStatus ? {
      contentExtracted: submission.aiProcessingStatus.contentExtracted || false,
      readyForGrading: typeof submission.aiProcessingStatus.readyForGrading === 'boolean' 
        ? submission.aiProcessingStatus.readyForGrading 
        : !!submission.aiProcessingStatus.readyForGrading,
      processingErrors: submission.aiProcessingStatus.processingErrors || [],
      lastProcessedAt: submission.aiProcessingStatus.lastProcessedAt || null
    } : undefined,
    
    extractedContent: submission.extractedContent ? {
      text: submission.extractedContent.text || '',
      structuredData: submission.extractedContent.structuredData || {},
      images: submission.extractedContent.images || [],
      metadata: submission.extractedContent.metadata || {}
    } : undefined
  };
}

/**
 * Transform grade from snapshot submission to core grade schema
 */
export function extractGradeFromSubmission(
  submission: SubmissionSnapshot,
  classroomId: string
): GradeInput | null {
  if (!submission.grade) {
    return null;
  }

  const studentId = StableIdGenerator.student(submission.studentEmail);
  const assignmentId = StableIdGenerator.assignment(classroomId, submission.assignmentId);
  const submissionId = StableIdGenerator.submission(classroomId, assignmentId, studentId);

  const grade = submission.grade;
  
  return {
    submissionId,
    assignmentId,
    studentId,
    classroomId,
    score: grade.score,
    maxScore: grade.maxScore,
    feedback: grade.feedback || '',
    privateComments: grade.privateComments,
    rubricScores: grade.rubricScore ? 
      grade.rubricScore.criterionScores.map(cs => ({
        criterionId: crypto.randomUUID(),
        criterionTitle: cs.criterionTitle,
        score: cs.points,
        maxScore: cs.points, // Assuming points is max for now
        feedback: cs.feedback
      })) : undefined,
    gradedAt: grade.gradedAt ? new Date(grade.gradedAt) : new Date(),
    gradedBy: grade.gradedBy === 'system' ? 'auto' : grade.gradedBy,
    gradingMethod: grade.gradingMethod || 'points',
    submissionVersionGraded: 1, // Default to version 1
    submissionContentSnapshot: submission.studentWork,
    isLocked: grade.gradedBy === 'manual',
    lockedReason: grade.gradedBy === 'manual' ? 'Manual grade' : undefined,
    aiGradingInfo: grade.aiGradingInfo
  };
}

/**
 * Merge new snapshot data with existing data, preserving grades
 */
export interface MergeResult {
  toCreate: {
    classrooms: Classroom[];
    assignments: Assignment[];
    submissions: Submission[];
    enrollments: StudentEnrollment[];
    grades: Grade[];
  };
  toUpdate: {
    classrooms: Classroom[];
    assignments: Assignment[];
    submissions: Submission[];
    enrollments: StudentEnrollment[];
  };
  toArchive: {
    submissionIds: string[];
    enrollmentIds: string[];
  };
}

export function mergeSnapshotWithExisting(
  snapshot: ReturnType<typeof snapshotToCore>,
  existing: {
    classrooms: Classroom[];
    assignments: Assignment[];
    submissions: Submission[];
    enrollments: StudentEnrollment[];
    grades: Grade[];
  }
): MergeResult {
  const result: MergeResult = {
    toCreate: {
      classrooms: [],
      assignments: [],
      submissions: [],
      enrollments: [],
      grades: []
    },
    toUpdate: {
      classrooms: [],
      assignments: [],
      submissions: [],
      enrollments: []
    },
    toArchive: {
      submissionIds: [],
      enrollmentIds: []
    }
  };

  // Create maps for efficient lookups
  const existingClassrooms = new Map(existing.classrooms.map(c => [c.externalId, c]));
  
  console.log(`[MERGE DEBUG] Creating existingAssignments map from ${existing.assignments.length} assignments:`);
  existing.assignments.forEach((a, index) => {
    console.log(`[MERGE DEBUG]   Assignment ${index}: id=${a.id}, externalId=${a.externalId}, title=${a.title}`);
  });
  const existingAssignments = new Map(existing.assignments.map(a => [a.externalId, a]));
  console.log(`[MERGE DEBUG] existingAssignments map created with ${existingAssignments.size} entries`);
  
  // Create fallback matching maps for assignments with different externalIds
  const existingAssignmentsByTitle = new Map(
    existing.assignments.map(a => [`${a.classroomId}_${a.title}`, a])
  );
  console.log(`[MERGE DEBUG] Created fallback title-based matching map with ${existingAssignmentsByTitle.size} entries`);
  
  // Create additional fallback maps for more robust matching
  const existingAssignmentsByTitleOnly = new Map(
    existing.assignments.map(a => [a.title, a])
  );
  console.log(`[MERGE DEBUG] Created fallback title-only matching map with ${existingAssignmentsByTitleOnly.size} entries`);
  
  // Debug: Check for assignments missing externalId
  const missingExternalId = existing.assignments.filter(a => !a.externalId);
  console.log(`[MERGE DEBUG] Assignments missing externalId: ${missingExternalId.length}`);
  if (missingExternalId.length > 0) {
    console.log(`[MERGE DEBUG] Sample missing externalId assignments:`, 
      missingExternalId.slice(0, 3).map(a => ({ id: a.id, title: a.title })));
  }
  
  const existingSubmissions = new Map(existing.submissions.map(s => [
    StableIdGenerator.submission(s.classroomId, s.assignmentId, s.studentId),
    s
  ]));
  const existingEnrollments = new Map(existing.enrollments.map(e => [
    `${e.classroomId}_${e.studentId}`,
    e
  ]));

  // Process classrooms
  for (const classroom of snapshot.classrooms) {
    const existing = existingClassrooms.get(classroom.externalId!);
    if (existing) {
      // Update existing classroom
      result.toUpdate.classrooms.push({
        ...existing,
        ...classroom,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date()
      } as Classroom);
    } else {
      // Create new classroom
      result.toCreate.classrooms.push({
        ...classroom,
        id: StableIdGenerator.classroom(classroom.externalId!),
        createdAt: new Date(),
        updatedAt: new Date()
      } as Classroom);
    }
  }

  // Process assignments
  console.log(`[MERGE DEBUG] Processing ${snapshot.assignments.length} assignments from snapshot`);
  console.log(`[MERGE DEBUG] Existing assignments map has ${existingAssignments.size} entries`);
  
  for (const assignment of snapshot.assignments) {
    const externalId = assignment.externalId!;
    let existingAssignment = existingAssignments.get(externalId);
    
    console.log(`[MERGE DEBUG] Assignment ${assignment.title}:`);
    console.log(`[MERGE DEBUG]   externalId: ${externalId}`);
    console.log(`[MERGE DEBUG]   existing found by externalId: ${!!existingAssignment}`);
    
    // If not found by externalId, try fallback matching strategies
    if (!existingAssignment) {
      // Strategy 1: Match by title + classroom
      const titleKey = `${assignment.classroomId}_${assignment.title}`;
      existingAssignment = existingAssignmentsByTitle.get(titleKey);
      console.log(`[MERGE DEBUG]   fallback match by title+classroom found: ${!!existingAssignment}`);
      
      // Strategy 2: If still not found, try matching by title only (within same classroom)
      if (!existingAssignment) {
        const candidatesByTitle = existing.assignments.filter(a => 
          a.title === assignment.title && a.classroomId === assignment.classroomId
        );
        if (candidatesByTitle.length === 1) {
          existingAssignment = candidatesByTitle[0];
          console.log(`[MERGE DEBUG]   fallback match by title-only found: ${!!existingAssignment}`);
        } else if (candidatesByTitle.length > 1) {
          console.log(`[MERGE DEBUG]   multiple title matches found (${candidatesByTitle.length}), skipping fallback`);
        }
      }
      
      if (existingAssignment) {
        console.log(`[MERGE DEBUG]   fallback matched assignment externalId: ${existingAssignment.externalId}`);
      }
    }
    
    if (existingAssignment) {
      // Update existing assignment
      console.log(`[MERGE DEBUG]   -> Updating existing assignment`);
      
      // OPTIMIZATION: If matched by fallback (title), update external ID for future matching
      const matchedByFallback = existingAssignment.externalId !== externalId;
      if (matchedByFallback) {
        console.log(`[MERGE DEBUG]   -> Updating external ID from ${existingAssignment.externalId} to ${externalId}`);
      }
      
      result.toUpdate.assignments.push({
        ...existingAssignment,
        ...assignment,
        id: existingAssignment.id,
        externalId: externalId, // Ensure external ID is updated for future matching
        createdAt: existingAssignment.createdAt,
        updatedAt: new Date()
      } as Assignment);
    } else {
      // Create new assignment
      console.log(`[MERGE DEBUG]   -> Creating new assignment`);
      const classroomId = assignment.classroomId;
      result.toCreate.assignments.push({
        ...assignment,
        id: StableIdGenerator.assignment(classroomId, assignment.externalId!),
        createdAt: new Date(),
        updatedAt: new Date()
      } as Assignment);
    }
  }

  // Process submissions - this is where versioning matters
  for (const submission of snapshot.submissions) {
    const submissionKey = StableIdGenerator.submission(
      submission.classroomId,
      submission.assignmentId,
      submission.studentId
    );
    const existing = existingSubmissions.get(submissionKey);
    
    if (existing) {
      // Check if content has changed
      const contentChanged = 
        existing.content !== submission.content ||
        JSON.stringify(existing.attachments) !== JSON.stringify(submission.attachments);
      
      if (contentChanged) {
        // Create new version of submission
        result.toCreate.submissions.push({
          ...submission,
          id: `${submissionKey}_v${existing.version + 1}`,
          version: existing.version + 1,
          previousVersionId: existing.id,
          isLatest: true,
          createdAt: new Date(),
          updatedAt: new Date()
        } as Submission);
        
        // Mark old version as not latest
        result.toUpdate.submissions.push({
          ...existing,
          isLatest: false,
          updatedAt: new Date()
        });
      } else {
        // Just update metadata
        result.toUpdate.submissions.push({
          ...existing,
          ...submission,
          id: existing.id,
          version: existing.version,
          createdAt: existing.createdAt,
          updatedAt: new Date()
        } as Submission);
      }
    } else {
      // Create new submission
      result.toCreate.submissions.push({
        ...submission,
        id: StableIdGenerator.submission(
          submission.classroomId,
          submission.assignmentId,
          submission.studentId
        ),
        version: 1,
        isLatest: true,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Submission);
    }
  }

  // Process enrollments
  const snapshotEnrollmentKeys = new Set<string>();
  for (const enrollment of snapshot.enrollments) {
    const enrollmentKey = `${enrollment.classroomId}_${enrollment.studentId}`;
    snapshotEnrollmentKeys.add(enrollmentKey);
    
    const existing = existingEnrollments.get(enrollmentKey);
    if (existing) {
      // Update existing enrollment
      result.toUpdate.enrollments.push({
        ...existing,
        ...enrollment,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date()
      });
    } else {
      // Create new enrollment
      result.toCreate.enrollments.push({
        ...enrollment,
        id: StableIdGenerator.enrollment(enrollment.classroomId, enrollment.studentId),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  // Find enrollments to archive (not in snapshot anymore)
  existingEnrollments.forEach((enrollment, key) => {
    if (!snapshotEnrollmentKeys.has(key)) {
      result.toArchive.enrollmentIds.push(enrollment.id);
    }
  });

  return result;
}

/**
 * Calculate percentage from score and maxScore
 */
export function calculatePercentage(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
}