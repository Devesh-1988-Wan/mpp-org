import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// This will now throw an error if the credentials are not set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase URL and anonymous key are required.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          status: 'active' | 'completed' | 'archived'
          created_date: string
          last_modified: string
          created_by: string
          team_members: string[]
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: 'active' | 'completed' | 'archived'
          created_date?: string
          last_modified?: string
          created_by?: string
          team_members?: string[]
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: 'active' | 'completed' | 'archived'
          created_date?: string
          last_modified?: string
          created_by?: string
          team_members?: string[]
        }
      }
      custom_fields: {
        Row: {
          id: string
          project_id: string
          name: string
          field_type: 'text' | 'number' | 'date' | 'select' | 'boolean'
          required: boolean
          options: any | null
          default_value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          field_type: 'text' | 'number' | 'date' | 'select' | 'boolean'
          required?: boolean
          options?: any | null
          default_value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          field_type?: 'text' | 'number' | 'date' | 'select' | 'boolean'
          required?: boolean
          options?: any | null
          default_value?: string | null
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          task_type: 'task' | 'milestone' | 'deliverable'
          status: 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'impacted' | 'dev-in-progress' | 'done'
          start_date: string
          end_date: string
          assignee: string | null
          progress: number
          dependencies: string[]
          custom_fields: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          task_type?: 'task' | 'milestone' | 'deliverable'
          status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'impacted' | 'dev-in-progress' | 'done'
          start_date: string
          end_date: string
          assignee?: string | null
          progress?: number
          dependencies?: string[]
          custom_fields?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          task_type?: 'task' | 'milestone' | 'deliverable'
          status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold'  | 'impacted' | 'dev-in-progress' | 'done'
          start_date?: string
          end_date?: string
          assignee?: string | null
          progress?: number
          dependencies?: string[]
          custom_fields?: any
          created_at?: string
          updated_at?: string
        }
      }
      activity_log: {
        Row: {
          id: string
          project_id: string
          task_id: string | null
          user_id: string
          action: string
          changes: any | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          task_id?: string | null
          user_id?: string
          action: string
          changes?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          task_id?: string | null
          user_id?: string
          action?: string
          changes?: any | null
          created_at?: string
        }
      }
    }
  }
}