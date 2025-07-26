import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderOpen, Plus, BarChart3, Users, Loader2 } from "lucide-react"; // Import Loader2
import { useAuth } from "@/contexts/AuthContext";
import { AuthForms } from "@/components/auth/AuthForms";
import { UserMenu } from "@/components/auth/UserMenu";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth(); // Destructure the loading state

  // Add this block to handle the loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Project Management</h2>
            {user && <UserMenu />}
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-6 py-24 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6">
            Project Management
            <span className="text-primary block">Made Simple</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Plan, track, and manage your projects with powerful tools for teams. 
            Create Gantt charts, manage dependencies, and export to Excel.
          </p>
          
          {user ? (
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={() => navigate('/projects')}>
                <FolderOpen className="w-5 h-5 mr-2" />
                View Projects
              </Button>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <AuthForms onSuccess={() => navigate('/projects')} />
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Everything you need to manage projects
          </h2>
          <p className="text-lg text-muted-foreground">
            Professional project management tools that scale with your team
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Gantt Charts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Visualize project timelines, dependencies, and milestones with interactive Gantt charts.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Team Collaboration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Assign tasks, track progress, and collaborate with team members efficiently.
              </p>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-primary" />
                Custom Fields
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Add custom fields to capture project-specific information and requirements.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Button size="lg" onClick={() => navigate('/projects')}>
            Get Started Today
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;