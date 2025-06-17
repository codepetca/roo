export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      answer_history: {
        Row: {
          answer_id: string | null
          code_snapshot: string
          id: string
          keystroke_count: number | null
          timestamp: string | null
        }
        Insert: {
          answer_id?: string | null
          code_snapshot: string
          id?: string
          keystroke_count?: number | null
          timestamp?: string | null
        }
        Update: {
          answer_id?: string | null
          code_snapshot?: string
          id?: string
          keystroke_count?: number | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answer_history_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "test_answers"
            referencedColumns: ["id"]
          },
        ]
      }
      coding_tests: {
        Row: {
          created_at: string | null
          created_by: string
          description: string | null
          disable_copy_paste: boolean | null
          end_date: string
          fullscreen_required: boolean | null
          id: string
          immediate_feedback: boolean | null
          start_date: string | null
          status: string | null
          time_limit_minutes: number
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          description?: string | null
          disable_copy_paste?: boolean | null
          end_date: string
          fullscreen_required?: boolean | null
          id?: string
          immediate_feedback?: boolean | null
          start_date?: string | null
          status?: string | null
          time_limit_minutes: number
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          description?: string | null
          disable_copy_paste?: boolean | null
          end_date?: string
          fullscreen_required?: boolean | null
          id?: string
          immediate_feedback?: boolean | null
          start_date?: string | null
          status?: string | null
          time_limit_minutes?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coding_tests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          full_name?: string | null
          id: string
          role: string
        }
        Update: {
          created_at?: string | null
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          archived: boolean | null
          concepts: string[]
          created_at: string | null
          created_by: string | null
          id: string
          language: string
          question_text: string
          rubric: Json
          solution: Json | null
        }
        Insert: {
          archived?: boolean | null
          concepts: string[]
          created_at?: string | null
          created_by?: string | null
          id?: string
          language?: string
          question_text: string
          rubric: Json
          solution?: Json | null
        }
        Update: {
          archived?: boolean | null
          concepts?: string[]
          created_at?: string | null
          created_by?: string | null
          id?: string
          language?: string
          question_text?: string
          rubric?: Json
          solution?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string | null
          extracted_code: string | null
          feedback: Json | null
          graded_at: string | null
          id: string
          image_url: string | null
          language: string
          overall_score: number | null
          question_id: string
          scores: Json | null
          status: string | null
          student_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string | null
          extracted_code?: string | null
          feedback?: Json | null
          graded_at?: string | null
          id?: string
          image_url?: string | null
          language?: string
          overall_score?: number | null
          question_id: string
          scores?: Json | null
          status?: string | null
          student_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string | null
          extracted_code?: string | null
          feedback?: Json | null
          graded_at?: string | null
          id?: string
          image_url?: string | null
          language?: string
          overall_score?: number | null
          question_id?: string
          scores?: Json | null
          status?: string | null
          student_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "submissions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      test_answers: {
        Row: {
          answer_code: string | null
          attempt_id: string | null
          created_at: string | null
          feedback: Json | null
          graded_at: string | null
          id: string
          last_saved_at: string | null
          question_id: string
          question_score: number | null
          scores: Json | null
        }
        Insert: {
          answer_code?: string | null
          attempt_id?: string | null
          created_at?: string | null
          feedback?: Json | null
          graded_at?: string | null
          id?: string
          last_saved_at?: string | null
          question_id: string
          question_score?: number | null
          scores?: Json | null
        }
        Update: {
          answer_code?: string | null
          attempt_id?: string | null
          created_at?: string | null
          feedback?: Json | null
          graded_at?: string | null
          id?: string
          last_saved_at?: string | null
          question_id?: string
          question_score?: number | null
          scores?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "test_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "test_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_attempts: {
        Row: {
          auto_submitted: boolean | null
          created_at: string | null
          graded_at: string | null
          id: string
          started_at: string | null
          status: string | null
          student_id: string
          submitted_at: string | null
          test_id: string
          time_spent_seconds: number | null
          total_score: number | null
        }
        Insert: {
          auto_submitted?: boolean | null
          created_at?: string | null
          graded_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          student_id: string
          submitted_at?: string | null
          test_id: string
          time_spent_seconds?: number | null
          total_score?: number | null
        }
        Update: {
          auto_submitted?: boolean | null
          created_at?: string | null
          graded_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          student_id?: string
          submitted_at?: string | null
          test_id?: string
          time_spent_seconds?: number | null
          total_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "coding_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          created_at: string | null
          id: string
          points: number | null
          question_id: string | null
          question_order: number
          test_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          points?: number | null
          question_id?: string | null
          question_order: number
          test_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number | null
          question_id?: string | null
          question_order?: number
          test_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "coding_tests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
