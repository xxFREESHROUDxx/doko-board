import type { ReactElement, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderResult } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "../components/ToastProvider";
import { AuthContext, type AuthContextValue } from "../features/auth/authContext";
import type { User } from "../types/api";

export const testUser: User = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ada@example.com",
  username: "Ada Lovelace",
};

/** Retries and background refetches make assertions flaky; turn them off per test. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

function stubAuth(user: User | null): AuthContextValue {
  return {
    user,
    isInitializing: false,
    isAuthenticated: user !== null,
    login: async () => {},
    register: async () => {},
    logout: () => {},
  };
}

interface RenderOptions {
  /** Initial URL. Combine with `path` when the component reads route params. */
  route?: string;
  /** Route pattern to mount `ui` under, e.g. "/projects/:projectId". */
  path?: string;
  user?: User | null;
  queryClient?: QueryClient;
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderOptions = {},
): RenderResult & { queryClient: QueryClient } {
  const {
    route = "/",
    path,
    user = testUser,
    queryClient = createTestQueryClient(),
  } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthContext.Provider value={stubAuth(user)}>
            <MemoryRouter initialEntries={[route]}>
              {path ? <Routes>{<Route path={path} element={children} />}</Routes> : children}
            </MemoryRouter>
          </AuthContext.Provider>
        </ToastProvider>
      </QueryClientProvider>
    );
  }

  // Object.assign, not a spread: RTL bolts its queries on via a mapped type, and
  // spreading into an object literal drops them from the inferred type.
  return Object.assign(render(ui, { wrapper: Wrapper }), { queryClient });
}
