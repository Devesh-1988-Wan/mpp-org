import { supabase } from '@/lib/supabase';
import { connectToSql, db } from '@/lib/sql-server';
import { Project } from '@/types/project';

const backend = import.meta.env.VITE_BACKEND_TYPE;

export class ProjectService {
  static async getUserProjects(): Promise<Project[]> {
    if (backend === 'sqlserver') {
      const request = await connectToSql();
      const result = await request.query('SELECT * FROM projects');
      return result.recordset;
    } else {
      const { data, error } = await supabase.from('projects').select('*');
      if (error) throw error;
      return data;
    }
  }

  static async createProject(project: Omit<Project, 'id' | 'created_date' | 'last_modified' | 'created_by'>): Promise<Project> {
    if (backend === 'sqlserver') {
      const request = await connectToSql();
      const result = await request
        .input('name', db.NVarChar, project.name)
        .input('description', db.NVarChar, project.description)
        .input('status', db.NVarChar, project.status)
        .input('team_members', db.NVarChar, JSON.stringify(project.team_members))
        .query('INSERT INTO projects (name, description, status, team_members) OUTPUT INSERTED.* VALUES (@name, @description, @status, @team_members)');
      return result.recordset[0];
    } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User must be authenticated to create a project.");
      const { data, error } = await supabase.from('projects').insert([{ ...project, created_by: user.id }]).select();
      if (error) throw error;
      return data[0];
    }
  }

  // ... Implement other methods (getProject, updateProject, deleteProject) similarly
}