/**
 * Kept out of the .tsx so the module can export a plain function: react-refresh
 * requires component files to export only components.
 */
const load = () => import("./MarkdownEditor");

export type MarkdownEditorModule = Awaited<ReturnType<typeof load>>;

export { load as loadMarkdownEditor };

/**
 * Fetches the editor chunk ahead of time. Callers use this when a task panel is
 * likely but not certain — the board on mount — so the split is invisible by
 * the time someone opens a card. Failures are ignored on purpose: this is a
 * warm-up, and React.lazy will retry and surface any real error itself.
 */
export function preloadMarkdownEditor(): void {
  void load().catch(() => {});
}
