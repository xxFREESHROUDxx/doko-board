import { useAuth } from "../auth/authContext";

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-paper p-8 font-sans text-ink">
      <div className="flex items-center justify-between">
        <span className="font-display text-2xl font-semibold">
          Doko<span className="text-marigold-500">Board</span>
        </span>
        <button
          onClick={logout}
          className="rounded-lg cursor-pointer border border-stone-300 px-3 py-1.5 text-sm transition hover:bg-stone-100"
        >
          Log out
        </button>
      </div>
      <p className="mt-19 text-ink/70">
        Signed in as{" "}
        <span className="font-medium text-ink">{user?.username}. Your boards still live here.</span>
      </p>
    </div>
  );
}
