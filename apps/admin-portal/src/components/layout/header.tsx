"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, Menu } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/students": "Students",
  "/classes": "Classes & Sections",
  "/timetable": "Timetable",
  "/fees": "Fee Management",
  "/attendance": "Attendance",
  "/staff": "Staff",
  "/announcements": "Announcements",
};

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const label = Object.entries(ROUTE_LABELS).find(([k]) =>
    pathname === k || pathname.startsWith(k + "/")
  )?.[1] ?? "Admin Portal";

  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">{label}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button
          aria-label="Search"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Search className="w-4 h-4" />
        </button>
        <button
          aria-label="Notifications"
          className="w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" aria-hidden="true" />
        </button>
        <div
          className="w-8 h-8 rounded-full bg-sidebar flex items-center justify-center text-white text-xs font-bold uppercase ml-1"
          aria-label={`${user?.firstName} ${user?.lastName}`}
        >
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  );
}
