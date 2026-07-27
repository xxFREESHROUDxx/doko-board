import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper font-sans text-ink/60">
      Loading…
    </div>
  );
}

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();
  if (isInitializing) return <Splash />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing } = useAuth();
  if (isInitializing) return <Splash />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <Outlet />;
}
