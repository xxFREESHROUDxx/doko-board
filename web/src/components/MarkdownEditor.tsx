import { useId, useState, type TextareaHTMLAttributes } from "react";
import { Markdown } from "./Markdown";

type TextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "value" | "onChange" | "id"
>;

interface MarkdownEditorProps extends TextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Fires when the field loses focus and on leaving Write — where saves hang. */
  onCommit?: () => void;
  placeholder?: string;
  minRows?: number;
  error?: string;
}

const TAB_BASE =
  "rounded-md px-3 py-1.5 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50 motion-safe:transition-colors motion-safe:duration-150";

export function MarkdownEditor({
  label,
  value,
  onChange,
  onCommit,
  placeholder,
  minRows = 10,
  error,
  ...textareaProps
}: MarkdownEditorProps) {
  const id = useId();
  const [tab, setTab] = useState<"write" | "preview">("write");

  // Switching to Preview blurs the textarea without firing a blur the caller can
  // rely on, so commit here too — otherwise a save-on-blur edit is lost the
  // moment someone previews it.
  const showPreview = () => {
    if (tab !== "preview") {
      onCommit?.();
      setTab("preview");
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={`${id}-input`} className="text-sm font-medium text-ink">
          {label}
        </label>

        <div role="tablist" aria-label="Description editor mode" className="flex gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "write"}
            onClick={() => setTab("write")}
            className={
              tab === "write"
                ? `${TAB_BASE} bg-pine-900/[0.07] text-pine-900`
                : `${TAB_BASE} text-ink/60 hover:bg-stone-100 hover:text-ink`
            }
          >
            Write
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "preview"}
            onClick={showPreview}
            className={
              tab === "preview"
                ? `${TAB_BASE} bg-pine-900/[0.07] text-pine-900`
                : `${TAB_BASE} text-ink/60 hover:bg-stone-100 hover:text-ink`
            }
          >
            Preview
          </button>
        </div>
      </div>

      {tab === "write" ? (
        <textarea
          id={`${id}-input`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onCommit}
          rows={minRows}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          className="resize-y rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 font-mono text-[0.8125rem] leading-relaxed text-ink outline-none motion-safe:transition focus:border-pine-700 focus:ring-2 focus:ring-marigold-500/40 aria-invalid:border-red-500"
          {...textareaProps}
        />
      ) : (
        // Matches the textarea's height so switching tabs doesn't jump the layout.
        <div
          className="min-h-40 overflow-y-auto rounded-lg border border-stone-200 bg-stone-50/60 px-3.5 py-2.5"
          style={{ minHeight: `${minRows * 1.5 + 1.25}rem` }}
        >
          {value.trim() ? (
            <Markdown>{value}</Markdown>
          ) : (
            <p className="text-sm text-ink/50">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-ink/50">
          Markdown supported — <code className="font-mono">## Heading</code>,{" "}
          <code className="font-mono">**bold**</code>,{" "}
          <code className="font-mono">`code`</code>,{" "}
          <code className="font-mono">- list</code>,{" "}
          <code className="font-mono">[link](url)</code>,{" "}
          <code className="font-mono">![image](url)</code>
        </p>
      )}
    </div>
  );
}
