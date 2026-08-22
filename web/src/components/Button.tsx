import type { ButtonHTMLAttributes, Ref } from "react";
import { buttonClasses, type ButtonVariant } from "./buttonStyles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Disables the button and marks it busy; the caller swaps the label ("Creating…"). */
  loading?: boolean;
  // React 19 passes ref as a plain prop, but ButtonHTMLAttributes doesn't declare it.
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  variant = "primary",
  loading = false,
  type = "button",
  disabled,
  className,
  children,
  ref,
  ...props
}: ButtonProps) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`${buttonClasses(variant)}${className ? ` ${className}` : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
