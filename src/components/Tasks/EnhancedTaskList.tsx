import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import {
  PlusIcon,
  PencilIcon,
  EyeIcon,
  TrashIcon,
  FunnelIcon,
  ArrowsUpDownIcon,
  CheckIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import SimpleTaskModal from './SimpleTaskModal';
import DeleteConfirmModal from '../DeleteConfirmModal';
import type { Task, TaskFilters, TaskSort, User, Project } from '../../types';

interface OptimisticUpdate {
  id: number;
  originalData: Task;
  newData: Partial<Task>;
  timestamp: number;
}

export default function EnhancedTaskList() {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters and sorting
  const [filters, setFilters] = useState<TaskFilters>({});
  const [sort, setSort] = useState<TaskSort>({ field: 'created_at', direction: 'desc' });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Optimistic updates tracking
  const [optimisticUpdates, setOptimisticUpdates] = useState<OptimisticUpdate[]>([]);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch tasks based on user role
  const { data: tasksResponse, isLoading, error } = useQuery({
    queryKey: ['tasks', filters, sort, user?.role],
    queryFn: () => {
      const allFilters = { ...filters };
      if (searchTerm) {
        allFilters.search = searchTerm;
      }
      return apiService.getTasks(allFilters, sort, 1, 100);
    },
    refetchInterval: import.meta.env.VITE_ENABLE_REAL_TIME === 'true' ? 
      parseInt(import.meta.env.VITE_POLLING_INTERVAL || '30000') : false,
  });

  // Fetch users for assignee filtering
  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => apiService.getUsers(),
    enabled: user?.role !== 'member',
  });
  const usersList = Array.isArray(users) ? users : [];

  // Fetch projects for project filtering
  const { data: projectsResponse } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects(1, 100),
  });

  const projects = projectsResponse?.data || [];
  const tasks = tasksResponse?.data || [];

  // Apply optimistic updates to tasks
  const tasksWithOptimisticUpdates = tasks.map(task => {
    const optimisticUpdate = optimisticUpdates.find(update => update.id === task.id);
    if (optimisticUpdate) {
      return { ...task, ...optimisticUpdate.newData };
    }
    return task;
  });

  // Cleanup old optimistic updates
  useEffect(() => {
    const cleanup = () => {
      const now = Date.now();
      setOptimisticUpdates(prev => {
        const filtered = prev.filter(update => now - update.timestamp < 5000);
        return filtered.length !== prev.length ? filtered : prev;
      });
    };

    const interval = setInterval(cleanup, 1000); // Check every second
    return () => clearInterval(interval);
  }, []);

  // Optimistic update helper
  const applyOptimisticUpdate = (taskId: number, newData: Partial<Task>) => {
    const originalTask = tasks.find(t => t.id === taskId);
    if (!originalTask) return;

    const optimisticUpdate: OptimisticUpdate = {
      id: taskId,
      originalData: originalTask,
      newData,
      timestamp: Date.now(),
    };

    setOptimisticUpdates(prev => [
      ...prev.filter(update => update.id !== taskId),
      optimisticUpdate,
    ]);
  };

  // Rollback optimistic update
  const rollbackOptimisticUpdate = (taskId: number) => {
    setOptimisticUpdates(prev => prev.filter(update => update.id !== taskId));
  };

  // Delete task mutation with optimistic updates
  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => {
      // Apply optimistic update
      applyOptimisticUpdate(id, { status: 'cancelled' as const });
      return apiService.deleteTask(id);
    },
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowDeleteModal(false);
      setTaskToDelete(null);
      // Remove optimistic update since the real update succeeded
      rollbackOptimisticUpdate(taskId);
    },
    onError: (_, taskId) => {
      // Rollback optimistic update on error
      rollbackOptimisticUpdate(taskId);
    },
  });

  // Status update mutation with optimistic updates
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Task['status'] }) => {
      // Apply optimistic update immediately
      applyOptimisticUpdate(id, { status });
      return apiService.updateTask(id, { status });
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      // Remove optimistic update since the real update succeeded
      rollbackOptimisticUpdate(id);
    },
    onError: (_, { id }) => {
      // Rollback optimistic update on error
      rollbackOptimisticUpdate(id);
    },
  });

  // Complete task mutation
  const completeTaskMutation = useMutation({
    mutationFn: (id: number) => {
      // Apply optimistic update
      applyOptimisticUpdate(id, { 
        status: 'completed' as const, 
        completed_at: new Date().toISOString() 
      });
      return apiService.completeTask(id);
    },
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      rollbackOptimisticUpdate(taskId);
    },
    onError: (_, taskId) => {
      rollbackOptimisticUpdate(taskId);
    },
  });

  const handleCreateTask = () => {
    setSelectedTask(null);
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    setModalMode('view');
    setShowModal(true);
  };

  const handleDeleteTask = (task: Task) => {
    setTaskToDelete(task);
    setShowDeleteModal(true);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      deleteTaskMutation.mutate(taskToDelete.id);
    }
  };

  const handleStatusChange = (taskId: number, newStatus: Task['status']) => {
    updateStatusMutation.mutate({ id: taskId, status: newStatus });
  };

  const handleQuickComplete = (taskId: number) => {
    completeTaskMutation.mutate(taskId);
  };

  // Filter handlers
  const handleFilterChange = (key: keyof TaskFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const hasActiveFilters = Object.keys(filters).length > 0 || searchTerm;


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'bg-red-100 text-red-800 border-red-200';
      case 2: return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4: return 'bg-blue-100 text-blue-800 border-blue-200';
      case 5: return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Urgent';
      case 2: return 'High';
      case 3: return 'Medium';
      case 4: return 'Low';
      case 5: return 'Very Low';
      default: return 'Unknown';
    }
  };

  const isOverdue = (task: Task) => {
    if (!task.due_date) return false;
    return new Date(task.due_date) < new Date() && task.status !== 'completed';
  };

  const canEditTask = (task: Task) => {
    if (user?.role === 'admin') return true;
    if (user?.role === 'manager') return true;
    if (user?.role === 'member') return task.user_id === user.id;
    return false;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-500">Loading tasks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-lg">
        <p className="text-red-600">Failed to load tasks. Please try again.</p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['tasks'] })}
          className="mt-2 text-sm text-red-500 hover:text-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Tasks
            {user?.role === 'member' && ' (My Tasks)'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {user?.role === 'admin' 
              ? 'Manage all tasks across the organization'
              : user?.role === 'manager' 
                ? 'Manage tasks for your projects'
                : 'View and update your assigned tasks'
            }
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Filters */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              hasActiveFilters 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="h-4 w-4 mr-1" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-xs">
                {Object.keys(filters).length + (searchTerm ? 1 : 0)}
              </span>
            )}
          </button>

          {/* Sort */}
          <div className="relative">
            <select
              value={`${sort.field}-${sort.direction}`}
              onChange={(e) => {
                const [field, direction] = e.target.value.split('-');
                setSort({ field: field as TaskSort['field'], direction: direction as 'asc' | 'desc' });
              }}
              className="pl-8 pr-8 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="due_date-asc">Due Date (Soon)</option>
              <option value="due_date-desc">Due Date (Late)</option>
              <option value="priority-asc">Priority (High)</option>
              <option value="priority-desc">Priority (Low)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
            <ArrowsUpDownIcon className="w-4 h-4 text-gray-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Create Task Button */}
          {user?.role !== 'member' && (
            <button
              onClick={handleCreateTask}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              New Task
            </button>
          )}
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm space-y-4">
          <div className="flex flex-wrap gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status?.[0] || ''}
                onChange={(e) => handleFilterChange('status', e.target.value ? [e.target.value] : undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={filters.priority?.[0] || ''}
                onChange={(e) => handleFilterChange('priority', e.target.value ? [parseInt(e.target.value)] : undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="1">Urgent</option>
                <option value="2">High</option>
                <option value="3">Medium</option>
                <option value="4">Low</option>
                <option value="5">Very Low</option>
              </select>
            </div>

            {/* Project Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <select
                value={filters.project_id?.[0] || ''}
                onChange={(e) => handleFilterChange('project_id', e.target.value ? [parseInt(e.target.value)] : undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Projects</option>
                {projects.map((project: Project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </div>

            {/* Assignee Filter (only for admin/manager) */}
            {user?.role !== 'member' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assignee</label>
                <select
                  value={filters.assignee_id?.[0] || ''}
                  onChange={(e) => handleFilterChange('assignee_id', e.target.value ? [parseInt(e.target.value)] : undefined)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Assignees</option>
                  {usersList.map((userOption: User) => (
                    <option key={userOption.id} value={userOption.id}>{userOption.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Due Date Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due From</label>
              <input
                type="date"
                value={filters.due_date_from || ''}
                onChange={(e) => handleFilterChange('due_date_from', e.target.value || undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due To</label>
              <input
                type="date"
                value={filters.due_date_to || ''}
                onChange={(e) => handleFilterChange('due_date_to', e.target.value || undefined)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-800"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Task List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {tasksWithOptimisticUpdates.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">
              {hasActiveFilters ? 'No tasks match your filters.' : 'No tasks found.'}
            </p>
            {!hasActiveFilters && user?.role !== 'member' && (
              <button
                onClick={handleCreateTask}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Create your first task
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tasksWithOptimisticUpdates.map((task) => {
              const isOptimistic = optimisticUpdates.some(update => update.id === task.id);
              const isTaskOverdue = isOverdue(task);
              
              return (
                <div 
                  key={task.id} 
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    isOptimistic ? 'opacity-70 bg-blue-50' : ''
                  } ${isTaskOverdue ? 'border-l-4 border-red-400' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate flex items-center">
                          {task.name}
                          {isTaskOverdue && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              <ClockIcon className="w-3 h-3 mr-1" />
                              Overdue
                            </span>
                          )}
                        </h3>
                        <span className={`px-2 py-1 text-xs rounded-full border ${getPriorityColor(Number(task.priority))}`}>
                          {getPriorityLabel(Number(task.priority))}
                        </span>
                      </div>
                      
                      {task.description && (
                        <p className="text-sm text-gray-500 mb-2 truncate">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                        {task.project?.name && (
                          <span className="inline-flex items-center">
                            <FolderIcon className="w-3 h-3 mr-1" />
                            {task.project.name}
                          </span>
                        )}
                        {task.user?.name && (
                          <span className="inline-flex items-center">
                            <UserIcon className="w-3 h-3 mr-1" />
                            {task.user.name}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="inline-flex items-center">
                            <CalendarIcon className="w-3 h-3 mr-1" />
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                        {task.estimated_time && (
                          <span className="inline-flex items-center">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            {task.estimated_time}h estimated
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      {/* Quick Complete Button */}
                      {task.status !== 'completed' && canEditTask(task) && (
                        <button
                          onClick={() => handleQuickComplete(task.id)}
                          disabled={completeTaskMutation.isPending}
                          className="text-green-600 hover:text-green-900 p-1"
                          title="Mark as completed"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                      )}

                      {/* Status Dropdown */}
                      {canEditTask(task) ? (
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                          className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(task.status)}`}
                          disabled={updateStatusMutation.isPending}
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <span className={`px-2 py-1 text-xs rounded-full border ${getStatusColor(task.status)}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                      )}
                      
                      {/* Action Buttons */}
                      <button
                        onClick={() => handleViewTask(task)}
                        className="text-gray-600 hover:text-gray-900 p-1"
                        title="View task"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      
                      {canEditTask(task) && (
                        <>
                          <button
                            onClick={() => handleEditTask(task)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit task"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          
                          {user?.role !== 'member' && (
                            <button
                              onClick={() => handleDeleteTask(task)}
                              className="text-red-600 hover:text-red-900 p-1"
                              title="Delete task"
                              disabled={deleteTaskMutation.isPending}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Task Modal */}
      {showModal && (
        <SimpleTaskModal
          task={selectedTask}
          mode={modalMode}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && taskToDelete && (
        <DeleteConfirmModal
          title="Delete Task"
          message={`Are you sure you want to delete "${taskToDelete.name}"? This action cannot be undone.`}
          onConfirm={confirmDeleteTask}
          onCancel={() => {
            setShowDeleteModal(false);
            setTaskToDelete(null);
          }}
          isLoading={deleteTaskMutation.isPending}
        />
      )}
    </div>
  );
}
