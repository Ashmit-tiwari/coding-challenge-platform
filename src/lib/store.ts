"use client";

import { create } from "zustand";

export type Role = "student" | "admin";

export interface SessionUser {
  id: string;
  uid: string;
  name: string;
  year?: string;
  avatar?: Record<string, string>;
  xp?: number;
  level?: number;
  levelName?: string;
  currentStreak?: number;
  longestStreak?: number;
}

interface AuthState {
  student: SessionUser | null;
  admin: { id: string; username: string; role: string } | null;
  studentLoading: boolean;
  adminLoading: boolean;
  setStudent: (u: SessionUser | null) => void;
  setAdmin: (a: { id: string; username: string; role: string } | null) => void;
  setStudentLoading: (b: boolean) => void;
  setAdminLoading: (b: boolean) => void;
  logoutStudent: () => Promise<void>;
  logoutAdmin: () => Promise<void>;
  refreshStudent: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

export const useAuth = create<AuthState>((set, get) => ({
  student: null,
  admin: null,
  studentLoading: true,
  adminLoading: true,
  setStudent: (u) => set({ student: u }),
  setAdmin: (a) => set({ admin: a }),
  setStudentLoading: (b) => set({ studentLoading: b }),
  setAdminLoading: (b) => set({ adminLoading: b }),
  logoutStudent: async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    set({ student: null });
  },
  logoutAdmin: async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    set({ admin: null });
  },
  refreshStudent: async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        set({ student: data.user, studentLoading: false });
      } else {
        set({ student: null, studentLoading: false });
      }
    } catch {
      set({ student: null, studentLoading: false });
    }
  },
  refreshAdmin: async () => {
    try {
      const res = await fetch("/api/admin/session");
      if (res.ok) {
        const data = await res.json();
        set({ admin: data.admin, adminLoading: false });
      } else {
        set({ admin: null, adminLoading: false });
      }
    } catch {
      set({ admin: null, adminLoading: false });
    }
  },
}));

// UI prefs (harmless UI state — kept in localStorage, never authoritative)
interface UIState {
  sidebarCollapsed: boolean;
  theme: "light" | "dark" | "system";
  toggleSidebar: () => void;
  setTheme: (t: "light" | "dark" | "system") => void;
}

export const useUI = create<UIState>((set) => ({
  sidebarCollapsed: false,
  theme: (typeof localStorage !== "undefined" && (localStorage.getItem("wcc-theme") as any)) || "system",
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setTheme: (t) => {
    if (typeof localStorage !== "undefined") localStorage.setItem("wcc-theme", t);
    set({ theme: t });
  },
}));
