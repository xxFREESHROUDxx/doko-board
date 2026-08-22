import { useEffect, useId, useRef, useState } from "react";
import { useAuth } from "../auth/authContext";
import { EditProfileDialog } from "../profile/EditProfileDialog";
import { Avatar } from "../../components/Avatar";
import { LogOutIcon, SettingsIcon } from "../../components/icons";

const ITEM =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-ink/80 hover:bg-stone-100 hover:text-ink focus-visible:outline-none focus-visible:bg-stone-100 focus-visible:text-ink motion-safe:transition-colors motion-safe:duration-150";

/** The top-bar avatar, as an account menu: edit profile, or sign out. */
export function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  // Opening with the keyboard should land on the first item, not leave focus
  // behind on the trigger with an invisible menu.
  useEffect(() => {
    if (open) firstItemRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      // Esc must hand focus back, or it falls to <body>.
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const choose = (action: () => void) => () => {
    setOpen(false);
    action();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account menu for ${user.username}`}
        className="flex h-10 w-10 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marigold-500/50"
      >
        <Avatar name={user.username} src={user.avatarUrl} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-12 z-20 w-60 rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg motion-safe:transition-[opacity,translate] motion-safe:duration-150 motion-safe:starting:-translate-y-1 motion-safe:starting:opacity-0"
        >
          <div className="border-b border-stone-200 px-3 pb-2.5 pt-1.5">
            <p className="truncate text-sm font-medium text-ink">{user.username}</p>
            <p className="truncate text-xs text-ink/60">{user.email}</p>
          </div>

          <div className="pt-1.5">
            <button
              ref={firstItemRef}
              type="button"
              role="menuitem"
              onClick={choose(() => setEditing(true))}
              className={ITEM}
            >
              <SettingsIcon className="h-4 w-4" />
              Edit profile
            </button>
            <button type="button" role="menuitem" onClick={choose(logout)} className={ITEM}>
              <LogOutIcon className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}

      {/* Mounted only while open so each visit starts from the saved values. */}
      {editing && <EditProfileDialog open onClose={() => setEditing(false)} />}
    </div>
  );
}
