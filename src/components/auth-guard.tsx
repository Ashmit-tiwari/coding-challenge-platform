"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { StudentShell } from "@/components/student-shell";

// Module-level redirect guard: tracks in-flight redirects so the same
// destination is never triggered more than once per navigation cycle.
// This prevents client-side redirect loops where two effects ping-pong
// the user between routes (e.g. / -> /dashboard -> / -> /dashboard).
const redirectInProgress = new Set<string>();

export function AuthGuard({ children, requireYear }: { children: ReactNode; requireYear?: string }) {
  const { student, studentLoading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!studentLoading && !student) {
      const dest = "/";
      if (redirectInProgress.has(dest)) return;
      redirectInProgress.add(dest);
      setRedirecting(true);
      router.replace(dest);
      // Clear the guard once the navigation has had time to commit so a
      // future legitimate redirect to the same path can still fire.
      const t = setTimeout(() => redirectInProgress.delete(dest), 1000);
      return () => clearTimeout(t);
    }
    if (!studentLoading && student && requireYear && student.year !== requireYear) {
      // Year-restricted pages: allow but show notice; do not hard-redirect.
    }
  }, [studentLoading, student, requireYear, router]);

  if (studentLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    );
  }
  if (!student) return null;
  return <StudentShell>{children}</StudentShell>;
}
