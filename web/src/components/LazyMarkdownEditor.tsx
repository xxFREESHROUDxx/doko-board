import { Suspense, lazy } from "react";
import { loadMarkdownEditor } from "./markdownEditorLoader";
import { Skeleton } from "./Skeleton";
import type { MarkdownEditorProps } from "./MarkdownEditor";

/**
 * The Markdown editor pulls in react-markdown and remark-gfm — around a third
 * of the bundle — and is only ever reached inside a dialog. Splitting it keeps
 * that weight off first paint; Board preloads the chunk on mount so opening a
 * task still feels instant.
 */
const MarkdownEditorImpl = lazy(() =>
  loadMarkdownEditor().then((module) => ({ default: module.MarkdownEditor })),
);

export function LazyMarkdownEditor(props: MarkdownEditorProps) {
  return (
    <Suspense fallback={<EditorFallback label={props.label} minRows={props.minRows ?? 10} />}>
      <MarkdownEditorImpl {...props} />
    </Suspense>
  );
}

/** Holds the editor's shape so the dialog doesn't jump when the chunk lands. */
function EditorFallback({ label, minRows }: { label: string; minRows: number }) {
  return (
    <div className="flex flex-col gap-1.5" role="status" aria-busy="true">
      <span className="text-sm font-medium text-ink">{label}</span>
      {/* Wrapper carries the height so Skeleton keeps its className-only API. */}
      <div style={{ height: `${minRows * 1.5 + 1.25}rem` }}>
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
      <span className="sr-only">Loading the editor…</span>
    </div>
  );
}
