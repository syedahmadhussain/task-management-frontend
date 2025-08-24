import React, { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { apiService } from '../../services/api';
import { useAllUsers } from '../../hooks/useUsers';
import { useAuth } from '../../hooks/useAuth';
import type { Task } from '../../types';

interface SimpleTaskModalProps {
  task: Task | null;
  mode: 'create' | 'edit' | 'view';
  onClose: () => void;
  onSave: () => void;
}

export default function SimpleTaskModal({
  task,
  mode,
  onClose,
  onSave,
}: SimpleTaskModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'pending' as Task['status'],
    priority: 'medium' as Task['priority'],
    project_id: null as number | null,
    assigned_to: null as number | null,
    due_date: '',
    estimated_time: null as number | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { user } = useAuth();

  // Fetch projects for project selection
  const { data: projectsData, isLoading: projectsLoading, error: projectsError } = useQuery({
    queryKey: ['projects', 'all'], // Use consistent key pattern with status filter
    queryFn: () => {
      return apiService.getProjects(1, 100);
    },
    staleTime: 0,
    gcTime: 1000 * 60 * 5,
  });

  // Fetch users for assignment selection
  const { data: users } = useAllUsers();
  const usersList = Array.isArray(users) ? users : [];

  const projects = (projectsData as any)?.data || [];

  const createTaskMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const taskData = {
        ...data,
        project_id: data.project_id || 0, // Use 0 instead of null for API compatibility
        assigned_to: data.assigned_to || undefined, // Convert null to undefined
        estimated_time: data.estimated_time?.toString() // Convert to string
      };
      return apiService.createTask(taskData);
    },
    onSuccess: () => {
      onSave();
    },
    onError: (error: any) => {
      
      if (error.response?.data?.errors) {
        // Handle Laravel validation errors - convert arrays to strings
        const formattedErrors: Record<string, string> = {};
        Object.entries(error.response.data.errors).forEach(([key, value]) => {
          formattedErrors[key] = Array.isArray(value) ? value[0] : String(value);
        });
        setErrors(formattedErrors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: `Failed to create task. Server responded with status ${error.response?.status || 'unknown'}.` });
      }
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: (data: { id: number; updates: Partial<Task> }) => {
      return apiService.updateTask(data.id, data.updates);
    },
    onSuccess: () => {
      onSave();
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ general: 'Failed to update task. Please try again.' });
      }
    },
  });

  useEffect(() => {
    if (task && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: task.name,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        project_id: task.project_id || null,
        assigned_to: task.assigned_to || null,
        due_date: task.due_date || '',
        estimated_time: typeof task.estimated_time === 'string' ? parseFloat(task.estimated_time) || null : task.estimated_time || null,
      });
    } else {
      // Reset form for create mode
      setFormData({
        name: '',
        description: '',
        status: 'pending',
        priority: 'medium',
        project_id: null,
        assigned_to: null,
        due_date: '',
        estimated_time: null,
      });
    }
    setErrors({});
  }, [task, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Task name is required';
    }
    
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    }
    
    // Check if due date is in the future
    if (formData.due_date) {
      const dueDate = new Date(formData.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (dueDate <= today) {
        newErrors.due_date = 'Due date must be in the future';
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (mode === 'create') {
      createTaskMutation.mutate(formData);
    } else if (mode === 'edit' && task) {
      // Filter fields based on user role to prevent validation errors
      let allowedUpdates = { ...formData };
      
      if (user?.role === 'member') {
        // Members can only update specific fields
        allowedUpdates = {
          ...formData,
          name: task.name, // Keep existing values for restricted fields
          description: task.description || '',
          priority: task.priority,
          project_id: task.project_id,
          assigned_to: task.assigned_to || null,
          due_date: task.due_date || '',
          // Only allow updates to these fields
          status: formData.status,
          estimated_time: formData.estimated_time
        };
      } else {
        // Admins and managers can update all fields
        allowedUpdates = {
          ...formData,
          project_id: formData.project_id || null
        };
      }
      
      updateTaskMutation.mutate({
        id: task.id,
        updates: {
          ...allowedUpdates,
          assigned_to: allowedUpdates.assigned_to || undefined,
          estimated_time: allowedUpdates.estimated_time?.toString()
        } as any,
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'project_id' || name === 'assigned_to'
        ? value ? parseInt(value) : null 
        : name === 'estimated_time'
        ? value ? parseFloat(value) : null
        : value,
    }));
  };

  const isReadOnly = mode === 'view';
  const isLoading = createTaskMutation.isPending || updateTaskMutation.isPending;
  const canEditAllFields = user?.role === 'admin' || user?.role === 'manager' || mode === 'create';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        {/* This element is to trick the browser into centering the modal contents. */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
        
        <div className="relative inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {mode === 'create' && 'New Task'}
                  {mode === 'edit' && 'Edit Task'}
                  {mode === 'view' && 'Task Details'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{errors.general}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Task Name - Only admins/managers can edit */}
                {canEditAllFields && (
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                      Task Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                      placeholder="Enter task name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                    )}
                  </div>
                )}
                
                {/* Task Name - Read-only for members */}
                {!canEditAllFields && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Task Name
                    </label>
                    <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      {formData.name}
                    </div>
                  </div>
                )}

                {/* Description - Only admins/managers can edit */}
                {canEditAllFields && (
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                      placeholder="Enter task description (optional)"
                    />
                  </div>
                )}
                
                {/* Description - Read-only for members */}
                {!canEditAllFields && formData.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600 whitespace-pre-wrap">
                      {formData.description}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Status */}
                  <div>
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Priority - Only admins/managers can edit */}
                  {canEditAllFields && (
                    <div>
                      <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        disabled={isReadOnly}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                      >
                        <option value="urgent">Urgent</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  )}
                  
                  {/* Priority - Read-only for members */}
                  {!canEditAllFields && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Priority
                      </label>
                      <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                        {formData.priority.charAt(0).toUpperCase() + formData.priority.slice(1)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Project - Only admins/managers can edit */}
                {canEditAllFields && (
                  <div>
                    <label htmlFor="project_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Project
                    </label>
                    <select
                      id="project_id"
                      name="project_id"
                      value={formData.project_id || ''}
                      onChange={handleChange}
                      disabled={isReadOnly || projectsLoading}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {projectsLoading ? 'Loading projects...' : 
                         projectsError ? 'Failed to load projects' :
                         projects.length === 0 ? 'No projects available' : 'No project'}
                      </option>
                      {projects.map((project: any) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                    {projectsError && (
                      <p className="mt-1 text-sm text-red-600">
                        Failed to load projects: {projectsError.message}
                      </p>
                    )}
                    {errors.project_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.project_id}</p>
                    )}
                  </div>
                )}
                
                {/* Project - Read-only for members */}
                {!canEditAllFields && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Project
                    </label>
                    <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      {formData.project_id 
                        ? projects.find((p: any) => p.id === formData.project_id)?.name || 'Unknown Project'
                        : 'No project'
                      }
                    </div>
                  </div>
                )}

                {/* Assigned To - Only admins/managers can edit */}
                {canEditAllFields && (
                  <div>
                    <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned To
                    </label>
                    <select
                      id="assigned_to"
                      name="assigned_to"
                      value={formData.assigned_to || ''}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Unassigned</option>
                      {usersList.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email}) - {user.role}
                        </option>
                      ))}
                    </select>
                    {errors.assigned_to && (
                      <p className="mt-1 text-sm text-red-600">{errors.assigned_to}</p>
                    )}
                  </div>
                )}
                
                {/* Assigned To - Read-only for members */}
                {!canEditAllFields && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assigned To
                    </label>
                    <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                      {formData.assigned_to 
                        ? usersList.find(u => u.id === formData.assigned_to)?.name || 'Unknown User'
                        : 'Unassigned'
                      }
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {/* Due Date - Only admins/managers can edit */}
                  {canEditAllFields && (
                    <div>
                      <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date *
                      </label>
                      <input
                        type="date"
                        id="due_date"
                        name="due_date"
                        value={formData.due_date}
                        onChange={handleChange}
                        disabled={isReadOnly}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                      />
                      {errors.due_date && (
                        <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Due Date - Read-only for members */}
                  {!canEditAllFields && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Due Date
                      </label>
                      <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-gray-600">
                        {formData.due_date || 'No due date'}
                      </div>
                    </div>
                  )}

                  {/* Estimated Time */}
                  <div>
                    <label htmlFor="estimated_time" className="block text-sm font-medium text-gray-700 mb-1">
                      Estimated Time (hours)
                    </label>
                    <input
                      type="number"
                      id="estimated_time"
                      name="estimated_time"
                      value={formData.estimated_time || ''}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      min="0"
                      step="0.5"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                      placeholder="0"
                    />
                    {errors.estimated_time && (
                      <p className="mt-1 text-sm text-red-600">{errors.estimated_time}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {!isReadOnly && (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center">
                      <div className="loading-spinner mr-2" />
                      Saving...
                    </div>
                  ) : (
                    mode === 'create' ? 'Create Task' : 'Save Changes'
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                {isReadOnly ? 'Close' : 'Cancel'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
