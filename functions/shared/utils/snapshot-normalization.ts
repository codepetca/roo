import { ClassroomSnapshot } from "../schemas/classroom-snapshot";

/**
 * Snapshot Normalization Utility
 * Location: functions/shared/utils/snapshot-normalization.ts
 * 
 * Normalizes classroom snapshots by removing volatile timestamp fields
 * that change on every export from Google Classroom, preventing false
 * positive differences in import comparison.
 */

/**
 * Normalize a classroom snapshot for consistent comparison
 * 
 * Removes fields that change on every export but don't represent
 * actual content changes:
 * - snapshotMetadata.fetchedAt (when snapshot was fetched)
 * - snapshotMetadata.expiresAt (expiration time)
 * - submissions[].updatedAt (Google internal updates)
 */
export function normalizeSnapshotForComparison(snapshot: ClassroomSnapshot): ClassroomSnapshot {
  // Deep clone to avoid modifying original
  const normalized = JSON.parse(JSON.stringify(snapshot)) as ClassroomSnapshot;
  
  // Remove volatile metadata timestamps
  if (normalized.snapshotMetadata) {
    delete (normalized.snapshotMetadata as any).fetchedAt;
    delete (normalized.snapshotMetadata as any).expiresAt;
  }
  
  // Remove updatedAt from submissions (can change due to Google internal updates)
  if (normalized.classrooms) {
    normalized.classrooms.forEach(classroom => {
      if (classroom.submissions) {
        classroom.submissions.forEach(submission => {
          delete (submission as any).updatedAt;
        });
      }
    });
  }
  
  return normalized;
}

/**
 * Create a stable JSON string for comparison
 * Sorts object keys to ensure consistent serialization regardless of field order
 */
export function createStableJsonString(obj: any): string {
  // Use a replacer function that sorts keys at each level
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const sortedObj: any = {};
      Object.keys(value).sort().forEach(k => {
        sortedObj[k] = value[k];
      });
      return sortedObj;
    }
    return value;
  });
}

/**
 * Compare two normalized snapshots for content equality
 * Returns true if snapshots contain identical content (ignoring volatile timestamps)
 */
export function areSnapshotsContentEqual(
  snapshot1: ClassroomSnapshot, 
  snapshot2: ClassroomSnapshot
): boolean {
  const normalized1 = normalizeSnapshotForComparison(snapshot1);
  const normalized2 = normalizeSnapshotForComparison(snapshot2);
  
  const json1 = createStableJsonString(normalized1);
  const json2 = createStableJsonString(normalized2);
  
  return json1 === json2;
}