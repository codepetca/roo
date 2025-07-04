import type { Tables, TablesInsert, TablesUpdate } from './supabase.js'

// Domain type aliases for better readability
export type Question = Tables<'java_questions'>
export type QuestionInsert = TablesInsert<'java_questions'>
export type QuestionUpdate = TablesUpdate<'java_questions'>

export type Submission = Tables<'java_submissions'>
export type SubmissionInsert = TablesInsert<'java_submissions'>
export type SubmissionUpdate = TablesUpdate<'java_submissions'>

// Extended submission type with joined relations for display
export interface SubmissionWithRelations extends Submission {
  profiles?: {
    full_name: string | null
  } | null
  java_questions?: {
    question_text: string
    java_concepts: string[]
  } | null
}

export type Profile = Tables<'profiles'>
export type ProfileInsert = TablesInsert<'profiles'>
export type ProfileUpdate = TablesUpdate<'profiles'>

// API Response Types
export interface ApiResponse<T = unknown> {
  success?: boolean
  error?: string
  data?: T
}

export interface QuestionResponse extends ApiResponse<Question> {
  question?: Question
}

export interface QuestionsResponse extends ApiResponse<Question[]> {
  questions?: Question[]
}

export interface SubmissionResponse extends ApiResponse<Submission> {
  submission?: Submission & {
    gradingResult?: GradingResult
  }
}

export interface SubmissionsResponse extends ApiResponse<Submission[]> {
  submissions?: Submission[]
}

// Claude AI Types
export interface QuestionData {
  question: string
  rubric: Rubric
  solution: Solution
  concepts: string[]
}

export interface Rubric {
  communication: RubricCategory
  correctness: RubricCategory
  logic: RubricCategory
}

export interface RubricCategory {
  description: string
  weight: number
  criteria: string[]
}

export interface Solution {
  code: string
  explanation: string
  keyPoints: string[]
}

export interface GradingResult {
  extractedCode: string
  scores: Record<string, number>
  feedback: Record<string, string>
  overallScore: number
  generalComments: string
}

// Form and UI Types
export interface QuestionGenerationRequest {
  concepts: JavaConcept[]
}

export interface QuestionModificationRequest {
  modificationPrompt: string
}

export interface ArchiveRequest {
  questionId: string
}

export interface BulkArchiveRequest {
  questionIds: string[]
}

export interface RestoreRequest {
  questionIds: string[]
}

export interface DeleteRequest {
  questionIds: string[]
}

// Event Types for Store Communication
export interface QuestionArchivedEvent extends CustomEvent {
  detail: Question
}

export interface QuestionRestoredEvent extends CustomEvent {
  detail: Question
}

// Component Props Types
export interface MarkdownProps {
  content: string
  class?: string
}

// Store State Types
export interface QuestionsStoreState {
  questions: Question[]
  loading: boolean
  error: string | null
}

export interface ArchivedQuestionsStoreState {
  questions: Question[]
  selectedQuestionIds: string[]
  loading: boolean
  error: string | null
}

// Toast Types
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

// Auth Types
export interface AuthState {
  user: any | null // TODO: Type this properly with Supabase User type
  profile: Profile | null
  loading: boolean
}

// Java Concepts
export type JavaConcept = 
  | 'variables' 
  | 'data-types' 
  | 'conditionals' 
  | 'loops' 
  | 'methods' 
  | 'arrays' 
  | 'strings' 
  | 'input-output'

// Status Types
export type SubmissionStatus = 'pending' | 'graded' | 'error'
export type UserRole = 'teacher' | 'student'

// Online Test System Types
export type CodingTest = Tables<'coding_tests'>
export type CodingTestInsert = TablesInsert<'coding_tests'>
export type CodingTestUpdate = TablesUpdate<'coding_tests'>

export type TestQuestion = Tables<'test_questions'>
export type TestQuestionInsert = TablesInsert<'test_questions'>
export type TestQuestionUpdate = TablesUpdate<'test_questions'>

export type TestAttempt = Tables<'test_attempts'>
export type TestAttemptInsert = TablesInsert<'test_attempts'>
export type TestAttemptUpdate = TablesUpdate<'test_attempts'>

export type TestAnswer = Tables<'test_answers'>
export type TestAnswerInsert = TablesInsert<'test_answers'>
export type TestAnswerUpdate = TablesUpdate<'test_answers'>

export type AnswerHistory = Tables<'answer_history'>
export type AnswerHistoryInsert = TablesInsert<'answer_history'>

export interface CodingTestWithQuestions extends CodingTest {
  test_questions?: (TestQuestion & {
    java_questions?: Question
  })[]
}

export interface TestAttemptWithDetails extends TestAttempt {
  coding_tests?: CodingTest
  profiles?: { full_name: string | null }
  test_answers?: TestAnswer[]
}

export interface TestAnswerWithQuestion extends TestAnswer {
  java_questions?: Question
}

export interface TestProgress {
  testId: string
  studentId: string
  status: 'not_started' | 'in_progress' | 'submitted' | 'graded'
  timeSpent: number
  timeRemaining: number
  questionsAnswered: number
  totalQuestions: number
  lastSaved: string | null
}

export interface TestSettings {
  timeLimitMinutes: number
  immediateeFeedback: boolean
  fullscreenRequired: boolean
  disableCopyPaste: boolean
}

export interface CodeEditorSettings {
  fontSize: number
  theme: 'light' | 'dark'
  autoSave: boolean
  autoSaveInterval: number
}

export interface BulkGradingRequest {
  testId: string
  attemptIds: string[]
}

export interface BulkGradingResult {
  testId: string
  gradedCount: number
  failedCount: number
  results: {
    attemptId: string
    success: boolean
    error?: string
    scores?: Record<string, number>
  }[]
}

// Test creation types
export interface TestCreationRequest {
  title: string
  description?: string
  questionIds: string[]
  timeLimitMinutes: number
  startDate?: string
  endDate: string
  settings: TestSettings
  createdBy?: string
}

export interface TestQuestionWithDetails extends TestQuestion {
  java_questions?: Question
}

// Timer types
export interface TimerState {
  timeRemaining: number
  isRunning: boolean
  isExpired: boolean
}

// Auto-save types
export interface AutoSaveState {
  lastSaved: Date | null
  isDirty: boolean
  isSaving: boolean
}

// Test status types
export type TestStatus = 'draft' | 'active' | 'ended'
export type AttemptStatus = 'in_progress' | 'submitted' | 'graded'

// Utility Types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>