import { supabase } from '@/integrations/supabase/client'
import { generateId } from '@/utils/idGenerator'

// Define types manually until the auto-generated types are updated
type Task = {
  id: string
  project_id: string
  name: string
  description?: string | null // Allow null
  task_type: 'task' | 'milestone' | 'deliverable'
  status: 'not-started' | 'in-progress' | 'completed' | 'on-hold' | 'impacted' | 'on-going' | 'dev-in-progress' | 'done'
  start_date: string
  end_date: string
  assignee?: string
  progress: number
  dependencies: string[]
  custom_fields: Record<string, any>
  created_at: string
  updated_at: string
}

type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at'>
type TaskUpdate = Partial<Omit<Task, 'id' | 'project_id' | 'created_at'>>

// LocalStorage key for demo projects (to sync with ProjectService)
const DEMO_PROJECTS_KEY = 'lovable-demo-projects';

// Helper functions for localStorage persistence
const loadDemoProjects = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(DEMO_PROJECTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.warn('Failed to load demo projects from localStorage:', error);
    return [];
  }
};

const saveDemoProjects = (projects: any[]): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEMO_PROJECTS_KEY, JSON.stringify(projects));
  } catch (error) {
    console.warn('Failed to save demo projects to localStorage:', error);
  }
};

export class TaskService {
  // Get all tasks for a project
  static async getProjectTasks(projectId: string): Promise<Task[]> {
    if (!supabase) {
      // Load from localStorage demo projects
      const demoProjects = loadDemoProjects();
      const project = demoProjects.find(p => p.id === projectId);
      return project?.tasks || [];
    }

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  }

