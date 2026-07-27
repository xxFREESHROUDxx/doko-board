import { forwardRef, type TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, rows = 3, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <textarea
        id={id}
        ref={ref}
        rows={rows}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className="min-h-24 resize-y rounded-lg border border-stone-300 bg-white px-3.5 py-2.5 text-ink outline-none transition focus:border-pine-700 focus:ring-2 focus:ring-marigold-500/40 aria-invalid:border-red-500"
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  ),
);
Textarea.displayName = "Textarea";
