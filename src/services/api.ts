import axios from 'axios';
import type { AxiosInstance} from 'axios';
import type {
  User,
  Project,
  Task,
  LoginRequest,
  AuthResponse,
  ApiResponse,
  PaginatedResponse,
  TaskFilters,
  TaskSort,
} from '../types';
import { normalizePriority } from '../utils/status';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout');
  }

  async getProfile(): Promise<User> {
    const response = await this.client.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  }

  async getTasks(
    filters?: TaskFilters,
    sort?: TaskSort,
    page = 1,
    perPage = 20
  ): Promise<PaginatedResponse<Task>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(`${key}[]`, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    if (sort) {
      params.append('sort_by', sort.field);
      params.append('sort_direction', sort.direction);
    }

    params.append('page', page.toString());
    params.append('per_page', perPage.toString());

    const response = await this.client.get<PaginatedResponse<Task>>(
      `/tasks?${params.toString()}`
    );
    return response.data;
  }


  async createTask(task: Omit<Task, 'id' | 'created_at' | 'updated_at'>): Promise<Task> {
    const normalizedTask = {
      ...task,
      ...(task.priority && { priority: normalizePriority(task.priority) })
    };
    const response = await this.client.post<ApiResponse<Task>>('/tasks', normalizedTask);
    return response.data.data;
  }

  async updateTask(id: number, task: Partial<Task>): Promise<Task> {
    const normalizedTask = {
      ...task,
      ...(task.priority && { priority: normalizePriority(task.priority) })
    };
    const response = await this.client.put<ApiResponse<Task>>(`/tasks/${id}`, normalizedTask);
    return response.data.data;
  }

  async deleteTask(id: number): Promise<void> {
    await this.client.delete(`/tasks/${id}`);
  }

  async getProjects(page = 1, perPage = 50): Promise<PaginatedResponse<Project>> {
    const response = await this.client.get<PaginatedResponse<Project>>(
      `/projects?page=${page}&per_page=${perPage}`
    );
    return response.data;
  }

  async createProject(project: Omit<Project, 'id' | 'created_at' | 'updated_at'>): Promise<Project> {
    const response = await this.client.post<ApiResponse<Project>>('/projects', project);
    return response.data.data;
  }

  async updateProject(id: number, project: Partial<Project>): Promise<Project> {
    const response = await this.client.put<ApiResponse<Project>>(`/projects/${id}`, project);
    return response.data.data;
  }

  async deleteProject(id: number): Promise<void> {
    await this.client.delete(`/projects/${id}`);
  }

  async getUsers(role?: string): Promise<User[]> {
    const params = role ? `?role=${role}` : '';
    const response = await this.client.get<{data: User[]}>(`/users${params}`);
    return response.data.data;
  }

  async getMyTasks(filters?: TaskFilters): Promise<Task[]> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            value.forEach((v) => params.append(`${key}[]`, v.toString()));
          } else {
            params.append(key, value.toString());
          }
        }
      });
    }

    const response = await this.client.get<{data: Task[]}>(
      `/my-tasks${params.toString() ? `?${params.toString()}` : ''}`
    );
    return response.data.data;
  }

  async getMySchedule(startDate?: string, hoursPerDay?: number): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (hoursPerDay) params.append('hours_per_day', hoursPerDay.toString());
    
    const response = await this.client.get<{data: any}>(
      `/my-schedule${params.toString() ? `?${params.toString()}` : ''}`
    );
    return response.data.data;
  }

  async getTeamSchedule(startDate?: string, hoursPerDay?: number): Promise<any> {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (hoursPerDay) params.append('hours_per_day', hoursPerDay.toString());
    
    const response = await this.client.get<{data: any}>(
      `/tasks/schedule${params.toString() ? `?${params.toString()}` : ''}`
    );
    return response.data.data;
  }

  async completeTask(id: number): Promise<Task> {
    const response = await this.client.patch<ApiResponse<Task>>(`/tasks/${id}/complete`);
    return response.data.data;
  }

  async assignTask(id: number, userId: number): Promise<Task> {
    const response = await this.client.post<ApiResponse<Task>>(`/tasks/${id}/assign`, { user_id: userId });
    return response.data.data;
  }
}

export const apiService = new ApiService();
