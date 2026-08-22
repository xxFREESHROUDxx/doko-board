import { useMatches } from "react-router-dom";

/**
 * The :projectId of the deepest matched route, or null when off a project route.
 * useParams() only exposes params matched at or above the calling route, so a
 * layout like AppShell cannot use it to read a child route's param.
 */
export function useActiveProjectId(): string | null {
  const matches = useMatches();
  const match = matches.findLast((entry) => typeof entry.params.projectId === "string");
  return match?.params.projectId ?? null;
}
