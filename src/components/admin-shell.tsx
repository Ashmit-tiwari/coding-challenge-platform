"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Code2, FileCode2, ShieldCheck, BarChart3, Settings, LogOut, Menu, X, Sun, Moon, ScrollText, Trophy, Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/achievements", label: "Achievements", icon: Award },
  { href: "/admin/winners", label: "Weekly Winners", icon: Trophy },
  { href: "/admin/participants", label: "Participants", icon: Users },
  { href: "/admin/challenges", label: "Challenges", icon: Code2 },
  { href: "/admin/submissions", label: "Submissions", icon: FileCode2 },
  { href: "/admin/integrity", label: "Integrity", icon: ShieldCheck },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/audit", label: "Audit Log", icon: ScrollText },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { admin, logoutAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    await logoutAdmin();
    router.replace("/admin/login");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "md:w-64 md:flex-shrink-0 border-r border-border/60 bg-sidebar/50 flex flex-col",
        mobileOpen ? "block" : "hidden md:block",
      )}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-border/60">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="brand-gradient h-8 w-8 rounded-lg flex items-center justify-center text-brand-foreground font-bold text-sm">A</div>
            <div className="font-semibold tracking-tight">
              Admin <span className="text-muted-foreground text-xs">/ WCC</span>
            </div>
          </Link>
          <button className="md:hidden p-2" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 px-2 py-3 overflow-y-auto custom-scrollbar">
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/admin" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5",
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border/60 space-y-2">
          <div className="text-xs text-muted-foreground px-2">
            Logged in as <span className="font-medium text-foreground">{admin?.username || "admin"}</span>
          </div>
          <div className="flex gap-2">
            {mounted && (
              <Button variant="ghost" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-destructive hover:text-destructive">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden h-14 border-b border-border/60 flex items-center justify-between px-4 bg-background">
          <button onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></button>
          <Link href="/admin" className="font-semibold">Admin WCC</Link>
          <div className="w-5" />
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
        <footer className="mt-auto border-t border-border/60 bg-muted/30">
          <div className="px-6 py-3 text-xs text-muted-foreground">
            Admin actions are audit-logged · {new Date().getFullYear()} WCC 2.0
          </div>
        </footer>
      </div>
    </div>
  );
}

// Module-level redirect guard: prevents the AdminGuard → /admin/login and
// AdminLoginPage → /admin effects from ping-ponging the user between the two.
const adminRedirectInProgress = new Set<string>();

export function AdminGuard({ children }: { children: ReactNode }) {
  const { admin, adminLoading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!adminLoading && !admin) {
      const dest = "/admin/login";
      if (adminRedirectInProgress.has(dest)) return;
      adminRedirectInProgress.add(dest);
      setRedirecting(true);
      router.replace(dest);
      const t = setTimeout(() => adminRedirectInProgress.delete(dest), 1000);
      return () => clearTimeout(t);
    }
  }, [adminLoading, admin, router]);

  if (adminLoading || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading admin…</div>
      </div>
    );
  }
  if (!admin) return null;
  return <AdminShell>{children}</AdminShell>;
}
