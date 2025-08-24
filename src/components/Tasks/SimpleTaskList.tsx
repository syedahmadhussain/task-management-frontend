import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { PlusIcon, PencilIcon, EyeIcon, TrashIcon } from '@heroicons/react/24/outline';
import SimpleTaskModal from './SimpleTaskModal';
import DeleteConfirmModal from '../DeleteConfirmModal';
import type { Task } from '../../types';
import { 
  getPriorityColor, 
  getPriorityLabel, 
  getAllowedStatusOptions, 
  getStatusLabel, 
  getStatusColor
} from '../../utils/status';
import { useTaskMutations } from '../../hooks/useTaskMutations';

export default function SimpleTaskList() {
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');


  // Unified task mutations with optimistic updates
  const {
    updateTaskStatus,
    deleteTask,
    isLoading: mutationLoading
  } = useTaskMutations({
    onSuccess: () => {
      // Close modals on success
      setShowDeleteModal(false);
      setTaskToDelete(null);
    }
  });

  // Fetch tasks
  const { data: tasksResponse, isLoading, error } = useQuery({
    queryKey: ['tasks', statusFilter],
    queryFn: () => {
      const filters = statusFilter !== 'all' ? { status: [statusFilter as Task['status']] } : {};
      return apiService.getTasks(filters, { field: 'created_at', direction: 'desc' }, 1, 100);
    },
  });

  const tasks = tasksResponse?.data || [];

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
      deleteTask(taskToDelete.id);
    }
  };

  const handleStatusChange = (taskId: number, newStatus: Task['status']) => {
    updateTaskStatus(taskId, newStatus);
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage your tasks and track progress
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <button
            onClick={handleCreateTask}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Task
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-gray-500 mb-4">
              {statusFilter === 'all' ? 'No tasks found.' : `No ${statusFilter.replace('_', ' ')} tasks.`}
            </p>
            <button
              onClick={handleCreateTask}
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Create your first task
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {task.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {task.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                      {task.project?.name && (
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          📁 {task.project.name}
                        </span>
                      )}
                      {task.user?.name && (
                        <span>👤 {task.user.name}</span>
                      )}
                      <span>📅 {new Date(task.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {/* Status Dropdown */}
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as Task['status'])}
                      className={`px-2 py-1 text-xs rounded-full border-0 ${getStatusColor(task.status)}`}
                      disabled={mutationLoading}
                      title={`Current: ${getStatusLabel(task.status)}. Available transitions: ${getAllowedStatusOptions(task.status).map(getStatusLabel).join(', ')}`}
                    >
                      {getAllowedStatusOptions(task.status).map((statusOption) => (
                        <option key={statusOption} value={statusOption}>
                          {getStatusLabel(statusOption)}
                        </option>
                      ))}
                    </select>
                    
                    {/* Action Buttons */}
                    <button
                      onClick={() => handleViewTask(task)}
                      className="text-gray-600 hover:text-gray-900 p-1"
                      title="View task"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditTask(task)}
                      className="text-blue-600 hover:text-blue-900 p-1"
                      title="Edit task"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTask(task)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title="Delete task"
                      disabled={mutationLoading}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
          isLoading={mutationLoading}
        />
      )}
    </div>
  );
}
