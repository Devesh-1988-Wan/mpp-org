import { createClient } from '@supabase/supabase-js'

// Get Supabase credentials from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fallback check to prevent initialization with invalid values
console.log('Supabase Configuration Check:');
console.log('VITE_SUPABASE_URL:', supabaseUrl);
console.log('VITE_SUPABASE_ANON_KEY exists:', !!supabaseAnonKey);
console.log('URL is placeholder:', supabaseUrl === 'YOUR_SUPABASE_URL');

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'YOUR_SUPABASE_URL') {
  console.warn('❌ Supabase credentials not configured. Some features will be disabled.');
  console.log('Missing:', {
    url: !supabaseUrl,
    key: !supabaseAnonKey,
    placeholder: supabaseUrl === 'YOUR_SUPABASE_URL'
  });
} else {
  console.log('✅ Supabase credentials configured successfully');
}

// Only create client if we have valid credentials
export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL') 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

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
          status: 'not-started' | 'in-progress' | 'completed' | 'on-hold'
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
          status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold'
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
          status?: 'not-started' | 'in-progress' | 'completed' | 'on-hold'
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