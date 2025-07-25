// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Settings, X } from "lucide-react";
import { CustomField, FieldType } from "@/types/project";
import { useToast } from "@/hooks/use-toast";

interface CustomFieldsManagerProps {
  customFields: CustomField[];
  onUpdate: (fields: CustomField[]) => void;
}

export function CustomFieldsManager({ customFields, onUpdate }: CustomFieldsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | undefined>();
  const [showFieldForm, setShowFieldForm] = useState(false);
  const { toast } = useToast();

  const handleAddField = () => {
    setEditingField(undefined);
    setShowFieldForm(true);
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setShowFieldForm(true);
  };

  const handleDeleteField = (fieldId: string) => {
    const field = customFields.find(f => f.id === fieldId);
    const updatedFields = customFields.filter(f => f.id !== fieldId);
    onUpdate(updatedFields);
    
    if (field) {
      toast({
        title: "Custom Field Deleted",
        description: `"${field.name}" has been removed.`,
        variant: "destructive"
      });
    }
  };

  const handleSaveField = (fieldData: Omit<CustomField, 'id'>) => {
    if (editingField) {
      // Update existing field
      const updatedFields = customFields.map(field =>
        field.id === editingField.id
          ? { ...fieldData, id: editingField.id }
          : field
      );
      onUpdate(updatedFields);
      toast({
        title: "Custom Field Updated",
        description: `"${fieldData.name}" has been updated.`,
      });
    } else {
      // Create new field
      const newField: CustomField = {
        ...fieldData,
        id: Date.now().toString()
      };
      onUpdate([...customFields, newField]);
      toast({
        title: "Custom Field Created",
        description: `"${fieldData.name}" has been added.`,
      });
    }
    setShowFieldForm(false);
    setEditingField(undefined);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="w-4 h-4 mr-2" />
          Custom Fields ({customFields.length})
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Custom Fields</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add New Field Button */}
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Create custom fields to capture additional task information
            </p>
            <Button onClick={handleAddField}>
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          </div>

          {/* Field Form */}
          {showFieldForm && (
            <CustomFieldForm
              onSave={handleSaveField}
              onCancel={() => {
                setShowFieldForm(false);
                setEditingField(undefined);
              }}
              editField={editingField}
            />
          )}

          {/* Existing Fields */}
          {customFields.length > 0 ? (
            <div className="space-y-3">
              <h3 className="font-medium">Existing Fields</h3>
              {customFields.map((field) => (
                <Card key={field.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{field.name}</span>
                          <Badge variant="outline">{field.type}</Badge>
                          {field.required && (
                            <Badge variant="secondary" className="text-xs">Required</Badge>
                          )}
                        </div>
                        {field.options && field.options.length > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Options: {field.options.join(', ')}
                          </div>
                        )}
                        {field.defaultValue && (
                          <div className="text-sm text-muted-foreground">
                            Default: {field.defaultValue.toString()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditField(field)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteField(field.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No custom fields created yet.</p>
              <p>Add your first custom field to get started.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface CustomFieldFormProps {
  onSave: (field: Omit<CustomField, 'id'>) => void;
  onCancel: () => void;
  editField?: CustomField;
}

function CustomFieldForm({ onSave, onCancel, editField }: CustomFieldFormProps) {
  const [name, setName] = useState(editField?.name || '');
  const [type, setType] = useState<FieldType>(editField?.type || 'text');
  const [required, setRequired] = useState(editField?.required || false);
  const [options, setOptions] = useState<string[]>(editField?.options || []);
  const [newOption, setNewOption] = useState('');
  const [defaultValue, setDefaultValue] = useState(editField?.defaultValue?.toString() || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) return;

    const fieldData: Omit<CustomField, 'id'> = {
      name: name.trim(),
      type,
      required,
      options: type === 'select' ? options.filter(o => o.trim()) : undefined,
      defaultValue: defaultValue.trim() || undefined
    };

    onSave(fieldData);
  };

  const handleAddOption = () => {
    if (newOption.trim() && !options.includes(newOption.trim())) {
      setOptions([...options, newOption.trim()]);
      setNewOption('');
    }
  };

  const handleRemoveOption = (option: string) => {
    setOptions(options.filter(o => o !== option));
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {editField ? 'Edit Field' : 'New Custom Field'}
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="field-name">Field Name *</Label>
              <Input
                id="field-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter field name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="field-type">Field Type</Label>
              <Select value={type} onValueChange={(value: FieldType) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="boolean">Yes/No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {type === 'select' && (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex gap-2">
                <Input
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOption())}
                  placeholder="Add option"
                />
                <Button type="button" variant="outline" onClick={handleAddOption}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {options.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {options.map((option, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-2">
                      {option}
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(option)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="default-value">Default Value</Label>
            <Input
              id="default-value"
              value={defaultValue}
              onChange={(e) => setDefaultValue(e.target.value)}
              placeholder="Enter default value (optional)"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="required"
              checked={required}
              onCheckedChange={setRequired}
            />
            <Label htmlFor="required">Required field</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {editField ? 'Update' : 'Create'} Field
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
