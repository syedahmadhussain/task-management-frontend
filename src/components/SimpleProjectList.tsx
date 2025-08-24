import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusIcon, PencilIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import type { Project } from '../types';
import { useProjectRealtime } from '../hooks/useProjectRealtime';
import SimpleProjectModal from './SimpleProjectModal';
import DeleteConfirmModal from './DeleteConfirmModal';

export default function SimpleProjectList() {
  const queryClient = useQueryClient();
  const { isConnected } = useProjectRealtime();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch projects
  const { data: projectsResponse, isLoading, error } = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: () => apiService.getProjects(1, 50),
  });

  const projects = projectsResponse?.data || [];

  // Optimistic project creation mutation
  const createProjectMutation = useMutation({
    mutationFn: (projectData: any) => apiService.createProject(projectData),
    onMutate: async (newProject) => {
      // Cancel any outgoing refetches (so they don't overwrite our optimistic update)
      await queryClient.cancelQueries({ queryKey: ['projects'] });

      // Snapshot the previous value
      const previousProjects = queryClient.getQueryData(['projects', statusFilter]);

      // Create optimistic project with temporary ID
      const optimisticProject = {
        id: Date.now(), // Temporary ID
        name: newProject.name,
        description: newProject.description || '',
        status: newProject.status,
        priority: newProject.priority,
        start_date: newProject.start_date,
        end_date: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        tasks_count: 0,
        manager_id: newProject.manager_id,
        assigned_user_id: newProject.assigned_user_id || newProject.manager_id,
        org_id: newProject.org_id,
        _optimistic: true, // Flag to identify optimistic updates
      };

      // Optimistically update to the new value
      queryClient.setQueryData(['projects', statusFilter], (old: any) => {
        if (!old) return { data: [optimisticProject] };
        return {
          ...old,
          data: [optimisticProject, ...old.data]
        };
      });

      // Return a context object with the snapshotted value
      return { previousProjects };
    },
    onError: (err: any, _, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(['projects', statusFilter], context?.previousProjects);
      
      // Show user-friendly error notification
      
      // You can add toast notification here if you have a toast system
      // For now, we'll use browser alert as fallback
      const errorMessage = err.response?.data?.message || 'Failed to create project. Please try again.';
      alert(`Error: ${errorMessage}`);
    },
    onSuccess: () => {
      // Project created successfully
    },
    onSettled: () => {
      // Always refetch after error or success to ensure we have the latest data
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      // Also invalidate the "all" query used by task modal
      queryClient.invalidateQueries({ queryKey: ['projects', 'all'] });
    },
  });

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (id: number) => apiService.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowDeleteModal(false);
      setProjectToDelete(null);
    },
  });

  const handleCreateProject = () => {
    setSelectedProject(null);
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleViewProject = (project: Project) => {
    setSelectedProject(project);
    setModalMode('view');
    setShowModal(true);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
    setShowDeleteModal(true);
  };

  const confirmDeleteProject = () => {
    if (projectToDelete) {
      deleteProjectMutation.mutate(projectToDelete.id);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on_hold': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: number | undefined) => {
    if (!priority) return 'bg-gray-100 text-gray-800';
    switch (priority) {
      case 1: return 'bg-gray-100 text-gray-800';
      case 2: return 'bg-yellow-100 text-yellow-800';
      case 3: return 'bg-orange-100 text-orange-800';
      case 4: return 'bg-red-100 text-red-800';
      case 5: return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityLabel = (priority: number | undefined) => {
    if (!priority) return 'Unknown';
    switch (priority) {
      case 1: return 'Very Low';
      case 2: return 'Low';
      case 3: return 'Medium';
      case 4: return 'High';
      case 5: return 'Very High';
      default: return 'Unknown';
    }
  };

  // Filter projects based on status
  const filteredProjects = statusFilter === 'all' 
    ? projects 
    : projects.filter(project => project?.status === statusFilter);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-500">Loading projects...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-lg">
        <p className="text-red-600">Failed to load projects. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            {/* Real-time status indicator */}
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-gray-400'
              }`}></div>
              <span className="text-xs text-gray-500">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Manage your projects and track progress
            {isConnected && ' • Real-time updates enabled'}
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Projects</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <button
            onClick={handleCreateProject}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Project
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-500 mb-4">
              {statusFilter === 'all' ? 'No projects found.' : `No ${statusFilter.replace('_', ' ')} projects.`}
            </p>
            <button
              onClick={handleCreateProject}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Create your first project
            </button>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div
              key={project.id}
              className={`bg-white rounded-lg border p-6 hover:shadow-md transition-shadow ${
                (project as any)._optimistic 
                  ? 'border-blue-300 bg-blue-50 opacity-75' 
                  : 'border-gray-200'
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {project.name}
                  </h3>
                  {(project as any)._optimistic && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Saving...
                    </span>
                  )}
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleViewProject(project)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="View project"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEditProject(project)}
                    className="p-1 text-gray-400 hover:text-blue-600"
                    title="Edit project"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project)}
                    className="p-1 text-gray-400 hover:text-red-600"
                    title="Delete project"
                    disabled={deleteProjectMutation.isPending}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {project.description && (
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {project.description}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                  {project.status?.replace('_', ' ') || 'Unknown'}
                </span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                  {getPriorityLabel(project.priority)}
                </span>
              </div>

              <div className="text-xs text-gray-500 space-y-1">
                {project.start_date && (
                  <div>Start: {new Date(project.start_date).toLocaleDateString()}</div>
                )}
                {project.end_date && (
                  <div>End: {new Date(project.end_date).toLocaleDateString()}</div>
                )}
                {project.created_at && (
                  <div>Created: {new Date(project.created_at).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Project Modal */}
      {showModal && (
        <SimpleProjectModal
          project={selectedProject}
          mode={modalMode}
          onClose={() => setShowModal(false)}
          onSave={(projectData) => {
            if (modalMode === 'create' && projectData) {
              // Use optimistic mutation for creation
              createProjectMutation.mutate(projectData);
            }
            setShowModal(false);
            // No need to invalidate queries here as the mutation handles it
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && projectToDelete && (
        <DeleteConfirmModal
          title="Delete Project"
          message={`Are you sure you want to delete "${projectToDelete.name}"? This will also permanently delete all ${projectToDelete.tasks_count || 0} task(s) in this project. This action cannot be undone.`}
          onConfirm={confirmDeleteProject}
          onCancel={() => {
            setShowDeleteModal(false);
            setProjectToDelete(null);
          }}
          isLoading={deleteProjectMutation.isPending}
        />
      )}
    </div>
  );
}
