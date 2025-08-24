import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import {
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { getPriorityLabel, getPriorityColor } from '../../utils/status';

interface ScheduleDay {
  date: string;
  tasks: ScheduledTask[];
  total_hours: number;
  available_hours: number;
  is_full_day: boolean;
  utilization_rate: number;
}

interface ScheduledTask {
  id: number;
  name: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_time: number;
  due_date: string;
  project_id: number;
  assigned_to: number | null;
  is_overdue: boolean;
  days_until_due: number;
  urgency_score: number;
}

interface ScheduleStatistics {
  total_days: number;
  total_tasks: number;
  scheduled_tasks: number;
  unscheduled_tasks: number;
  total_hours: number;
  overdue_tasks: number;
  overdue_percentage: number;
  average_utilization: number;
  start_date: string;
  end_date: string;
}

interface ScheduleData {
  schedule: ScheduleDay[];
  statistics: ScheduleStatistics;
}

export default function TaskSchedule() {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return format(today, 'yyyy-MM-dd');
  });
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [viewType, setViewType] = useState<'personal' | 'team'>('personal');

  const { user } = useAuth();

  // Fetch personal schedule
  const { data: personalSchedule, isLoading: personalLoading, error: personalError } = useQuery({
    queryKey: ['personal-schedule', startDate, hoursPerDay],
    queryFn: () => apiService.getMySchedule(startDate, hoursPerDay),
    enabled: viewType === 'personal',
  });

  // Fetch team schedule (only for admin/manager)
  const { data: teamSchedule, isLoading: teamLoading, error: teamError } = useQuery({
    queryKey: ['team-schedule', startDate, hoursPerDay],
    queryFn: () => apiService.getTeamSchedule(startDate, hoursPerDay),
    enabled: viewType === 'team' && (user?.role === 'admin' || user?.role === 'manager'),
  });

  const scheduleData: ScheduleData | null = viewType === 'personal' ? personalSchedule : teamSchedule;
  const isLoading = viewType === 'personal' ? personalLoading : teamLoading;
  const error = viewType === 'personal' ? personalError : teamError;


  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 90) return 'text-red-600 bg-red-100';
    if (utilization >= 75) return 'text-yellow-600 bg-yellow-100';
    if (utilization >= 50) return 'text-green-600 bg-green-100';
    return 'text-gray-600 bg-gray-100';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-500">Generating schedule...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-6 bg-red-50 rounded-lg">
        <p className="text-red-600">Failed to load schedule. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Schedule</h1>
          <p className="mt-1 text-sm text-gray-600">
            AI-powered task scheduling with priority and due date optimization
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          {/* View Type Toggle */}
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <div className="flex rounded-md overflow-hidden border border-gray-300">
              <button
                onClick={() => setViewType('personal')}
                className={`px-3 py-2 text-sm font-medium ${
                  viewType === 'personal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                My Schedule
              </button>
              <button
                onClick={() => setViewType('team')}
                className={`px-3 py-2 text-sm font-medium ${
                  viewType === 'team'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {user?.role === 'admin' ? 'Organization Schedule' : 'Team Schedule'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-sm">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hours per Day
            </label>
            <input
              type="number"
              min="1"
              max="24"
              step="0.5"
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(parseFloat(e.target.value) || 8)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
            />
          </div>

          <div className="flex items-center text-xs text-gray-500 max-w-md">
            <AdjustmentsHorizontalIcon className="w-4 h-4 mr-1" />
            Tasks are scheduled based on priority (urgent, high, medium, low) and due dates, with urgent tasks scheduled first
          </div>
        </div>
      </div>

      {scheduleData && (
        <>
          {/* Statistics */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ChartBarIcon className="h-6 w-6 text-blue-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Tasks Scheduled
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {scheduleData.statistics.scheduled_tasks} / {scheduleData.statistics.total_tasks}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-6 w-6 text-green-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Hours
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {scheduleData.statistics.total_hours}h
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CalendarIcon className="h-6 w-6 text-yellow-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Schedule Days
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {scheduleData.statistics.total_days}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-400" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Overdue Tasks
                      </dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {scheduleData.statistics.overdue_tasks} ({scheduleData.statistics.overdue_percentage}%)
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Schedule Calendar */}
          {scheduleData.schedule.length > 0 ? (
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Schedule Overview
                  <span className="ml-2 text-sm text-gray-500">
                    ({format(parseISO(scheduleData.statistics.start_date), 'MMM d')} - {format(parseISO(scheduleData.statistics.end_date), 'MMM d, yyyy')})
                  </span>
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Average utilization: {scheduleData.statistics.average_utilization}%
                </p>
              </div>
              
              <div className="divide-y divide-gray-200">
                {scheduleData.schedule.map((day) => (
                  <div key={day.date} className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-medium text-gray-900">
                          {format(parseISO(day.date), 'EEEE, MMM d, yyyy')}
                        </h4>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUtilizationColor(day.utilization_rate)}`}>
                          {day.utilization_rate}% utilization
                        </span>
                        {day.is_full_day && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            Full Day
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">
                        {day.total_hours}h / {day.available_hours}h available
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {day.tasks.map((task) => (
                        <div 
                          key={task.id}
                          className={`p-3 border border-gray-200 rounded-lg ${
                            task.is_overdue ? 'border-l-4 border-l-red-400 bg-red-50' : 'bg-gray-50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h5 className="text-sm font-medium text-gray-900 truncate">
                                {task.name}
                              </h5>
                              <div className="mt-1 flex items-center space-x-2 text-xs">
                                <span className={`px-2 py-0.5 rounded-full border ${getPriorityColor(task.priority)}`}>
                                  {getPriorityLabel(task.priority)}
                                </span>
                                <span className="text-gray-500">
                                  {task.estimated_time}h
                                </span>
                                {task.is_overdue && (
                                  <span className="text-red-600 font-medium">
                                    Overdue
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                Due: {format(parseISO(task.due_date), 'MMM d')}
                                {task.days_until_due !== 0 && (
                                  <span className="ml-1">
                                    ({task.days_until_due > 0 ? `${task.days_until_due} days left` : `${Math.abs(task.days_until_due)} days overdue`})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 font-mono">
                              Score: {task.urgency_score}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6 text-center">
              <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks to schedule</h3>
              <p className="mt-1 text-sm text-gray-500">
                All your tasks are either completed or don't have the required information for scheduling.
              </p>
            </div>
          )}

          {/* Unscheduled Tasks Warning */}
          {scheduleData.statistics.unscheduled_tasks > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800">
                    {scheduleData.statistics.unscheduled_tasks} task{scheduleData.statistics.unscheduled_tasks !== 1 ? 's' : ''} could not be scheduled
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700">
                    <p>
                      Some tasks couldn't fit in the available time slots. Consider:
                    </p>
                    <ul className="mt-1 list-disc pl-5 space-y-1">
                      <li>Increasing hours per day</li>
                      <li>Adjusting task priorities</li>
                      <li>Breaking down large tasks</li>
                      <li>Extending the scheduling period</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
