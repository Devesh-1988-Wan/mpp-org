// @ts-nocheck
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileSpreadsheet, Download } from "lucide-react";
import { Task, TaskStatus, TaskType, CustomField } from "@/types/project";
import { useToast } from "@/hooks/use-toast";
import { importFromCSV } from "@/utils/importUtils";
import { importFromCSVWithMapping, parseCSVHeaders } from "@/utils/importWithMapping";
import { FieldMappingDialog } from "./FieldMappingDialog";

interface ImportDataProps {
  onImport: (tasks: Omit<Task, 'id'>[]) => void;
  onBulkUpdate?: (tasks: Omit<Task, 'id'>[]) => void;
  onBulkDelete?: (taskNames: string[]) => void;
  existingTasks?: Task[];
  customFields?: CustomField[];
}

export function ImportData({ 
  onImport, 
  onBulkUpdate, 
  onBulkDelete, 
  existingTasks = [], 
  customFields = [] 
}: ImportDataProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [importMode, setImportMode] = useState<'create' | 'update' | 'delete'>('create');
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvData(content);
    };
    reader.readAsText(file);
  };

  const handleImportCSV = () => {
    if (!csvData.trim()) {
      toast({
        title: "No data to import",
        description: "Please upload a CSV file or paste CSV data",
        variant: "destructive",
      });
      return;
    }

    try {
      // Parse headers and show mapping dialog
      const headers = parseCSVHeaders(csvData);
      setCsvHeaders(headers);
      setShowFieldMapping(true);
    } catch (error) {
      toast({
        title: "CSV parsing failed",
        description: error instanceof Error ? error.message : "Failed to parse CSV headers",
        variant: "destructive",
      });
    }
  };

  const handleFieldMappingConfirm = (mappings: Array<{csvColumn: string; appField: string}>) => {
    try {
      const tasks = importFromCSVWithMapping(csvData, mappings, customFields);
      
      if (importMode === 'delete') {
        const taskNames = tasks.map(task => task.name).filter(name => name);
        if (taskNames.length === 0) {
          toast({
            title: "No task names found",
            description: "The CSV file doesn't contain valid task names for deletion",
            variant: "destructive",
          });
          return;
        }
        
        if (onBulkDelete) {
          onBulkDelete(taskNames);
          toast({
            title: "Bulk delete initiated",
            description: `Marked ${taskNames.length} tasks for deletion`,
          });
        }
      } else if (importMode === 'update') {
        if (tasks.length === 0) {
          toast({
            title: "No tasks found",
            description: "The CSV file doesn't contain valid task data",
            variant: "destructive",
          });
          return;
        }
        
        if (onBulkUpdate) {
          onBulkUpdate(tasks);
          toast({
            title: "Bulk update successful",
            description: `Updated ${tasks.length} tasks from CSV`,
          });
        }
      } else {
        if (tasks.length === 0) {
          toast({
            title: "No tasks found",
            description: "The CSV file doesn't contain valid task data",
            variant: "destructive",
          });
          return;
        }

        onImport(tasks);
        toast({
          title: "Import successful",
          description: `Imported ${tasks.length} tasks from CSV`,
        });
      }
      
      setIsOpen(false);
      setShowFieldMapping(false);
      setCsvData('');
      setCsvHeaders([]);
    } catch (error) {
      toast({
        title: "Operation failed",
        description: error instanceof Error ? error.message : "Failed to process CSV data",
        variant: "destructive",
      });
    }
  };

  const handleFieldMappingClose = () => {
    setShowFieldMapping(false);
    setCsvHeaders([]);
  };

  const handleGoogleSheetsSync = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!webhookUrl) {
      toast({
        title: "Missing URL",
        description: "Please enter your Google Sheets webhook URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          action: "sync_tasks",
          timestamp: new Date().toISOString(),
          source: window.location.origin,
        }),
      });

      toast({
        title: "Sync Request Sent",
        description: "The sync request was sent to Google Sheets. Please check your automation to confirm it worked.",
      });
    } catch (error) {
      console.error("Error syncing with Google Sheets:", error);
      toast({
        title: "Sync Error",
        description: "Failed to sync with Google Sheets. Please check the URL and try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = () => {
    // Include custom fields in template
    const customFieldHeaders = customFields.map(field => field.name).join(',');
    const customFieldSample = customFields.map(field => {
      switch (field.type) {
        case 'text': return '"Sample text"';
        case 'number': return '100';
        case 'date': return '2024-01-15';
        case 'boolean': return 'true';
        case 'select': return field.options?.[0] ? `"${field.options[0]}"` : '""';
        default: return '""';
      }
    }).join(',');
    
    const headers = `Task Name,Type,Status,Start Date,End Date,Assignee,Progress (%),Dependencies,Description${customFieldHeaders ? ',' + customFieldHeaders : ''}`;
    const sampleRows = [
      `"Setup Project Environment",task,not-started,2024-01-15,2024-01-17,"John Doe",0,"","Initialize development environment"${customFieldSample ? ',' + customFieldSample : ''}`,
      `"Requirements Analysis",milestone,in-progress,2024-01-18,2024-01-25,"Jane Smith",50,"","Gather and analyze project requirements"${customFieldSample ? ',' + customFieldSample : ''}`,
      `"Database Design",deliverable,not-started,2024-01-26,2024-02-02,"Mike Johnson",0,"Requirements Analysis","Design database schema"${customFieldSample ? ',' + customFieldSample : ''}`
    ];
    
    const template = [headers, ...sampleRows].join('\n');

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'project_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import Data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Project Data</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* CSV Import Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">CSV Import</h3>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="import-mode">Import Mode</Label>
                <select
                  id="import-mode"
                  value={importMode}
                  onChange={(e) => setImportMode(e.target.value as 'create' | 'update' | 'delete')}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-md"
                >
                  <option value="create">Create New Tasks</option>
                  <option value="update">Update Existing Tasks (by name)</option>
                  <option value="delete">Delete Tasks (by name)</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="csv-file">Upload CSV File</Label>
                <Input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="csv-data">Or Paste CSV Data</Label>
                <Textarea
                  id="csv-data"
                  value={csvData}
                  onChange={(e) => setCsvData(e.target.value)}
                  placeholder="Paste CSV data here..."
                  rows={6}
                  className="mt-1 font-mono text-sm"
                />
              </div>
              
              <Button onClick={handleImportCSV} disabled={!csvData.trim()}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Import CSV Data
              </Button>
            </div>
          </div>

          {/* Google Sheets Integration Section */}
          <div className="border-t pt-6 space-y-4">
            <h3 className="text-lg font-medium">Google Sheets Integration</h3>
            <p className="text-sm text-muted-foreground">
              To sync with Google Sheets, you'll need to create a webhook automation using tools like Zapier or Google Apps Script.
            </p>
            
            <form onSubmit={handleGoogleSheetsSync} className="space-y-4">
              <div>
                <Label htmlFor="webhook-url">Webhook URL</Label>
                <Input
                  id="webhook-url"
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Create a Zapier webhook or Google Apps Script to handle the sync
                </p>
              </div>
              
              <Button type="submit" disabled={!webhookUrl || isLoading}>
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                {isLoading ? "Syncing..." : "Sync with Google Sheets"}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
      
      <FieldMappingDialog
        isOpen={showFieldMapping}
        onClose={handleFieldMappingClose}
        csvHeaders={csvHeaders}
        customFields={customFields}
        importMode={importMode}
        onConfirm={handleFieldMappingConfirm}
      />
    </Dialog>
  );
}