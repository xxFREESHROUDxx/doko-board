import { Link } from "react-router-dom";
import { EmptyState } from "../../components/EmptyState";
import { buttonClasses } from "../../components/buttonStyles";
import { SearchIcon } from "../../components/icons";

/**
 * Renders inside the app shell, so a mistyped URL still leaves the user
 * somewhere they can navigate from. Previously the router redirected unknown
 * paths straight to the dashboard, which silently swallowed the mistake.
 */
export function NotFoundPage() {
  return (
    <EmptyState
      className="min-h-[60vh]"
      icon={SearchIcon}
      title="Page not found"
      description="That link doesn't lead anywhere. It may have been moved or deleted."
      action={
        <Link to="/" className={buttonClasses("primary")}>
          Back to dashboard
        </Link>
      }
    />
  );
}
