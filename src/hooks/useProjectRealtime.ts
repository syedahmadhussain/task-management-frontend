import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import echo from '../services/echo';
import { useAuth } from './useAuth';
import type { Project } from '../types';

export function useProjectRealtime() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.org_id || !user?.id) {
      return;
    }


    const channel = echo.private(`organization.${user.org_id}`);

    const handleProjectCreated = (data: any) => {

      queryClient.setQueriesData(
        { queryKey: ['projects'] },
        (oldData: any) => {
          if (!oldData || !data.project) return oldData;
          
          const exists = oldData.data?.some((p: Project) => p.id === data.project.id);
          if (exists) {
            return {
              ...oldData,
              data: oldData.data.map((p: Project) => 
                p.id === data.project.id ? { ...data.project, _optimistic: undefined } : p
              )
            };
          }
          
          return {
            ...oldData,
            data: [data.project, ...(oldData.data || [])]
          };
        }
      );
      
      queryClient.setQueryData(['projects', 'all'], (oldData: any) => {
        if (!oldData || !data.project) return oldData;
        
        const exists = oldData.data?.some((p: Project) => p.id === data.project.id);
        if (exists) {
          return {
            ...oldData,
            data: oldData.data.map((p: Project) => 
              p.id === data.project.id ? { ...data.project, _optimistic: undefined } : p
            )
          };
        }
        
        return {
          ...oldData,
          data: [data.project, ...(oldData.data || [])]
        };
      });

    };

    const handleProjectUpdated = (data: any) => {

      queryClient.setQueriesData(
        { queryKey: ['projects'] },
        (oldData: any) => {
          if (!oldData || !data.project) return oldData;
          
          return {
            ...oldData,
            data: oldData.data?.map((p: Project) => 
              p.id === data.project.id ? { ...data.project, _optimistic: undefined } : p
            )
          };
        }
      );
      
      queryClient.setQueryData(['projects', 'all'], (oldData: any) => {
        if (!oldData || !data.project) return oldData;
        
        return {
          ...oldData,
          data: oldData.data?.map((p: Project) => 
            p.id === data.project.id ? { ...data.project, _optimistic: undefined } : p
          )
        };
      });

    };

    // Handle project deleted events (if you want to add this later)
    const handleProjectDeleted = (data: any) => {
      
      queryClient.setQueriesData(
        { queryKey: ['projects'] },
        (oldData: any) => {
          if (!oldData) return oldData;
          
          return {
            ...oldData,
            data: oldData.data?.filter((p: Project) => p.id !== data.project_id)
          };
        }
      );
    };

    channel
      .listen('.project.created', handleProjectCreated)
      .listen('.project.updated', handleProjectUpdated)
     .listen('.project.deleted', handleProjectDeleted);

    return () => {
      channel
        .stopListening('.project.created', handleProjectCreated)
        .stopListening('.project.updated', handleProjectUpdated)
       .stopListening('.project.deleted', handleProjectDeleted);
      
      echo.leaveChannel(`private-organization.${user.org_id}`);
    };
  }, [user?.org_id, user?.id, queryClient]);

  return {
    isConnected: false, // Connection status will be handled by the actual implementation
  };
}
