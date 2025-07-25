-- ####################################################################
-- TABLE DEFINITIONS
-- ####################################################################

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
  created_date TIMESTAMPTZ DEFAULT NOW(),
  last_modified TIMESTAMPTZ DEFAULT NOW(),
  -- CORRECTED: Changed ON DELETE CASCADE to ON DELETE SET NULL.
  -- Deleting a user should not cause a cascading deletion of all their projects.
  -- This prevents accidental mass data loss. Ownership should be transferred at the application level.
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- NOTE: Using JSONB for team members is a denormalized approach.
  -- A dedicated `project_members` junction table would provide better referential integrity.
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
  -- CORRECTED: Changed `assignee` from TEXT to UUID with a foreign key.
  -- This enforces data integrity and allows for proper joins with the users table.
  assignee UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  dependencies JSONB DEFAULT '[]'::jsonb,
  -- NOTE: The name `custom_fields` can be ambiguous. `custom_field_values` might be clearer.
  custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- ADDED: A constraint to ensure logical date ordering.
  CONSTRAINT end_date_after_start_date CHECK (end_date >= start_date)
);

-- Create custom_fields table
CREATE TABLE public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  field_type TEXT CHECK (field_type IN ('text', 'number', 'date', 'select', 'boolean')) NOT NULL,
  required BOOLEAN DEFAULT false,
  options JSONB,
  -- NOTE: `default_value` as TEXT requires careful casting and validation in the application
  -- when the `field_type` is not 'text'.
  default_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create activity_log table
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  -- CORRECTED: Changed ON DELETE CASCADE to ON DELETE SET NULL.
  -- Deleting a user should not erase their activity history, which is crucial for auditing.
  -- This anonymizes the user while preserving the log.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  changes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ####################################################################
-- FUNCTIONS AND TRIGGERS
-- ####################################################################

-- CORRECTED: Create two explicit functions for clarity and correctness.

-- Function to update the 'last_modified' column
CREATE OR REPLACE FUNCTION public.update_last_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_modified = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update the 'updated_at' column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for the projects table
CREATE TRIGGER update_projects_last_modified
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  -- ADDED: Included `team_members` in the check to ensure changes to the team update the timestamp.
  WHEN (OLD IS DISTINCT FROM NEW)
  EXECUTE FUNCTION public.update_last_modified_column();

-- Trigger for the tasks table
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (OLD IS DISTINCT FROM NEW)
  -- CORRECTED: This now calls the correctly defined function.
  EXECUTE FUNCTION public.update_updated_at_column();


-- ####################################################################
-- ROW LEVEL SECURITY (RLS)
-- ####################################################################

-- Enable RLS on all tables
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
CREATE POLICY "Users can view projects they are on"
  ON public.projects FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR team_members @> to_jsonb(auth.uid()::text));

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- CORRECTED: Policy now allows team members to update a project, not just the creator.
CREATE POLICY "Team members can update projects"
  ON public.projects FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR team_members @> to_jsonb(auth.uid()::text))
  WITH CHECK (auth.uid() = created_by OR team_members @> to_jsonb(auth.uid()::text));

-- CORRECTED: Policy now allows team members to delete a project.
-- NOTE: You may want this to be more restrictive (e.g., only creators can delete).
CREATE POLICY "Team members can delete projects"
  ON public.projects FOR DELETE TO authenticated
  USING (auth.uid() = created_by OR team_members @> to_jsonb(auth.uid()::text));


-- A helper function to check project access to avoid repeating logic in policies.
CREATE OR REPLACE FUNCTION public.can_access_project(p_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id
    AND (auth.uid() = created_by OR team_members @> to_jsonb(auth.uid()::text))
  );
END;
$$ LANGUAGE plpgsql;


-- RLS Policies for tasks
-- CORRECTED: Replaced redundant and insecure policies with explicit, secure ones.
CREATE POLICY "Users can view tasks for accessible projects"
  ON public.tasks FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));

CREATE POLICY "Users can insert tasks into accessible projects"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (public.can_access_project(project_id));

CREATE POLICY "Users can update tasks in accessible projects"
  ON public.tasks FOR UPDATE TO authenticated
  USING (public.can_access_project(project_id)) -- Checks the existing row
  WITH CHECK (public.can_access_project(project_id)); -- Checks the new/modified row

CREATE POLICY "Users can delete tasks in accessible projects"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.can_access_project(project_id));


-- RLS Policies for custom_fields
-- CORRECTED: Replaced redundant and insecure policies.
CREATE POLICY "Users can view custom fields for accessible projects"
  ON public.custom_fields FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));

CREATE POLICY "Users can insert custom fields into accessible projects"
  ON public.custom_fields FOR INSERT TO authenticated
  WITH CHECK (public.can_access_project(project_id));

CREATE POLICY "Users can update custom fields in accessible projects"
  ON public.custom_fields FOR UPDATE TO authenticated
  USING (public.can_access_project(project_id))
  WITH CHECK (public.can_access_project(project_id));

CREATE POLICY "Users can delete custom fields in accessible projects"
  ON public.custom_fields FOR DELETE TO authenticated
  USING (public.can_access_project(project_id));


-- RLS Policies for activity_log
CREATE POLICY "Users can view activity for accessible projects"
  ON public.activity_log FOR SELECT TO authenticated
  USING (public.can_access_project(project_id));

-- This policy is well-written and remains unchanged.
CREATE POLICY "Users can create activity logs for accessible projects"
  ON public.activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_access_project(project_id));

-- NOTE: No UPDATE or DELETE policies are defined for `activity_log`,
-- making it an immutable log, which is generally the desired behavior.