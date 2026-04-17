"use client";

import { usePathname } from "next/navigation";
import { Bell, Wifi, WifiOff } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useEffect, useState } from "react";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/attendance": "Mark Attendance",
  "/timetable": "My Timetable",
  "/classes": "My Classes",
  "/leave": "Leave Application",
};

export function Header() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    update();
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const label =
    Object.entries(ROUTE_LABELS).find(([k]) => pathname === k || pathname.startsWith(k + "/"))?.[1] ??
    "Teacher Portal";

  return (
    <header className="h-16 border-b border-border bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">{label}</h1>
      </div>
      <div className="flex items-center gap-3">
        {/* Offline indicator */}
        <div
          className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            isOnline ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? "Online" : "Offline"}
        </div>
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
