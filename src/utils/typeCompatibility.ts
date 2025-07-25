// Temporary compatibility layer for legacy field names
// This will be removed once all components are updated

export function adaptTaskForLegacyComponents(task: any): any {
  return {
    ...task,
    // Legacy field mappings
    type: task.task_type,
    startDate: new Date(task.start_date),
    endDate: new Date(task.end_date),
    customFields: task.custom_fields
  };
}

export function adaptCustomFieldForLegacyComponents(field: any): any {
  return {
    ...field,
    // Legacy field mappings
    type: field.field_type,
    defaultValue: field.default_value
  };
}

export function adaptTaskFromLegacyComponents(task: any): any {
  return {
    ...task,
    // Convert back to database field names
    task_type: task.type || task.task_type,
    start_date: task.startDate ? task.startDate.toISOString().split('T')[0] : task.start_date,
    end_date: task.endDate ? task.endDate.toISOString().split('T')[0] : task.end_date,
    custom_fields: task.customFields || task.custom_fields
  };
}