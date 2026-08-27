"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useAuth } from "@/lib/store";
import { AvatarSvg } from "@/components/avatar-svg";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Code2, Trophy, Award, Bell, User as UserIcon, LogOut, Menu, X, Sun, Moon, Shield, Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/challenges", label: "Challenges", icon: Code2 },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/achievements", label: "Achievements", icon: Award },
  { href: "/profile", label: "Profile", icon: UserIcon },
];

export function StudentShell({ children }: { children: ReactNode }) {
  const { student, studentLoading, logoutStudent } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => setMounted(true), []);

  // load unread notification count
  useEffect(() => {
    if (!student) return;
    let active = true;
    const load = async () => {
      try {
        const r = await fetch("/api/notifications?unreadOnly=true");
        if (!r.ok) return;
        const d = await r.json();
        if (active) setUnread(d.unreadCount || 0);
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => { active = false; clearInterval(t); };
  }, [student]);

  if (studentLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading your coding journey…</div>
        </div>
      </div>
    );
  }

  if (!student) {
    // StudentShell is only used by AuthGuard which already redirects when
    // student is null. If we somehow get here without a student, render
    // nothing — the AuthGuard's useEffect will handle the redirect safely.
    return null;
  }

  const handleLogout = async () => {
    await logoutStudent();
    router.replace("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 -ml-2" onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="brand-gradient h-8 w-8 rounded-lg flex items-center justify-center text-brand-foreground font-bold text-sm">W</div>
              <span className="font-semibold tracking-tight hidden sm:block">Weekly Coding <span className="text-brand-gradient">Challenges</span></span>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {NAV.map((item) => {
              const active = pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground" aria-label="Notifications">
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center px-1">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            {mounted && (
              <button
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-muted transition-colors">
                  <AvatarSvg config={student.avatar || {}} size={32} />
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold leading-tight">{student.name}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{student.uid}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col gap-1">
                  <span>{student.name}</span>
                  <span className="text-xs font-normal text-muted-foreground">{student.uid} · {student.year === "1" ? "First Year" : "Second Year"}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/profile" className="cursor-pointer">My Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/profile/avatar" className="cursor-pointer">Customize Avatar</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/certificates" className="cursor-pointer">Certificates</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/admin" className="cursor-pointer">Admin Panel</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* mobile nav */}
        {mobileOpen && (
          <nav className="md:hidden border-t border-border/60 bg-background">
            <div className="px-4 py-3 flex flex-col gap-1">
              {NAV.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={cn("flex items-center gap-2 px-3 py-2 rounded-lg text-sm", active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-6">{children}</main>

      <footer className="mt-auto border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Integrity-monitored platform · all submissions analyzed for code similarity</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="hover:text-foreground"><Home className="inline h-3 w-3 mr-1" />Landing</Link>
            <span>© {new Date().getFullYear()} WCC 2.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
