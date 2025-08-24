import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import echo from '../services/echo';
import { useAuth } from './useAuth';
import type { Task, Project } from '../types';

export function useDashboardRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.org_id || !user?.id) {
      return;
    }


    // Listen to the organization's private channel for all events
    const channel = echo.private(`organization.${user.org_id}`);

    // Handle project created events
    const handleProjectCreated = (data: any) => {
      
      // Invalidate projects query to refresh dashboard projects data
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    // Handle project updated events
    const handleProjectUpdated = (data: any) => {
      
      // Invalidate projects query to refresh dashboard projects data
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    };

    // Handle task created events
    const handleTaskCreated = (data: any) => {
      
      // Update tasks in dashboard queries
      queryClient.setQueriesData(
        { queryKey: ['tasks'] },
        (oldData: any) => {
          if (!oldData || !data.task) return oldData;
          
          // For paginated responses, add to the beginning of the data array
          if (Array.isArray(oldData)) {
            return [data.task, ...oldData];
          } else if (oldData.data && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: [data.task, ...oldData.data]
            };
          }
          
          return oldData;
        }
      );
      
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    // Handle task updated events (including status changes)
    const handleTaskUpdated = (data: any) => {
      
      // Update specific task in all task queries
      queryClient.setQueriesData(
        { queryKey: ['tasks'] },
        (oldData: any) => {
          if (!oldData || !data.task) return oldData;
          
          const updateTaskInArray = (tasks: Task[]) => {
            return tasks.map(task => 
              task.id === data.task.id ? { ...task, ...data.task } : task
            );
          };
          
          // For paginated responses
          if (Array.isArray(oldData)) {
            return updateTaskInArray(oldData);
          } else if (oldData.data && Array.isArray(oldData.data)) {
            return {
              ...oldData,
              data: updateTaskInArray(oldData.data)
            };
          }
          
          return oldData;
        }
      );
      
      // Also invalidate to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    // Handle task completed events (specific case of task update)
    const handleTaskCompleted = (data: any) => {
      handleTaskUpdated(data);
    };

    // Bind event listeners
    channel
      .listen('.project.created', handleProjectCreated)
      .listen('.project.updated', handleProjectUpdated)
      .listen('.task.created', handleTaskCreated)
      .listen('.task.updated', handleTaskUpdated)
      .listen('.task.completed', handleTaskCompleted);

    // Cleanup function
    return () => {
      channel
        .stopListening('.project.created', handleProjectCreated)
        .stopListening('.project.updated', handleProjectUpdated)
        .stopListening('.task.created', handleTaskCreated)
        .stopListening('.task.updated', handleTaskUpdated)
        .stopListening('.task.completed', handleTaskCompleted);
      
      // Note: Don't leave the channel here as it might be used by other components
    };
  }, [user?.org_id, user?.id, queryClient]);

  return {
    isConnected: echo.connector?.pusher?.connection?.state === 'connected',
  };
}
