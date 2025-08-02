/**
 * AI Grading Types - TypeScript interfaces for AI grading services
 * @module functions/src/services/ai/types
 * @size ~50 lines (extracted from 402-line gemini.ts)
 * @exports GradingRequest, QuizGradingRequest, GradingResponse
 * @dependencies none (pure types)
 * @patterns Type definitions, interface segregation
 */

export interface GradingRequest {
  submissionId: string;
  assignmentId: string;
  title: string;
  description: string;
  maxPoints: number;
  criteria: string[];
  submission: string;
  promptTemplate?: string;
}

export interface QuizGradingRequest {
  submissionId: string;
  formId: string;
  studentAnswers: { [questionNumber: number]: string };
  answerKey: {
    formId: string;
    assignmentTitle: string;
    courseId: string;
    questions: Array<{
      questionNumber: number;
      questionText: string;
      questionType: string;
      points: number;
      correctAnswer: string;
      answerExplanation: string;
      gradingStrictness: "strict" | "standard" | "generous";
    }>;
    totalPoints: number;
  };
}

export interface GradingResponse {
  score: number;
  feedback: string;
  criteriaScores: Array<{
    name: string;
    score: number;
    maxScore: number;
    feedback: string;
  }>;
}

export interface QuizGradingResponse {
  totalScore: number;
  questionGrades: Array<{
    questionNumber: number;
    score: number;
    feedback: string;
    maxScore: number;
  }>;
}