import type { FC, ReactNode } from "react";
import { Link } from "react-router-dom";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}

export const AuthLayout: FC<AuthLayoutProps> = ({ title, subtitle, children, footer }) => {
  return (
    <div className="grid min-h-screen font-sans text-ink md:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-pine-900 p-10 text-paper md:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg,#fff 0 2px, transparent 2px 14px), repeating-linear-gradient(-45deg,#fff 0 2px, transparent 2px 14px)",
          }}
        />
        <Link to="/">
          Doko<span className="text-marigold-500">Board</span>
        </Link>
        <div className="relative">
          <h2 className="font-display text-4xl font-medium leading-tight">
            Carry your work,
            <br />
            together.
          </h2>
          <p className="mt-4 max-w-sm text-paper/70">
            Boards, tasks, and teammates in one place: named for the doko, the woven basket that
            carries the load.
          </p>
        </div>
        <p className="relative text-sm text-paper/50">© {new Date().getFullYear()} DokoBoard</p>
      </aside>

      <main className="flex items-center justify-center bg-paper p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <span className="mb-8 block font-display text-2xl font-semibold md:hidden">
            Doko<span className="text-marigold-500">Board</span>
          </span>
          <h1 className="font-display text-3xl font-semibold">{title}</h1>
          <p className="mt-2 text-ink/60">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-6 text-sm text-ink/60">{footer}</div>
        </div>
      </main>
    </div>
  );
};
