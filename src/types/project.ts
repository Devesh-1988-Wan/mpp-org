export type TaskType = 'task' | 'milestone' | 'deliverable';
export type TaskStatus = 'not-started' | 'in-progress' | 'completed' | 'on-hold'|'impacted'|'on-going'|'dev-in-progress'|'done';
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface CustomField {
  id: string;
  project_id: string;
  name: string;
  field_type: FieldType;
  required: boolean;
  options?: any; // For select type (stored as JSONB)
  default_value?: any;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  task_type: TaskType;
  status: TaskStatus;
  start_date: string;
  end_date: string;
  dependencies: string[];
  assignee?: string;
  progress: number; // 0-100
  custom_fields?: Record<string, any>; // Custom field values
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_date: string;  // Updated to match database
  last_modified: string; // Updated to match database
  status: 'active' | 'completed' | 'archived';
  tasks?: Task[];
  customFields?: CustomField[];
  team_members: string[]; // Updated to match database
  created_by: string;     // Updated to match database
}