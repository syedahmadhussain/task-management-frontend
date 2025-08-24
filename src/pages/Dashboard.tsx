import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDashboardRealtime } from '../hooks/useDashboardRealtime';
import { apiService } from '../services/api';
import {
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FolderIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { clsx } from 'clsx';
import { 
  getPriorityColor, 
  getPriorityLabel, 
  getStatusColor, 
  getStatusLabel,
  isTaskOverdue 
} from '../utils/status';

export default function Dashboard() {
  const { user } = useAuth();
  const { isConnected } = useDashboardRealtime();

  // Fetch dashboard data with real-time updates
  const { data: tasks = [], refetch: refetchTasks } = useQuery({
    queryKey: ['tasks', { limit: 100 }],
    queryFn: () => apiService.getTasks({}, undefined, 1, 100).then(res => res.data),
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: isConnected ? false : 60000, // Auto-refetch every minute if not connected
  });

  const { data: projects = [], refetch: refetchProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => apiService.getProjects().then(res => res.data),
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: isConnected ? false : 60000, // Auto-refetch every minute if not connected
  });

  // Calculate stats
  const taskStats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    overdue: tasks.filter(isTaskOverdue).length,
  };

  const projectStats = {
    total: projects.length,
    active: projects.filter(p => p.status === 'active').length,
    completed: projects.filter(p => p.status === 'completed').length,
  };

  const recentTasks = tasks
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const urgentTasks = tasks
    .filter(t => t.priority === 'urgent' && t.status !== 'completed')
    .slice(0, 3);

  const stats = [
    {
      name: 'Total Tasks',
      value: taskStats.total,
      icon: CheckCircleIcon,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      name: 'In Progress',
      value: taskStats.inProgress,
      icon: ClockIcon,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
    {
      name: 'Completed',
      value: taskStats.completed,
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      name: 'Overdue',
      value: taskStats.overdue,
      icon: ExclamationTriangleIcon,
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
    {
      name: 'Active Projects',
      value: projectStats.active,
      icon: FolderIcon,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ];



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}!
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {user?.role === 'admin' 
              ? 'Here\'s an overview of all tasks and projects across your organization.'
              : user?.role === 'manager'
                ? 'Here\'s what\'s happening with your projects and team tasks.'
                : 'Here\'s what\'s happening with your tasks and projects today.'
            }
          </p>
        </div>
        
        {/* Real-time status indicator */}
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
          }`}></div>
          <span className="text-xs text-gray-500">
            {isConnected ? 'Live Updates' : 'Offline'}
          </span>
          <SignalIcon className={`w-4 h-4 ${
            isConnected ? 'text-green-500' : 'text-gray-400'
          }`} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="relative bg-white pt-5 px-4 pb-12 sm:pt-6 sm:px-6 shadow rounded-lg overflow-hidden"
          >
            <dt>
              <div className={clsx('absolute p-3 rounded-md', stat.bg)}>
                <stat.icon className={clsx('h-6 w-6', stat.color)} />
              </div>
              <p className="ml-16 text-sm font-medium text-gray-500 truncate">
                {stat.name}
              </p>
            </dt>
            <dd className="ml-16 pb-6 flex items-baseline sm:pb-7">
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </dd>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Tasks */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Tasks
            </h3>
            {recentTasks.length === 0 ? (
              <p className="text-sm text-gray-500">No tasks yet.</p>
            ) : (
              <div className="space-y-3">
                {recentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {task.project?.name}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          getStatusColor(task.status)
                        )}
                      >
                        {getStatusLabel(task.status)}
                      </span>
                      <span
                        className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          getPriorityColor(task.priority)
                        )}
                      >
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 space-y-2">
              <Link
                to="/dashboard/tasks"
                className="block text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                View all tasks →
              </Link>
              <Link
                to="/dashboard/schedule"
                className="block text-sm font-medium text-green-600 hover:text-green-500"
              >
                View schedule →
              </Link>
            </div>
          </div>
        </div>

        {/* Urgent Tasks */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Urgent Tasks
            </h3>
            {urgentTasks.length === 0 ? (
              <p className="text-sm text-gray-500">No urgent tasks.</p>
            ) : (
              <div className="space-y-3">
                {urgentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-md"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {task.project?.name}
                        {task.due_date && (
                          <span className="ml-2">
                            Due: {new Date(task.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                        getStatusColor(task.status)
                      )}
                    >
                      {getStatusLabel(task.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
