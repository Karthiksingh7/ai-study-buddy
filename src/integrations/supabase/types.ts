export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      chat_messages: {
        Row: {
          content: string
          conversation_id: string | null
          created_at: string
          id: string
          message_type: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_type?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_type?: string | null
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      discussion_groups: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          member_count: number | null
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          member_count?: number | null
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          member_count?: number | null
          name?: string
          subject?: string
        }
        Relationships: []
      }
      discussion_messages: {
        Row: {
          content: string
          created_at: string
          group_id: string
          id: string
          is_ai_response: boolean | null
          reply_to: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          group_id: string
          id?: string
          is_ai_response?: boolean | null
          reply_to?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          group_id?: string
          id?: string
          is_ai_response?: boolean | null
          reply_to?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "discussion_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_messages_reply_to_fkey"
            columns: ["reply_to"]
            isOneToOne: false
            referencedRelation: "discussion_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          answer: string
          created_at: string
          id: string
          question: string
          topic: string
          user_id: string
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          question: string
          topic: string
          user_id: string
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          question?: string
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      game_sessions: {
        Row: {
          completed_at: string
          duration_seconds: number | null
          game_type: string
          id: string
          score: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string
          duration_seconds?: number | null
          game_type: string
          id?: string
          score?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string
          duration_seconds?: number | null
          game_type?: string
          id?: string
          score?: number | null
          user_id?: string
        }
        Relationships: []
      }
      group_memberships: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: string | null
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: string | null
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_memberships_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "discussion_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          flashcards_created: number | null
          id: string
          quizzes_completed: number | null
          total_study_time: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          flashcards_created?: number | null
          id?: string
          quizzes_completed?: number | null
          total_study_time?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          flashcards_created?: number | null
          id?: string
          quizzes_completed?: number | null
          total_study_time?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_results: {
        Row: {
          correct_answers: number
          created_at: string
          difficulty: string
          id: string
          score_percentage: number
          time_taken_seconds: number | null
          topic: string
          total_questions: number
          user_id: string
        }
        Insert: {
          correct_answers: number
          created_at?: string
          difficulty: string
          id?: string
          score_percentage: number
          time_taken_seconds?: number | null
          topic: string
          total_questions: number
          user_id: string
        }
        Update: {
          correct_answers?: number
          created_at?: string
          difficulty?: string
          id?: string
          score_percentage?: number
          time_taken_seconds?: number | null
          topic?: string
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      scanned_notes: {
        Row: {
          ai_explanation: string | null
          created_at: string
          extracted_text: string | null
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          ai_explanation?: string | null
          created_at?: string
          extracted_text?: string | null
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          ai_explanation?: string | null
          created_at?: string
          extracted_text?: string | null
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      studied_topics: {
        Row: {
          created_at: string
          id: string
          last_studied_at: string
          source: string | null
          study_count: number | null
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_studied_at?: string
          source?: string | null
          study_count?: number | null
          topic: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_studied_at?: string
          source?: string | null
          study_count?: number | null
          topic?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          duration_minutes: number | null
          ended_at: string | null
          id: string
          notes: string | null
          subject: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          subject?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          ended_at?: string | null
          id?: string
          notes?: string | null
          subject?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      user_video_history: {
        Row: {
          completed: boolean | null
          id: string
          user_id: string
          video_id: string
          watch_duration_seconds: number | null
          watched_at: string
        }
        Insert: {
          completed?: boolean | null
          id?: string
          user_id: string
          video_id: string
          watch_duration_seconds?: number | null
          watched_at?: string
        }
        Update: {
          completed?: boolean | null
          id?: string
          user_id?: string
          video_id?: string
          watch_duration_seconds?: number | null
          watched_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_video_history_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "video_recommendations"
            referencedColumns: ["id"]
          },
        ]
      }
      video_recommendations: {
        Row: {
          channel: string
          created_at: string
          description: string | null
          duration: string | null
          id: string
          thumbnail_url: string | null
          title: string
          topic: string
          video_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          title: string
          topic: string
          video_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          description?: string | null
          duration?: string | null
          id?: string
          thumbnail_url?: string | null
          title?: string
          topic?: string
          video_id?: string
        }
        Relationships: []
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
