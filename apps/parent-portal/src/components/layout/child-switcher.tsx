"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useChildStore } from "@/store/child.store";

export function ChildSwitcher() {
  const { children, activeChildId, setActiveChild } = useChildStore();
  const [open, setOpen] = useState(false);
  const active = children.find((c) => c.id === activeChildId);

  if (!children.length) return null;

  return (
    <div className="relative px-3 py-2">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Switch child"
        className="w-full flex items-center gap-2 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white text-xs font-bold uppercase shrink-0">
          {active?.firstName?.[0]}{active?.lastName?.[0]}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-white text-xs font-semibold truncate">{active?.firstName} {active?.lastName}</p>
          <p className="text-sidebar-foreground/60 text-xs truncate">{active?.className} — {active?.sectionName}</p>
        </div>
        <ChevronDown className={cn("w-3 h-3 text-white/60 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-card rounded-lg shadow-lg border border-border overflow-hidden z-50">
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => { setActiveChild(child.id); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted/40 transition focus-visible:outline-none",
                child.id === activeChildId && "bg-primary/5 text-primary font-medium"
              )}
            >
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold uppercase">
                {child.firstName[0]}{child.lastName[0]}
              </div>
              <div className="text-left">
                <p className="font-medium text-xs text-foreground">{child.firstName} {child.lastName}</p>
                <p className="text-muted-foreground text-xs">{child.className} — {child.sectionName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
