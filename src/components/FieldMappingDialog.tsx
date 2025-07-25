// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Task, CustomField } from "@/types/project";

interface FieldMapping {
  csvColumn: string;
  appField: string;
}

interface FieldMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  csvHeaders: string[];
  customFields?: CustomField[];
  importMode?: 'create' | 'update' | 'delete';
  onConfirm: (mappings: FieldMapping[]) => void;
}

const APP_FIELDS = [
  { value: 'name', label: 'Task Name', required: true },
  { value: 'type', label: 'Type', required: false },
  { value: 'status', label: 'Status', required: false },
  { value: 'startDate', label: 'Start Date', required: true },
  { value: 'endDate', label: 'End Date', required: true },
  { value: 'assignee', label: 'Assignee', required: false },
  { value: 'progress', label: 'Progress (%)', required: false },
  { value: 'dependencies', label: 'Dependencies', required: false },
  { value: 'description', label: 'Description', required: false },
];

const findBestMatch = (headers: string[], fieldName: string): string | null => {
  const lowerHeaders = headers.map(h => h.toLowerCase().trim());
  
  const matchPatterns: Record<string, string[]> = {
    name: ['task name', 'name', 'title'],
    type: ['type', 'task type'],
    status: ['status', 'task status'],
    startDate: ['start date', 'start', 'start_date'],
    endDate: ['end date', 'end', 'end_date', 'due date'],
    assignee: ['assignee', 'assigned to', 'owner'],
    progress: ['progress', 'progress (%)', 'completion'],
    dependencies: ['dependencies', 'depends on'],
    description: ['description', 'notes', 'details']
  };

  const patterns = matchPatterns[fieldName] || [];
  for (const pattern of patterns) {
    const index = lowerHeaders.indexOf(pattern);
    if (index !== -1) {
      return headers[index];
    }
  }
  return null;
};

export function FieldMappingDialog({ 
  isOpen, 
  onClose, 
  csvHeaders, 
  customFields = [], 
  importMode = 'create',
  onConfirm 
}: FieldMappingDialogProps) {
  const [mappings, setMappings] = useState<FieldMapping[]>(() => {
    // Create mappings for standard fields
    const standardMappings = APP_FIELDS.map(appField => {
      const csvColumn = findBestMatch(csvHeaders, appField.value);
      return {
        csvColumn: csvColumn || '',
        appField: appField.value
      };
    });
    
    // Create mappings for custom fields
    const customMappings = customFields.map(customField => {
      const csvColumn = findBestMatch(csvHeaders, customField.name.toLowerCase());
      return {
        csvColumn: csvColumn || '',
        appField: `custom_${customField.id}`
      };
    });
    
    return [...standardMappings, ...customMappings];
  });


  const updateMapping = (appField: string, csvColumn: string) => {
    const actualValue = csvColumn === '__no_mapping__' ? '' : csvColumn;
    setMappings(prev => prev.map(mapping => 
      mapping.appField === appField 
        ? { ...mapping, csvColumn: actualValue }
        : mapping
    ));
  };

  const getUsedColumns = () => {
    return new Set(mappings.map(m => m.csvColumn).filter(col => col !== ''));
  };

  const getAvailableColumns = (currentField: string) => {
    const usedColumns = getUsedColumns();
    const currentMapping = mappings.find(m => m.appField === currentField);
    
    return csvHeaders.filter(header => 
      !usedColumns.has(header) || header === currentMapping?.csvColumn
    );
  };

  const handleConfirm = () => {
    const validMappings = mappings.filter(m => m.csvColumn !== '');
    
    if (importMode === 'delete') {
      // For delete mode, only need task name
      const nameMapping = validMappings.find(m => m.appField === 'name');
      if (!nameMapping) {
        alert('Please map the Task Name field for deletion');
        return;
      }
      onConfirm([nameMapping]);
      return;
    }
    
    // Check if required fields are mapped for create/update modes
    let requiredFields = APP_FIELDS.filter(f => f.required).map(f => f.value);
    
    // Add required custom fields
    const requiredCustomFields = customFields
      .filter(f => f.required)
      .map(f => `custom_${f.id}`);
    requiredFields = [...requiredFields, ...requiredCustomFields];
    
    const mappedRequiredFields = validMappings
      .filter(m => requiredFields.includes(m.appField))
      .map(m => m.appField);
    
    const missingRequired = requiredFields.filter(field => 
      !mappedRequiredFields.includes(field)
    );

    if (missingRequired.length > 0) {
      const missingLabels = missingRequired
        .map(field => {
          const standardField = APP_FIELDS.find(f => f.value === field);
          if (standardField) return standardField.label;
          
          const customFieldId = field.replace('custom_', '');
          const customField = customFields.find(f => f.id === customFieldId);
          return customField?.name || field;
        })
        .join(', ');
      alert(`Please map the following required fields: ${missingLabels}`);
      return;
    }

    onConfirm(validMappings);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Map CSV Fields</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {importMode === 'delete' 
              ? 'Map the task name column to identify tasks for deletion.' 
              : `Map your CSV columns to the application fields. Required fields are marked with *.`}
          </p>
          
          <div className="space-y-3">
            {/* Standard Fields */}
            {APP_FIELDS.map(appField => {
              // For delete mode, only show required fields (mainly task name)
              if (importMode === 'delete' && !appField.required) return null;
              
              return (
                <div key={appField.value} className="grid grid-cols-2 gap-4 items-center">
                  <Label className="text-sm font-medium">
                    {appField.label}
                    {appField.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  
                  <Select
                    value={mappings.find(m => m.appField === appField.value)?.csvColumn || '__no_mapping__'}
                    onValueChange={(value) => updateMapping(appField.value, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select CSV column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__no_mapping__">-- No mapping --</SelectItem>
                      {getAvailableColumns(appField.value).map(header => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
            
            {/* Custom Fields */}
            {importMode !== 'delete' && customFields.length > 0 && (
              <>
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-muted-foreground mb-3">Custom Fields</h4>
                </div>
                {customFields.map(customField => (
                  <div key={customField.id} className="grid grid-cols-2 gap-4 items-center">
                    <Label className="text-sm font-medium">
                      {customField.name}
                      {customField.required && <span className="text-destructive ml-1">*</span>}
                      <span className="text-xs text-muted-foreground ml-1">({customField.type})</span>
                    </Label>
                    
                    <Select
                      value={mappings.find(m => m.appField === `custom_${customField.id}`)?.csvColumn || '__no_mapping__'}
                      onValueChange={(value) => updateMapping(`custom_${customField.id}`, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select CSV column" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__no_mapping__">-- No mapping --</SelectItem>
                        {getAvailableColumns(`custom_${customField.id}`).map(header => (
                          <SelectItem key={header} value={header}>
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              {importMode === 'delete' ? 'Delete Tasks' : 
               importMode === 'update' ? 'Update Tasks' : 
               'Import with Mapping'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}