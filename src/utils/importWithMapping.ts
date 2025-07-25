// @ts-nocheck
import { Task, TaskStatus, TaskType, CustomField, FieldType } from "@/types/project";

interface FieldMapping {
  csvColumn: string;
  appField: string;
}

export function importFromCSVWithMapping(
  csvContent: string, 
  mappings: FieldMapping[],
  customFields: CustomField[] = []
): Omit<Task, 'id'>[] {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Parse header row
  const headers = parseCSVRow(lines[0]);
  
  // Create mapping lookup
  const fieldMapping = new Map<string, string>();
  mappings.forEach(mapping => {
    if (mapping.csvColumn && mapping.appField) {
      const columnIndex = headers.findIndex(h => h.trim() === mapping.csvColumn.trim());
      if (columnIndex !== -1) {
        fieldMapping.set(mapping.appField, mapping.csvColumn);
      }
    }
  });

  const tasks: Omit<Task, 'id'>[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCSVRow(lines[i]);
      
      if (row.length === 0) {
        continue; // Skip empty rows
      }

      const getValue = (field: string): string => {
        const columnName = fieldMapping.get(field);
        if (!columnName) return '';
        
        const columnIndex = headers.findIndex(h => h.trim() === columnName.trim());
        return columnIndex !== -1 ? (row[columnIndex]?.trim() || '') : '';
      };

      const name = getValue('name');
      if (!name) continue; // Skip rows without task name

      // Parse dates
      const startDateStr = getValue('startDate');
      const endDateStr = getValue('endDate');
      
      const startDate = parseDate(startDateStr);
      const endDate = parseDate(endDateStr);
      
      if (!startDate || !endDate) {
        console.warn(`Skipping row ${i + 1}: Invalid date format`);
        continue;
      }

      // Parse type with fallback
      const typeValue = getValue('type').toLowerCase().trim() || 'task';
      const type: TaskType = ['task', 'milestone', 'deliverable'].includes(typeValue) 
        ? typeValue as TaskType 
        : 'task';

      // Parse status with fallback
      const statusValue = getValue('status').toLowerCase().replace(/\s+/g, '-').trim() || 'not-started';
      const status: TaskStatus = ['not-started', 'in-progress', 'completed', 'on-hold'].includes(statusValue)
        ? statusValue as TaskStatus
        : 'not-started';

      // Parse progress
      let progress = 0;
      const progressStr = getValue('progress');
      if (progressStr) {
        const progressValue = parseFloat(progressStr.replace('%', ''));
        if (!isNaN(progressValue)) {
          progress = Math.max(0, Math.min(100, progressValue));
        }
      }

      // Parse dependencies
      const dependencies: string[] = [];
      const dependenciesStr = getValue('dependencies');
      if (dependenciesStr) {
        dependencies.push(...dependenciesStr
          .split(/[,;]/)
          .map(dep => dep.trim())
          .filter(dep => dep.length > 0)
        );
      }

      // Parse custom fields
      const customFieldValues: Record<string, any> = {};
      customFields.forEach(field => {
        const value = getValue(`custom_${field.id}`);
        if (value) {
          customFieldValues[field.id] = parseCustomFieldValue(value, field.type);
        }
      });

      const task: Omit<Task, 'id'> = {
        name,
        type,
        status,
        startDate,
        endDate,
        assignee: getValue('assignee'),
        progress,
        dependencies,
        description: getValue('description'),
        customFields: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined
      };

      tasks.push(task);
    } catch (error) {
      console.warn(`Error parsing row ${i + 1}:`, error);
      continue;
    }
  }

  return tasks;
}

function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < row.length) {
    const char = row[i];
    const nextChar = row[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i += 2;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // Add the last field
  result.push(current);

  return result;
}

function parseDate(dateString: string): Date | null {
  if (!dateString?.trim()) return null;

  const cleaned = dateString.trim();
  
  // Try different date formats
  const formats = [
    // ISO format: 2024-01-15
    /^\d{4}-\d{1,2}-\d{1,2}$/,
    // US format: 01/15/2024 or 1/15/2024
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,
    // European format: 15/01/2024 or 15.01.2024
    /^\d{1,2}[\.\/]\d{1,2}[\.\/]\d{4}$/,
  ];

  let date: Date | null = null;

  // Try ISO format first
  if (formats[0].test(cleaned)) {
    date = new Date(cleaned);
  }
  // Try US format
  else if (formats[1].test(cleaned)) {
    date = new Date(cleaned);
  }
  // Try European format - need to rearrange
  else if (formats[2].test(cleaned)) {
    const parts = cleaned.split(/[\.\/]/);
    if (parts.length === 3) {
      // Assume DD/MM/YYYY or DD.MM.YYYY
      const [day, month, year] = parts;
      date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
  }
  // Fallback to Date constructor
  else {
    date = new Date(cleaned);
  }

  // Validate the date
  if (date && !isNaN(date.getTime())) {
    return date;
  }

  return null;
}

function parseCustomFieldValue(value: string, fieldType: FieldType): any {
  switch (fieldType) {
    case 'number':
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    case 'boolean':
      return value.toLowerCase() === 'true' || value === '1';
    case 'date':
      return parseDate(value);
    case 'select':
    case 'text':
    default:
      return value;
  }
}

export function parseCSVHeaders(csvContent: string): string[] {
  const lines = csvContent.trim().split('\n');
  if (lines.length === 0) return [];
  
  return parseCSVRow(lines[0]);
}