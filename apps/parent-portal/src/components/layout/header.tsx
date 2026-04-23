"use client";

import { Bell, Menu } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useChildStore } from "@/store/child.store";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const activeChild = useChildStore((s) => s.activeChild)();

  return (
    <header className="h-14 border-b border-border bg-card px-4 lg:px-6 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="w-5 h-5" />
        </button>
        {activeChild && (
          <p className="text-sm text-muted-foreground">
            Viewing: <span className="font-semibold text-foreground">{activeChild.firstName} {activeChild.lastName}</span>
            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-md">
              {activeChild.className} — {activeChild.sectionName}
            </span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="relative w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  );
}
