import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, Plus, Trash2 } from "lucide-react";
import { Project } from "@/types/project";

interface ProjectFormProps {
  onSave: (project: Omit<Project, 'id' | 'created_date' | 'last_modified' | 'created_by'>) => void;
  onCancel: () => void;
  editProject?: Project;
}

export function ProjectForm({ onSave, onCancel, editProject }: ProjectFormProps) {
  const [name, setName] = useState(editProject?.name || '');
  const [description, setDescription] = useState(editProject?.description || '');
  const [status, setStatus] = useState<Project['status']>(editProject?.status || 'active');
  const [teamMembers, setTeamMembers] = useState<string[]>(editProject?.team_members || []);
  const [newMember, setNewMember] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      return;
    }

    const projectData: Omit<Project, 'id' | 'created_date' | 'last_modified' | 'created_by'> = {
      name: name.trim(),
      description: description.trim(),
      status,
      tasks: editProject?.tasks || [],
      customFields: editProject?.customFields || [],
      team_members: teamMembers.filter(member => member.trim().length > 0)
    };

    onSave(projectData);
  };

  const handleAddTeamMember = () => {
    if (newMember.trim() && !teamMembers.includes(newMember.trim())) {
      setTeamMembers([...teamMembers, newMember.trim()]);
      setNewMember('');
    }
  };

  const handleRemoveTeamMember = (member: string) => {
    setTeamMembers(teamMembers.filter(m => m !== member));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTeamMember();
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{editProject ? 'Edit Project' : 'Create New Project'}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter project description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={(value: Project['status']) => setStatus(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Team Members */}
          <div className="space-y-4">
            <Label>Team Members</Label>
            
            <div className="flex gap-2">
              <Input
                value={newMember}
                onChange={(e) => setNewMember(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add team member name"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddTeamMember}
                disabled={!newMember.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {teamMembers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {teamMembers.map((member, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary" 
                    className="flex items-center gap-2"
                  >
                    {member}
                    <button
                      type="button"
                      onClick={() => handleRemoveTeamMember(member)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              <Save className="w-4 h-4 mr-2" />
              {editProject ? 'Update' : 'Create'} Project
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}