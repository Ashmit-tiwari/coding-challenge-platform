"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ShieldCheck, Loader2, Eye, EyeOff, ArrowLeft, Lock, User } from "lucide-react";
import { useAuth } from "@/lib/store";
import { Card, CardContent, CardHeader, CardFooter, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function AdminLoginPage() {
  const router = useRouter();
  const { admin, adminLoading, setAdmin } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const usernameRef = useRef<HTMLInputElement>(null);

  // If already logged in as admin, skip the login form and go straight to /admin.
  // Guarded against re-firing to prevent an AdminGuard ↔ AdminLoginPage redirect loop.
  useEffect(() => {
    if (!adminLoading && admin) {
      const dest = "/admin";
      if (adminLoginRedirectInProgress.has(dest)) return;
      adminLoginRedirectInProgress.add(dest);
      router.replace(dest);
      const t = setTimeout(() => adminLoginRedirectInProgress.delete(dest), 1000);
      return () => clearTimeout(t);
    }
  }, [admin, adminLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      toast.error("Enter both username and password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data?.error || "Invalid admin credentials");
        setLoading(false);
        return;
      }
      if (data?.admin) setAdmin(data.admin);
      toast.success("Welcome back, admin");
      router.push("/admin");
    } catch (err) {
      toast.error("Login failed. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-background overflow-hidden">
      {/* Brand-tinted ambient background */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 brand-gradient opacity-[0.04]" />
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-40 -right-32 h-[28rem] w-[28rem] rounded-full bg-amber-500/15 blur-3xl" />
        <div className="absolute inset-0 grid-bg opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        <Card className="border-border/60 shadow-xl backdrop-blur-md bg-card/95">
          <CardHeader className="space-y-3 text-center pb-6">
            <div className="mx-auto brand-gradient h-14 w-14 rounded-2xl flex items-center justify-center text-brand-foreground shadow-lg">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <CardTitle className="text-2xl tracking-tight">
                <span className="text-brand-gradient">Admin Console</span>
              </CardTitle>
              <CardDescription className="mt-1.5">
                Sign in to manage the Weekly Coding Challenges platform
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-xs font-medium text-muted-foreground">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    ref={usernameRef}
                    id="username"
                    type="text"
                    autoComplete="username"
                    placeholder="admin"
                    className="pl-9"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-9 pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Authenticating…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Sign in to admin
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col gap-3 pt-0">
            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 border border-border/50 rounded-md px-3 py-2">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary/70" />
              <span>
                Authorized administrators only. All access is logged and audit-trailed.
              </span>
            </div>
            <Link
              href="/"
              className={cn(
                "inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground",
                "hover:text-foreground transition-colors",
              )}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to student site
            </Link>
          </CardFooter>
        </Card>

        <p className="mt-6 text-center text-[11px] text-muted-foreground/70 tracking-wide">
          WCC 2.0 · Admin Console
        </p>
      </motion.div>
    </div>
  );
}

// Module-level redirect guard: prevents the AdminLoginPage → /admin and
// AdminGuard → /admin/login effects from ping-ponging the user between the two.
const adminLoginRedirectInProgress = new Set<string>();
