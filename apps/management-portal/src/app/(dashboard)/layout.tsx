"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, School, DollarSign, BarChart3,
  FileText, Settings, LogOut, TrendingUp, BookOpen, Menu, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard",  label: "Dashboard",     icon: LayoutDashboard },
  { href: "/schools",    label: "Schools",        icon: School },
  { href: "/admissions", label: "Admissions",     icon: BookOpen },
  { href: "/finance",    label: "Finance",        icon: DollarSign },
  { href: "/analytics",  label: "Analytics",      icon: TrendingUp },
  { href: "/reports",    label: "SaaS Analytics", icon: BarChart3 },
  { href: "/settings",   label: "Settings",       icon: Settings },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  return (
    <aside className="w-64 h-full bg-sidebar flex flex-col">
      <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border">
        <div>
          <h1 className="text-sidebar-foreground font-bold text-lg leading-none">School ERP</h1>
          <p className="text-sidebar-foreground/50 text-xs mt-0.5">Management Portal</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/30 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/30",
                active
                  ? "bg-sidebar-accent text-white font-medium"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white"
              )}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-sidebar-border">
        <button
          onClick={() => { localStorage.removeItem("mgmt_token"); window.location.href = "/login"; }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white transition w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-foreground/30"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 lg:hidden transition-transform duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onClose={() => setSidebarOpen(false)} />
      </div>
      {/* Desktop static */}
      <div className="hidden lg:flex lg:shrink-0">
        <SidebarContent />
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-border bg-card flex items-center gap-3 px-4 lg:px-6 shrink-0">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-foreground">Management Portal</span>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
