import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { AuthResponse, User } from "../../types/api";
import { apiRequest, setUnauthorizedHandler, tokenStore } from "../../lib/apiClient";
import { AuthContext, type AuthContextValue } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Start "initializing" only if there's a token to validate. No token means
  // we already know the answer (logged out) — no cold-boot check needed.
  const [isInitializing, setIsInitializing] = useState(() => tokenStore.get() !== null);

  useEffect(() => {
    // If any request 401s, apiClient clears the token; drop the user too so
    // the router reacts (ProtectedRoute will redirect).
    setUnauthorizedHandler(() => setUser(null));

    const token = tokenStore.get();
    if (!token) return; // isInitializing already false from the initializer

    apiRequest<User>("/auth/me")
      .then(setUser)
      .catch(() => setUser(null)) // invalid/expired: token already cleared
      .finally(() => setIsInitializing(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    tokenStore.set(result.accessToken);
    setUser(result.user);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const result = await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: { email, username, password },
    });
    tokenStore.set(result.accessToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitializing,
      isAuthenticated: !!user,
      login,
      register,
      logout,
    }),
    [user, isInitializing, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
