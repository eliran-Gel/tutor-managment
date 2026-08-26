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
    PostgrestVersion: "14.17"
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
      change_requests: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          reason: string | null
          request_type: Database["public"]["Enums"]["change_request_type"]
          requested_by: string
          requested_date: string | null
          requested_end_time: string | null
          requested_start_time: string | null
          requested_subject_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["change_request_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          lesson_id: string
          reason?: string | null
          request_type: Database["public"]["Enums"]["change_request_type"]
          requested_by: string
          requested_date?: string | null
          requested_end_time?: string | null
          requested_start_time?: string | null
          requested_subject_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["change_request_status"]
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          reason?: string | null
          request_type?: Database["public"]["Enums"]["change_request_type"]
          requested_by?: string
          requested_date?: string | null
          requested_end_time?: string | null
          requested_start_time?: string | null
          requested_subject_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["change_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "change_requests_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_requested_subject_id_fkey"
            columns: ["requested_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "change_requests_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          created_at: string
          description: string
          due_date: string | null
          id: string
          is_done: boolean
          lesson_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          description: string
          due_date?: string | null
          id?: string
          is_done?: boolean
          lesson_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          description?: string
          due_date?: string | null
          id?: string
          is_done?: boolean
          lesson_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_files: {
        Row: {
          created_at: string
          file_name: string
          id: string
          lesson_id: string
          mime_type: string
          storage_path: string
          visible_to_students: boolean
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          lesson_id: string
          mime_type: string
          storage_path: string
          visible_to_students?: boolean
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          lesson_id?: string
          mime_type?: string
          storage_path?: string
          visible_to_students?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lesson_files_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
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
          rejection_reason: string | null
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
          rejection_reason?: string | null
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
          rejection_reason?: string | null
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link_path: string | null
          read_at: string | null
          recipient_profile_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link_path?: string | null
          read_at?: string | null
          recipient_profile_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link_path?: string | null
          read_at?: string | null
          recipient_profile_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_profile_id_fkey"
            columns: ["recipient_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          grade: number | null
          grade_level: string | null
          grade_year: number | null
          id: string
          is_guest: boolean
          profile_id: string | null
          school_name: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          claimed_at?: string | null
          created_at?: string
          default_price?: number | null
          display_name: string
          grade?: number | null
          grade_level?: string | null
          grade_year?: number | null
          id?: string
          is_guest?: boolean
          profile_id?: string | null
          school_name?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          claimed_at?: string | null
          created_at?: string
          default_price?: number | null
          display_name?: string
          grade?: number | null
          grade_level?: string | null
          grade_year?: number | null
          id?: string
          is_guest?: boolean
          profile_id?: string | null
          school_name?: string | null
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
      tutor_working_hours: {
        Row: {
          day_of_week: number
          end_time: string | null
          is_open: boolean
          start_time: string | null
        }
        Insert: {
          day_of_week: number
          end_time?: string | null
          is_open?: boolean
          start_time?: string | null
        }
        Update: {
          day_of_week?: number
          end_time?: string | null
          is_open?: boolean
          start_time?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_change_request: {
        Args: { p_request_id: string }
        Returns: {
          created_at: string
          id: string
          lesson_id: string
          reason: string | null
          request_type: Database["public"]["Enums"]["change_request_type"]
          requested_by: string
          requested_date: string | null
          requested_end_time: string | null
          requested_start_time: string | null
          requested_subject_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["change_request_status"]
        }
        SetofOptions: {
          from: "*"
          to: "change_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
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
          rejection_reason: string | null
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
      calculate_lesson_price: {
        Args: {
          p_duration_minutes: number
          p_lesson_type: Database["public"]["Enums"]["lesson_type"]
        }
        Returns: number
      }
      cancel_lesson: {
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
          rejection_reason: string | null
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
      cancel_lesson_request: {
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
          rejection_reason: string | null
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
      create_manual_lesson:
        | {
            Args: {
              p_date: string
              p_delivery_mode: Database["public"]["Enums"]["delivery_mode"]
              p_duration_minutes: number
              p_end_time: string
              p_forced: boolean
              p_lesson_type: Database["public"]["Enums"]["lesson_type"]
              p_online_url: string
              p_participants: Json
              p_start_time: string
              p_subject_id: string
              p_topic: string
            }
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
              rejection_reason: string | null
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
        | {
            Args: {
              p_date: string
              p_delivery_mode: Database["public"]["Enums"]["delivery_mode"]
              p_duration_minutes: number
              p_end_time: string
              p_forced: boolean
              p_lesson_type: Database["public"]["Enums"]["lesson_type"]
              p_online_url: string
              p_start_time: string
              p_student_ids: string[]
              p_subject_id: string
              p_topic: string
            }
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
              rejection_reason: string | null
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
      create_notification: {
        Args: {
          p_body: string
          p_link_path: string
          p_recipient: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      delete_student: { Args: { p_student_id: string }; Returns: undefined }
      is_lesson_participant: {
        Args: { target_lesson_id: string }
        Returns: boolean
      }
      is_parent_of: { Args: { target_student_id: string }; Returns: boolean }
      is_tutor: { Args: never; Returns: boolean }
      owns_student: { Args: { target_student_id: string }; Returns: boolean }
      reject_change_request: {
        Args: { p_request_id: string }
        Returns: {
          created_at: string
          id: string
          lesson_id: string
          reason: string | null
          request_type: Database["public"]["Enums"]["change_request_type"]
          requested_by: string
          requested_date: string | null
          requested_end_time: string | null
          requested_start_time: string | null
          requested_subject_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["change_request_status"]
        }
        SetofOptions: {
          from: "*"
          to: "change_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reject_lesson_request:
        | {
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
              rejection_reason: string | null
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
        | {
            Args: { p_reason?: string; target_lesson_id: string }
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
              rejection_reason: string | null
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
      request_lesson: {
        Args: {
          p_date: string
          p_delivery_mode: Database["public"]["Enums"]["delivery_mode"]
          p_duration_minutes: number
          p_end_time: string
          p_start_time: string
          p_subject_id: string
          p_topic: string
        }
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
          rejection_reason: string | null
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
      request_lesson_change: {
        Args: {
          p_lesson_id: string
          p_reason: string
          p_request_type: Database["public"]["Enums"]["change_request_type"]
          p_requested_date: string
          p_requested_end_time: string
          p_requested_start_time: string
          p_requested_subject_id: string
        }
        Returns: {
          created_at: string
          id: string
          lesson_id: string
          reason: string | null
          request_type: Database["public"]["Enums"]["change_request_type"]
          requested_by: string
          requested_date: string | null
          requested_end_time: string | null
          requested_start_time: string | null
          requested_subject_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["change_request_status"]
        }
        SetofOptions: {
          from: "*"
          to: "change_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      change_request_status: "pending" | "approved" | "rejected"
      change_request_type: "reschedule" | "cancel"
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
      change_request_status: ["pending", "approved", "rejected"],
      change_request_type: ["reschedule", "cancel"],
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
