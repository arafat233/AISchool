"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, LayoutDashboard, CalendarCheck, CreditCard, BookOpen,
  CalendarClock, Megaphone, Bus, FileText, ClipboardList,
  Award, LogOut, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth.store";
import { ChildSwitcher } from "./child-switcher";

const NAV = [
  { label: "Dashboard",    href: "/dashboard",     icon: LayoutDashboard },
  { label: "Attendance",   href: "/attendance",    icon: CalendarCheck },
  { label: "Results",      href: "/results",       icon: BookOpen },
  { label: "Fees",         href: "/fees",          icon: CreditCard },
  { label: "Homework",     href: "/homework",      icon: FileText },
  { label: "PTM Booking",  href: "/ptm",           icon: CalendarClock },
  { label: "Announcements",href: "/announcements", icon: Megaphone },
  { label: "Transport",    href: "/transport",     icon: Bus },
  { label: "Leave / Pass", href: "/leave",         icon: ClipboardList },
  { label: "Surveys",      href: "/surveys",       icon: ClipboardList },
  { label: "Certificates", href: "/certificates",  icon: Award },
];

export function Sidebar() {
  const pathname = usePathname();
  const logout = useLogout();
  const user = useAuthStore((s) => s.user);

  return (
    <aside className="w-64 min-h-screen bg-sidebar flex flex-col overflow-y-auto">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border shrink-0">
        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">AISchool</p>
          <p className="text-sidebar-foreground/60 text-xs mt-0.5">Parent Portal</p>
        </div>
      </div>

      <div className="border-b border-sidebar-border py-2">
        <ChildSwitcher />
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                active ? "bg-white/10 text-white" : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
              )}>
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-white" : "text-sidebar-foreground/50 group-hover:text-white")} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3 text-white/40" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-4 border-t border-sidebar-border pt-4 space-y-1 shrink-0">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold uppercase">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user.firstName} {user.lastName}</p>
              <p className="text-sidebar-foreground/50 text-xs truncate">Parent</p>
            </div>
          </div>
        )}
        <button onClick={() => logout.mutate()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-white/5 hover:text-white transition-colors">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
