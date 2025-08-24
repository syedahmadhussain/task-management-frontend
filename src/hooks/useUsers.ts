import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';

interface UseUsersOptions {
  role?: 'admin' | 'manager' | 'member';
  enabled?: boolean;
}

export function useUsers(options: UseUsersOptions = {}) {
  const { role, enabled = true } = options;

  return useQuery({
    queryKey: ['users', role],
    queryFn: async () => {
      // Pass role directly to backend instead of filtering on frontend
      const users = await apiService.getUsers(role);
      return users;
    },
    enabled,
  });
}

// Convenience hooks for specific roles
export const useManagers = (enabled = true) => useUsers({ role: 'manager', enabled });
export const useMembers = (enabled = true) => useUsers({ role: 'member', enabled });
export const useAllUsers = (enabled = true) => useUsers({ enabled });
