export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'member';
  email_verified_at?: string;
  created_at: string;
  updated_at: string;
  org_id: number;
}

export interface Organization {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status?: 'active' | 'completed' | 'on_hold' | 'cancelled';
  priority: number;
  start_date?: string;
  end_date?: string;
  org_id: number;
  manager_id?: number;  // Used for updates
  assigned_user_id?: number;  // Used for creation and API responses
  organization?: Organization;
  tasks?: Task[];
  created_at: string;
  updated_at: string;
  tasks_count?: number;
  members?: User[];
}

export interface Task {
  id: number;
  name: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent'; // Backend uses string enum values
  due_date?: string;
  project_id: number;
  assigned_to?: number; // This is the user_id field in backend
  user_id?: number;
  estimated_time?: string;
  project?: Project;
  user?: User; // Backend relationship name
  creator?: User;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number;
  to: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface TaskFilters {
  status?: Task['status'][];
  priority?: Task['priority'][];
  project_id?: number[];
  assignee_id?: number[];
  due_date_from?: string;
  due_date_to?: string;
  search?: string;
}

export interface TaskSort {
  field: 'created_at' | 'updated_at' | 'due_date' | 'priority' | 'name';
  direction: 'asc' | 'desc';
}
