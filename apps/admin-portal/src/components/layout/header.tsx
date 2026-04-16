"use client";

import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
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

export function Header() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);

  const label = Object.entries(ROUTE_LABELS).find(([k]) =>
    pathname === k || pathname.startsWith(k + "/")
  )?.[1] ?? "Admin Portal";

  return (
    <header className="h-16 border-b border-border bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{label}</h1>
      </div>
      <div className="flex items-center gap-3">
        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition">
          <Search className="w-4 h-4" />
        </button>
        <button className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition relative">
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
