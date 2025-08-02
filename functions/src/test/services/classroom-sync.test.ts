/**
 * Tests for ClassroomSyncService
 * Location: functions/src/test/services/classroom-sync.test.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ClassroomSyncService, type ExtractedClassroom, type ExtractedStudent } from "../../services/classroom-sync";
import { type SheetSubmission } from "../schemas/source";
import { db, getCurrentTimestamp } from "../../config/firebase";

// Mock Firebase dependencies using the same pattern as other tests
vi.mock("../../config/firebase", () => ({
  db: {
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => ({
            get: vi.fn()
          }))
        })),
        limit: vi.fn(() => ({
          get: vi.fn()
        })),
        get: vi.fn()
      })),
      add: vi.fn(),
      doc: vi.fn(() => ({
        get: vi.fn(),
        update: vi.fn(),
        set: vi.fn()
      }))
    }))
  },
  getCurrentTimestamp: vi.fn(() => ({
    _seconds: Math.floor(Date.now() / 1000),
    _nanoseconds: 0
  }))
}));

vi.mock("firebase-functions", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe("ClassroomSyncService", () => {
  let service: ClassroomSyncService;
  let mockDb: any;

  beforeEach(() => {
    service = new ClassroomSyncService();
    mockDb = db as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("extractClassroomsAndStudents", () => {
    it("should extract classrooms and students from submissions", () => {
      const submissions: SheetSubmission[] = [
        {
          id: "sub1",
          assignmentTitle: "Karel Assignment 1",
          courseId: "CS101",
          studentFirstName: "John",
          studentLastName: "Doe",
          studentEmail: "john.doe@school.edu",
          submissionText: "Some code here",
          submissionDate: "2024-01-15",
          gradingStatus: "pending",
          maxPoints: 100,
          sourceSheetName: "Test Sheet",
          assignmentDescription: "Description",
          lastProcessed: "",
          sourceFileId: "",
          isQuiz: false,
          formId: ""
        },
        {
          id: "sub2",
          assignmentTitle: "Karel Assignment 2",
          courseId: "CS101",
          studentFirstName: "Jane",
          studentLastName: "Smith",
          studentEmail: "jane.smith@school.edu",
          submissionText: "More code here",
          submissionDate: "2024-01-16",
          gradingStatus: "pending",
          maxPoints: 100,
          sourceSheetName: "Test Sheet",
          assignmentDescription: "Description",
          lastProcessed: "",
          sourceFileId: "",
          isQuiz: false,
          formId: ""
        },
        {
          id: "sub3",
          assignmentTitle: "Math Quiz 1",
          courseId: "MATH201",
          studentFirstName: "John",
          studentLastName: "Doe",
          studentEmail: "john.doe@school.edu",
          submissionText: "Quiz answers",
          submissionDate: "2024-01-17",
          gradingStatus: "pending",
          maxPoints: 50,
          sourceSheetName: "Test Sheet",
          assignmentDescription: "Description",
          lastProcessed: "",
          sourceFileId: "",
          isQuiz: true,
          formId: "form123"
        }
      ];

      const result = service.extractClassroomsAndStudents(submissions);

      // Check classrooms
      expect(result.classrooms.size).toBe(2);
      expect(result.classrooms.has("CS101")).toBe(true);
      expect(result.classrooms.has("MATH201")).toBe(true);

      const cs101Classroom = result.classrooms.get("CS101")!;
      expect(cs101Classroom.courseCode).toBe("CS101");
      expect(cs101Classroom.name).toBe("CS101 - Karel");
      expect(cs101Classroom.studentEmails).toEqual(["john.doe@school.edu", "jane.smith@school.edu"]);

      const math201Classroom = result.classrooms.get("MATH201")!;
      expect(math201Classroom.courseCode).toBe("MATH201");
      expect(math201Classroom.name).toBe("MATH201 - Math");
      expect(math201Classroom.studentEmails).toEqual(["john.doe@school.edu"]);

      // Check students
      expect(result.students.size).toBe(2);
      expect(result.students.has("john.doe@school.edu")).toBe(true);
      expect(result.students.has("jane.smith@school.edu")).toBe(true);

      const johnStudent = result.students.get("john.doe@school.edu")!;
      expect(johnStudent.email).toBe("john.doe@school.edu");
      expect(johnStudent.displayName).toBe("John Doe");
      expect(johnStudent.courseIds).toEqual(["CS101", "MATH201"]);

      const janeStudent = result.students.get("jane.smith@school.edu")!;
      expect(janeStudent.email).toBe("jane.smith@school.edu");
      expect(janeStudent.displayName).toBe("Jane Smith");
      expect(janeStudent.courseIds).toEqual(["CS101"]);
    });

    it("should skip submissions with missing required data", () => {
      const submissions: SheetSubmission[] = [
        {
          id: "sub1",
          assignmentTitle: "Karel Assignment 1",
          courseId: "", // Missing course ID
          studentFirstName: "John",
          studentLastName: "Doe",
          studentEmail: "john.doe@school.edu",
          submissionText: "Some code here",
          submissionDate: "2024-01-15",
          gradingStatus: "pending",
          maxPoints: 100,
          sourceSheetName: "Test Sheet",
          assignmentDescription: "Description",
          lastProcessed: "",
          sourceFileId: "",
          isQuiz: false,
          formId: ""
        },
        {
          id: "sub2",
          assignmentTitle: "Karel Assignment 2",
          courseId: "CS101",
          studentFirstName: "", // Missing first name
          studentLastName: "Smith",
          studentEmail: "jane.smith@school.edu",
          submissionText: "More code here",
          submissionDate: "2024-01-16",
          gradingStatus: "pending",
          maxPoints: 100,
          sourceSheetName: "Test Sheet",
          assignmentDescription: "Description",
          lastProcessed: "",
          sourceFileId: "",
          isQuiz: false,
          formId: ""
        }
      ];

      const result = service.extractClassroomsAndStudents(submissions);

      expect(result.classrooms.size).toBe(0);
      expect(result.students.size).toBe(0);
    });

    it("should handle duplicate students in same classroom", () => {
      const submissions: SheetSubmission[] = [
        {
          id: "sub1",
          assignmentTitle: "Karel Assignment 1",
          courseId: "CS101",
          studentFirstName: "John",
          studentLastName: "Doe",
          studentEmail: "john.doe@school.edu",
          submissionText: "Some code here",
          submissionDate: "2024-01-15",
          gradingStatus: "pending",
          maxPoints: 100,
          sourceSheetName: "Test Sheet",
          assignmentDescription: "Description",
          lastProcessed: "",
          sourceFileId: "",
          isQuiz: false,
          formId: ""
        },
        {
          id: "sub2",
          assignmentTitle: "Karel Assignment 2",
          courseId: "CS101",
          studentFirstName: "John",
          studentLastName: "Doe",
          studentEmail: "john.doe@school.edu", // Same student
          submissionText: "More code here",
          submissionDate: "2024-01-16",
          gradingStatus: "pending",
          maxPoints: 100,
          sourceSheetName: "Test Sheet",
          assignmentDescription: "Description",
          lastProcessed: "",
          sourceFileId: "",
          isQuiz: false,
          formId: ""
        }
      ];

      const result = service.extractClassroomsAndStudents(submissions);

      expect(result.classrooms.size).toBe(1);
      expect(result.students.size).toBe(1);

      const classroom = result.classrooms.get("CS101")!;
      expect(classroom.studentEmails).toEqual(["john.doe@school.edu"]); // No duplicates

      const student = result.students.get("john.doe@school.edu")!;
      expect(student.courseIds).toEqual(["CS101"]); // No duplicates
    });
  });

  describe("syncClassroom", () => {
    it("should create new classroom when none exists", async () => {
      const teacherId = "teacher123";
      const extractedClassroom: ExtractedClassroom = {
        courseCode: "CS101",
        name: "CS101 - Karel",
        studentEmails: ["john.doe@school.edu", "jane.smith@school.edu"]
      };
      const studentIdsByEmail = new Map([
        ["john.doe@school.edu", "student1"],
        ["jane.smith@school.edu", "student2"]
      ]);

      // Mock empty classroom query result
      const mockGet = vi.fn().mockResolvedValue({ empty: true, docs: [] });
      const mockAdd = vi.fn().mockResolvedValue({ id: "classroom123" });
      
      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: mockGet
            })
          })
        }),
        add: mockAdd
      });

      const result = await service.syncClassroom(teacherId, extractedClassroom, studentIdsByEmail);

      expect(result.created).toBe(true);
      expect(result.updated).toBe(false);
      expect(result.classroomId).toBe("classroom123");
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "CS101 - Karel",
          courseCode: "CS101",
          teacherId: "teacher123",
          studentIds: ["student1", "student2"],
          isActive: true
        })
      );
    });

    it("should update existing classroom", async () => {
      const teacherId = "teacher123";
      const extractedClassroom: ExtractedClassroom = {
        courseCode: "CS101",
        name: "CS101 - Karel",
        studentEmails: ["john.doe@school.edu", "jane.smith@school.edu"]
      };
      const studentIdsByEmail = new Map([
        ["john.doe@school.edu", "student1"],
        ["jane.smith@school.edu", "student2"]
      ]);

      // Mock existing classroom
      const mockDoc = {
        id: "existing-classroom",
        data: () => ({
          studentIds: ["student1"] // Existing student
        })
      };
      const mockGet = vi.fn().mockResolvedValue({ 
        empty: false, 
        docs: [mockDoc] 
      });
      const mockUpdate = vi.fn().mockResolvedValue({});
      
      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: mockGet
            })
          })
        }),
        doc: vi.fn().mockReturnValue({
          update: mockUpdate
        })
      });

      const result = await service.syncClassroom(teacherId, extractedClassroom, studentIdsByEmail);

      expect(result.created).toBe(false);
      expect(result.updated).toBe(true);
      expect(result.classroomId).toBe("existing-classroom");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          studentIds: ["student1", "student2"], // Merged student IDs
          isActive: true
        })
      );
    });
  });

  describe("syncStudent", () => {
    it("should create new student when none exists", async () => {
      const extractedStudent: ExtractedStudent = {
        email: "john.doe@school.edu",
        firstName: "John",
        lastName: "Doe",
        displayName: "John Doe",
        courseIds: ["CS101"]
      };

      // Mock empty student query result
      const mockGet = vi.fn().mockResolvedValue({ empty: true, docs: [] });
      const mockAdd = vi.fn().mockResolvedValue({ id: "student123" });
      
      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: mockGet
          })
        }),
        add: mockAdd
      });

      const result = await service.syncStudent(extractedStudent);

      expect(result.created).toBe(true);
      expect(result.updated).toBe(false);
      expect(result.userId).toBe("student123");
      expect(mockAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "john.doe@school.edu",
          displayName: "John Doe",
          role: "student",
          classroomIds: [],
          isActive: true
        })
      );
    });

    it("should update existing student", async () => {
      const extractedStudent: ExtractedStudent = {
        email: "john.doe@school.edu",
        firstName: "John",
        lastName: "Doe",
        displayName: "John Doe",
        courseIds: ["CS101"]
      };

      // Mock existing student
      const mockDoc = {
        id: "existing-student",
        data: () => ({
          role: "student",
          displayName: "Old Name"
        })
      };
      const mockGet = vi.fn().mockResolvedValue({ 
        empty: false, 
        docs: [mockDoc] 
      });
      const mockUpdate = vi.fn().mockResolvedValue({});
      
      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: mockGet
          })
        }),
        doc: vi.fn().mockReturnValue({
          update: mockUpdate
        })
      });

      const result = await service.syncStudent(extractedStudent);

      expect(result.created).toBe(false);
      expect(result.updated).toBe(true);
      expect(result.userId).toBe("existing-student");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          displayName: "John Doe",
          isActive: true
        })
      );
    });

    it("should not update existing non-student user", async () => {
      const extractedStudent: ExtractedStudent = {
        email: "teacher@school.edu",
        firstName: "Teacher",
        lastName: "Name",
        displayName: "Teacher Name",
        courseIds: ["CS101"]
      };

      // Mock existing teacher
      const mockDoc = {
        id: "existing-teacher",
        data: () => ({
          role: "teacher",
          displayName: "Teacher Name"
        })
      };
      const mockGet = vi.fn().mockResolvedValue({ 
        empty: false, 
        docs: [mockDoc] 
      });
      
      mockDb.collection.mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            get: mockGet
          })
        })
      });

      const result = await service.syncStudent(extractedStudent);

      expect(result.created).toBe(false);
      expect(result.updated).toBe(false);
      expect(result.userId).toBe("existing-teacher");
    });
  });

  describe("syncClassroomsFromSheets", () => {
    it("should handle empty submissions gracefully", async () => {
      const teacherId = "teacher123";
      const spreadsheetId = "sheet123";

      // Mock empty submissions from sheets service
      vi.doMock("../../services/sheets", () => ({
        createSheetsService: vi.fn().mockResolvedValue({
          getAllSubmissions: vi.fn().mockResolvedValue([])
        })
      }));

      const result = await service.syncClassroomsFromSheets(teacherId, spreadsheetId);

      expect(result.success).toBe(true);
      expect(result.classroomsCreated).toBe(0);
      expect(result.classroomsUpdated).toBe(0);
      expect(result.studentsCreated).toBe(0);
      expect(result.studentsUpdated).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it("should handle sheets service errors", async () => {
      const teacherId = "teacher123";
      const spreadsheetId = "sheet123";

      // Mock sheets service that throws error
      vi.doMock("../../services/sheets", () => ({
        createSheetsService: vi.fn().mockRejectedValue(new Error("Sheets access denied"))
      }));

      const result = await service.syncClassroomsFromSheets(teacherId, spreadsheetId);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Sheets access denied");
    });
  });
});