  // Create a new task
  static async createTask(task: Partial<TaskInsert>): Promise<Task> {
    if (!supabase) {
      // Handle demo mode
      const demoProjects = loadDemoProjects();
      const projectIndex = demoProjects.findIndex(p => p.id === task.project_id);
      
      if (projectIndex !== -1) {
        const now = new Date().toISOString();
        const newTask: Task = {
          id: generateId(true),
          project_id: task.project_id!,
          name: task.name || 'Untitled Task',
          description: task.description || null, // FIXED: Use null for consistency
          task_type: task.task_type || 'task',
          status: task.status || 'not-started',
          start_date: task.start_date ? new Date(task.start_date).toISOString() : now,
          end_date: task.end_date ? new Date(task.end_date).toISOString() : now,
          dependencies: task.dependencies || [],
          assignee: task.assignee || undefined,
          progress: task.progress || 0,
          custom_fields: task.custom_fields || {},
          created_at: now,
          updated_at: now
        };
        
        if (!demoProjects[projectIndex].tasks) {
          demoProjects[projectIndex].tasks = [];
        }
        demoProjects[projectIndex].tasks.push(newTask);
        demoProjects[projectIndex].lastModified = new Date();
        saveDemoProjects(demoProjects);
        
        return newTask;
      }
      throw new Error('Project not found');
    }

    // For Supabase mode
    const taskData: TaskInsert = {
      project_id: task.project_id!,
      name: task.name!,
      description: task.description || null,
      task_type: task.task_type || 'task',
      status: task.status || 'not-started',
      start_date: task.start_date || new Date().toISOString(),
      end_date: task.end_date || new Date().toISOString(),
      assignee: task.assignee || undefined,
      progress: task.progress || 0,
      dependencies: task.dependencies || [],
      custom_fields: task.custom_fields || {}
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select()
      .single()

    if (error) {
      console.error('Error creating task:', error);
      throw error;
    }

    await this.logActivity(data.project_id, 'task_created', { task_name: data.name }, data.id);
    return data;
  }

  // Update a task
  // FIXED: Added projectId for efficient searching in demo mode
  static async updateTask(id: string, projectId: string, updates: TaskUpdate): Promise<Task> {
    if (!supabase) {
      // Handle demo mode
      const demoProjects = loadDemoProjects();
      const projectIndex = demoProjects.findIndex(p => p.id === projectId);
      
      if (projectIndex !== -1 && demoProjects[projectIndex].tasks) {
        const taskIndex = demoProjects[projectIndex].tasks.findIndex((t: any) => t.id === id);
        if (taskIndex !== -1) {
          // FIXED: Correctly updates timestamp and merges updates
          const updatedTask = {
            ...demoProjects[projectIndex].tasks[taskIndex],
            ...updates,
            updated_at: new Date().toISOString()
          };
          demoProjects[projectIndex].tasks[taskIndex] = updatedTask;
          saveDemoProjects(demoProjects);
          return updatedTask;
        }
      }
      throw new Error('Task not found');
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error;
    await this.logActivity(data.project_id, 'task_updated', updates, id);
    return data;
  }

  // Delete a task
  static async deleteTask(id: string, projectId: string): Promise<void> {
    if (!supabase) {
      // Handle demo mode
      const demoProjects = loadDemoProjects();
      const projectIndex = demoProjects.findIndex(p => p.id === projectId);
      
      if (projectIndex !== -1 && demoProjects[projectIndex].tasks) {
        const initialLength = demoProjects[projectIndex].tasks.length;
        demoProjects[projectIndex].tasks = demoProjects[projectIndex].tasks.filter((t: any) => t.id !== id);
        if (demoProjects[projectIndex].tasks.length < initialLength) {
          saveDemoProjects(demoProjects);
          return;
        }
      }
      throw new Error('Task not found');
    }

    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    await this.logActivity(projectId, 'task_deleted', { task_id: id }, id);
  }

  // Update task progress
  // FIXED: Added projectId and implemented consistent status change logic
  static async updateTaskProgress(id: string, projectId: string, progress: number): Promise<Task> {
    let taskToUpdate: Task | undefined;
    
    // 1. Find the task and determine the new status
    if (!supabase) {
      const demoProjects = loadDemoProjects();
      const project = demoProjects.find(p => p.id === projectId);
      taskToUpdate = project?.tasks?.find((t: any) => t.id === id);
    } else {
      const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single();
      if (error) throw error;
      taskToUpdate = data;
    }

    if (!taskToUpdate) throw new Error('Task not found');

    const updates: TaskUpdate = { progress };
    let newStatus = taskToUpdate.status;

    if (progress <= 0) {
      newStatus = 'not-started';
    } else if (progress >= 100) {
      newStatus = 'completed';
    } else if (newStatus === 'not-started' || newStatus === 'completed') {
      newStatus = 'in-progress';
    }

    if (newStatus !== taskToUpdate.status) {
      updates.status = newStatus;
    }

    // 2. Apply the updates in a single operation
    return this.updateTask(id, projectId, updates);
  }

  // Bulk import tasks
  static async importTasks(tasks: Partial<TaskInsert>[]): Promise<Task[]> {
    if (!supabase) {
      // NOTE: This demo mode implementation is resilient, not atomic.
      // If one task fails, others will still be imported.
      const results: Task[] = [];
      for (const task of tasks) {
        try {
          // This requires project_id to be present on each task object
          if (task.project_id) {
            const result = await this.createTask(task);
            results.push(result);
          } else {
             console.warn('Skipping import for task without project_id:', task.name);
          }
        } catch (error) {
          console.warn('Failed to import task:', task.name, error);
        }
      }
      return results;
    }

    // Supabase mode is atomic: all tasks are inserted or none are.
    const preparedTasks: TaskInsert[] = tasks.map(task => ({
      project_id: task.project_id!,
      name: task.name || 'Untitled Task',
      description: task.description || null,
      task_type: task.task_type || 'task',
      status: task.status || 'not-started',
      start_date: task.start_date || new Date().toISOString(),
      end_date: task.end_date || new Date().toISOString(),
      assignee: task.assignee || undefined,
      progress: task.progress || 0,
      dependencies: task.dependencies || [],
      custom_fields: task.custom_fields || {}
    }));

    const { data, error } = await supabase.from('tasks').insert(preparedTasks).select();

    if (error) {
      console.error('Error importing tasks:', error);
      throw error;
    }

    if (data && data.length > 0) {
      await this.logActivity(data[0].project_id, 'tasks_imported', { count: data.length });
    }
    return data;
  }

  // Get task dependencies
  static async getTaskDependencies(taskId: string): Promise<Task[]> {
    if (!supabase) {
      // Handle demo mode
      const demoProjects = loadDemoProjects();
      let task: Task | undefined;
      let project: any;

      for (const p of demoProjects) {
        task = p.tasks?.find((t: any) => t.id === taskId);
        if (task) {
          project = p;
          break;
        }
      }
      
      if (!task || !project || !task.dependencies || task.dependencies.length === 0) {
        return [];
      }
      
      return project.tasks.filter((t: any) => task!.dependencies.includes(t.id)) || [];
    }

    const { data: task, error } = await supabase
      .from('tasks')
      .select('dependencies, project_id')
      .eq('id', taskId)
      .single()

    if (error) throw error
    if (!task.dependencies || !Array.isArray(task.dependencies) || task.dependencies.length === 0) {
      return []
    }

    const { data: dependencies, error: depsError } = await supabase
      .from('tasks')
      .select('*')
      .in('id', task.dependencies as string[])

    if (depsError) throw depsError
    return dependencies
  }

  // Check if task can be started (all dependencies completed)
  static async canStartTask(taskId: string): Promise<boolean> {
    const dependencies = await this.getTaskDependencies(taskId)
    if (dependencies.length === 0) return true;
    return dependencies.every(dep => dep.status === 'completed' || dep.status === 'done');
  }

  // Subscribe to task changes for a project
  static subscribeToProjectTasks(projectId: string, callback: (payload: any) => void) {
    if (!supabase) return null; // Can't subscribe in demo mode

    return supabase
      .channel(`tasks_${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        callback
      )
      .subscribe()
  }

  // Log activity for audit trail
  private static async logActivity(projectId: string, action: string, changes?: any, taskId?: string) {
    if (!supabase) return; // Skip logging when Supabase is not configured
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase
        .from('activity_log')
        .insert([{
          project_id: projectId,
          task_id: taskId || null,
          user_id: user.id,
          action,
          changes
        }])
    }
  }
}