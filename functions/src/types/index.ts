import * as admin from "firebase-admin";

export interface Classroom {
  id: string;
  name: string;
  courseCode: string;
  teacherId: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface Assignment {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  dueDate: admin.firestore.Timestamp;
  maxPoints: number;
  gradingRubric: {
    enabled: boolean;
    criteria: string[];
    promptTemplate?: string;
  };
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  submittedAt: admin.firestore.Timestamp;
  documentUrl: string;
  status: "pending" | "grading" | "graded" | "error";
  content?: string;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface Grade {
  id: string;
  submissionId: string;
  assignmentId: string;
  studentId: string;
  score: number;
  maxScore: number;
  feedback: string;
  gradingDetails: {
    criteria: Array<{
      name: string;
      score: number;
      maxScore: number;
      feedback: string;
    }>;
  };
  gradedBy: "ai" | "manual";
  gradedAt: admin.firestore.Timestamp;
  postedToClassroom: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}