-- Add project permissions table for fine-grained access control
CREATE TABLE project_permissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  permission_level TEXT CHECK (permission_level IN ('view', 'edit', 'admin')) DEFAULT 'view',
  granted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_email)
);

-- Enable RLS for project_permissions
ALTER TABLE project_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_permissions
CREATE POLICY "Users can view permissions for accessible projects" ON project_permissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_permissions.project_id 
      AND (projects.created_by = auth.uid() OR 
           auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members)))
    )
  );

CREATE POLICY "Project owners can manage permissions" ON project_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_permissions.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- Update existing RLS policies to include permission-based access
DROP POLICY IF EXISTS "Users can view projects they created or are team members of" ON projects;
DROP POLICY IF EXISTS "Users can view tasks for accessible projects" ON tasks;
DROP POLICY IF EXISTS "Users can manage tasks for accessible projects" ON tasks;
DROP POLICY IF EXISTS "Users can view custom fields for accessible projects" ON custom_fields;

-- New RLS policies with permission support
CREATE POLICY "Users can view accessible projects" ON projects
  FOR SELECT USING (
    created_by = auth.uid() OR 
    auth.uid()::text = ANY(SELECT jsonb_array_elements_text(team_members)) OR
    EXISTS (
      SELECT 1 FROM project_permissions 
      WHERE project_permissions.project_id = projects.id 
      AND project_permissions.user_email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view tasks for accessible projects" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND (
        projects.created_by = auth.uid() OR 
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members)) OR
        EXISTS (
          SELECT 1 FROM project_permissions 
          WHERE project_permissions.project_id = projects.id 
          AND project_permissions.user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Users can manage tasks based on permissions" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND (
        projects.created_by = auth.uid() OR 
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members)) OR
        EXISTS (
          SELECT 1 FROM project_permissions 
          WHERE project_permissions.project_id = projects.id 
          AND project_permissions.user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
          )
          AND project_permissions.permission_level IN ('edit', 'admin')
        )
      )
    )
  );

CREATE POLICY "Users can view custom fields for accessible projects" ON custom_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = custom_fields.project_id 
      AND (
        projects.created_by = auth.uid() OR 
        auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members)) OR
        EXISTS (
          SELECT 1 FROM project_permissions 
          WHERE project_permissions.project_id = projects.id 
          AND project_permissions.user_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
          )
        )
      )
    )
  );

-- Function to update updated_at timestamp
CREATE TRIGGER update_project_permissions_updated_at 
BEFORE UPDATE ON project_permissions
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE project_permissions;