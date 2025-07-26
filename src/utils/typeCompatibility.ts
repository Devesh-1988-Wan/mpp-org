import { supabase } from '@/lib/supabase'
import { PostgrestError } from '@supabase/supabase-js'

// --- Type Definitions ---

// Define placeholder types for related data for better type safety.
type Task = { id: string; name: string; project_id: string; [key: string]: any };
type CustomField = { id: string; name: string; value: any; project_id: string };
type ActivityLog = { [key: string]: any };

// Base project structure using consistent snake_case naming.
type ProjectBase = {
  id: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'archived'
  created_at: string
  last_modified: string
  created_by: string
  team_members: string[]
}

// Type for project lists, where related tables are aggregated (e.g., as a count).
// This prevents runtime errors from expecting an array where an object is returned.
export type ProjectSummary = ProjectBase & {
  tasks: { count: number }[] // Supabase returns count as an array with one object
  custom_fields: CustomField[]
}

// Type for a single, detailed project view with full related data.
export type ProjectDetail = ProjectBase & {
  tasks: Task[]
  custom_fields: CustomField[]
}

// Type for creating a new project.
export type ProjectInsert = Omit<ProjectDetail, 'id' | 'created_at' | 'last_modified' | 'created_by'>;

// Type for updating a project.
export type ProjectUpdate = Partial<Omit<ProjectDetail, 'id' | 'created_at' | 'created_by'>>;

// --- LocalStorage Management for Demo Mode ---

const DEMO_PROJECTS_KEY = 'lovable-demo-projects';
const DEMO_ACTIVITY_LOG_KEY = 'lovable-demo-activity-log';

// Correctly handles loading/saving for both projects and the activity log.
const loadFromLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.warn(`Failed to load '${key}' from localStorage:`, error);
    return defaultValue;
  }
};

const saveToLocalStorage = <T>(key: string, data: T): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn(`Failed to save '${key}' to localStorage:`, error);
  }
};

// --- In-Memory State for Demo Mode ---

let demoProjects: ProjectDetail[] = loadFromLocalStorage(DEMO_PROJECTS_KEY, []);
let demoActivityLog: ActivityLog[] = loadFromLocalStorage(DEMO_ACTIVITY_LOG_KEY, []);

// Simple UUID generator for robust demo data IDs.
const generateUUID = () => crypto.randomUUID();

/**
 * Service class for all project-related data operations.
 * Provides a fallback to a demo mode using localStorage when Supabase is not configured.
 */
export class ProjectService {
  /**
   * Initializes sample data if in demo mode and no projects exist.
   * This should be called once when the application loads.
   */
  static initializeDemoData(): void {
    if (!supabase && demoProjects.length === 0) {
      const demoId = '1';
      demoProjects = [{
        id: demoId,
        name: 'Sample Project',
        description: 'This is a sample project. Connect Supabase to store real data.',
        status: 'active',
        created_at: new Date('2024-01-01').toISOString(),
        last_modified: new Date().toISOString(),
        created_by: 'demo_user',
        team_members: ['Demo User'],
        tasks: [],
        custom_fields: [],
      }];
      demoActivityLog = [{
          id: generateUUID(),
          project_id: demoId,
          user_id: 'demo_user',
          action: 'project_created',
          changes: { project_name: 'Sample Project' },
          created_at: new Date().toISOString(),
      }];
      saveToLocalStorage(DEMO_PROJECTS_KEY, demoProjects);
      saveToLocalStorage(DEMO_ACTIVITY_LOG_KEY, demoActivityLog);
    }
  }

