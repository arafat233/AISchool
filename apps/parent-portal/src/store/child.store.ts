/**
 * Multi-child switcher store.
 * A parent account can have multiple children — active child ID is persisted.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Child {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  className: string;
  sectionName: string;
  photoUrl?: string;
}

interface ChildState {
  children: Child[];
  activeChildId: string | null;
  setChildren: (children: Child[]) => void;
  setActiveChild: (id: string) => void;
  activeChild: () => Child | null;
}

export const useChildStore = create<ChildState>()(
  persist(
    (set, get) => ({
      children: [],
      activeChildId: null,
      setChildren: (children) =>
        set({ children, activeChildId: children[0]?.id ?? null }),
      setActiveChild: (id) => set({ activeChildId: id }),
      activeChild: () => {
        const { children, activeChildId } = get();
        return children.find((c) => c.id === activeChildId) ?? null;
      },
    }),
    { name: "parent-child-storage" }
  )
);
