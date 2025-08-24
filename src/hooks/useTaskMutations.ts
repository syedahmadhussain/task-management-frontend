import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { Task } from '../types';
import { isValidStatusTransition } from '../utils/status';

interface TaskMutationOptions {
  onSuccess?: () => void;
  onError?: (error: any) => void;
  optimistic?: boolean;
}

export function useTaskMutations(options: TaskMutationOptions = {}) {
  const queryClient = useQueryClient();
  const {
    onSuccess,
    onError,
    optimistic = true
  } = options;

  const applyOptimisticUpdate = (taskId: number, newData: Partial<Task>) => {
    if (!optimistic) return;

    queryClient.setQueryData(['tasks'], (oldData: any) => {
      if (!oldData?.data) return oldData;
      
      return {
        ...oldData,
        data: oldData.data.map((task: Task) =>
          task.id === taskId ? { ...task, ...newData } : task
        ),
      };
    });
  };


  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Task['status'] }) => {
      return apiService.updateTask(id, { status });
    },
    onMutate: async ({ id, status }) => {
      if (optimistic) {
        const tasksData = queryClient.getQueryData(['tasks']) as any;
        const currentTask = tasksData?.data?.find((task: Task) => task.id === id);
        
        if (currentTask && !isValidStatusTransition(currentTask.status, status)) {
          throw new Error(`Invalid status transition from ${currentTask.status} to ${status}`);
        }
        
        applyOptimisticUpdate(id, { status });
        
        return { previousData: tasksData };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onSuccess?.();
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['tasks'], context.previousData);
      }
      onError?.(error);
    },
  });

  const completeTaskMutation = useMutation({
    mutationFn: (id: number) => {
      return apiService.completeTask(id);
    },
    onMutate: async (id) => {
      if (optimistic) {
        const tasksData = queryClient.getQueryData(['tasks']) as any;
        applyOptimisticUpdate(id, { 
          status: 'completed' as const,
          completed_at: new Date().toISOString()
        });
        return { previousData: tasksData };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onSuccess?.();
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['tasks'], context.previousData);
      }
      onError?.(error);
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Task> }) => {
      return apiService.updateTask(id, updates);
    },
    onMutate: async ({ id, updates }) => {
      if (optimistic) {
        const tasksData = queryClient.getQueryData(['tasks']) as any;
        applyOptimisticUpdate(id, updates);
        return { previousData: tasksData };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onSuccess?.();
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['tasks'], context.previousData);
      }
      onError?.(error);
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: (id: number) => {
      return apiService.deleteTask(id);
    },
    onMutate: async (id) => {
      if (optimistic) {
        const tasksData = queryClient.getQueryData(['tasks']) as any;
        if (tasksData?.data) {
          queryClient.setQueryData(['tasks'], {
            ...tasksData,
            data: tasksData.data.filter((task: Task) => task.id !== id),
          });
        }
        return { previousData: tasksData };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onSuccess?.();
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['tasks'], context.previousData);
      }
      onError?.(error);
    },
  });

  const assignTaskMutation = useMutation({
    mutationFn: ({ id, userId }: { id: number; userId: number }) => {
      return apiService.assignTask(id, userId);
    },
    onMutate: async ({ id, userId }) => {
      if (optimistic) {
        const tasksData = queryClient.getQueryData(['tasks']) as any;
        applyOptimisticUpdate(id, { assigned_to: userId });
        return { previousData: tasksData };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      onSuccess?.();
    },
    onError: (error, _, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['tasks'], context.previousData);
      }
      onError?.(error);
    },
  });

  const updateTaskStatus = (taskId: number, status: Task['status']) => {
    updateStatusMutation.mutate({ id: taskId, status });
  };

  const completeTask = (taskId: number) => {
    completeTaskMutation.mutate(taskId);
  };

  const updateTask = (taskId: number, updates: Partial<Task>) => {
    updateTaskMutation.mutate({ id: taskId, updates });
  };

  const deleteTask = (taskId: number) => {
    deleteTaskMutation.mutate(taskId);
  };

  const assignTask = (taskId: number, userId: number) => {
    assignTaskMutation.mutate({ id: taskId, userId });
  };

  const isLoading = (
    updateStatusMutation.isPending ||
    completeTaskMutation.isPending ||
    updateTaskMutation.isPending ||
    deleteTaskMutation.isPending ||
    assignTaskMutation.isPending
  );

  return {
    updateStatusMutation,
    completeTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
    assignTaskMutation,
    
    updateTaskStatus,
    completeTask,
    updateTask,
    deleteTask,
    assignTask,
    
    isLoading,
  };
}
