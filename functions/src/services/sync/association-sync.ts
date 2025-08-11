/**
 * Association Sync - Update student-classroom and teacher-classroom associations in Firestore
 * @module functions/src/services/sync/association-sync
 * @size ~120 lines (extracted from 474-line classroom-sync.ts)
 * @exports updateStudentClassroomAssociations, updateTeacherClassroomAssociations
 * @dependencies firebase-admin/firestore, firebase-functions, ../config/firebase, ../schemas/domain
 * @patterns Database operations, batch updates, association management
 */

import { logger } from "firebase-functions";
import { db, getCurrentTimestamp } from "../../config/firebase";
import { type ClassroomDomain, type UserDomain } from "@shared/schemas/domain";

/**
 * Update student classroom associations based on current classroom memberships
 * @param classroomIdsByCourseCode - Map of course codes to classroom IDs
 */
export async function updateStudentClassroomAssociations(classroomIdsByCourseCode: Map<string, string>): Promise<void> {
  try {
    logger.info("Updating student-classroom associations");

    // Get all students
    const studentsSnapshot = await db.collection("users").where("role", "==", "student").get();

    for (const studentDoc of studentsSnapshot.docs) {
      try {
        const studentData = studentDoc.data() as UserDomain;

        // Get all classrooms this student belongs to
        const studentClassroomIds: string[] = [];

        for (const [courseCode, classroomId] of classroomIdsByCourseCode) {
          // Check if student is in this classroom
          const classroomDoc = await db.collection("classrooms").doc(classroomId).get();
          if (classroomDoc.exists) {
            const classroomData = classroomDoc.data() as ClassroomDomain;
            if (classroomData.studentIds?.includes(studentDoc.id)) {
              studentClassroomIds.push(classroomId);
            }
          }
        }

        // Update student's classroomIds if different
        const existingClassroomIds = studentData.classroomIds || [];
        const mergedClassroomIds = Array.from(new Set([...existingClassroomIds, ...studentClassroomIds]));

        if (JSON.stringify(existingClassroomIds.sort()) !== JSON.stringify(mergedClassroomIds.sort())) {
          await db.collection("users").doc(studentDoc.id).update({
            classroomIds: mergedClassroomIds,
            updatedAt: getCurrentTimestamp(),
          });

          logger.info("Updated student classroom associations", {
            studentId: studentDoc.id,
            email: studentData.email,
            classroomCount: mergedClassroomIds.length,
          });
        }
      } catch (error) {
        logger.error("Error updating student classroom associations", {
          studentId: studentDoc.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  } catch (error) {
    logger.error("Error in updateStudentClassroomAssociations", error);
    throw error;
  }
}

/**
 * Update teacher classroom associations based on current classroom ownership
 * @param teacherId - ID of the teacher to update
 * @param classroomIdsByCourseCode - Map of course codes to classroom IDs
 */
export async function updateTeacherClassroomAssociations(
  teacherId: string, 
  classroomIdsByCourseCode: Map<string, string>
): Promise<void> {
  try {
    logger.info("Updating teacher-classroom associations", { teacherId });

    // Get all classrooms owned by this teacher
    const teacherClassroomsSnapshot = await db
      .collection("classrooms")
      .where("teacherId", "==", teacherId)
      .get();

    const classroomIds: string[] = [];
    let totalStudents = 0;

    // Collect classroom IDs and count total students
    for (const classroomDoc of teacherClassroomsSnapshot.docs) {
      classroomIds.push(classroomDoc.id);
      
      const classroomData = classroomDoc.data() as ClassroomDomain;
      totalStudents += (classroomData.studentIds || []).length;
    }

    // Get the teacher document
    const teacherRef = db.collection("users").doc(teacherId);
    const teacherSnapshot = await teacherRef.get();

    if (teacherSnapshot.exists) {
      const teacherData = teacherSnapshot.data() as UserDomain;
      
      // Check if update is needed
      const existingClassroomIds = teacherData.classroomIds || [];
      const sortedExisting = [...existingClassroomIds].sort();
      const sortedNew = [...classroomIds].sort();

      const needsUpdate = 
        JSON.stringify(sortedExisting) !== JSON.stringify(sortedNew) ||
        ((teacherData as any).totalClassrooms || 0) !== classroomIds.length ||
        ((teacherData as any).totalStudents || 0) !== totalStudents;

      if (needsUpdate) {
        await teacherRef.update({
          classroomIds: classroomIds,
          totalClassrooms: classroomIds.length,
          totalStudents: totalStudents,
          updatedAt: getCurrentTimestamp(),
        });

        logger.info("Updated teacher classroom associations", {
          teacherId,
          email: teacherData.email,
          classroomCount: classroomIds.length,
          studentCount: totalStudents,
          classroomIds: classroomIds
        });
      } else {
        logger.info("Teacher classroom associations already up to date", {
          teacherId,
          classroomCount: classroomIds.length,
          studentCount: totalStudents
        });
      }
    } else {
      logger.warn("Teacher document not found", { teacherId });
    }
  } catch (error) {
    logger.error("Error updating teacher classroom associations", {
      teacherId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
