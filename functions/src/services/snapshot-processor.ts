import { ClassroomSnapshot } from "@shared/schemas/classroom-snapshot";
import {
  snapshotToCore,
  mergeSnapshotWithExisting,
  extractGradeFromSubmission,
  StableIdGenerator
} from "@shared/schemas/transformers";
import { FirestoreRepository } from "./firestore-repository";
import { GradeVersioningService } from "./grade-versioning";
import { 
  Classroom, 
  Assignment, 
  Submission, 
  StudentEnrollment,
  Grade
} from "@shared/schemas/core";
import { logger } from "../utils/logger";

/**
 * Snapshot Processor Service
 * Location: functions/src/services/snapshot-processor.ts
 * 
 * Processes incoming classroom snapshots, transforms them to normalized entities,
 * merges with existing data while preserving grades, and updates the database.
 */

export interface ProcessingResult {
  success: boolean;
  stats: {
    classroomsCreated: number;
    classroomsUpdated: number;
    assignmentsCreated: number;
    assignmentsUpdated: number;
    submissionsCreated: number;
    submissionsVersioned: number;
    gradesPreserved: number;
    gradesCreated: number;
    enrollmentsCreated: number;
    enrollmentsUpdated: number;
    enrollmentsArchived: number;
  };
  errors: Array<{
    entity: string;
    id: string;
    error: string;
  }>;
  processingTime: number;
}

export class SnapshotProcessor {
  private repository: FirestoreRepository;
  private gradeService: GradeVersioningService;

  constructor() {
    this.repository = new FirestoreRepository();
    this.gradeService = new GradeVersioningService();
  }

