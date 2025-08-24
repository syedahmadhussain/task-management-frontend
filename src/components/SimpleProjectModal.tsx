import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { useManagers } from '../hooks/useUsers';
import { useAuth } from '../hooks/useAuth';
import type { Project } from '../types';

interface SimpleProjectModalProps {
  project: Project | null;
  mode: 'create' | 'edit' | 'view';
  onClose: () => void;
  onSave: (projectData?: any) => void;
}

export default function SimpleProjectModal({
  project,
  mode,
  onClose,
  onSave,
}: SimpleProjectModalProps) {
  const { user } = useAuth();
  // Only fetch managers for admins (managers don't need to see other managers)
  const { data: managers } = useManagers(user?.role === 'admin');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as Project['status'],
    priority: 3,
    start_date: '',
    manager_id: null as number | null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Helper function to prepare project data
  const prepareProjectData = (data: typeof formData) => {
    const projectData = {
      ...data,
      // Ensure description is not null
      description: data.description || '',
      // Add required fields based on the project structure from GET response
      org_id: user?.org_id || 1, // Use current user's org or default to 1
    };
    
    // Business logic: 
    // - Admin can assign projects to managers
    // - Manager can only create projects for themselves
    if (user?.role === 'admin') {
      // Admin can select a manager or leave unassigned
      if (data.manager_id) {
        projectData.manager_id = data.manager_id;
        projectData.assigned_user_id = data.manager_id;
      } else {
        // If no manager selected, leave both null for admin to assign later
        projectData.manager_id = null;
        projectData.assigned_user_id = null;
      }
    } else if (user?.role === 'manager') {
      // Manager can only create projects for themselves
      projectData.manager_id = user.id;
      projectData.assigned_user_id = user.id;
    }
    
    return projectData;
  };

  const createProjectMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const projectData = prepareProjectData(data);
      return apiService.createProject(projectData);
    },
    onSuccess: () => {
      onSave();
    },
    onError: (error: any) => {
      
      if (error.response?.data?.errors) {
        // Handle Laravel validation errors
        setErrors(error.response.data.errors);
      } else if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else if (error.response?.status === 422) {
        setErrors({ general: 'Please check your input and try again.' });
      } else if (error.response?.status === 403) {
        setErrors({ general: 'You do not have permission to create projects.' });
      } else if (error.response?.status === 302) {
        setErrors({ general: 'Authentication issue. Please try logging in again.' });
      } else if (error.response?.status === 500) {
        setErrors({ general: 'Server error occurred. The backend may have an issue with project creation. Please contact support.' });
      } else {
        setErrors({ general: `Failed to create project. Server responded with status ${error.response?.status || 'unknown'}.` });
      }
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: (data: { id: number; updates: typeof formData }) => {
      const updateData = {
        ...data.updates,
        description: data.updates.description || '',
        org_id: user?.org_id || 1,
      };
      if (data.updates.manager_id) {
        updateData.manager_id = data.updates.manager_id;
      } else if (user?.id) {
        updateData.manager_id = user.id;
      }
      return apiService.updateProject(data.id, updateData);
    },
    onSuccess: () => {
      onSave();
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ general: 'Failed to update project. Please try again.' });
      }
    },
  });

  useEffect(() => {
    if (project && (mode === 'edit' || mode === 'view')) {
      setFormData({
        name: project.name,
        description: project.description || '',
        status: project.status,
        priority: project.priority,
        start_date: project.start_date ? project.start_date.split('T')[0] : '',
        // Handle both field names from backend responses
        manager_id: project.manager_id || project.assigned_user_id || null,
      });
    } else {
      // Reset form for create mode - set default start_date to today
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        name: '',
        description: '',
        status: 'active',
        priority: 3,
        start_date: today,
        manager_id: null,
      });
    }
    setErrors({});
  }, [project, mode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') return;

    setErrors({});

    // Basic validation
    if (!formData.name.trim()) {
      setErrors({ name: 'Project name is required' });
      return;
    }
    
    if (!formData.start_date) {
      setErrors({ start_date: 'Start date is required' });
      return;
    }

    if (mode === 'create') {
      const projectData = prepareProjectData(formData);
      // Pass project data to parent for optimistic updates
      onSave(projectData);
      // Don't use the local mutation anymore as parent handles optimistic updates
    } else if (mode === 'edit' && project) {
      updateProjectMutation.mutate({
        id: project.id,
        updates: formData,
      });
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'priority' || name === 'manager_id'
        ? value ? parseInt(value) : null
        : value,
    }));
  };

  const isReadOnly = mode === 'view';
  const isLoading = createProjectMutation.isPending || updateProjectMutation.isPending;

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
                  {mode === 'create' && 'New Project'}
                  {mode === 'edit' && 'Edit Project'}
                  {mode === 'view' && 'Project Details'}
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
                {/* Project Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    placeholder="Enter project name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Description */}
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
                    placeholder="Enter project description (optional)"
                  />
                </div>

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
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="on_hold">On Hold</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Priority */}
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
                      <option value={1}>Very Low</option>
                      <option value={2}>Low</option>
                      <option value={3}>Medium</option>
                      <option value={4}>High</option>
                      <option value={5}>Very High</option>
                    </select>
                  </div>
                </div>

                {/* Start Date */}
                <div>
                  <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="start_date"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    disabled={isReadOnly}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
                  )}
                </div>

                {/* Manager Selection - Only show for admins */}
                {user?.role === 'admin' && (
                  <div>
                    <label htmlFor="manager_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Project Manager
                    </label>
                    <select
                      id="manager_id"
                      name="manager_id"
                      value={formData.manager_id || ''}
                      onChange={handleChange}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
                    >
                      <option value="">Select a manager (optional)</option>
                      {managers?.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.name} ({manager.email})
                        </option>
                      ))}
                    </select>
                    {errors.manager_id && (
                      <p className="mt-1 text-sm text-red-600">{errors.manager_id}</p>
                    )}
                  </div>
                )}
                
                {/* Show info for managers that project will be assigned to them */}
                {user?.role === 'manager' && mode === 'create' && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-600">
                      <strong>Note:</strong> This project will be automatically assigned to you as the project manager.
                    </p>
                  </div>
                )}
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
                    mode === 'create' ? 'Create Project' : 'Save Changes'
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
