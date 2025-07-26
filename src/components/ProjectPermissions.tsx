import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Users, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ProjectPermissionsProps {
  projectId: string;
  teamMembers: string[];
  onUpdateTeamMembers: (members: string[]) => void;
  isOwner: boolean;
}

export const ProjectPermissions: React.FC<ProjectPermissionsProps> = ({
  projectId,
  teamMembers,
  onUpdateTeamMembers,
  isOwner,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [permission, setPermission] = useState<'view' | 'edit'>('view');
  const { toast } = useToast();

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return;

    const memberWithPermission = `${newMemberEmail}:${permission}`;
    
    if (teamMembers.some(member => member.startsWith(newMemberEmail))) {
      toast({
        title: "Member already exists",
        description: "This user is already a team member.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Call the invite-user edge function
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: {
          email: newMemberEmail,
          projectId,
          permission,
        },
      });

      if (error) {
        throw error;
      }

      const updatedMembers = [...teamMembers, memberWithPermission];
      onUpdateTeamMembers(updatedMembers);
      
      toast({
        title: "Member invited",
        description: `${newMemberEmail} has been invited and will receive a password reset email to set up their account.`,
      });

      setNewMemberEmail('');
      setPermission('view');
      setIsOpen(false);
    } catch (error: any) {
      console.error('Error inviting user:', error);
      toast({
        title: "Invitation failed",
        description: error.message || "Failed to invite user. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = (memberToRemove: string) => {
    const updatedMembers = teamMembers.filter(member => member !== memberToRemove);
    onUpdateTeamMembers(updatedMembers);
    
    toast({
      title: "Member removed",
      description: "Team member has been removed from the project.",
    });
  };

  const getMemberEmail = (member: string) => member.split(':')[0];
  const getMemberPermission = (member: string) => member.split(':')[1] || 'view';

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            View project team members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members added yet.</p>
            ) : (
              teamMembers.map((member) => (
                <div key={member} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{getMemberEmail(member)}</span>
                  <Badge variant={getMemberPermission(member) === 'edit' ? 'default' : 'secondary'}>
                    {getMemberPermission(member)}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Team Members
        </CardTitle>
        <CardDescription>
          Manage who can access this project and their permissions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            {teamMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No team members added yet.</p>
            ) : (
              teamMembers.map((member) => (
                <div key={member} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{getMemberEmail(member)}</span>
                    <Badge variant={getMemberPermission(member) === 'edit' ? 'default' : 'secondary'}>
                      {getMemberPermission(member)}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Team Member</DialogTitle>
                <DialogDescription>
                  Invite a team member to collaborate on this project.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="colleague@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permission">Permission Level</Label>
                  <Select value={permission} onValueChange={(value: 'view' | 'edit') => setPermission(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="view">View Only</SelectItem>
                      <SelectItem value="edit">Edit Access</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddMember}>
                  Add Member
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};