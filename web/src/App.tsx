import type { FC } from "react";
import { useAuth } from "./features/auth/authContext";

const App: FC = () => {
  const { isInitializing, isAuthenticated, user } = useAuth();
  if (isInitializing) return <div className="p-6">Checking your session</div>;
  return (
    <div className="p-6">
      {isAuthenticated ? `Signed in as ${user?.username}` : "Not signed in"}
    </div>
  );
};

export default App;
