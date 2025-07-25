import { useState, useEffect } from "react";
import { Project } from "@/types/project";
import { ProjectService } from "@/services/projectService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FolderOpen, Calendar, Users, Archive, Loader2 } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { useNavigate } from "react-router-dom";
import { ProjectForm } from "@/components/ProjectForm";
import { useToast } from "@/hooks/use-toast";
import { UserMenu } from "@/components/auth/UserMenu";
import { useAuth } from "@/contexts/AuthContext";

// Helper function to safely format dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'Unknown';
  try {
    const date = new Date(dateString);
    if (!isValid(date)) return 'Unknown';
    return format(date, 'MMM dd, yyyy');
  } catch {
    return 'Unknown';
  }
};

const Projects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>();
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed' | 'archived'>('all');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await ProjectService.getUserProjects();
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      toast({
        title: "Error Loading Projects",
        description: "Failed to load your projects. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = projects.filter(project => 
    filterStatus === 'all' || project.status === filterStatus
  );

  const handleCreateProject = () => {
    setEditingProject(undefined);
    setShowProjectForm(true);
  };

  const handleEditProject = (project: Project) => {
    setEditingProject(project);
    setShowProjectForm(true);
  };

  const handleSaveProject = async (projectData: Omit<Project, 'id' | 'created_date' | 'last_modified' | 'created_by'>) => {
    try {
      if (editingProject) {
        // Update existing project
        await ProjectService.updateProject(editingProject.id, {
          name: projectData.name,
          description: projectData.description,
          status: projectData.status,
          team_members: projectData.team_members
        });
        toast({
          title: "Project Updated",
          description: `"${projectData.name}" has been updated successfully.`,
        });
      } else {
        // Create new project
        const newProject = await ProjectService.createProject({
          name: projectData.name,
          description: projectData.description,
          status: projectData.status,
          team_members: projectData.team_members
        });
        toast({
          title: "Project Created",
          description: `"${projectData.name}" has been created successfully.`,
        });
        // Navigate to the new project
        navigate(`/project/${newProject.id}`);
      }
      
      // Reload projects list
      await loadProjects();
      setShowProjectForm(false);
      setEditingProject(undefined);
    } catch (error) {
      console.error('Error saving project:', error);
      toast({
        title: "Error",
        description: "Failed to save project. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const project = projects.find(p => p.id === projectId);
      await ProjectService.deleteProject(projectId);
      await loadProjects();
      if (project) {
        toast({
          title: "Project Deleted",
          description: `"${project.name}" has been deleted.`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: "Error",
        description: "Failed to delete project. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/project/${projectId}`);
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'completed': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'archived': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Projects</h1>
              <p className="text-muted-foreground">
                Welcome back, {user?.email?.split('@')[0]}! Manage your project portfolio
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleCreateProject}>
                <Plus className="w-4 h-4 mr-2" />
                New Project
              </Button>
              <UserMenu />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-2" />
            <span>Loading projects...</span>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex gap-2">
              {(['all', 'active', 'completed', 'archived'] as const).map((status) => (
                <Button
                  key={status}
                  variant={filterStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilterStatus(status)}
                >
                  {status === 'all' ? 'All Projects' : status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>

            {/* Project Form */}
            {showProjectForm && (
              <ProjectForm
                onSave={handleSaveProject}
                onCancel={() => {
                  setShowProjectForm(false);
                  setEditingProject(undefined);
                }}
                editProject={editingProject}
              />
            )}

            {/* Projects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {project.description}
                        </CardDescription>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(project.status)}
                      >
                        {project.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(project.created_date)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {project.team_members?.length || 0}
                      </div>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      Last updated: {formatDate(project.last_modified)}
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleOpenProject(project.id)}
                        className="flex-1"
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Open
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditProject(project)}
                      >
                        Edit
                      </Button>
                      {project.status !== 'archived' && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteProject(project.id)}
                        >
                          <Archive className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredProjects.length === 0 && !loading && (
              <div className="text-center py-12">
                <FolderOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  No projects found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {filterStatus === 'all' 
                    ? 'Create your first project to get started.' 
                    : `No ${filterStatus} projects found.`}
                </p>
                {filterStatus === 'all' && (
                  <Button onClick={handleCreateProject}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Project
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Projects;