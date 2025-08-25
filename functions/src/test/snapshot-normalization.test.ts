import { 
  normalizeSnapshotForComparison, 
  areSnapshotsContentEqual,
  createStableJsonString 
} from "@shared/utils/snapshot-normalization";

/**
 * Tests for snapshot normalization and comparison utilities
 * Location: functions/src/test/snapshot-normalization.test.ts
 */

describe('Snapshot Normalization', () => {
  const baseSnapshot = {
    snapshotMetadata: {
      fetchedAt: "2025-08-15T21:56:00.687Z",
      expiresAt: "2025-08-15T22:26:00.687Z",
      source: "google-classroom",
      version: "1.0.0"
    },
    teacher: {
      name: "Test Teacher",
      email: "teacher@test.com"
    },
    classrooms: [
      {
        id: "classroom-1",
        name: "Test Classroom",
        submissions: [
          {
            id: "sub-1",
            studentEmail: "student@test.com",
            studentWork: "Test submission",
            updatedAt: "2025-08-15T21:56:00.687Z",
            submittedAt: "2025-08-15T20:00:00.000Z"
          }
        ]
      }
    ]
  };

  it('should remove volatile timestamp fields from snapshot metadata', () => {
    const normalized = normalizeSnapshotForComparison(baseSnapshot as any);
    
    expect(normalized.snapshotMetadata).toBeDefined();
    expect((normalized.snapshotMetadata as any).fetchedAt).toBeUndefined();
    expect((normalized.snapshotMetadata as any).expiresAt).toBeUndefined();
    expect((normalized.snapshotMetadata as any).source).toBe("google-classroom");
    expect((normalized.snapshotMetadata as any).version).toBe("1.0.0");
  });

  it('should remove updatedAt from submissions but preserve submittedAt', () => {
    const normalized = normalizeSnapshotForComparison(baseSnapshot as any);
    
    const submission = normalized.classrooms[0].submissions[0];
    expect((submission as any).updatedAt).toBeUndefined();
    expect((submission as any).submittedAt).toBe("2025-08-15T20:00:00.000Z");
    expect((submission as any).studentWork).toBe("Test submission");
  });

  it('should preserve all other data fields', () => {
    const normalized = normalizeSnapshotForComparison(baseSnapshot as any);
    
    expect(normalized.teacher.name).toBe("Test Teacher");
    expect(normalized.teacher.email).toBe("teacher@test.com");
    expect(normalized.classrooms[0].name).toBe("Test Classroom");
  });

  it('should detect identical snapshots after normalization', () => {
    const snapshot1 = JSON.parse(JSON.stringify(baseSnapshot));
    const snapshot2 = JSON.parse(JSON.stringify(baseSnapshot));
    
    // Change volatile timestamps
    snapshot2.snapshotMetadata.fetchedAt = "2025-08-16T10:00:00.000Z";
    snapshot2.snapshotMetadata.expiresAt = "2025-08-16T10:30:00.000Z";
    
    const areEqual = areSnapshotsContentEqual(snapshot1 as any, snapshot2 as any);
    expect(areEqual).toBe(true);
  });

  it('should detect different snapshots with content changes', () => {
    const snapshot1 = JSON.parse(JSON.stringify(baseSnapshot));
    const snapshot2 = JSON.parse(JSON.stringify(baseSnapshot));
    
    // Change actual content
    snapshot2.teacher.name = "Different Teacher";
    
    const areEqual = areSnapshotsContentEqual(snapshot1 as any, snapshot2 as any);
    expect(areEqual).toBe(false);
  });

  it('should create stable JSON strings regardless of field order', () => {
    const obj1 = { b: 2, a: 1, c: 3 };
    const obj2 = { a: 1, c: 3, b: 2 };
    
    const json1 = createStableJsonString(obj1);
    const json2 = createStableJsonString(obj2);
    
    expect(json1).toBe(json2);
  });

  it('should handle snapshots without volatile fields gracefully', () => {
    const minimalSnapshot = {
      teacher: { name: "Test", email: "test@test.com" },
      classrooms: []
    };
    
    const normalized = normalizeSnapshotForComparison(minimalSnapshot as any);
    expect(normalized.teacher.name).toBe("Test");
    expect(normalized.classrooms).toEqual([]);
  });
});