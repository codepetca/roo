export interface Classroom {
  id: string;
  name: string;
  courseCode: string;
  teacherId: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface Assignment {
  id: string;
  classroomId: string;
  title: string;
  description: string;
  dueDate: FirebaseFirestore.Timestamp;
  maxPoints: number;
  gradingRubric: {
    enabled: boolean;
    criteria: string[];
    promptTemplate: string;
  };
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  submittedAt: FirebaseFirestore.Timestamp;
  documentUrl: string;
  status: 'pending' | 'grading' | 'graded' | 'error';
  content?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
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
  gradedBy: 'ai' | 'manual';
  gradedAt: FirebaseFirestore.Timestamp;
  postedToClassroom: boolean;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}