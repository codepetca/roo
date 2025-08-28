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
  async processSnapshot(snapshot: ClassroomSnapshot, authenticatedUserEmail?: string): Promise<ProcessingResult> {
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
      // Step 1: Transform snapshot to core entities with detailed logging
      logger.info("TRANSFORM DEBUG: Starting snapshot to core transformation", {
        snapshotKeys: Object.keys(snapshot),
        classroomCount: snapshot.classrooms.length,
        teacherEmail: snapshot.teacher.email
      });
      
      const transformed = snapshotToCore(snapshot);
      logger.info("TRANSFORM DEBUG: Core transformation successful", {
        transformedKeys: Object.keys(transformed),
        classroomCount: transformed.classrooms.length,
        assignmentCount: transformed.assignments.length,
        submissionCount: transformed.submissions.length,
        enrollmentCount: transformed.enrollments.length
      });

      // Step 2: Process teacher
      console.log(`[SNAPSHOT DEBUG] About to process teacher: ${snapshot.teacher.email}`);
      await this.processTeacher(transformed.teacher, snapshot.teacher.email);
      console.log(`[SNAPSHOT DEBUG] Teacher processing completed`);

      // Step 3: Get existing data for merge
      console.log(`[SNAPSHOT DEBUG] Starting to fetch existing data for merge`);
      logger.info("Fetching existing data for merge");
      const existing = await this.getExistingData(transformed);
      console.log(`[SNAPSHOT DEBUG] Existing data fetched successfully`);

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
      await this.finalizeTeacherAssociations(authenticatedUserEmail || snapshot.teacher.email);

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
    // Skip teacher creation - users are now created through authentication flow
    // Just update existing teacher data if found
    const existingTeacher = await this.repository.getTeacherByEmail(email);
    
    if (existingTeacher) {
      await this.repository.updateTeacher(existingTeacher.id, {
        ...teacherInput,
        totalClassrooms: teacherInput.classroomIds.length
      });
      logger.info("Updated existing teacher profile", { teacherEmail: email });
    } else {
      logger.info("Teacher profile not found, skipping teacher processing", { teacherEmail: email });
      // Teacher profile should already exist from authentication flow
      // If it doesn't exist, it will be handled by other endpoints
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
    
    console.log(`[SNAPSHOT DEBUG] Loading assignments for ${classroomIds.length} classrooms:`, classroomIds);
    
    for (const classroomId of classroomIds) {
      const classroomAssignments = await this.repository.getAssignmentsByClassroom(classroomId);
      console.log(`[SNAPSHOT DEBUG] Classroom ${classroomId}: found ${classroomAssignments.length} assignments`);
      assignments.push(...classroomAssignments);
    }

    console.log(`[SNAPSHOT DEBUG] Total existing assignments loaded: ${assignments.length}`);
    console.log(`[SNAPSHOT DEBUG] Sample assignment externalIds:`, 
      assignments.slice(0, 5).map(a => a.externalId));

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
      console.log(`[PROCESS CREATES] Starting batch creates`);
      console.log(`[PROCESS CREATES] Submissions to create: ${mergeResult.toCreate.submissions.length}`);
      console.log(`[PROCESS CREATES] First submission exists:`, !!mergeResult.toCreate.submissions[0]);
      
      if (mergeResult.toCreate.submissions.length > 0) {
        console.log(`[PROCESS CREATES] First submission sample:`, {
          id: mergeResult.toCreate.submissions[0]?.id,
          studentId: mergeResult.toCreate.submissions[0]?.studentId,
          keysCount: Object.keys(mergeResult.toCreate.submissions[0] || {}).length
        });
      }
      
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
            console.log(`[STATS DEBUG] Assignments to CREATE: ${mergeResult.toCreate.assignments.length}`);
            console.log(`[STATS DEBUG] Sample assignments being created:`, 
              mergeResult.toCreate.assignments.slice(0, 3).map(a => ({ 
                externalId: a.externalId, 
                title: a.title 
              })));
            result.stats.assignmentsCreated = mergeResult.toCreate.assignments.length;
          }),
        
        // Batch create submissions
        (() => {
          try {
            console.log(`[PRE-BATCH DEBUG] About to create ${mergeResult.toCreate.submissions.length} submissions`);
            
            // Debug first few submissions for empty keys
            mergeResult.toCreate.submissions.slice(0, 3).forEach((submission, index) => {
              try {
                const keys = Object.keys(submission);
                const emptyKeys = keys.filter(key => key === '' || key === null || key === undefined);
                console.log(`[PRE-BATCH DEBUG] Submission ${index} keys:`, keys);
                if (emptyKeys.length > 0) {
                  console.error(`[PRE-BATCH DEBUG] Found empty keys in submission ${index}:`, emptyKeys);
                  console.error(`[PRE-BATCH DEBUG] Full submission data:`, JSON.stringify(submission, null, 2));
                }
              } catch (inspectionError) {
                console.error(`[PRE-BATCH DEBUG] Error inspecting submission ${index}:`, inspectionError);
              }
            });
            
            console.log(`[PRE-BATCH DEBUG] Pre-inspection completed, calling batchCreate`);
            return this.repository.batchCreate("submissions", mergeResult.toCreate.submissions as any[]);
          } catch (error) {
            console.error(`[PRE-BATCH DEBUG] Error during pre-batch setup:`, error);
            throw error;
          }
        })()
          .then(() => {
            console.log(`[STATS DEBUG] Submissions batch create completed successfully`);
            console.log(`[STATS DEBUG] Total submissions created: ${mergeResult.toCreate.submissions.length}`);
            console.log(`[STATS DEBUG] Sample submission IDs:`, 
              mergeResult.toCreate.submissions.slice(0, 5).map(s => s.id));
            
            const versioned = mergeResult.toCreate.submissions.filter(s => s.version > 1);
            result.stats.submissionsVersioned = versioned.length;
            result.stats.submissionsCreated = mergeResult.toCreate.submissions.length - versioned.length;
            
            console.log(`[STATS DEBUG] Final stats - Created: ${result.stats.submissionsCreated}, Versioned: ${result.stats.submissionsVersioned}`);
          })
          .catch(error => {
            console.error(`[STATS DEBUG] Submissions batch create FAILED:`, error);
            throw error;
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
            console.log(`[STATS DEBUG] Assignments to UPDATE: ${assignmentUpdates.length}`);
            console.log(`[STATS DEBUG] Sample assignments being updated:`, 
              assignmentUpdates.slice(0, 3).map(u => ({ 
                id: u.id, 
                externalId: u.data.externalId,
                title: u.data.title 
              })));
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
              submissionSnapshot.assignmentId,
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