import { Plus, Download, Settings, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProjectHeaderProps {
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  onAddTask: () => void;
  onExport: () => void;
}

export function ProjectHeader({ 
  projectName, 
  totalTasks, 
  completedTasks, 
  onAddTask, 
  onExport 
}: ProjectHeaderProps) {
  const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="bg-gradient-to-r from-primary to-professional p-6 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h1 className="text-2xl font-bold text-primary-foreground">{projectName}</h1>
            <div className="flex items-center space-x-4 mt-2">
              <Badge variant="secondary" className="bg-white/20 text-primary-foreground border-0">
                <Calendar className="w-3 h-3 mr-1" />
                {totalTasks} tasks
              </Badge>
              <Badge 
                variant={completionPercentage === 100 ? "default" : "secondary"} 
                className="bg-white/20 text-primary-foreground border-0"
              >
                {completionPercentage}% complete
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            onClick={onAddTask} 
            variant="secondary" 
            className="bg-white/20 hover:bg-white/30 text-primary-foreground border-0"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
          <Button 
            onClick={onExport} 
            variant="secondary" 
            className="bg-white/20 hover:bg-white/30 text-primary-foreground border-0"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="secondary" 
            size="icon"
            className="bg-white/20 hover:bg-white/30 text-primary-foreground border-0"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}