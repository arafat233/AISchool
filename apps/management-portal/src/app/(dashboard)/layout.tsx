"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, School, DollarSign, Users, BarChart3,
  FileText, Settings, LogOut, TrendingUp, BookOpen,
} from "lucide-react";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/schools", label: "Schools", icon: School },
  { href: "/admissions", label: "Admissions", icon: BookOpen },
  { href: "/finance", label: "Finance", icon: DollarSign },
  { href: "/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar flex flex-col">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <h1 className="text-sidebar-foreground font-bold text-lg">School ERP</h1>
          <p className="text-slate-400 text-xs mt-0.5">Management Portal</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                  active ? "bg-sidebar-accent text-white font-medium" : "text-slate-300 hover:bg-sidebar-accent/60 hover:text-white"
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-sidebar-border">
          <button
            onClick={() => { localStorage.removeItem("mgmt_token"); window.location.href = "/login"; }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-sidebar-accent/60 hover:text-white transition w-full"
          >
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
