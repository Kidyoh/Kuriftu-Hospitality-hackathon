import { Database } from './types';

// Extend the Database type to include missing tables
export interface ExtendedDatabase extends Database {
  public: {
    Tables: {
      // Include all existing tables from Database["public"]["Tables"]
      ...Database["public"]["Tables"],

      // Add missing tables
      user_assessments: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          results: Record<string, string>;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          results: Record<string, string>;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          results?: Record<string, string>;
        };
        Relationships: [
          {
            foreignKeyName: "user_assessments_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      
      user_lessons: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          course_id: string;
          completed: boolean;
          progress: number;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          course_id: string;
          completed?: boolean;
          progress?: number;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          course_id?: string;
          completed?: boolean;
          progress?: number;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_lessons_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_lessons_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "course_lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_lessons_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      
      lesson_views: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          course_id: string;
          view_count: number;
          first_viewed_at: string;
          last_viewed_at: string;
          total_duration: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          course_id: string;
          view_count?: number;
          first_viewed_at?: string;
          last_viewed_at?: string;
          total_duration?: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          course_id?: string;
          view_count?: number;
          first_viewed_at?: string;
          last_viewed_at?: string;
          total_duration?: number;
        };
        Relationships: [
          {
            foreignKeyName: "lesson_views_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_views_lesson_id_fkey";
            columns: ["lesson_id"];
            isOneToOne: false;
            referencedRelation: "course_lessons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "lesson_views_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          }
        ];
      };
      
      user_quiz_results: {
        Row: {
          id: string;
          user_id: string;
          quiz_id: string;
          score: number;
          passed: boolean;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          quiz_id: string;
          score: number;
          passed: boolean;
          completed_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          quiz_id?: string;
          score?: number;
          passed?: boolean;
          completed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_quiz_results_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_quiz_results_quiz_id_fkey";
            columns: ["quiz_id"];
            isOneToOne: false;
            referencedRelation: "quizzes";
            referencedColumns: ["id"];
          }
        ];
      };
      
      achievements: {
        Row: {
          id: string;
          name: string;
          description: string;
          criteria: string;
          icon: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description: string;
          criteria: string;
          icon: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          criteria?: string;
          icon?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          earned_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          earned_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          earned_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_achievements_achievement_id_fkey";
            columns: ["achievement_id"];
            isOneToOne: false;
            referencedRelation: "achievements";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Database["public"]["Views"];
    Functions: Database["public"]["Functions"];
    Enums: Database["public"]["Enums"];
    CompositeTypes: Database["public"]["CompositeTypes"];
  };
}

// Achievement interface
export interface Achievement {
  id: string;
  name: string;
  description: string;
  criteria: string;
  icon: string;
  created_at?: string;
}

// Re-export the custom types
export type Tables<T extends keyof ExtendedDatabase['public']['Tables']> = 
  ExtendedDatabase['public']['Tables'][T]['Row'];
export type TablesInsert<T extends keyof ExtendedDatabase['public']['Tables']> = 
  ExtendedDatabase['public']['Tables'][T]['Insert'];
export type TablesUpdate<T extends keyof ExtendedDatabase['public']['Tables']> = 
  ExtendedDatabase['public']['Tables'][T]['Update']; 