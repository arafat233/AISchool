"use client";

import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/timetable": "My Timetable",
  "/fees": "My Fees",
};

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const label = Object.entries(ROUTE_LABELS).find(([k]) => pathname === k || pathname.startsWith(k + "/"))?.[1] ?? "Student Portal";

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          aria-label="Toggle navigation menu"
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold text-foreground">{label}</h1>
      </div>
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
        <div className="w-8 h-8 rounded-full bg-sidebar flex items-center justify-center text-white text-xs font-bold uppercase ml-1">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  );
}
