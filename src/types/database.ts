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
    PostgrestVersion: "14.15"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      availability_blocks: {
        Row: {
          created_at: string
          end_at: string
          id: string
          note: string | null
          recurrence_rule: string | null
          start_at: string
        }
        Insert: {
          created_at?: string
          end_at: string
          id?: string
          note?: string | null
          recurrence_rule?: string | null
          start_at: string
        }
        Update: {
          created_at?: string
          end_at?: string
          id?: string
          note?: string | null
          recurrence_rule?: string | null
          start_at?: string
        }
        Relationships: []
      }
      business_links: {
        Row: {
          bit_link: string | null
          community_url: string | null
          contact_info: string | null
          id: boolean
          paybox_link: string | null
          updated_at: string
          website_url: string | null
        }
        Insert: {
          bit_link?: string | null
          community_url?: string | null
          contact_info?: string | null
          id?: boolean
          paybox_link?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          bit_link?: string | null
          community_url?: string | null
          contact_info?: string | null
          id?: boolean
          paybox_link?: string | null
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      lesson_participants: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_note: string | null
          payment_received_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          price_charged: number
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_note?: string | null
          payment_received_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          price_charged: number
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_note?: string | null
          payment_received_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          price_charged?: number
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_participants_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_participants_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_tutor_notes: {
        Row: {
          id: string
          lesson_id: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          lesson_id: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          lesson_id?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_tutor_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          created_at: string
          created_by: string
          date: string
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          duration_minutes: number
          end_time: string
          forced: boolean
          id: string
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          online_url: string | null
          source: Database["public"]["Enums"]["lesson_source"]
          start_time: string
          status: Database["public"]["Enums"]["lesson_status"]
          subject_id: string | null
          topic: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          date: string
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          duration_minutes: number
          end_time: string
          forced?: boolean
          id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          online_url?: string | null
          source: Database["public"]["Enums"]["lesson_source"]
          start_time: string
          status?: Database["public"]["Enums"]["lesson_status"]
          subject_id?: string | null
          topic?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          date?: string
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"]
          duration_minutes?: number
          end_time?: string
          forced?: boolean
          id?: string
          lesson_type?: Database["public"]["Enums"]["lesson_type"]
          online_url?: string | null
          source?: Database["public"]["Enums"]["lesson_source"]
          start_time?: string
          status?: Database["public"]["Enums"]["lesson_status"]
          subject_id?: string | null
          topic?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_students: {
        Row: {
          created_at: string
          id: string
          parent_profile_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_profile_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_profile_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_students_parent_profile_id_fkey"
            columns: ["parent_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          theme_preference: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          theme_preference?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          theme_preference?: string
          updated_at?: string
        }
        Relationships: []
      }
      student_internal_notes: {
        Row: {
          id: string
          notes: string | null
          rating: number | null
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          notes?: string | null
          rating?: number | null
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          notes?: string | null
          rating?: number | null
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_internal_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_internal_notes_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          archived_at: string | null
          claimed_at: string | null
          created_at: string
          default_price: number | null
          display_name: string
          grade_level: string | null
          id: string
          is_guest: boolean
          profile_id: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          claimed_at?: string | null
          created_at?: string
          default_price?: number | null
          display_name: string
          grade_level?: string | null
          id?: string
          is_guest?: boolean
          profile_id?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          claimed_at?: string | null
          created_at?: string
          default_price?: number | null
          display_name?: string
          grade_level?: string | null
          id?: string
          is_guest?: boolean
          profile_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          active: boolean
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      tutor_settings: {
        Row: {
          default_lesson_duration: number
          id: boolean
          payment_reminder_days: number
          updated_at: string
        }
        Insert: {
          default_lesson_duration?: number
          id?: boolean
          payment_reminder_days?: number
          updated_at?: string
        }
        Update: {
          default_lesson_duration?: number
          id?: boolean
          payment_reminder_days?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_lesson_request: {
        Args: { target_lesson_id: string }
        Returns: {
          created_at: string
          created_by: string
          date: string
          delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          duration_minutes: number
          end_time: string
          forced: boolean
          id: string
          lesson_type: Database["public"]["Enums"]["lesson_type"]
          online_url: string | null
          source: Database["public"]["Enums"]["lesson_source"]
          start_time: string
          status: Database["public"]["Enums"]["lesson_status"]
          subject_id: string | null
          topic: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "lessons"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_parent_of: { Args: { target_student_id: string }; Returns: boolean }
      is_tutor: { Args: never; Returns: boolean }
      owns_student: { Args: { target_student_id: string }; Returns: boolean }
    }
    Enums: {
      delivery_mode: "online" | "in_person"
      lesson_source: "student_request" | "tutor_manual"
      lesson_status:
        | "requested"
        | "confirmed"
        | "rejected"
        | "cancelled"
        | "completed"
        | "change_requested"
      lesson_type: "individual" | "group"
      payment_method: "cash" | "bit" | "paybox" | "other"
      payment_status: "unpaid" | "paid"
      user_role: "tutor" | "parent" | "student"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      delivery_mode: ["online", "in_person"],
      lesson_source: ["student_request", "tutor_manual"],
      lesson_status: [
        "requested",
        "confirmed",
        "rejected",
        "cancelled",
        "completed",
        "change_requested",
      ],
      lesson_type: ["individual", "group"],
      payment_method: ["cash", "bit", "paybox", "other"],
      payment_status: ["unpaid", "paid"],
      user_role: ["tutor", "parent", "student"],
    },
  },
} as const
