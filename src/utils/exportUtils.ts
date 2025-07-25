// @ts-nocheck
import { Task, Project } from "@/types/project";
import { format } from "date-fns";

export function exportToCSV(tasks: Task[], projectName: string = 'Project') {
  const headers = [
    'Task Name',
    'Type',
    'Status',
    'Start Date',
    'End Date',
    'Duration (days)',
    'Assignee',
    'Progress (%)',
    'Dependencies',
    'Description'
  ];

  const csvData = tasks.map(task => {
    const duration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return [
      task.name,
      task.type,
      task.status,
      format(task.startDate, 'yyyy-MM-dd'),
      format(task.endDate, 'yyyy-MM-dd'),
      duration.toString(),
      task.assignee || '',
      task.progress.toString(),
      task.dependencies.join('; '),
      task.description
    ];
  });

  const csvContent = [headers, ...csvData]
    .map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${projectName}_tasks_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function exportToExcel(tasks: Task[], projectName: string = 'Project') {
  // For Excel export, we'll generate a more structured CSV that Excel can interpret
  const headers = [
    'ID',
    'Task Name',
    'Type',
    'Status', 
    'Start Date',
    'End Date',
    'Duration (days)',
    'Assignee',
    'Progress (%)',
    'Dependencies',
    'Description'
  ];

  const excelData = tasks.map(task => {
    const duration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return [
      task.id,
      task.name,
      task.type.charAt(0).toUpperCase() + task.type.slice(1),
      task.status.charAt(0).toUpperCase() + task.status.slice(1).replace('-', ' '),
      format(task.startDate, 'MM/dd/yyyy'),
      format(task.endDate, 'MM/dd/yyyy'),
      duration,
      task.assignee || 'Unassigned',
      task.progress,
      task.dependencies.length > 0 ? task.dependencies.join(', ') : 'None',
      task.description || 'No description'
    ];
  });

  // Add summary section
  const summaryHeaders = ['Project Summary', '', '', '', '', '', '', '', '', '', ''];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  
  const summaryData = [
    ['Total Tasks', totalTasks, '', '', '', '', '', '', '', '', ''],
    ['Completed Tasks', completedTasks, '', '', '', '', '', '', '', '', ''],
    ['In Progress Tasks', inProgressTasks, '', '', '', '', '', '', '', '', ''],
    ['Completion Rate', `${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%`, '', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', '', '', ''] // Empty row
  ];

  const csvContent = [summaryHeaders, ...summaryData, headers, ...excelData]
    .map(row => row.map(cell => `"${cell.toString().replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${projectName}_project_plan_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

export function generateProjectSummary(tasks: Task[]): string {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed').length;
  const inProgressTasks = tasks.filter(task => task.status === 'in-progress').length;
  const milestones = tasks.filter(task => task.type === 'milestone').length;
  const deliverables = tasks.filter(task => task.type === 'deliverable').length;

  return `Project Summary:
- Total Tasks: ${totalTasks}
- Completed: ${completedTasks} (${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%)
- In Progress: ${inProgressTasks}
- Milestones: ${milestones}
- Deliverables: ${deliverables}`;
}