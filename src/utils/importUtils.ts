// @ts-nocheck
import { Task, TaskStatus, TaskType } from "@/types/project";

export function importFromCSV(csvContent: string): Omit<Task, 'id'>[] {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Parse header row
  const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().trim());
  
  // Find required column indices
  const nameIndex = findColumnIndex(headers, ['task name', 'name', 'title']);
  const typeIndex = findColumnIndex(headers, ['type', 'task type']);
  const statusIndex = findColumnIndex(headers, ['status', 'task status']);
  const startDateIndex = findColumnIndex(headers, ['start date', 'start', 'start_date']);
  const endDateIndex = findColumnIndex(headers, ['end date', 'end', 'end_date', 'due date']);
  
  // Optional columns
  const assigneeIndex = findColumnIndex(headers, ['assignee', 'assigned to', 'owner'], false);
  const progressIndex = findColumnIndex(headers, ['progress', 'progress (%)', 'completion'], false);
  const dependenciesIndex = findColumnIndex(headers, ['dependencies', 'depends on'], false);
  const descriptionIndex = findColumnIndex(headers, ['description', 'notes', 'details'], false);

  if (nameIndex === -1 || startDateIndex === -1 || endDateIndex === -1) {
    throw new Error('CSV must contain columns for: Task Name, Start Date, and End Date');
  }

  const tasks: Omit<Task, 'id'>[] = [];

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCSVRow(lines[i]);
      
      if (row.length === 0 || !row[nameIndex]?.trim()) {
        continue; // Skip empty rows
      }

      const name = row[nameIndex]?.trim();
      if (!name) continue;

      // Parse dates
      const startDate = parseDate(row[startDateIndex]);
      const endDate = parseDate(row[endDateIndex]);
      
      if (!startDate || !endDate) {
        console.warn(`Skipping row ${i + 1}: Invalid date format`);
        continue;
      }

      // Parse type with fallback
      const typeValue = row[typeIndex]?.toLowerCase().trim() || 'task';
      const type: TaskType = ['task', 'milestone', 'deliverable'].includes(typeValue) 
        ? typeValue as TaskType 
        : 'task';

      // Parse status with fallback
      const statusValue = row[statusIndex]?.toLowerCase().replace(/\s+/g, '-').trim() || 'not-started';
      const status: TaskStatus = ['not-started', 'in-progress', 'completed', 'on-hold'].includes(statusValue)
        ? statusValue as TaskStatus
        : 'not-started';

      // Parse progress
      let progress = 0;
      if (progressIndex !== -1 && row[progressIndex]) {
        const progressValue = parseFloat(row[progressIndex].replace('%', ''));
        if (!isNaN(progressValue)) {
          progress = Math.max(0, Math.min(100, progressValue));
        }
      }

      // Parse dependencies
      const dependencies: string[] = [];
      if (dependenciesIndex !== -1 && row[dependenciesIndex]) {
        dependencies.push(...row[dependenciesIndex]
          .split(/[,;]/)
          .map(dep => dep.trim())
          .filter(dep => dep.length > 0)
        );
      }

      const task: Omit<Task, 'id'> = {
        name,
        type,
        status,
        startDate,
        endDate,
        assignee: assigneeIndex !== -1 ? (row[assigneeIndex]?.trim() || '') : '',
        progress,
        dependencies,
        description: descriptionIndex !== -1 ? (row[descriptionIndex]?.trim() || '') : ''
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

function findColumnIndex(headers: string[], possibleNames: string[], required: boolean = true): number {
  for (const name of possibleNames) {
    const index = headers.indexOf(name);
    if (index !== -1) return index;
  }
  
  if (required) {
    throw new Error(`Required column not found. Looking for one of: ${possibleNames.join(', ')}`);
  }
  
  return -1;
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

export function validateCSVFormat(csvContent: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  try {
    const lines = csvContent.trim().split('\n');
    
    if (lines.length < 2) {
      errors.push('CSV file must contain at least a header row and one data row');
      return { isValid: false, errors };
    }

    const headers = parseCSVRow(lines[0]).map(h => h.toLowerCase().trim());
    
    // Check for required columns
    const requiredColumns = [
      { names: ['task name', 'name', 'title'], found: false },
      { names: ['start date', 'start', 'start_date'], found: false },
      { names: ['end date', 'end', 'end_date', 'due date'], found: false }
    ];

    for (const col of requiredColumns) {
      col.found = col.names.some(name => headers.includes(name));
      if (!col.found) {
        errors.push(`Missing required column. Expected one of: ${col.names.join(', ')}`);
      }
    }

    // Validate sample data rows
    let validRows = 0;
    for (let i = 1; i < Math.min(lines.length, 6); i++) { // Check first 5 data rows
      const row = parseCSVRow(lines[i]);
      if (row.length > 0 && row[0]?.trim()) {
        validRows++;
      }
    }

    if (validRows === 0) {
      errors.push('No valid data rows found');
    }

  } catch (error) {
    errors.push(`CSV parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return { isValid: errors.length === 0, errors };
}