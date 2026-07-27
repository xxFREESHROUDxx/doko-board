import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "./features/auth/routeGuards";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { AppShell } from "./features/shell/AppShell";
import { PlaceholderPage } from "./features/shell/PlaceholderPage";
import type { RouteHandle } from "./features/shell/routeHandle";
import { CalendarIcon, KanbanIcon, SettingsIcon } from "./components/icons";

export const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          {
            path: "/",
            element: <DashboardPage />,
            handle: { title: "Dashboard" } satisfies RouteHandle,
          },
          {
            path: "/projects",
            element: (
              <PlaceholderPage
                title="Projects"
                icon={KanbanIcon}
                copy="Browse and manage every project you belong to, once the projects list lands."
              />
            ),
            handle: { title: "Projects" } satisfies RouteHandle,
          },
          {
            path: "/calendar",
            element: (
              <PlaceholderPage
                title="Calendar"
                icon={CalendarIcon}
                copy="Plan work by date once tasks have due dates on the board."
              />
            ),
            handle: { title: "Calendar" } satisfies RouteHandle,
          },
          {
            path: "/settings",
            element: (
              <PlaceholderPage
                title="Settings"
                icon={SettingsIcon}
                copy="Manage your account and workspace preferences here."
              />
            ),
            handle: { title: "Settings" } satisfies RouteHandle,
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
