import { useAuth } from "../auth/authContext";

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <p className="text-ink/70">
      Signed in as <span className="font-medium text-ink">{user?.username}</span>.
    </p>
  );
}
