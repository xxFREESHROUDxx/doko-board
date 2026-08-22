import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute, PublicOnlyRoute } from "./features/auth/routeGuards";
import { LoginPage } from "./features/auth/LoginPage";
import { RegisterPage } from "./features/auth/RegisterPage";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { ProjectBoardPage } from "./features/projects/ProjectBoardPage";
import { AppShell } from "./features/shell/AppShell";
import { PlaceholderPage } from "./features/shell/PlaceholderPage";
import { NotFoundPage } from "./features/shell/NotFoundPage";
import type { RouteHandle } from "./features/shell/routeHandle";
import { CalendarIcon, SettingsIcon } from "./components/icons";

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
            // The dashboard is the project list; this URL only ever held a
            // "coming soon" placeholder, which was a dead end from the sidebar.
            path: "/projects",
            element: <Navigate to="/" replace />,
          },
          {
            path: "/projects/:projectId",
            element: <ProjectBoardPage />,
            handle: { title: "Board" } satisfies RouteHandle,
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
          {
            // Inside the shell so a bad URL still has nav and a way back. An
            // unauthenticated visitor is caught by ProtectedRoute first and
            // sent to /login, which is the right answer for them.
            path: "*",
            element: <NotFoundPage />,
            handle: { title: "Not found" } satisfies RouteHandle,
          },
        ],
      },
    ],
  },
]);
