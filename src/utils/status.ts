import type { Task } from '../types';

// Unified task management utilities
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * STATUS UTILITIES
 */

/**
 * Get valid status transitions from current status
 */
export function getValidStatusTransitions(currentStatus: TaskStatus): TaskStatus[] {
  switch (currentStatus) {
    case 'pending':
      return ['in_progress', 'completed', 'cancelled'];
    case 'in_progress':
      return ['completed', 'cancelled'];
    case 'completed':
      return ['in_progress'];
    case 'cancelled':
      return ['pending'];
    default:
      return [];
  }
}

/**
 * Get all possible status transitions including current status
 */
export function getAllowedStatusOptions(currentStatus: TaskStatus): TaskStatus[] {
  return [currentStatus, ...getValidStatusTransitions(currentStatus)];
}

/**
 * Check if a status transition is valid
 */
export function isValidStatusTransition(fromStatus: TaskStatus, toStatus: TaskStatus): boolean {
  if (fromStatus === toStatus) return true;
  return getValidStatusTransitions(fromStatus).includes(toStatus);
}

/**
 * Get status display label
 */
export function getStatusLabel(status: TaskStatus): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'in_progress':
      return 'In Progress';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

/**
 * Get status color classes for UI
 */
export function getStatusColor(status: TaskStatus): string {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'in_progress':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'pending':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'cancelled':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get all status options for filters/dropdowns
 */
export function getAllStatusOptions(): TaskStatus[] {
  return ['pending', 'in_progress', 'completed', 'cancelled'];
}

/**
 * PRIORITY UTILITIES
 */

/**
 * Get priority display label
 */
export function getPriorityLabel(priority: TaskPriority): string {
  switch (priority) {
    case 'urgent':
      return 'Urgent';
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    case 'low':
      return 'Low';
    default:
      return 'Unknown';
  }
}

/**
 * Get priority color classes for UI
 */
export function getPriorityColor(priority: TaskPriority): string {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

/**
 * Get priority numeric value for sorting
 */
export function getPriorityWeight(priority: TaskPriority): number {
  switch (priority) {
    case 'urgent': return 4;
    case 'high': return 3;
    case 'medium': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

/**
 * Get all priority options
 */
export function getAllPriorityOptions(): TaskPriority[] {
  return ['low', 'medium', 'high', 'urgent'];
}

/**
 * Normalize priority input (handles legacy numeric priorities)
 */
export function normalizePriority(priority: any): TaskPriority {
  if (typeof priority === 'string') {
    const validPriorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
    if (validPriorities.includes(priority as TaskPriority)) {
      return priority as TaskPriority;
    }
  }
  
  // Handle legacy numeric priorities
  if (typeof priority === 'number') {
    switch (priority) {
      case 1: return 'urgent';
      case 2: return 'high';
      case 3: return 'medium';
      case 4: return 'low';
      default: return 'medium';
    }
  }
  
  return 'medium'; // Default fallback
}

/**
 * TASK UTILITIES
 */

/**
 * Check if task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (!task.due_date) return false;
  const dueDate = new Date(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today && task.status !== 'completed';
}

/**
 * Get days until due (negative if overdue)
 */
export function getDaysUntilDue(task: Task): number | null {
  if (!task.due_date) return null;
  const dueDate = new Date(task.due_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format task due date display
 */
export function formatDueDate(task: Task): string {
  if (!task.due_date) return 'No due date';
  
  const daysUntil = getDaysUntilDue(task);
  if (daysUntil === null) return 'No due date';
  
  if (daysUntil === 0) return 'Due today';
  if (daysUntil === 1) return 'Due tomorrow';
  if (daysUntil === -1) return '1 day overdue';
  if (daysUntil < 0) return `${Math.abs(daysUntil)} days overdue`;
  if (daysUntil <= 7) return `Due in ${daysUntil} days`;
  
  return new Date(task.due_date).toLocaleDateString();
}

/**
 * Get task urgency score for sorting
 */
export function getTaskUrgencyScore(task: Task): number {
  const priorityWeight = getPriorityWeight(task.priority) * 10;
  const daysUntil = getDaysUntilDue(task);
  
  if (daysUntil === null) return priorityWeight;
  
  let dueDateWeight = 0;
  if (daysUntil < 0) dueDateWeight = 50; // Overdue
  else if (daysUntil <= 1) dueDateWeight = 30; // Due soon
  else if (daysUntil <= 3) dueDateWeight = 20;
  else if (daysUntil <= 7) dueDateWeight = 10;
  else dueDateWeight = 5;
  
  return priorityWeight + dueDateWeight;
}

/**
 * Sort tasks by urgency (priority + due date)
 */
export function sortTasksByUrgency(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const scoreB = getTaskUrgencyScore(b);
    const scoreA = getTaskUrgencyScore(a);
    return scoreB - scoreA;
  });
}

/**
 * Filter tasks by various criteria
 */
export function filterTasks(tasks: Task[], filters: {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  overdue?: boolean;
  assignee?: number[];
  project?: number[];
  search?: string;
}): Task[] {
  return tasks.filter(task => {
    // Status filter
    if (filters.status && filters.status.length > 0) {
      if (!filters.status.includes(task.status)) return false;
    }
    
    // Priority filter
    if (filters.priority && filters.priority.length > 0) {
      if (!filters.priority.includes(task.priority)) return false;
    }
    
    // Overdue filter
    if (filters.overdue !== undefined) {
      if (filters.overdue !== isTaskOverdue(task)) return false;
    }
    
    // Assignee filter
    if (filters.assignee && filters.assignee.length > 0) {
      if (!task.assigned_to || !filters.assignee.includes(task.assigned_to)) return false;
    }
    
    // Project filter
    if (filters.project && filters.project.length > 0) {
      if (!task.project_id || !filters.project.includes(task.project_id)) return false;
    }
    
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return (
        task.name.toLowerCase().includes(searchLower) ||
        (task.description && task.description.toLowerCase().includes(searchLower))
      );
    }
    
    return true;
  });
}
