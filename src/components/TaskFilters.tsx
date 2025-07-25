// @ts-nocheck
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, X, SlidersHorizontal } from "lucide-react";
import { Task, TaskStatus, TaskType } from "@/types/project";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TaskFiltersProps {
  tasks: Task[];
  onFilteredTasks: (filteredTasks: Task[]) => void;
}

export function TaskFilters({ tasks, onFilteredTasks }: TaskFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<TaskType | "all">("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  // Get unique assignees
  const uniqueAssignees = Array.from(new Set(tasks.map(task => task.assignee).filter(Boolean)));

  // Apply filters
  const applyFilters = () => {
    let filtered = tasks;

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(task =>
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        task.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(task => task.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(task => task.type === typeFilter);
    }

    // Assignee filter
    if (assigneeFilter !== "all") {
      filtered = filtered.filter(task => task.assignee === assigneeFilter);
    }

    onFilteredTasks(filtered);
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
    setAssigneeFilter("all");
    onFilteredTasks(tasks);
  };

  // Check if any filters are active
  const hasActiveFilters = searchTerm.trim() || statusFilter !== "all" || typeFilter !== "all" || assigneeFilter !== "all";

  // Apply filters whenever any filter changes
  useEffect(() => {
    applyFilters();
  }, [searchTerm, statusFilter, typeFilter, assigneeFilter, tasks]);

  return (
    <div className="bg-card rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <h3 className="font-medium">Filter & Search Tasks</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="w-4 h-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tasks by name or description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Status</label>
          <Select value={statusFilter} onValueChange={(value: TaskStatus | "all") => setStatusFilter(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="not-started">Not Started</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on-hold">On Hold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Type Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <Select value={typeFilter} onValueChange={(value: TaskType | "all") => setTypeFilter(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="milestone">Milestone</SelectItem>
              <SelectItem value="deliverable">Deliverable</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Assignee Filter */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Assignee</label>
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {uniqueAssignees.map(assignee => (
                <SelectItem key={assignee} value={assignee}>{assignee}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Actions */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quick Filters</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full">
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Quick Filters
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56" align="end">
              <div className="space-y-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setStatusFilter("completed")}
                >
                  Show Completed Only
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setStatusFilter("in-progress")}
                >
                  Show In Progress Only
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setTypeFilter("milestone")}
                >
                  Show Milestones Only
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={() => setTypeFilter("deliverable")}
                >
                  Show Deliverables Only
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-muted-foreground">Active filters:</span>
          {searchTerm.trim() && (
            <Badge variant="secondary">
              Search: "{searchTerm}"
              <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setSearchTerm("")} />
            </Badge>
          )}
          {statusFilter !== "all" && (
            <Badge variant="secondary">
              Status: {statusFilter.replace('-', ' ')}
              <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setStatusFilter("all")} />
            </Badge>
          )}
          {typeFilter !== "all" && (
            <Badge variant="secondary">
              Type: {typeFilter}
              <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setTypeFilter("all")} />
            </Badge>
          )}
          {assigneeFilter !== "all" && (
            <Badge variant="secondary">
              Assignee: {assigneeFilter}
              <X className="w-3 h-3 ml-1 cursor-pointer" onClick={() => setAssigneeFilter("all")} />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}