"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Code2, Flame, Trophy, ShieldCheck, Award, CalendarDays, Sparkles, ArrowRight, BookOpen, Zap, Brain, GitBranch, Lock,
} from "lucide-react";
import Link from "next/link";
import { AvatarSvg } from "@/components/avatar-svg";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { student, refreshStudent, studentLoading } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // already logged in → go to dashboard (guarded against re-firing)
  useEffect(() => {
    if (!studentLoading && student) {
      const dest = "/dashboard";
      if (landingRedirectInProgress.has(dest)) return;
      landingRedirectInProgress.add(dest);
      router.replace(dest);
      const t = setTimeout(() => landingRedirectInProgress.delete(dest), 1000);
      return () => clearTimeout(t);
    }
  }, [student, studentLoading, router]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: any = Object.fromEntries(fd.entries());
    setLoading(true);
    try {
      const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { error: `Server response error (${res.status})` };
      }
      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
        return;
      }
      await refreshStudent();
      toast.success(mode === "login" ? `Welcome back, ${data.user?.name || ""}!` : "Account created — welcome aboard!");
      router.push("/dashboard");
    } catch (err) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top nav */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="brand-gradient h-9 w-9 rounded-xl flex items-center justify-center text-brand-foreground font-bold">W</div>
            <div className="font-semibold tracking-tight text-lg">
              Weekly Coding <span className="text-brand-gradient">Challenges 2.0</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {mounted && (
              <button
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
            )}
            <Button asChild variant="ghost" size="sm" className="gap-2">
              <Link href="/admin/login">
                <Lock className="h-4 w-4" /> Admin
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex-1 grid-bg overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 lg:py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> New weekly challenges every Monday
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Train weekly.
              <br />
              <span className="text-brand-gradient">Climb the leaderboard.</span>
              <br />
              Become a <span className="text-foreground">Pro Coder.</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl">
              A competitive-programming home for first and second-year students. Solve weekly challenges, build streaks,
              unlock achievements, earn certificates and prove your skills on the leaderboard — with code-integrity monitoring
              that keeps the competition fair.
            </p>
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Flame className="h-4 w-4 text-amber-500" /> Streaks</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Trophy className="h-4 w-4 text-yellow-600" /> Leaderboard</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Award className="h-4 w-4 text-emerald-600" /> Achievements</div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Integrity</div>
            </div>
          </div>

          {/* Auth card */}
          <div className="lg:pl-6">
            <Card className="shadow-xl border-border/70">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">Enter the arena</CardTitle>
                    <CardDescription>Sign in with your university UID</CardDescription>
                  </div>
                  <AvatarSvg config={{ skin: "skin2", hair: "hair5", eyes: "eyes1", outfit: "outfit9", outfitVibe: "tech", expression: "cool", sticker: "code1" }} size={56} />
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="login">Sign in</TabsTrigger>
                    <TabsTrigger value="register">Register</TabsTrigger>
                  </TabsList>
                  <TabsContent value="login">
                    <form onSubmit={submit} className="space-y-3 mt-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="uid">University UID</Label>
                        <Input id="uid" name="uid" placeholder="25LBCS0001 or 26LBCS0001" autoComplete="username" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="password">Password</Label>
                        <Input id="password" name="password" type="password" placeholder="••••••" autoComplete="current-password" required />
                      </div>
                      <Button type="submit" className="w-full brand-gradient text-brand-foreground" disabled={loading}>
                        {loading ? "Signing in…" : <>Sign in <ArrowRight className="h-4 w-4 ml-2" /></>}
                      </Button>
                    </form>
                  </TabsContent>
                  <TabsContent value="register">
                    <form onSubmit={submit} className="space-y-3 mt-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="r-uid">University UID</Label>
                        <Input id="r-uid" name="uid" placeholder="26LBCS0134" required />
                        <p className="text-xs text-muted-foreground">25LBCSxxxx = second year · 26LBCSxxxx = first year</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="r-name">Full name</Label>
                        <Input id="r-name" name="name" placeholder="Your name" required />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="r-username">Display handle (optional)</Label>
                        <Input id="r-username" name="username" placeholder="e.g. codequeen" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="r-password">Password</Label>
                        <Input id="r-password" name="password" type="password" placeholder="At least 4 characters" required />
                      </div>
                      <Button type="submit" className="w-full brand-gradient text-brand-foreground" disabled={loading}>
                        {loading ? "Creating…" : <>Create account <ArrowRight className="h-4 w-4 ml-2" /></>}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground justify-center">
                Demo: <code className="mx-1 px-1.5 py-0.5 rounded bg-muted">26LBCS0001</code> / <code className="mx-1 px-1.5 py-0.5 rounded bg-muted">demo1234</code>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-border/60 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Everything a competitive coder needs</h2>
            <p className="text-muted-foreground mt-2">A real, production-grade platform — not a static mockup.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <Card key={f.title} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div>Weekly Coding Challenges 2.0 · university coding ecosystem</div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-3.5 w-3.5" />
            All submissions analyzed for code similarity
          </div>
        </div>
      </footer>
    </div>
  );
}

// Module-level redirect guard: prevents the LandingPage → /dashboard and
// AuthGuard → / effects from ping-ponging the user between / and /dashboard.
const landingRedirectInProgress = new Set<string>();

const FEATURES = [
  { icon: Code2, title: "Real code execution", body: "Submit Python, C++ or JavaScript against hidden test cases in a sandboxed runner with time and memory limits." },
  { icon: Flame, title: "Streaks & consistency", body: "A GitHub-style contribution calendar keeps you accountable. Build 7-day, 30-day and longer streaks." },
  { icon: Trophy, title: "Leaderboards & Hall of Fame", body: "Overall, first-year and second-year rankings update live from backend XP and verified solves." },
  { icon: Award, title: "22 achievements + certificates", body: "From First Code Right to Pro Coder — auto-evaluated from your real activity. Certificates on tier completion." },
  { icon: ShieldCheck, title: "Integrity monitoring", body: "Plagiarism detection across token, identifier, and structural similarity — reviewed by admins." },
  { icon: CalendarDays, title: "Weekly cadence", body: "A new challenge lands every week with deadlines, XP and leaderboard impact. Keep coming back." },
  { icon: Zap, title: "XP & progression", body: "Four tiers: Beginner, Intermediate, Advanced, Pro. Primary XP on first solve, bonus for first-attempt success." },
  { icon: Brain, title: "Your coding identity", body: "Customize a Bitmoji-style avatar, display featured badges, and build a public profile page." },
  { icon: GitBranch, title: "Extensible architecture", body: "Built to add contests, teams, mentorship, battles and more languages without a rewrite." },
];
