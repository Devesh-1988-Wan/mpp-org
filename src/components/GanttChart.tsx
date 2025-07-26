import { useMemo } from "react";
import { format, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval, addDays, isSameDay } from "date-fns";
import { Task, CustomField } from "@/types/project";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit2, Trash2 } from "lucide-react";
import { adaptTaskForLegacyComponents } from "@/utils/typeCompatibility";

interface GanttChartProps {
  tasks: Task[];
  customFields: CustomField[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
}

export function GanttChart({ tasks, customFields, onEditTask, onDeleteTask }: GanttChartProps) {
  // Convert tasks to legacy format for compatibility
  const adaptedTasks = tasks.map(adaptTaskForLegacyComponents);
  
  const { dateRange, dayColumns, taskRows } = useMemo(() => {
    if (adaptedTasks.length === 0) {
      const today = new Date();
      return {
        dateRange: { start: today, end: addDays(today, 30) },
        dayColumns: [],
        taskRows: []
      };
    }

    const allDates = adaptedTasks.flatMap(task => [task.startDate, task.endDate]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));

    const start = startOfWeek(minDate);
    const end = endOfWeek(maxDate);
    
    const days = eachDayOfInterval({ start, end });
    const totalDays = days.length;

    const rows = adaptedTasks.map(task => {
      const taskStart = Math.max(0, differenceInDays(task.startDate, start));
      const taskDuration = differenceInDays(task.endDate, task.startDate) + 1;
      const taskWidth = Math.min(taskDuration, totalDays - taskStart);

      return {
        task,
        startOffset: (taskStart / totalDays) * 100,
        width: (taskWidth / totalDays) * 100,
        duration: differenceInDays(task.endDate, task.startDate) + 1
      };
    });

    return {
      dateRange: { start, end },
      dayColumns: days,
      taskRows: rows
    };
  }, [adaptedTasks]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success';
      case 'in-progress': return 'bg-primary';
      case 'on-hold': return 'bg-warning';
      case 'done': return 'bg-success';
      case 'dev-in-progress': return 'bg-primary';
      case 'on-going': return 'bg-primary';
      default: return 'bg-muted';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'milestone': return '◆';
      case 'deliverable': return '📦';
      default: return '■';
    }
  };

  const isToday = (date: Date) => isSameDay(date, new Date());

  const renderCustomFields = (task: Task) => {
    if (!task.custom_fields || !customFields) return null;

    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {customFields.map(field => {
          const value = task.custom_fields[field.id];
          if (value === undefined || value === null) return null;

          return (
            <Badge key={field.id} variant="secondary" className="text-xs font-normal">
              {field.name}: {String(value)}
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-card rounded-lg border overflow-hidden">
      <div className="p-4 border-b bg-muted/30">
        <h3 className="font-semibold text-foreground">Project Timeline</h3>
      </div>

      <div className="overflow-auto">
        {/* Header with dates */}
        <div className="flex border-b bg-timeline-bg min-w-max">
          <div className="w-80 p-3 border-r bg-card font-medium">
            Task Details
          </div>
          <div className="flex-1 flex">
            {dayColumns.map((day, index) => (
              <div
                key={index}
                className={`flex-1 min-w-[40px] p-2 text-center text-xs border-r ${
                  isToday(day) ? 'bg-primary/20 font-semibold text-primary' : ''
                }`}
              >
                <div>{format(day, 'dd')}</div>
                <div className="text-muted-foreground">{format(day, 'MMM')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Task rows */}
        {taskRows.map(({ task, startOffset, width }) => (
          <div key={task.id} className="flex border-b hover:bg-muted/20 min-w-max">
            <div className="w-80 p-3 border-r bg-card">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getTypeIcon(task.type)}</span>
                    <span className="font-medium truncate">{task.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(task.status)} text-white border-0`}
                    >
                      {task.status.replace('-', ' ')}
                    </Badge>
                    {task.assignee && (
                      <span className="text-xs text-muted-foreground">{task.assignee}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {format(task.startDate, 'MMM dd')} - {format(task.endDate, 'MMM dd')}
                  </div>
                  {renderCustomFields(task)}
                </div>
                <div className="flex space-x-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6"
                    onClick={() => onEditTask(task)}
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    onClick={() => onDeleteTask(task.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex-1 relative p-3">
              <div 
                className={`absolute top-1/2 transform -translate-y-1/2 h-6 rounded ${getStatusColor(task.status)} ${
                  task.type === 'milestone' ? 'h-3 rotate-45' : ''
                }`}
                style={{
                  left: `${startOffset}%`,
                  width: task.type === 'milestone' ? '12px' : `${width}%`
                }}
              >
                {task.type !== 'milestone' && (
                  <div 
                    className="h-full bg-white/20 rounded-l"
                    style={{ width: `${task.progress}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}

        {tasks.length === 0 && (
          <div className="p-8 text-center text-muted-foreground">
            <p>No tasks yet. Add your first task to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
}