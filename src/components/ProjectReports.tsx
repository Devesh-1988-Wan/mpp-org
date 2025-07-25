// @ts-nocheck
import { useMemo } from "react";
import { Task } from "@/types/project";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Users, 
  Target,
  TrendingUp,
  Download,
  FileText
} from "lucide-react";
import { format, differenceInDays, isAfter, isBefore } from "date-fns";

interface ProjectReportsProps {
  tasks: Task[];
  onExportReport: () => void;
}

export function ProjectReports({ tasks, onExportReport }: ProjectReportsProps) {
  const analytics = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'completed').length;
    const inProgressTasks = tasks.filter(t => t.status === 'in-progress').length;
    const notStartedTasks = tasks.filter(t => t.status === 'not-started').length;
    const onHoldTasks = tasks.filter(t => t.status === 'on-hold').length;
    
    const milestones = tasks.filter(t => t.type === 'milestone');
    const completedMilestones = milestones.filter(t => t.status === 'completed').length;
    
    const deliverables = tasks.filter(t => t.type === 'deliverable');
    const completedDeliverables = deliverables.filter(t => t.status === 'completed').length;

    const now = new Date();
    const overdueTasks = tasks.filter(t => 
      t.status !== 'completed' && isBefore(t.endDate, now)
    );
    
    const upcomingTasks = tasks.filter(t => 
      t.status === 'not-started' && 
      isAfter(t.startDate, now) && 
      differenceInDays(t.startDate, now) <= 7
    );

    // Team performance
    const teamPerformance = tasks.reduce((acc, task) => {
      if (!task.assignee) return acc;
      
      if (!acc[task.assignee]) {
        acc[task.assignee] = { total: 0, completed: 0, inProgress: 0 };
      }
      
      acc[task.assignee].total++;
      if (task.status === 'completed') acc[task.assignee].completed++;
      if (task.status === 'in-progress') acc[task.assignee].inProgress++;
      
      return acc;
    }, {} as Record<string, { total: number; completed: number; inProgress: number }>);

    // Status distribution for charts
    const statusData = [
      { name: 'Completed', value: completedTasks, color: 'hsl(var(--success))' },
      { name: 'In Progress', value: inProgressTasks, color: 'hsl(var(--primary))' },
      { name: 'Not Started', value: notStartedTasks, color: 'hsl(var(--muted))' },
      { name: 'On Hold', value: onHoldTasks, color: 'hsl(var(--warning))' }
    ];

    // Type distribution
    const typeData = [
      { name: 'Tasks', value: tasks.filter(t => t.type === 'task').length },
      { name: 'Milestones', value: milestones.length },
      { name: 'Deliverables', value: deliverables.length }
    ];

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      notStartedTasks,
      onHoldTasks,
      milestones: milestones.length,
      completedMilestones,
      deliverables: deliverables.length,
      completedDeliverables,
      overdueTasks,
      upcomingTasks,
      teamPerformance,
      statusData,
      typeData,
      completionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
      milestoneCompletionRate: milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0,
      deliverableCompletionRate: deliverables.length > 0 ? Math.round((completedDeliverables / deliverables.length) * 100) : 0
    };
  }, [tasks]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Project Analytics & Reports</h2>
          <p className="text-muted-foreground">Comprehensive insights into your project progress</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onExportReport}>
            <FileText className="w-4 h-4 mr-2" />
            Export Report
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Project Completion</p>
              <p className="text-3xl font-bold text-primary">{analytics.completionRate}%</p>
            </div>
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
          <Progress value={analytics.completionRate} className="mt-4" />
          <p className="text-xs text-muted-foreground mt-2">
            {analytics.completedTasks} of {analytics.totalTasks} tasks completed
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Milestones</p>
              <p className="text-3xl font-bold text-milestone">{analytics.completedMilestones}/{analytics.milestones}</p>
            </div>
            <div className="w-12 h-12 bg-milestone/10 rounded-full flex items-center justify-center">
              <Target className="w-6 h-6 text-milestone" />
            </div>
          </div>
          <Progress value={analytics.milestoneCompletionRate} className="mt-4" />
          <p className="text-xs text-muted-foreground mt-2">
            {analytics.milestoneCompletionRate}% milestone completion rate
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Overdue Tasks</p>
              <p className="text-3xl font-bold text-destructive">{analytics.overdueTasks.length}</p>
            </div>
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
          </div>
          {analytics.overdueTasks.length > 0 && (
            <div className="mt-2">
              <Badge variant="destructive" className="text-xs">
                Requires Attention
              </Badge>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Upcoming Tasks</p>
              <p className="text-3xl font-bold text-warning">{analytics.upcomingTasks.length}</p>
            </div>
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center">
              <Calendar className="w-6 h-6 text-warning" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Starting within next 7 days
          </p>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Task Status Distribution</h3>
          <div className="space-y-4">
            {analytics.statusData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">{item.value} tasks</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={analytics.totalTasks > 0 ? (item.value / analytics.totalTasks) * 100 : 0} 
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground min-w-[40px]">
                    {analytics.totalTasks > 0 ? Math.round((item.value / analytics.totalTasks) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Task Types */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Task Types Breakdown</h3>
          <div className="space-y-4">
            {analytics.typeData.map((item, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">{item.name}</span>
                  <span className="text-sm text-muted-foreground">{item.value} items</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={analytics.totalTasks > 0 ? (item.value / analytics.totalTasks) * 100 : 0} 
                    className="flex-1"
                  />
                  <span className="text-xs text-muted-foreground min-w-[40px]">
                    {analytics.totalTasks > 0 ? Math.round((item.value / analytics.totalTasks) * 100) : 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Team Performance */}
      {Object.keys(analytics.teamPerformance).length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Team Performance
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analytics.teamPerformance).map(([assignee, stats]) => {
              const completionRate = Math.round((stats.completed / stats.total) * 100);
              return (
                <div key={assignee} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{assignee}</h4>
                    <Badge variant="outline">{completionRate}%</Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Tasks:</span>
                      <span>{stats.total}</span>
                    </div>
                    <div className="flex justify-between text-sm text-success">
                      <span>Completed:</span>
                      <span>{stats.completed}</span>
                    </div>
                    <div className="flex justify-between text-sm text-primary">
                      <span>In Progress:</span>
                      <span>{stats.inProgress}</span>
                    </div>
                    <Progress value={completionRate} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Issues & Recommendations */}
      {(analytics.overdueTasks.length > 0 || analytics.upcomingTasks.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {analytics.overdueTasks.length > 0 && (
            <Card className="p-6 border-destructive/20 bg-destructive/5">
              <h3 className="text-lg font-semibold mb-4 text-destructive flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Overdue Tasks ({analytics.overdueTasks.length})
              </h3>
              <div className="space-y-2">
                {analytics.overdueTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex justify-between items-center p-2 bg-background rounded">
                    <div>
                      <p className="font-medium">{task.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {format(task.endDate, 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Badge variant="destructive">{task.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {analytics.upcomingTasks.length > 0 && (
            <Card className="p-6 border-warning/20 bg-warning/5">
              <h3 className="text-lg font-semibold mb-4 text-warning flex items-center">
                <Clock className="w-5 h-5 mr-2" />
                Upcoming Tasks ({analytics.upcomingTasks.length})
              </h3>
              <div className="space-y-2">
                {analytics.upcomingTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="flex justify-between items-center p-2 bg-background rounded">
                    <div>
                      <p className="font-medium">{task.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Starts: {format(task.startDate, 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <Badge variant="secondary">{task.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}