  static async getUserProjects(): Promise<ProjectSummary[]> {
    if (!supabase) {
        // In demo mode, we need to manually construct the summary view (e.g., task count).
        const summaries: ProjectSummary[] = demoProjects.map(p => ({
            ...p,
            tasks: [{ count: p.tasks.length }], // Mimic Supabase count structure
        }));
        return summaries;
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*, tasks(count), custom_fields(*)')
      .order('last_modified', { ascending: false });

    if (error) throw error;
    return (data as ProjectSummary[]) || [];
  }

  static async getProject(id: string): Promise<ProjectDetail | null> {
    if (!supabase) {
      const project = demoProjects.find(p => p.id === id);
      return project || null;
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*, tasks(*), custom_fields(*)')
      .eq('id', id)
      .single();

    if (error) {
      if ((error as PostgrestError).code === 'PGRST116') return null; // Handle not found gracefully
      throw error;
    }
    return data as ProjectDetail;
  }

  static async createProject(project: ProjectInsert): Promise<ProjectDetail> {
    if (!supabase) {
      const newProject: ProjectDetail = {
        id: generateUUID(),
        ...project,
        description: project.description || '',
        status: project.status || 'active',
        team_members: project.team_members || [],
        created_at: new Date().toISOString(),
        last_modified: new Date().toISOString(),
        created_by: 'demo_user',
        tasks: [],
        custom_fields: []
      };
      
      demoProjects.push(newProject);
      saveToLocalStorage(DEMO_PROJECTS_KEY, demoProjects);
      
      this.logActivity(newProject.id, 'demo_user', 'project_created', { project_name: newProject.name });
      return newProject;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('projects')
      .insert([{ ...project, created_by: user.id }])
      .select('*, tasks(*), custom_fields(*)')
      .single();

    if (error) throw error;
    
    await this.logActivity(data.id, user.id, 'project_created', { project_name: data.name });
    return data as ProjectDetail;
  }

  static async updateProject(id: string, updates: ProjectUpdate): Promise<ProjectDetail> {
    const last_modified = new Date().toISOString();
    const finalUpdates = { ...updates, last_modified };

    if (!supabase) {
      const projectIndex = demoProjects.findIndex(p => p.id === id);
      if (projectIndex === -1) throw new Error('Project not found in demo storage');
      
      demoProjects[projectIndex] = { ...demoProjects[projectIndex], ...finalUpdates };
      saveToLocalStorage(DEMO_PROJECTS_KEY, demoProjects);
      
      this.logActivity(id, 'demo_user', 'project_updated', finalUpdates); // Log all changes
      return demoProjects[projectIndex];
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { data, error } = await supabase
      .from('projects')
      .update(finalUpdates)
      .eq('id', id)
      .select('*, tasks(*), custom_fields(*)')
      .single();

    if (error) throw error;
    
    await this.logActivity(id, user.id, 'project_updated', finalUpdates);
    return data as ProjectDetail;
  }

  static async deleteProject(id: string): Promise<void> {
    if (!supabase) {
      const initialLength = demoProjects.length;
      demoProjects = demoProjects.filter(p => p.id !== id);
      // Only log and save if an item was actually deleted.
      if (demoProjects.length < initialLength) {
          saveToLocalStorage(DEMO_PROJECTS_KEY, demoProjects);
          this.logActivity(id, 'demo_user', 'project_deleted', { project_id: id });
      }
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');
    
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;

    await this.logActivity(id, user.id, 'project_deleted', { project_id: id });
  }
  
  // Refactored to accept userId, preventing redundant API calls.
  private static async logActivity(projectId: string, userId: string, action: string, changes?: any, taskId?: string) {
    if (!supabase) {
      const logEntry = {
        id: generateUUID(),
        project_id: projectId,
        task_id: taskId || null,
        user_id: userId, // Always 'demo_user' in this branch
        action,
        changes,
        created_at: new Date().toISOString()
      };
      demoActivityLog.unshift(logEntry);
      saveToLocalStorage(DEMO_ACTIVITY_LOG_KEY, demoActivityLog);
      return;
    }
    
    await supabase.from('activity_log').insert([{
      project_id: projectId,
      task_id: taskId || null,
      user_id: userId,
      action,
      changes
    }]);
  }

  static async getProjectActivity(projectId: string): Promise<ActivityLog[]> {
    if (!supabase) {
      return demoActivityLog.filter(log => log.project_id === projectId);
    }

    const { data, error } = await supabase
      .from('activity_log')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  static subscribeToProject(projectId: string, callback: (payload: any) => void) {
    if (!supabase) {
      console.warn("Demo Mode: Real-time updates are not supported. This is a mock subscription.");
      return { unsubscribe: () => {} }; // Simplified mock subscription
    }

    return supabase
      .channel(`project_${projectId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_fields', filter: `project_id=eq.${projectId}` }, callback)
      .subscribe();
  }
}

export const adaptTaskForLegacyComponents = (task: Task) => {
    return {
        ...task,
        startDate: new Date(task.start_date),
        endDate: new Date(task.end_date),
        type: task.task_type
    };
};