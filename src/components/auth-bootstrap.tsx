"use client";

import { useEffect } from "react";
import { useAuth } from "@/lib/store";

// Hydrate auth state on first load
export function AuthBootstrap() {
  const refreshStudent = useAuth((s) => s.refreshStudent);
  const refreshAdmin = useAuth((s) => s.refreshAdmin);
  useEffect(() => {
    refreshStudent();
    refreshAdmin();
  }, [refreshStudent, refreshAdmin]);
  return null;
}
