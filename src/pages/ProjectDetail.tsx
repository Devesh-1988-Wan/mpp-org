import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Task, Project } from "@/types/project";
import { ProjectService } from "@/services/projectService";
import { TaskService } from "@/services/taskService";
import { ProjectHeader } from "@/components/ProjectHeader";
import { TaskForm } from "@/components/TaskForm";
import { ImportData } from "@/components/ImportData";
import { DashboardTabs } from "@/components/DashboardTabs";
import { CustomFieldsManager } from "@/components/CustomFieldsManager";
import { ProjectPermissions } from "@/components/ProjectPermissions";
import { exportToCSV, exportToExcel } from "@/utils/exportUtils";
import { generateId } from "@/utils/idGenerator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/auth/UserMenu";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeft, Loader2 } from "lucide-react";

const ProjectDetail = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();

  useEffect(() => {
    if (projectId) {
      loadProject(projectId);
    }
  }, [projectId]);

  const loadProject = async (id: string) => {
    try {
      setLoading(true);
      console.log('Loading project with ID:', id);
      const projectData = await ProjectService.getProject(id);
      console.log('Project data received:', projectData);
      
      if (projectData) {
        // Ensure the project has all required properties
        const normalizedProject = {
          ...projectData,
          tasks: projectData.tasks || [],
          customFields: projectData.customFields || [],
          teamMembers: projectData.teamMembers || [],
          createdDate: projectData.createdDate ? new Date(projectData.createdDate) : new Date(),
          lastModified: projectData.lastModified ? new Date(projectData.lastModified) : new Date()
        };
        console.log('Normalized project:', normalizedProject);
        setProject(normalizedProject);
      } else {
        console.error('Project data is null/undefined');
        throw new Error('Project not found');
      }
    } catch (error) {
      console.error('Error loading project:', error);
      toast({
        title: "Project Not Found",
        description: "The requested project could not be found.",
        variant: "destructive"
      });
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const projectStats = useMemo(() => {
    if (!project) return { total: 0, completed: 0, inProgress: 0, impacted: 0 ,milestones: 0 };
    
    const total = project.tasks.length;
    const completed = project.tasks.filter(task => task.status === 'completed').length;
    const inProgress = project.tasks.filter(task => task.status === 'in-progress').length;
    const impacted = project.tasks.filter(task => task.task_type === 'impacted').length;
    const milestones = project.tasks.filter(task => task.task_type === 'milestone').length;
    
    return { total, completed, inProgress,impacted, milestones };
  }, [project]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Loading Project...</h2>
          <p className="text-muted-foreground">Please wait while we load your project.</p>
        </div>
      </div>
    );
  }

  const handleAddTask = () => {
    setEditingTask(undefined);
    setShowTaskForm(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setShowTaskForm(true);
  };

  const handleSaveTask = async (taskData: Omit<Task, 'id'>) => {
    try {
      if (editingTask) {
        // Update existing task
        await TaskService.updateTask(editingTask.id, taskData);
        const updatedTasks = project.tasks.map(task => 
          task.id === editingTask.id 
            ? { ...taskData, id: editingTask.id }
            : task
        );
        const updatedProject = { ...project, tasks: updatedTasks, lastModified: new Date() };
        setProject(updatedProject);
        
        // Update project in storage
        await ProjectService.updateProject(project.id, updatedProject);
        
        toast({
          title: "Task Updated",
          description: `"${taskData.name}" has been updated successfully.`,
        });
      } else {
        // Create new task with proper ID handling
        const newTaskData = {
          ...taskData,
          project_id: project.id,
          projectId: project.id // Add both for compatibility
        };
        
        console.log('Creating new task:', newTaskData);
        const createdTask = await TaskService.createTask(newTaskData);
        console.log('Task created with ID:', createdTask.id);
        
        // Convert database response to Task type using type casting for now
        const newTask: Task = {
          id: createdTask.id,
          project_id: project.id,
          name: createdTask.name,
          description: createdTask.description || '',
          task_type: createdTask.task_type || 'task',
          status: createdTask.status || 'not-started',
          start_date: createdTask.start_date || new Date().toISOString().split('T')[0],
          end_date: createdTask.end_date || new Date().toISOString().split('T')[0],
          assignee: createdTask.assignee || '',
          progress: createdTask.progress || 0,
          dependencies: Array.isArray(createdTask.dependencies) ? createdTask.dependencies : [],
          custom_fields: createdTask.custom_fields || {},
          created_at: createdTask.created_at || new Date().toISOString(),
          updated_at: createdTask.updated_at || new Date().toISOString()
        };
        
        const updatedProject = { 
          ...project, 
          tasks: [...project.tasks, newTask], 
          lastModified: new Date() 
        };
        setProject(updatedProject);
        
        // Update project in storage
        await ProjectService.updateProject(project.id, updatedProject);
        
        toast({
          title: "Task Created", 
          description: `"${taskData.name}" has been added to your project.`,
        });
      }
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: "Failed to save task. Please try again.",
        variant: "destructive"
      });
    }
    setShowTaskForm(false);
    setEditingTask(undefined);
  };

  const handleImportTasks = async (importedTasks: Omit<Task, 'id'>[]) => {
    try {
      // Prepare tasks for import with proper structure
      const tasksToImport = importedTasks.map(task => ({
        ...task,
        project_id: project.id,
        projectId: project.id
      }));
      
      // Use TaskService to properly import with UUID generation
      const createdTasks = await TaskService.importTasks(tasksToImport);
      
      // Convert created tasks to proper Task format
      const newTasks: Task[] = createdTasks.map(createdTask => ({
        ...createdTask,
        id: createdTask.id,
        type: createdTask.task_type || 'task',
        startDate: new Date(createdTask.start_date),
        endDate: new Date(createdTask.end_date),
        customFields: createdTask.custom_fields || {}
      }));
      
      const updatedProject = { 
        ...project, 
        tasks: [...project.tasks, ...newTasks], 
        lastModified: new Date() 
      };
      
      setProject(updatedProject);
      
      // Persist to storage
      await ProjectService.updateProject(project.id, updatedProject);
      
      toast({
        title: "Import Successful",
        description: `Imported ${newTasks.length} tasks successfully.`,
      });
    } catch (error) {
      console.error('Error importing tasks:', error);
      toast({
        title: "Import Failed",
        description: "Failed to import tasks. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const taskToDelete = project.tasks.find(task => task.id === taskId);
      const updatedTasks = project.tasks.filter(task => task.id !== taskId);
      
      const updatedProject = { ...project, tasks: updatedTasks, lastModified: new Date() };
      setProject(updatedProject);
      
      // Delete from task service
      await TaskService.deleteTask(taskId, project.id);
      
      // Persist project changes
      await ProjectService.updateProject(project.id, updatedProject);
      
      if (taskToDelete) {
        toast({
          title: "Task Deleted",
          description: `"${taskToDelete.name}" has been removed from your project.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Delete Failed",
        description: "Failed to delete task. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleExport = () => {
    exportToExcel(project.tasks, project.name);
    toast({
      title: "Export Successful",
      description: "Your project plan has been exported to CSV format.",
    });
  };

  const handleUpdateCustomFields = async (customFields: Project['customFields']) => {
    try {
      const updatedProject = { ...project, customFields, lastModified: new Date() };
      setProject(updatedProject);
      
      // Persist to storage
      await ProjectService.updateProject(project.id, updatedProject);
      
      toast({
        title: "Custom Fields Updated",
        description: "Custom fields have been updated successfully.",
      });
    } catch (error) {
      console.error('Error updating custom fields:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update custom fields. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle bulk update operations
  const handleBulkUpdate = async (updatedTasks: Omit<Task, 'id'>[]) => {
    try {
      const updatedTasksWithIds = project.tasks.map(existingTask => {
        const updatedTask = updatedTasks.find(t => t.name === existingTask.name);
        return updatedTask ? { ...updatedTask, id: existingTask.id } : existingTask;
      });
      
      const updatedProject = {
        ...project,
        tasks: updatedTasksWithIds,
        lastModified: new Date()
      };
      
      setProject(updatedProject);
      await ProjectService.updateProject(project.id, updatedProject);
      
      toast({
        title: "Bulk Update Successful",
        description: `Updated ${updatedTasks.length} tasks successfully.`,
      });
    } catch (error) {
      console.error('Error in bulk update:', error);
      toast({
        title: "Bulk Update Failed",
        description: "Failed to update tasks. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Handle bulk delete operations
  const handleBulkDelete = async (taskNames: string[]) => {
    try {
      const updatedTasks = project.tasks.filter(task => !taskNames.includes(task.name));
      
      const updatedProject = {
        ...project,
        tasks: updatedTasks,
        lastModified: new Date()
      };
      
      setProject(updatedProject);
      await ProjectService.updateProject(project.id, updatedProject);
      
      toast({
        title: "Bulk Delete Successful",
        description: `Deleted ${taskNames.length} tasks successfully.`,
        variant: "destructive"
      });
    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast({
        title: "Bulk Delete Failed",
        description: "Failed to delete tasks. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Project not found</h2>
          <p className="text-muted-foreground">The project could not be loaded.</p>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Back Navigation */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/projects')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
            <UserMenu />
          </div>
        </div>
      </div>

      <ProjectHeader
        projectName={project.name}
        totalTasks={projectStats.total}
        completedTasks={projectStats.completed}
        onAddTask={handleAddTask}
        onExport={handleExport}
      />

      <div className="container mx-auto p-6 space-y-6">
        {/* Project Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="text-2xl font-bold text-primary">{projectStats.total}</div>
            <div className="text-sm text-muted-foreground">Total Tasks</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-success">{projectStats.completed}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-warning">{projectStats.inProgress}</div>
            <div className="text-sm text-muted-foreground">In Progress</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-warning">{projectStats.impacted}</div>
            <div className="text-sm text-muted-foreground">Impacted</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-milestone">{projectStats.milestones}</div>
            <div className="text-sm text-muted-foreground">Milestones</div>
          </Card>
        </div>

        {/* Team Management and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex gap-2 flex-wrap">
              <ImportData 
                onImport={handleImportTasks}
                onBulkUpdate={handleBulkUpdate}
                onBulkDelete={handleBulkDelete}
                existingTasks={project.tasks}
                customFields={project.customFields}
              />
              <CustomFieldsManager 
                customFields={project.customFields} 
                onUpdate={handleUpdateCustomFields}
              />
              <Button onClick={handleAddTask}>
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
          
          <div>
            <ProjectPermissions
              projectId={project.id}
              teamMembers={project.team_members || []}
              onUpdateTeamMembers={async (members) => {
                const updatedProject = { ...project, team_members: members, last_modified: new Date().toISOString() };
                setProject(updatedProject);
                await ProjectService.updateProject(project.id, { team_members: members });
              }}
              isOwner={user?.id === project.created_by || !project.created_by}
            />
          </div>
        </div>

        {/* Task Form */}
        {showTaskForm && (
          <TaskForm
            onSave={handleSaveTask}
            onCancel={() => {
              setShowTaskForm(false);
              setEditingTask(undefined);
            }}
            existingTasks={project.tasks}
            editTask={editingTask}
            customFields={project.customFields}
          />
        )}

        {/* Dashboard Tabs */}
        <DashboardTabs
          tasks={project.tasks}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onExportReport={handleExport}
          customFields={project.customFields}
        />
      </div>
    </div>
  );
};

export default ProjectDetail;