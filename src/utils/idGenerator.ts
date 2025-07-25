import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique ID for tasks, projects, and other entities
 * Uses UUID v4 for production and timestamp for demo mode
 */
export const generateId = (isDemoMode: boolean = false): string => {
  if (isDemoMode) {
    // For demo mode, use timestamp + random suffix to avoid collisions
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // For production with Supabase, we'll let the database generate UUIDs
  // But this can be used for client-side temporary IDs
  return uuidv4();
};

/**
 * Generates a UUID for use as a primary key
 * This is typically handled by the database, but useful for client-side operations
 */
export const generateUUID = (): string => {
  return uuidv4();
};

/**
 * Validates if a string is a valid UUID
 */
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};