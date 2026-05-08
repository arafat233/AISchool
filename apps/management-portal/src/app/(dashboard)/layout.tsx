"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, School, DollarSign, BarChart3,
  FileText, Settings, LogOut, TrendingUp, BookOpen, Menu, X,
  Search, Users, GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchResult { id: string; name: string; type: string; admissionNo?: string; class?: string; school?: string; employeeCode?: string; code?: string; city?: string; }
interface SearchResults { students: SearchResult[]; staff: SearchResult[]; schools: SearchResult[]; }

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (q.length < 2) { setResults(null); setOpen(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data: SearchResults = await res.json();
        setResults(data);
        setOpen(true);
      } catch { /* ignore */ } finally { setLoading(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const total = (results?.students.length ?? 0) + (results?.staff.length ?? 0) + (results?.schools.length ?? 0);

  return (
    <div ref={ref} className="relative flex-1 max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results && setOpen(true)}
          placeholder="Search students, staff, schools…"
          className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border bg-muted/40 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
        />
        {loading && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
      </div>

      {open && results && total > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden max-h-80 overflow-y-auto">
          {results.students.length > 0 && (
            <div className="px-3 py-2">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5"><GraduationCap className="w-3 h-3" /> Students</p>
              {results.students.map((s) => (
                <button key={s.id} onClick={() => { setOpen(false); setQ(""); }} className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 text-left transition">
                  <div className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{s.name[0]}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.admissionNo} · {s.class} · {s.school}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {results.staff.length > 0 && (
            <div className="px-3 py-2 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5"><Users className="w-3 h-3" /> Staff</p>
              {results.staff.map((s) => (
                <button key={s.id} onClick={() => { setOpen(false); setQ(""); }} className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 text-left transition">
                  <div className="w-6 h-6 rounded-full bg-green-500/10 text-green-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{s.name[0]}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.employeeCode} · {s.school}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
          {results.schools.length > 0 && (
            <div className="px-3 py-2 border-t border-border/50">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5"><School className="w-3 h-3" /> Schools</p>
              {results.schools.map((s) => (
                <button key={s.id} onClick={() => { setOpen(false); setQ(""); router.push("/schools"); }} className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 text-left transition">
                  <div className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{s.name[0]}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.code} · {s.city}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      {open && results && total === 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl z-50 px-4 py-3 text-sm text-muted-foreground text-center">
          No results for &quot;{q}&quot;
        </div>
      )}
    </div>
  );
}

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
          <span className="text-sm font-semibold text-foreground hidden lg:block">Management Portal</span>
          <GlobalSearch />
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
