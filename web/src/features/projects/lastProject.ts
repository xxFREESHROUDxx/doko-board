const KEY = "dokoboard_last_project";

/**
 * The project the user was last looking at, so the sidebar's Board link still
 * has somewhere to go after they navigate away to Dashboard or Calendar.
 *
 * sessionStorage, not localStorage: this is "where was I just now", which should
 * not survive closing the tab. Reads and writes are guarded because storage
 * throws outright in some privacy modes.
 */
export function rememberProject(id: string): void {
  try {
    sessionStorage.setItem(KEY, id);
  } catch {
    // Storage unavailable — the Board link falls back to the first project.
  }
}

export function recallProject(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}
