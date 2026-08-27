"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import {
  Flame,
  Trophy,
  Target,
  TrendingUp,
  Zap,
  Code2,
  Calendar,
  Clock,
  CheckCircle2,
  Award,
  Sparkles,
  ArrowRight,
  Crown,
  Medal,
  Star,
  Bug,
  Gauge,
  ShieldCheck,
  Hammer,
  Binary,
  Mountain,
  Activity as ActivityIcon,
  ChevronRight,
  Rocket,
  type LucideIcon,
} from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import { AvatarSvg } from "@/components/avatar-svg";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types — mirror of the GET /api/dashboard response shape
// ---------------------------------------------------------------------------
interface DashboardUser {
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

interface LevelInfo {
  level: number;
  tier: string;
  minXp: number;
  maxXp: number | null;
  nextLevelXp: number | null;
  progress: number; // 0..1
  xpIntoLevel: number;
  xpForLevel: number;
  color: string;
}

interface DashboardStats {
  solvedCount: number;
  attempts: number;
  successRate: number;
  totalXp: number;
  achievementsUnlocked: number;
}

interface WeeklyChallenge {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  xpReward: number;
  weekLabel?: string;
  weekStartsAt?: string | null;
  weekEndsAt?: string | null;
  participationCount: number;
  userState: { attempted: boolean; solved: boolean; attempts: number } | null;
}

interface ActivityLogItem {
  id: string;
  userId: string;
  type: string;
  description: string;
  refId?: string | null;
  date: string;
  createdAt: string;
}

interface AchievementItem {
  id: string;
  key: string;
  name: string;
  description: string;
  rarity: string;
  icon: string;
  category: string;
  xpReward: number;
  unlockedAt: string;
}

interface SubmissionItem {
  id: string;
  challengeId: string;
  challengeTitle: string;
  challengeSlug: string;
  difficulty: string;
  category: string;
  language: string;
  status: string;
  passedAll: boolean;
  attemptNumber: number;
  xpAwarded: number;
  createdAt: string;
}

interface DashboardData {
  user: DashboardUser;
  levelInfo: LevelInfo;
  stats: DashboardStats;
  weekly: WeeklyChallenge | null;
  contributionCalendar: Record<string, number>;
  recentActivity: ActivityLogItem[];
  recentAchievements: AchievementItem[];
  recentSubmissions: SubmissionItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function difficultyColor(d?: string) {
  switch ((d || "").toLowerCase()) {
    case "easy":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "medium":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "hard":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "expert":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function submissionStatusColor(s: string) {
  switch ((s || "").toLowerCase()) {
    case "accepted":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "wrong answer":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "compilation error":
    case "runtime error":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "time limit exceeded":
    case "memory limit exceeded":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    case "internal error":
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return "just now";
  }
}

function yearLabel(year?: string) {
  if (year === "1") return "First Year";
  if (year === "2") return "Second Year";
  return year || "—";
}

// Countdown that ticks every second, displays "Xd Yh Zm"
function useCountdown(target?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (!isFinite(ms) || ms <= 0) return "Ended";
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${d}d ${h}h ${m}m`;
}

// Achievement icon name → lucide component
const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  Code2,
  Code: Code2,
  CheckCircle2,
  Zap,
  Sparkles,
  ShieldCheck,
  Trophy,
  Award,
  Crown,
  Flame,
  Gauge,
  Bug,
  Calendar,
  Hammer,
  Medal,
  Binary,
  Mountain,
  Star,
};

function rarityStyles(rarity: string) {
  switch ((rarity || "common").toLowerCase()) {
    case "common":
      return {
        ring: "bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-slate-500/30",
        label: "text-slate-600 dark:text-slate-300",
      };
    case "rare":
      return {
        ring: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30",
        label: "text-emerald-600 dark:text-emerald-300",
      };
    case "epic":
      return {
        ring: "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/30",
        label: "text-amber-600 dark:text-amber-300",
      };
    case "legendary":
      return {
        ring: "bg-gradient-to-br from-amber-500/25 to-rose-500/25 text-rose-600 dark:text-rose-300 ring-rose-500/30",
        label: "text-rose-600 dark:text-rose-300",
      };
    default:
      return {
        ring: "bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-slate-500/30",
        label: "text-slate-600 dark:text-slate-300",
      };
  }
}

// ---------------------------------------------------------------------------
// Contribution calendar (GitHub-style, 52 weeks, Monday-start)
// ---------------------------------------------------------------------------
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

function ymdLocal(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function contributionColor(count: number) {
  if (count <= 0) return "bg-muted";
  if (count === 1) return "bg-emerald-200 dark:bg-emerald-900/70";
  if (count === 2) return "bg-emerald-400 dark:bg-emerald-700";
  return "bg-emerald-600 dark:bg-emerald-500";
}

function ContributionCalendar({ data }: { data: Record<string, number> }) {
  const grid = useMemo(() => {
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayIdx = (todayMid.getDay() + 6) % 7; // Mon=0..Sun=6
    const lastMonday = new Date(todayMid);
    lastMonday.setDate(todayMid.getDate() - dayIdx);
    const firstMonday = new Date(lastMonday);
    firstMonday.setDate(lastMonday.getDate() - (52 - 1) * 7);
    const weeks: Date[][] = [];
    for (let w = 0; w < 52; w++) {
      const week: Date[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(firstMonday);
        date.setDate(firstMonday.getDate() + w * 7 + d);
        week.push(date);
      }
      weeks.push(week);
    }
    return { weeks, todayMid };
  }, []);

  // For each week column, decide if the month label should be shown
  const monthLabels = useMemo(() => {
    return grid.weeks.map((week, i) => {
      const thisMonth = week[0].getMonth();
      const prevMonth = i > 0 ? grid.weeks[i - 1][0].getMonth() : -1;
      return thisMonth !== prevMonth ? MONTHS_SHORT[thisMonth] : null;
    });
  }, [grid]);

  return (
    <div className="overflow-x-auto custom-scrollbar pb-2 -mx-1 px-1">
      <div className="inline-block min-w-full">
        {/* Month labels row */}
        <div className="flex gap-[3px] pl-9 mb-1.5">
          {monthLabels.map((label, i) => (
            <div
              key={i}
              className="w-[11px] text-[10px] leading-none text-muted-foreground whitespace-nowrap"
            >
              {label ? <span className="block -translate-x-0.5">{label}</span> : null}
            </div>
          ))}
        </div>
        {/* Body */}
        <div className="flex flex-col gap-[3px]">
          {WEEKDAY_LABELS.map((label, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-[3px]">
              <div className="w-8 text-[10px] leading-none text-muted-foreground pr-1 text-right">
                {label}
              </div>
              {grid.weeks.map((week, colIdx) => {
                const date = week[rowIdx];
                const isFuture = date > grid.todayMid;
                const key = ymdLocal(date);
                const count = isFuture ? 0 : (data?.[key] || 0);
                return (
                  <Tooltip key={colIdx}>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "h-[11px] w-[11px] rounded-[2px] transition-colors cursor-default",
                          isFuture
                            ? "bg-transparent border border-dashed border-border/40"
                            : contributionColor(count),
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {isFuture
                        ? `${key}`
                        : `${count} submission${count === 1 ? "" : "s"} · ${key}`}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-2 pl-9">
          <span className="text-[11px] text-muted-foreground mr-1">Less</span>
          <div className="h-[11px] w-[11px] rounded-[2px] bg-muted" />
          <div className="h-[11px] w-[11px] rounded-[2px] bg-emerald-200 dark:bg-emerald-900/70" />
          <div className="h-[11px] w-[11px] rounded-[2px] bg-emerald-400 dark:bg-emerald-700" />
          <div className="h-[11px] w-[11px] rounded-[2px] bg-emerald-600 dark:bg-emerald-500" />
          <span className="text-[11px] text-muted-foreground ml-1">More</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent activity icon by type
// ---------------------------------------------------------------------------
function activityIcon(type: string): { Icon: LucideIcon; color: string } {
  switch ((type || "").toLowerCase()) {
    case "submission":
      return { Icon: Code2, color: "text-sky-600 dark:text-sky-400 bg-sky-500/10" };
    case "solve":
      return { Icon: CheckCircle2, color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" };
    case "achievement":
      return { Icon: Award, color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" };
    case "certificate":
      return { Icon: Medal, color: "text-violet-600 dark:text-violet-400 bg-violet-500/10" };
    case "level_up":
      return { Icon: TrendingUp, color: "text-primary bg-primary/10" };
    default:
      return { Icon: ActivityIcon, color: "text-muted-foreground bg-muted" };
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function Page() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}

function DashboardContent() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/dashboard", { cache: "no-store" });
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          toast.error(json?.error || "Failed to load dashboard");
          return;
        }
        setData(json as DashboardData);
      } catch {
        if (!active) return;
        toast.error("Network error — could not load dashboard");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  if (loading || !data) return <DashboardSkeleton />;

  return <DashboardView data={data} />;
}

// ---------------------------------------------------------------------------
// Loaded view
// ---------------------------------------------------------------------------
function DashboardView({ data }: { data: DashboardData }) {
  const {
    user,
    levelInfo,
    stats,
    weekly,
    contributionCalendar,
    recentActivity,
    recentAchievements,
    recentSubmissions,
  } = data;
  const countdown = useCountdown(weekly?.weekEndsAt);
  const activeDays = useMemo(
    () => Object.values(contributionCalendar || {}).filter((n) => n > 0).length,
    [contributionCalendar],
  );
  const xpToNext = levelInfo.maxXp === null ? 0 : Math.max(0, levelInfo.xpForLevel - levelInfo.xpIntoLevel);
  const progressPct = Math.round((levelInfo.progress || 0) * 100);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <HeroCard
            user={user}
            levelInfo={levelInfo}
            xpToNext={xpToNext}
            progressPct={progressPct}
          />
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          <StatCard
            icon={CheckCircle2}
            label="Solved Challenges"
            value={stats.solvedCount}
            accent="from-emerald-500/15 to-emerald-500/0"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            icon={Zap}
            label="Total Attempts"
            value={stats.attempts}
            accent="from-amber-500/15 to-amber-500/0"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <StatCard
            icon={Target}
            label="Success Rate"
            value={`${stats.successRate}%`}
            accent="from-primary/15 to-primary/0"
            iconColor="text-primary"
          />
          <StatCard
            icon={Flame}
            label="Longest Streak"
            value={user.longestStreak ?? 0}
            suffix="days"
            accent="from-rose-500/15 to-rose-500/0"
            iconColor="text-rose-600 dark:text-rose-400"
          />
        </motion.div>

        {/* Welcome aboard (if no solves yet) */}
        {stats.solvedCount === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
          >
            <WelcomeAboard />
          </motion.div>
        )}

        {/* Weekly challenge spotlight */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <WeeklySpotlight weekly={weekly} countdown={countdown} />
        </motion.div>

        {/* Contribution calendar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.13 }}
        >
          <Card className="p-4 sm:p-6">
            <CardHeader className="px-0 pt-0">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Your coding activity
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {activeDays > 0 ? (
                      <>
                        <span className="font-medium text-foreground">{activeDays}</span>{" "}
                        active day{activeDays === 1 ? "" : "s"} in the last year
                      </>
                    ) : (
                      "Your contribution grid will light up as you solve challenges."
                    )}
                  </CardDescription>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                  <Flame className="h-3.5 w-3.5 text-amber-500" />
                  Current streak:{" "}
                  <span className="font-semibold text-foreground">{user.currentStreak || 0}</span>{" "}
                  day{(user.currentStreak || 0) === 1 ? "" : "s"}
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              {activeDays === 0 ? (
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center">
                  <Sparkles className="h-5 w-5 mx-auto text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Start your first challenge to light up the grid!
                  </p>
                </div>
              ) : (
                <ContributionCalendar data={contributionCalendar || {}} />
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Submissions + activity timeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.16 }}
            className="lg:col-span-2"
          >
            <RecentSubmissions submissions={recentSubmissions} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.18 }}
            className="lg:col-span-1"
          >
            <RecentActivity activity={recentActivity} />
          </motion.div>
        </div>

        {/* Recent achievements strip */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <RecentAchievements achievements={recentAchievements} />
        </motion.div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Hero card
// ---------------------------------------------------------------------------
function HeroCard({
  user,
  levelInfo,
  xpToNext,
  progressPct,
}: {
  user: DashboardUser;
  levelInfo: LevelInfo;
  xpToNext: number;
  progressPct: number;
}) {
  return (
    <Card className="overflow-hidden p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
        {/* Avatar */}
        <div className="flex items-center justify-center sm:items-start">
          <div className="rounded-full ring-4 ring-primary/10 shadow-sm overflow-hidden">
            <AvatarSvg config={user.avatar || {}} size={88} />
          </div>
        </div>
        {/* Identity + level */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">
              {user.name}
            </h1>
            <Badge variant="secondary" className="text-xs">
              {yearLabel(user.year)}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{user.uid}</span>
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <span
                className="inline-flex items-center gap-1.5 font-medium"
                style={{ color: levelInfo.color }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: levelInfo.color }}
                />
                {levelInfo.tier} · Level {levelInfo.level}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-semibold text-foreground">{(user.xp || 0).toLocaleString()}</span>
              XP total
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-semibold text-foreground">{user.currentStreak || 0}</span>
              day streak
            </span>
          </div>

          {/* Level progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
              <span>
                <span className="font-semibold text-foreground">{levelInfo.xpIntoLevel.toLocaleString()}</span>
                <span className="text-muted-foreground"> / {levelInfo.xpForLevel.toLocaleString()} XP this level</span>
              </span>
              <span className="font-medium">
                {levelInfo.maxXp === null ? (
                  "Max tier reached"
                ) : (
                  <>{xpToNext.toLocaleString()} XP to next level</>
                )}
              </span>
            </div>
            <Progress value={progressPct} className="h-2.5" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------
function StatCard({
  icon: Icon,
  label,
  value,
  suffix,
  accent,
  iconColor,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  suffix?: string;
  accent: string;
  iconColor: string;
}) {
  return (
    <Card className="relative overflow-hidden p-4 sm:p-6">
      <div
        className={cn(
          "pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl bg-gradient-to-br",
          accent,
        )}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-3xl font-bold tracking-tight">
            {value}
            {suffix && <span className="ml-1 text-sm font-medium text-muted-foreground">{suffix}</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{label}</div>
        </div>
        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center bg-background/60", iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Welcome aboard
// ---------------------------------------------------------------------------
function WelcomeAboard() {
  const tips = [
    {
      icon: Code2,
      title: "Solve your first challenge",
      body: "Browse challenges, pick an Easy one, and submit your solution in Python, C++ or JavaScript.",
      color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
    },
    {
      icon: Flame,
      title: "Build a streak",
      body: "Solve at least one challenge each day to grow your streak — the calendar tracks it.",
      color: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
    },
    {
      icon: Trophy,
      title: "Climb the leaderboard",
      body: "Every solved challenge earns XP. First-attempt success gives a 25% bonus.",
      color: "text-primary bg-primary/10",
    },
    {
      icon: Award,
      title: "Unlock achievements",
      body: "22 achievements + certificates auto-unlock as you progress. Check the Achievements page.",
      color: "text-violet-600 dark:text-violet-400 bg-violet-500/10",
    },
  ];
  return (
    <Card className="border-primary/30 bg-primary/5 p-4 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl brand-gradient text-brand-foreground flex items-center justify-center shrink-0">
          <Rocket className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg">Welcome aboard, coder!</CardTitle>
          <CardDescription className="mt-1">
            You haven't solved a challenge yet — here's how to start earning XP and climbing the leaderboard.
          </CardDescription>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {tips.map((t) => (
          <div key={t.title} className="rounded-lg border border-border/60 bg-background/70 p-3">
            <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-2", t.color)}>
              <t.icon className="h-4 w-4" />
            </div>
            <div className="text-sm font-semibold">{t.title}</div>
            <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{t.body}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm" className="brand-gradient text-brand-foreground">
          <Link href="/challenges">
            <Code2 className="h-4 w-4 mr-1.5" /> Browse challenges
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/leaderboard">
            <Trophy className="h-4 w-4 mr-1.5" /> See leaderboard
          </Link>
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Weekly spotlight
// ---------------------------------------------------------------------------
function WeeklySpotlight({
  weekly,
  countdown,
}: {
  weekly: WeeklyChallenge | null;
  countdown: string | null;
}) {
  if (!weekly) {
    return (
      <Card className="p-4 sm:p-6">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Weekly challenge
          </CardTitle>
          <CardDescription>
            No active weekly challenge right now. Check back soon — a new one drops every week!
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center">
            <Calendar className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Meanwhile, explore the challenge library and keep your streak alive.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/challenges">
                Browse all challenges <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const userState = weekly.userState;
  const statusLabel = !userState
    ? "Not attempted"
    : userState.solved
      ? "Solved"
      : userState.attempted
        ? `Attempted (${userState.attempts})`
        : "Not attempted";
  const statusStyles = !userState
    ? "bg-muted text-muted-foreground"
    : userState.solved
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : userState.attempted
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
        : "bg-muted text-muted-foreground";

  return (
    <Card className="relative overflow-hidden p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 brand-gradient opacity-[0.04]" />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl brand-gradient text-brand-foreground flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
                Weekly Challenge{weekly.weekLabel ? ` · ${weekly.weekLabel}` : ""}
              </div>
              <CardTitle className="text-xl sm:text-2xl mt-0.5">{weekly.title}</CardTitle>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={cn("border", difficultyColor(weekly.difficulty))}>
              {weekly.difficulty}
            </Badge>
            <Badge variant="secondary">{weekly.category}</Badge>
            <Badge className="bg-primary/10 text-primary border-primary/20">
              +{weekly.xpReward} XP
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Time left
            </div>
            <div className="text-lg font-semibold mt-0.5 tabular-nums">
              {countdown ?? "—"}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Trophy className="h-3 w-3" /> Participation
            </div>
            <div className="text-lg font-semibold mt-0.5">
              {weekly.participationCount.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 col-span-2 sm:col-span-1">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" /> Your status
            </div>
            <div className={cn("text-sm font-semibold mt-0.5 inline-flex items-center px-2 py-0.5 rounded-md w-fit", statusStyles)}>
              {statusLabel}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button asChild className="brand-gradient text-brand-foreground">
            <Link href={`/challenges/${weekly.slug}`}>
              {userState?.solved ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Review solution
                </>
              ) : (
                <>
                  <Code2 className="h-4 w-4 mr-1.5" /> Open challenge
                </>
              )}
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/challenges">
              Browse all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recent submissions
// ---------------------------------------------------------------------------
function RecentSubmissions({ submissions }: { submissions: SubmissionItem[] }) {
  return (
    <Card className="p-4 sm:p-6 h-full">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary" /> Recent submissions
        </CardTitle>
        <CardDescription className="mt-1">Your latest attempts across all challenges.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {submissions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center">
            <Code2 className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Your submissions will appear here once you start attempting challenges.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-4">
              <Link href="/challenges">
                Find a challenge <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border/60 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Challenge</TableHead>
                  <TableHead className="hidden sm:table-cell">Lang</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Attempt</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.slice(0, 8).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/challenges/${s.challengeSlug}`} className="block">
                        <div className="font-medium truncate max-w-[220px] sm:max-w-none">
                          {s.challengeTitle}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5">
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", difficultyColor(s.difficulty))}>
                            {s.difficulty}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">{s.category}</span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="text-[10px] font-mono uppercase">
                        {s.language}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
                          submissionStatusColor(s.status),
                        )}
                      >
                        {s.passedAll ? <CheckCircle2 className="h-3 w-3" /> : null}
                        {s.status}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right text-xs text-muted-foreground">
                      #{s.attemptNumber}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        "text-xs font-semibold",
                        s.xpAwarded > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                      )}>
                        {s.xpAwarded > 0 ? `+${s.xpAwarded}` : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-xs text-muted-foreground whitespace-nowrap">
                      {relativeTime(s.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {submissions.length > 0 && (
        <CardFooter className="px-0 justify-end pt-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/profile">
              View all submissions <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recent activity timeline
// ---------------------------------------------------------------------------
function RecentActivity({ activity }: { activity: ActivityLogItem[] }) {
  return (
    <Card className="p-4 sm:p-6 h-full">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <ActivityIcon className="h-4 w-4 text-primary" /> Recent activity
        </CardTitle>
        <CardDescription className="mt-1">A live timeline of what you've been up to.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {activity.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center">
            <ActivityIcon className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Your activity will appear here once you start submitting.
            </p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto custom-scrollbar pr-1">
            <ol className="relative">
              <div
                className="absolute left-[15px] top-1 bottom-1 w-px bg-border"
                aria-hidden
              />
              {activity.slice(0, 8).map((a) => {
                const { Icon, color } = activityIcon(a.type);
                return (
                  <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                    <div
                      className={cn(
                        "relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ring-2 ring-background",
                        color,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="text-sm leading-snug">{a.description}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {relativeTime(a.createdAt)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Recent achievements strip
// ---------------------------------------------------------------------------
function RecentAchievements({ achievements }: { achievements: AchievementItem[] }) {
  return (
    <Card className="p-4 sm:p-6">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" /> Recent achievements
            </CardTitle>
            <CardDescription className="mt-1">
              {achievements.length > 0
                ? "Recently unlocked badges — hover for details."
                : "No achievements unlocked yet — keep solving challenges!"}
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/achievements">
              View all <ChevronRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {achievements.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center">
            <Award className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Solve your first challenge to start unlocking achievements.
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto custom-scrollbar pb-2 -mx-1 px-1">
            {achievements.map((a) => {
              const styles = rarityStyles(a.rarity);
              const Icon = ACHIEVEMENT_ICONS[a.icon] || Award;
              return (
                <Tooltip key={a.id}>
                  <TooltipTrigger asChild>
                    <div className="shrink-0 w-24 sm:w-28 rounded-xl border border-border/60 bg-muted/20 p-3 text-center cursor-default hover:shadow-sm transition-shadow">
                      <div
                        className={cn(
                          "h-12 w-12 mx-auto rounded-full flex items-center justify-center ring-2 mb-2",
                          styles.ring,
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-xs font-semibold leading-tight line-clamp-2 min-h-[2rem]">
                        {a.name}
                      </div>
                      <div className={cn("text-[10px] mt-1 uppercase tracking-wide font-medium", styles.label)}>
                        {a.rarity}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    <div className="font-semibold">{a.name}</div>
                    <div className="opacity-90 mt-0.5">{a.description}</div>
                    <div className="opacity-75 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="uppercase">{a.rarity}</span>
                      {a.xpReward > 0 && <span>+{a.xpReward} XP</span>}
                      <span>· {relativeTime(a.unlockedAt)}</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Hero skeleton */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
          <Skeleton className="h-[88px] w-[88px] rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-48" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        </div>
      </Card>

      {/* Stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-4 sm:p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </Card>
        ))}
      </div>

      {/* Weekly skeleton */}
      <Card className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-6 w-56" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-lg" />
            ))}
          </div>
        </div>
      </Card>

      {/* Calendar skeleton */}
      <Card className="p-4 sm:p-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-64" />
          <div className="space-y-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-[3px]">
                <Skeleton className="h-[11px] w-[11px] rounded-[2px]" />
                {Array.from({ length: 30 }).map((_, j) => (
                  <Skeleton key={j} className="h-[11px] w-[11px] rounded-[2px]" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Submissions + activity skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-2 p-4 sm:p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </Card>
        <Card className="lg:col-span-1 p-4 sm:p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Achievements skeleton */}
      <Card className="p-4 sm:p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-28 rounded-xl shrink-0" />
          ))}
        </div>
      </Card>
    </div>
  );
}
