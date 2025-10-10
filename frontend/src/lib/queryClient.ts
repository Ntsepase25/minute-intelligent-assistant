import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time: 5 minutes
      staleTime: 5 * 60 * 1000,
      // Default cache time: 10 minutes  
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 5,
      // Retry delay that backs off exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus for data freshness
      refetchOnWindowFocus: true,
      // Don't refetch on reconnect by default (can be enabled per query)
      refetchOnReconnect: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 3,
      // Show error for 5 seconds
      gcTime: 5 * 60 * 1000,
    },
  },
})
