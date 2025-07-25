-- Create projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  last_modified TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  team_members JSONB DEFAULT '[]'::jsonb
);

-- Create custom_fields table
CREATE TABLE custom_fields (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT CHECK (field_type IN ('text', 'number', 'date', 'select', 'boolean')) NOT NULL,
  required BOOLEAN DEFAULT false,
  options JSONB,
  default_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT CHECK (task_type IN ('task', 'milestone', 'deliverable')) DEFAULT 'task',
  status TEXT CHECK (status IN ('not-started', 'in-progress', 'completed', 'on-hold')) DEFAULT 'not-started',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  assignee TEXT,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  dependencies JSONB DEFAULT '[]'::jsonb,
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_log table for tracking changes
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects they created or are team members of" ON projects
  FOR SELECT USING (
    created_by = auth.uid() OR 
    auth.uid()::text = ANY(SELECT jsonb_array_elements_text(team_members))
  );

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update projects they created" ON projects
  FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Users can delete projects they created" ON projects
  FOR DELETE USING (created_by = auth.uid());

-- RLS Policies for custom_fields
CREATE POLICY "Users can view custom fields for accessible projects" ON custom_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = custom_fields.project_id 
      AND (projects.created_by = auth.uid() OR 
           auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members)))
    )
  );

CREATE POLICY "Users can manage custom fields for projects they created" ON custom_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = custom_fields.project_id 
      AND projects.created_by = auth.uid()
    )
  );

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks for accessible projects" ON tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND (projects.created_by = auth.uid() OR 
           auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members)))
    )
  );

CREATE POLICY "Users can manage tasks for accessible projects" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = tasks.project_id 
      AND (projects.created_by = auth.uid() OR 
           auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members)))
    )
  );

-- RLS Policies for activity_log
CREATE POLICY "Users can view activity for accessible projects" ON activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = activity_log.project_id 
      AND (projects.created_by = auth.uid() OR 
           auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members)))
    )
  );

CREATE POLICY "Users can create activity logs" ON activity_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Functions to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_project_last_modified()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE projects SET last_modified = NOW() WHERE id = NEW.project_id;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_project_on_task_change AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE PROCEDURE update_project_last_modified();

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE projects;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE custom_fields;
ALTER PUBLICATION supabase_realtime ADD TABLE activity_log;