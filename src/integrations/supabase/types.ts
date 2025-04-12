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
      course_lessons: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          sequence_order: number | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          sequence_order?: number | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          sequence_order?: number | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          difficulty_level: string | null
          estimated_hours: number | null
          id: string
          related_skill: string | null
          status: string | null
          title: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          estimated_hours?: number | null
          id?: string
          related_skill?: string | null
          status?: string | null
          title: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: string | null
          estimated_hours?: number | null
          id?: string
          related_skill?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      learning_path_courses: {
        Row: {
          admin_notes: string | null
          course_id: string | null
          id: string
          learning_path_id: string | null
          sequence_order: number | null
        }
        Insert: {
          admin_notes?: string | null
          course_id?: string | null
          id?: string
          learning_path_id?: string | null
          sequence_order?: number | null
        }
        Update: {
          admin_notes?: string | null
          course_id?: string | null
          id?: string
          learning_path_id?: string | null
          sequence_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_courses_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "user_learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          created_at: string
          department: string | null
          description: string | null
          id: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          name: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          created_at?: string
          department?: string | null
          description?: string | null
          id?: string
          name?: string
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      onboarding_progress: {
        Row: {
          completed: boolean
          completed_at: string | null
          id: string
          step: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          step: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          id?: string
          step?: string
          user_id?: string
        }
        Relationships: []
      }
      path_courses: {
        Row: {
          course_id: string
          id: string
          path_id: string
          sequence_order: number
        }
        Insert: {
          course_id: string
          id?: string
          path_id: string
          sequence_order: number
        }
        Update: {
          course_id?: string
          id?: string
          path_id?: string
          sequence_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "path_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "path_courses_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          department: string | null
          experience_level: string | null
          first_name: string
          id: string
          joined_at: string
          last_name: string
          onboarding_completed: boolean
          phone: string | null
          position: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          avatar_url?: string | null
          department?: string | null
          experience_level?: string | null
          first_name: string
          id: string
          joined_at?: string
          last_name: string
          onboarding_completed?: boolean
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          avatar_url?: string | null
          department?: string | null
          experience_level?: string | null
          first_name?: string
          id?: string
          joined_at?: string
          last_name?: string
          onboarding_completed?: boolean
          phone?: string | null
          position?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          completed: boolean | null
          end_time: string | null
          id: string
          passed: boolean | null
          quiz_id: string | null
          score: number | null
          start_time: string | null
          user_id: string | null
        }
        Insert: {
          completed?: boolean | null
          end_time?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string | null
          score?: number | null
          start_time?: string | null
          user_id?: string | null
        }
        Update: {
          completed?: boolean | null
          end_time?: string | null
          id?: string
          passed?: boolean | null
          quiz_id?: string | null
          score?: number | null
          start_time?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_options: {
        Row: {
          id: string
          is_correct: boolean | null
          option_text: string
          question_id: string | null
          sequence_order: number | null
        }
        Insert: {
          id?: string
          is_correct?: boolean | null
          option_text: string
          question_id?: string | null
          sequence_order?: number | null
        }
        Update: {
          id?: string
          is_correct?: boolean | null
          option_text?: string
          question_id?: string | null
          sequence_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_options_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_questions: {
        Row: {
          created_at: string | null
          id: string
          points: number | null
          question_text: string
          question_type: string
          quiz_id: string | null
          sequence_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          points?: number | null
          question_text: string
          question_type: string
          quiz_id?: string | null
          sequence_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          points?: number | null
          question_text?: string
          question_type?: string
          quiz_id?: string | null
          sequence_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          attempt_id: string | null
          id: string
          is_correct: boolean | null
          points_earned: number | null
          question_id: string | null
          selected_option_id: string | null
          text_response: string | null
        }
        Insert: {
          attempt_id?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          selected_option_id?: string | null
          text_response?: string | null
        }
        Update: {
          attempt_id?: string | null
          id?: string
          is_correct?: boolean | null
          points_earned?: number | null
          question_id?: string | null
          selected_option_id?: string | null
          text_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "quiz_attempts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "quiz_options"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          ai_generated: boolean | null
          course_id: string | null
          created_at: string | null
          description: string | null
          id: string
          lesson_id: string | null
          passing_score: number | null
          time_limit: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          ai_generated?: boolean | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lesson_id?: string | null
          passing_score?: number | null
          time_limit?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          ai_generated?: boolean | null
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          lesson_id?: string | null
          passing_score?: number | null
          time_limit?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      skill_assessments: {
        Row: {
          completed_at: string
          id: string
          score: number | null
          skill_name: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          id?: string
          score?: number | null
          skill_name: string
          user_id: string
        }
        Update: {
          completed_at?: string
          id?: string
          score?: number | null
          skill_name?: string
          user_id?: string
        }
        Relationships: []
      }
      user_courses: {
        Row: {
          completed: boolean
          completed_at: string | null
          course_id: string
          id: string
          progress: number
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          course_id: string
          id?: string
          progress?: number
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          course_id?: string
          id?: string
          progress?: number
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_learning_paths: {
        Row: {
          admin_approved: boolean | null
          ai_generated: boolean | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          under_review: boolean | null
          user_id: string | null
        }
        Insert: {
          admin_approved?: boolean | null
          ai_generated?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          under_review?: boolean | null
          user_id?: string | null
        }
        Update: {
          admin_approved?: boolean | null
          ai_generated?: boolean | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          under_review?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_learning_paths_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_paths_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_self: {
        Args: { user_id: string }
        Returns: boolean
      }
      user_is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
    }
    Enums: {
      user_role: "admin" | "manager" | "staff" | "trainee"
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
    Enums: {
      user_role: ["admin", "manager", "staff", "trainee"],
    },
  },
} as const
