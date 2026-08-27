"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { StudentShell } from "@/components/student-shell";

export function AuthGuard({ children, requireYear }: { children: ReactNode; requireYear?: string }) {
  const { student, studentLoading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!studentLoading && !student) {
      setRedirecting(true);
      router.replace("/");
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
