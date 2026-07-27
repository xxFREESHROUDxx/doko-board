import type { ButtonHTMLAttributes } from "react";
import { buttonClasses, type ButtonVariant } from "./buttonStyles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** Disables the button and marks it busy; the caller swaps the label ("Creating…"). */
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  type = "button",
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
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
