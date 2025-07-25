-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  last_modified TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  team_members JSONB DEFAULT '[]'::jsonb
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
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

-- Create custom_fields table
CREATE TABLE public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  field_type TEXT CHECK (field_type IN ('text', 'number', 'date', 'select', 'boolean')) NOT NULL,
  required BOOLEAN DEFAULT false,
  options JSONB,
  default_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all new tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects they created or are team members of" 
ON public.projects 
FOR SELECT 
TO authenticated 
USING (
  created_by = auth.uid() OR 
  auth.uid()::text = ANY(SELECT jsonb_array_elements_text(team_members))
);

CREATE POLICY "Users can create their own projects" 
ON public.projects 
FOR INSERT 
TO authenticated 
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Project creators can update their projects" 
ON public.projects 
FOR UPDATE 
TO authenticated 
USING (created_by = auth.uid());

CREATE POLICY "Project creators can delete their projects" 
ON public.projects 
FOR DELETE 
TO authenticated 
USING (created_by = auth.uid());

-- RLS Policies for tasks
CREATE POLICY "Users can view tasks for accessible projects" 
ON public.tasks 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = tasks.project_id 
    AND (
      projects.created_by = auth.uid() OR 
      auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members))
    )
  )
);

CREATE POLICY "Users can manage tasks for accessible projects" 
ON public.tasks 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = tasks.project_id 
    AND (
      projects.created_by = auth.uid() OR 
      auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members))
    )
  )
);

-- RLS Policies for custom_fields
CREATE POLICY "Users can view custom fields for accessible projects" 
ON public.custom_fields 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = custom_fields.project_id 
    AND (
      projects.created_by = auth.uid() OR 
      auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members))
    )
  )
);

CREATE POLICY "Users can manage custom fields for accessible projects" 
ON public.custom_fields 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = custom_fields.project_id 
    AND (
      projects.created_by = auth.uid() OR 
      auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members))
    )
  )
);

-- RLS Policies for activity_log
CREATE POLICY "Users can view activity for accessible projects" 
ON public.activity_log 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = activity_log.project_id 
    AND (
      projects.created_by = auth.uid() OR 
      auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members))
    )
  )
);

CREATE POLICY "Users can create activity logs for accessible projects" 
ON public.activity_log 
FOR INSERT 
TO authenticated 
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.projects 
    WHERE projects.id = activity_log.project_id 
    AND (
      projects.created_by = auth.uid() OR 
      auth.uid()::text = ANY(SELECT jsonb_array_elements_text(projects.team_members))
    )
  )
);

-- Create triggers for updated_at timestamps
-- First, drop the old trigger if it exists
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
-- Now, create the new trigger with a conditional clause
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  WHEN (OLD.project_name IS DISTINCT FROM NEW.name)
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();