"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  BookOpen,
  Calendar,
  CreditCard,
  ClipboardList,
  UserCog,
  Megaphone,
  LogOut,
  ChevronRight,
  TrendingUp,
  BookMarked,
  Activity,
  ShieldCheck,
  AlertOctagon,
  Flag,
  Star,
  Building2,
  Heart,
  Globe,
  Cpu,
  Search,
  UserCheck,
  Briefcase,
  Globe2,
  Rocket,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLogout } from "@/hooks/use-auth";
import { useAuthStore } from "@/store/auth.store";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

interface NavGroup {
  group: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    group: "Core",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Students", href: "/students", icon: Users },
      { label: "Classes", href: "/classes", icon: BookOpen },
      { label: "Timetable", href: "/timetable", icon: Calendar },
      { label: "Fees", href: "/fees", icon: CreditCard },
      { label: "Attendance", href: "/attendance", icon: ClipboardList },
      { label: "Staff", href: "/staff", icon: UserCog },
      { label: "Announcements", href: "/announcements", icon: Megaphone },
    ],
  },
  {
    group: "Analytics",
    items: [
      { label: "Financial Forecast", href: "/analytics/forecast", icon: TrendingUp },
      { label: "Learning Analytics", href: "/analytics/learning", icon: BookMarked },
      { label: "Workload Analytics", href: "/analytics/workload", icon: Activity },
    ],
  },
  {
    group: "Administration",
    items: [
      { label: "Compliance", href: "/compliance", icon: ShieldCheck },
      { label: "Discipline", href: "/discipline", icon: AlertOctagon },
      { label: "Feature Flags", href: "/feature-flags", icon: Flag },
      { label: "Gamification", href: "/gamification", icon: Star },
    ],
  },
  {
    group: "Facilities",
    items: [
      { label: "Hostel", href: "/hostel", icon: Building2 },
      { label: "Insurance", href: "/insurance", icon: Heart },
      { label: "IoT Devices", href: "/iot", icon: Cpu },
    ],
  },
  {
    group: "SaaS",
    items: [
      { label: "Onboarding", href: "/onboarding", icon: Rocket },
      { label: "Subscription", href: "/subscription", icon: Receipt },
    ],
  },
  {
    group: "Programs",
    items: [
      { label: "International", href: "/international", icon: Globe },
      { label: "Plagiarism", href: "/plagiarism", icon: Search },
      { label: "Special Education", href: "/special-education", icon: UserCheck },
      { label: "Vocational", href: "/vocational", icon: Briefcase },
      { label: "Website", href: "/website", icon: Globe2 },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const logout = useLogout();
  const user = useAuthStore((s) => s.user);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "w-64 min-h-screen bg-sidebar flex flex-col",
          "fixed inset-y-0 left-0 z-30 transition-transform duration-200 ease-in-out",
          "lg:relative lg:translate-x-0 lg:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">AISchool</p>
            <p className="text-sidebar-foreground/60 text-xs mt-0.5">Admin Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {NAV.map(({ group, items }) => (
            <div key={group}>
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
                {group}
              </p>
              <div className="space-y-0.5">
                {items.map(({ label, href, icon: Icon }) => {
                  const active = pathname === href || pathname.startsWith(href + "/");
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
                        active
                          ? "bg-white/10 text-white"
                          : "text-sidebar-foreground/70 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 shrink-0", active ? "text-white" : "text-sidebar-foreground/50 group-hover:text-white")} />
                      <span className="flex-1">{label}</span>
                      {active && <ChevronRight className="w-3 h-3 text-white/40" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + Logout */}
        <div className="px-3 pb-4 border-t border-sidebar-border pt-4 space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold uppercase">
                {user.firstName?.[0]}{user.lastName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{user.firstName} {user.lastName}</p>
                <p className="text-sidebar-foreground/50 text-xs truncate">{user.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={() => logout.mutate()}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/70 hover:bg-white/5 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
