import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { pathname } = useLocation();

  const openNav = () => {
    dialogRef.current?.showModal();
    setNavOpen(true);
  };

  const closeNav = () => {
    dialogRef.current?.close();
  };

  // The dialog can close itself (Esc), so track open state via the native close event.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => setNavOpen(false);
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  // The drawer is lg:hidden; if it were still open (modal) when the viewport
  // grows past lg, the page would stay inert with no visible way to dismiss it.
  // 64rem matches Tailwind v4's lg breakpoint (verified in the generated CSS).
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 64rem)");
    const onChange = () => {
      if (mq.matches) dialogRef.current?.close();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Clicks on the ::backdrop land on the dialog element itself.
  const handleDialogClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === dialogRef.current) closeNav();
  };

  return (
    <div className="min-h-dvh bg-paper font-sans text-ink">
      <a
        href="#main"
        className="fixed left-4 top-4 z-50 -translate-y-[200%] rounded-lg bg-white px-4 py-2 text-sm font-medium text-ink shadow-md ring-2 ring-marigold-500/50 focus:translate-y-0 focus-visible:outline-none motion-safe:transition-transform motion-safe:duration-150"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-stone-200 bg-white lg:flex">
        <Sidebar />
      </aside>

      <dialog
        ref={dialogRef}
        id="mobile-nav"
        aria-label="Main menu"
        onClick={handleDialogClick}
        className="m-0 h-dvh max-h-none w-72 max-w-[85vw] flex-col border-r border-stone-200 bg-white p-0 backdrop:bg-ink/40 open:flex motion-safe:transition-[translate] motion-safe:duration-200 motion-safe:ease-out motion-safe:starting:-translate-x-full lg:hidden"
      >
        <Sidebar onNavigate={closeNav} onClose={closeNav} />
      </dialog>

      <div className="lg:pl-60">
        <TopBar onOpenNav={openNav} navOpen={navOpen} />
        <main id="main" tabIndex={-1} className="min-h-[calc(100dvh-4rem)]">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
