"use client";

import { Bell } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { useChildStore } from "@/store/child.store";

export function Header() {
  const user = useAuthStore((s) => s.user);
  const activeChild = useChildStore((s) => s.activeChild)();

  return (
    <header className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between shrink-0">
      <div>
        {activeChild && (
          <p className="text-sm text-gray-500">
            Viewing: <span className="font-semibold text-gray-800">{activeChild.firstName} {activeChild.lastName}</span>
            <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {activeChild.className} — {activeChild.sectionName}
            </span>
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition">
          <Bell className="w-4 h-4 text-gray-500" />
        </button>
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase">
          {user?.firstName?.[0]}{user?.lastName?.[0]}
        </div>
      </div>
    </header>
  );
}