  /**
   * Process a complete classroom snapshot
   */
  async processSnapshot(snapshot: ClassroomSnapshot): Promise<ProcessingResult> {
    const startTime = Date.now();
    const result: ProcessingResult = {
      success: true,
      stats: {
        classroomsCreated: 0,
        classroomsUpdated: 0,
        assignmentsCreated: 0,
        assignmentsUpdated: 0,
        submissionsCreated: 0,
        submissionsVersioned: 0,
        gradesPreserved: 0,
        gradesCreated: 0,
        enrollmentsCreated: 0,
        enrollmentsUpdated: 0,
        enrollmentsArchived: 0
      },
      errors: [],
      processingTime: 0
    };

    try {
      // Step 1: Transform snapshot to core entities
      logger.info("Transforming snapshot to core entities");
      const transformed = snapshotToCore(snapshot);

      // Step 2: Process teacher
      await this.processTeacher(transformed.teacher, snapshot.teacher.email);

      // Step 3: Get existing data for merge
      logger.info("Fetching existing data for merge");
      const existing = await this.getExistingData(transformed);

      // Step 4: Merge with existing data
      logger.info("Merging with existing data");
      const mergeResult = mergeSnapshotWithExisting(transformed, existing);

      // Step 5: Process creates
      logger.info("Creating new entities");
      await this.processCreates(mergeResult, result);

      // Step 6: Process updates
      logger.info("Updating existing entities");
      await this.processUpdates(mergeResult, result);

      // Step 7: Process archives
      logger.info("Archiving removed entities");
      await this.processArchives(mergeResult, result);

      // Step 8: Extract and process grades from submissions
      logger.info("Processing grades from submissions");
      await this.processGrades(snapshot, result);

      // Step 9: Finalize teacher associations
      logger.info("Finalizing teacher associations");
      await this.finalizeTeacherAssociations(snapshot.teacher.email);

      // Step 10: Update denormalized counts
      logger.info("Updating denormalized counts");
      await this.updateCounts(transformed.classrooms);

      result.processingTime = Date.now() - startTime;
      logger.info(`Snapshot processing completed in ${result.processingTime}ms`, result.stats);

    } catch (error) {
      logger.error("Error processing snapshot", error);
      result.success = false;
      result.errors.push({
        entity: "snapshot",
        id: "global",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }

    return result;
  }

  /**
   * Process teacher entity
   */
  private async processTeacher(teacherInput: any, email: string): Promise<void> {
    const existingTeacher = await this.repository.getTeacherByEmail(email);
    
    if (!existingTeacher) {
      await this.repository.createTeacher(teacherInput);
    } else {
      await this.repository.updateTeacher(existingTeacher.id, {
        ...teacherInput,
        totalClassrooms: teacherInput.classroomIds.length
      });
    }
  }

  /**
   * Get existing data for merge comparison
   */
  private async getExistingData(transformed: ReturnType<typeof snapshotToCore>) {
    const classroomIds = transformed.classrooms.map(c => 
      StableIdGenerator.classroom(c.externalId!)
    );

    // Fetch all existing data in parallel
    const [classrooms, assignments, submissions, enrollments, grades] = await Promise.all([
      this.getExistingClassrooms(classroomIds),
      this.getExistingAssignments(classroomIds),
      this.getExistingSubmissions(classroomIds),
      this.getExistingEnrollments(classroomIds),
      this.getExistingGrades(classroomIds)
    ]);

    return {
      classrooms,
      assignments,
      submissions,
      enrollments,
      grades
    };
  }

  /**
   * Get existing classrooms
   */
  private async getExistingClassrooms(classroomIds: string[]): Promise<Classroom[]> {
    const classrooms: Classroom[] = [];
    
    for (const id of classroomIds) {
      const classroom = await this.repository.getClassroom(id);
      if (classroom) {
        classrooms.push(classroom);
      }
    }

    return classrooms;
  }

  /**
   * Get existing assignments for classrooms
   */
  private async getExistingAssignments(classroomIds: string[]): Promise<Assignment[]> {
    const assignments: Assignment[] = [];
    
    for (const classroomId of classroomIds) {
      const classroomAssignments = await this.repository.getAssignmentsByClassroom(classroomId);
      assignments.push(...classroomAssignments);
    }

    return assignments;
  }

  /**
   * Get existing submissions for classrooms
   */
  private async getExistingSubmissions(classroomIds: string[]): Promise<Submission[]> {
    const submissions: Submission[] = [];
    
    for (const classroomId of classroomIds) {
      const ungradedSubmissions = await this.repository.getUngradedSubmissions(classroomId);
      submissions.push(...ungradedSubmissions);
    }

    return submissions;
  }

  /**
   * Get existing enrollments for classrooms
   */
  private async getExistingEnrollments(classroomIds: string[]): Promise<StudentEnrollment[]> {
    const enrollments: StudentEnrollment[] = [];
    
    for (const classroomId of classroomIds) {
      const classroomEnrollments = await this.repository.getEnrollmentsByClassroom(classroomId);
      enrollments.push(...classroomEnrollments);
    }

    return enrollments;
  }

  /**
   * Get existing grades for classrooms
   */
  private async getExistingGrades(classroomIds: string[]): Promise<Grade[]> {
    const grades: Grade[] = [];
    
    for (const classroomId of classroomIds) {
      const classroomGrades = await this.repository.getGradesByClassroom(classroomId);
      grades.push(...classroomGrades);
    }

    return grades;
  }

  /**
   * Process entity creates using batch operations for performance
   */
  private async processCreates(
    mergeResult: ReturnType<typeof mergeSnapshotWithExisting>,
    result: ProcessingResult
  ): Promise<void> {
    try {
      // Process all creates in parallel using batch operations
      await Promise.all([
        // Batch create classrooms (cast as the id is guaranteed to exist after merge)
        this.repository.batchCreate("classrooms", mergeResult.toCreate.classrooms as any[])
          .then(() => {
            result.stats.classroomsCreated = mergeResult.toCreate.classrooms.length;
          }),
        
        // Batch create assignments
        this.repository.batchCreate("assignments", mergeResult.toCreate.assignments as any[])
          .then(() => {
            result.stats.assignmentsCreated = mergeResult.toCreate.assignments.length;
          }),
        
        // Batch create submissions
        this.repository.batchCreate("submissions", mergeResult.toCreate.submissions as any[])
          .then(() => {
            const versioned = mergeResult.toCreate.submissions.filter(s => s.version > 1);
            result.stats.submissionsVersioned = versioned.length;
            result.stats.submissionsCreated = mergeResult.toCreate.submissions.length - versioned.length;
          }),
        
        // Batch create enrollments
        this.repository.batchCreate("enrollments", mergeResult.toCreate.enrollments as any[])
          .then(() => {
            result.stats.enrollmentsCreated = mergeResult.toCreate.enrollments.length;
          })
      ]);
      
      logger.info("Batch creates completed", {
        classrooms: result.stats.classroomsCreated,
        assignments: result.stats.assignmentsCreated,
        submissions: result.stats.submissionsCreated + result.stats.submissionsVersioned,
        enrollments: result.stats.enrollmentsCreated
      });
    } catch (error) {
      logger.error("Batch create failed", error);
      this.logError(result, "batch-create", "multiple", error);
    }
  }

  /**
   * Process entity updates using batch operations for performance
   */
  private async processUpdates(
    mergeResult: ReturnType<typeof mergeSnapshotWithExisting>,
    result: ProcessingResult
  ): Promise<void> {
    try {
      // Prepare batch updates
      const classroomUpdates = mergeResult.toUpdate.classrooms.map(c => ({ id: c.id, data: c }));
      const assignmentUpdates = mergeResult.toUpdate.assignments.map(a => ({ id: a.id, data: a }));
      const submissionUpdates = mergeResult.toUpdate.submissions.map(s => ({ id: s.id, data: s }));
      const enrollmentUpdates = mergeResult.toUpdate.enrollments.map(e => ({ id: e.id, data: e }));
      
      // Process all updates in parallel using batch operations
      await Promise.all([
        // Batch update classrooms
        this.repository.batchUpdate("classrooms", classroomUpdates)
          .then(() => {
            result.stats.classroomsUpdated = classroomUpdates.length;
          }),
        
        // Batch update assignments
        this.repository.batchUpdate("assignments", assignmentUpdates)
          .then(() => {
            result.stats.assignmentsUpdated = assignmentUpdates.length;
          }),
        
        // Batch update submissions
        this.repository.batchUpdate("submissions", submissionUpdates),
        
        // Batch update enrollments
        this.repository.batchUpdate("enrollments", enrollmentUpdates)
          .then(() => {
            result.stats.enrollmentsUpdated = enrollmentUpdates.length;
          })
      ]);
      
      logger.info("Batch updates completed", {
        classrooms: result.stats.classroomsUpdated,
        assignments: result.stats.assignmentsUpdated,
        submissions: submissionUpdates.length,
        enrollments: result.stats.enrollmentsUpdated
      });
    } catch (error) {
      logger.error("Batch update failed", error);
      this.logError(result, "batch-update", "multiple", error);
    }
  }

  /**
   * Process entity archives using batch operations
   */
  private async processArchives(
    mergeResult: ReturnType<typeof mergeSnapshotWithExisting>,
    result: ProcessingResult
  ): Promise<void> {
    try {
      if (mergeResult.toArchive.enrollmentIds.length > 0) {
        // Batch archive enrollments by updating their status
        const archiveUpdates = mergeResult.toArchive.enrollmentIds.map(id => ({
          id,
          data: { status: "removed" as const } as any
        }));
        
        await this.repository.batchUpdate("enrollments", archiveUpdates);
        result.stats.enrollmentsArchived = archiveUpdates.length;
        
        logger.info("Batch archives completed", {
          enrollments: result.stats.enrollmentsArchived
        });
      }
    } catch (error) {
      logger.error("Batch archive failed", error);
      this.logError(result, "batch-archive", "multiple", error);
    }
  }

  /**
   * Process grades from snapshot submissions
   */
  private async processGrades(
    snapshot: ClassroomSnapshot,
    result: ProcessingResult
  ): Promise<void> {
    const gradeInputs: Array<{
      gradeInput: any;
      submission: Submission;
    }> = [];

    // Extract grades from submissions
    for (const classroom of snapshot.classrooms) {
      const classroomId = StableIdGenerator.classroom(classroom.id);
      
      for (const submissionSnapshot of classroom.submissions) {
        if (submissionSnapshot.grade) {
          const gradeInput = extractGradeFromSubmission(submissionSnapshot, classroomId);
          if (gradeInput) {
            const submissionId = StableIdGenerator.submission(
              classroomId,
              StableIdGenerator.assignment(classroomId, submissionSnapshot.assignmentId),
              StableIdGenerator.student(submissionSnapshot.studentEmail)
            );
            
            const submission = await this.repository.getSubmission(submissionId);
            if (submission) {
              gradeInputs.push({ gradeInput, submission });
            }
          }
        }
      }
    }

    // Process grades with versioning
    if (gradeInputs.length > 0) {
      const gradeResult = await this.gradeService.batchProcessGrades(gradeInputs);
      
      result.stats.gradesCreated = gradeResult.created.length;
      result.stats.gradesPreserved = gradeResult.conflicts.filter(
        c => c.resolution === "keep_existing"
      ).length;
      
      // Log conflicts
      for (const conflict of gradeResult.conflicts) {
        if (conflict.resolution === "keep_existing") {
          logger.info(`Grade preserved: ${conflict.reason}`, {
            submissionId: conflict.submissionId
          });
        }
      }
    }
  }

  /**
   * Finalize teacher associations after all classrooms have been created
   * Updates the teacher's classroomIds array and counts with actual created classroom data
   */
  private async finalizeTeacherAssociations(teacherEmail: string): Promise<void> {
    try {
      logger.info("Starting teacher association finalization", { teacherEmail });

      // Get the teacher record
      const teacher = await this.repository.getTeacherByEmail(teacherEmail);
      if (!teacher) {
        logger.warn("Teacher not found during finalization", { teacherEmail });
        return;
      }

      // Get all classrooms owned by this teacher
      const classrooms = await this.repository.getClassroomsByTeacher(teacher.email);
      
      // Extract classroom IDs and calculate total students
      const classroomIds = classrooms.map(c => c.id);
      const totalStudents = classrooms.reduce((sum, classroom) => 
        sum + (classroom.studentCount || 0), 0
      );

      // Check if update is needed
      const existingClassroomIds = teacher.classroomIds || [];
      const sortedExisting = [...existingClassroomIds].sort();
      const sortedNew = [...classroomIds].sort();

      const needsUpdate = 
        JSON.stringify(sortedExisting) !== JSON.stringify(sortedNew) ||
        teacher.totalClassrooms !== classroomIds.length ||
        teacher.totalStudents !== totalStudents;

      if (needsUpdate) {
        await this.repository.updateTeacher(teacher.id, {
          classroomIds,
          totalClassrooms: classroomIds.length,
          totalStudents
        });

        logger.info("Teacher associations finalized", {
          teacherEmail,
          teacherId: teacher.id,
          classroomCount: classroomIds.length,
          totalStudents,
          classroomIds
        });
      } else {
        logger.info("Teacher associations already up to date", {
          teacherEmail,
          classroomCount: classroomIds.length,
          totalStudents
        });
      }
    } catch (error) {
      logger.error("Error finalizing teacher associations", {
        teacherEmail,
        error: error instanceof Error ? error.message : "Unknown error"
      });
      // Don't throw - this shouldn't fail the entire import
    }
  }

  /**
   * Update denormalized counts for classrooms using parallel operations
   */
  private async updateCounts(classrooms: any[]): Promise<void> {
    try {
      // Update all classroom counts in parallel
      await Promise.all(
        classrooms.map(classroom => {
          const classroomId = StableIdGenerator.classroom(classroom.externalId!);
          return this.repository.updateCounts(classroomId)
            .catch(error => {
              logger.error(`Failed to update counts for classroom ${classroomId}`, error);
            });
        })
      );
      
      logger.info("Classroom counts updated", {
        classrooms: classrooms.length
      });
    } catch (error) {
      logger.error("Failed to update classroom counts", error);
    }
  }

  /**
   * Log processing error
   */
  private logError(
    result: ProcessingResult,
    entity: string,
    id: string,
    error: unknown
  ): void {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`Error processing ${entity} ${id}`, error);
    result.errors.push({ entity, id, error: errorMessage });
  }
}