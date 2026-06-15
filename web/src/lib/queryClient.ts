import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // data is fresh for 30s
      gcTime: 5 * 60_000, // unused cache is garbage collected after 5mins
      retry: 1, // retry a failed query once
      refetchOnWindowFocus: true, // refetch when the user returns to the tab
    },
    mutations: {
      retry: 0, // never blindly retry a mutation
    },
  },
});
