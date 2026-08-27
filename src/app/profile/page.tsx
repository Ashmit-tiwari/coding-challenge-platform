"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { format, formatDistanceToNowStrict, parseISO } from "date-fns";
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
  Lock,
  Pencil,
  Save,
  ScrollText,
  Trophy as TrophyIcon,
  Download,
  type LucideIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip as RTooltip,
  CartesianGrid,
  Cell,
} from "recharts";

import { AuthGuard } from "@/components/auth-guard";
import { AvatarSvg } from "@/components/avatar-svg";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store";

// ---------------------------------------------------------------------------
// Types — mirror of the GET /api/profile response shape
// ---------------------------------------------------------------------------
interface ProfileUser {
  id: string;
  uid: string;
  name: string;
  year?: string;
  batch?: string;
  username?: string | null;
  bio?: string | null;
  avatar?: Record<string, string>;
  xp: number;
  level: number;
  levelName?: string;
  currentStreak: number;
  longestStreak: number;
  titles?: string[];
  featuredBadges?: string[];
  createdAt: string;
  isBanned?: boolean;
}

interface LevelInfo {
  level: number;
  tier: string;
  minXp: number;
  maxXp: number | null;
  nextLevelXp: number | null;
  progress: number;
  xpIntoLevel: number;
  xpForLevel: number;
  color: string;
}

interface ProfileStats {
  solvedCount: number;
  attempts: number;
  successRate: number;
  currentStreak: number;
  longestStreak: number;
  xp: number;
  level: number;
  levelName?: string;
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

interface FullAchievement extends AchievementItem {
  unlocked: boolean;
  unlockedAt: string | null;
}

interface CertificateItem {
  id: string;
  certId: string;
  userId: string;
  level: string;
  tierLevel: number;
  issuedAt: string;
  studentName: string;
  studentUid: string;
  year: string;
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
  execTimeMs?: number;
  xpAwarded: number;
  createdAt: string;
}

interface TimelineItem {
  id: string;
  userId: string;
  type: string;
  description: string;
  refId?: string | null;
  date?: string | null;
  createdAt: string;
}

interface ProfileData {
  user: ProfileUser;
  levelInfo: LevelInfo;
  stats: ProfileStats;
  achievements: AchievementItem[];
  certificates: CertificateItem[];
  submissions: SubmissionItem[];
  timeline: TimelineItem[];
  contributionCalendar: Record<string, number>;
  isOwn: boolean;
}

interface AchievementsApiResponse {
  achievements: FullAchievement[];
  progress:
    | Record<string, { current: number; needed: number; metric: string }>
    | null;
  stats: { total: number; unlocked: number };
}

// ---------------------------------------------------------------------------
// Helpers (shared with dashboard conventions)
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

function relativeTime(iso?: string | null): string {
  if (!iso) return "just now";
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

function resolveAchievementIcon(name: string): LucideIcon {
  return ACHIEVEMENT_ICONS[name] || Award;
}

function rarityStyles(rarity: string) {
  switch ((rarity || "common").toLowerCase()) {
    case "common":
      return {
        ring: "bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-slate-500/30",
        label: "text-slate-600 dark:text-slate-300",
        border: "border-slate-500/30",
      };
    case "rare":
      return {
        ring: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30",
        label: "text-emerald-600 dark:text-emerald-300",
        border: "border-emerald-500/30",
      };
    case "epic":
      return {
        ring: "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/30",
        label: "text-amber-600 dark:text-amber-300",
        border: "border-amber-500/30",
      };
    case "legendary":
      return {
        ring: "bg-gradient-to-br from-amber-500/25 to-rose-500/25 text-rose-600 dark:text-rose-300 ring-rose-500/30",
        label: "text-rose-600 dark:text-rose-300",
        border: "border-rose-500/30",
      };
    default:
      return {
        ring: "bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-slate-500/30",
        label: "text-slate-600 dark:text-slate-300",
        border: "border-slate-500/30",
      };
  }
}

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

// Contribution calendar helpers
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

// Build 12 weeks of submission counts for the performance bar chart
function weeklySubmissionBuckets(
  submissions: SubmissionItem[],
  weeks = 12,
): { week: string; label: string; submissions: number; solved: number }[] {
  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dayIdx = (todayMid.getDay() + 6) % 7; // Mon=0..Sun=6
  const lastMonday = new Date(todayMid);
  lastMonday.setDate(todayMid.getDate() - dayIdx);
  const firstMonday = new Date(lastMonday);
  firstMonday.setDate(lastMonday.getDate() - (weeks - 1) * 7);

  const buckets: { week: string; label: string; submissions: number; solved: number }[] = [];
  for (let w = 0; w < weeks; w++) {
    const start = new Date(firstMonday);
    start.setDate(firstMonday.getDate() + w * 7);
    const label = `${MONTHS_SHORT[start.getMonth()]} ${start.getDate()}`;
    buckets.push({ week: ymdLocal(start), label, submissions: 0, solved: 0 });
  }
  for (const s of submissions) {
    const d = new Date(s.createdAt);
    const diffDays = Math.floor(
      (d.getTime() - firstMonday.getTime()) / 86400000,
    );
    if (diffDays < 0) continue;
    const w = Math.floor(diffDays / 7);
    if (w < 0 || w >= weeks) continue;
    buckets[w].submissions += 1;
    if (s.passedAll) buckets[w].solved += 1;
  }
  return buckets;
}

// ---------------------------------------------------------------------------
// Page (default export)
// ---------------------------------------------------------------------------
export default function Page() {
  return (
    <AuthGuard>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
            Loading profile…
          </div>
        }
      >
        <ProfileContent />
      </Suspense>
    </AuthGuard>
  );
}

// ---------------------------------------------------------------------------
// Profile content
// ---------------------------------------------------------------------------
function ProfileContent() {
  const params = useSearchParams();
  const uid = params.get("uid") || undefined;

  const [data, setData] = useState<ProfileData | null>(null);
  const [achievementsFull, setAchievementsFull] =
    useState<FullAchievement[] | null>(null);
  const [progress, setProgress] = useState<
    Record<string, { current: number; needed: number; metric: string }> | null
  >(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile${uid ? `?uid=${encodeURIComponent(uid)}` : ""}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to load profile");
        return;
      }
      setData(json as ProfileData);

      // also fetch the full achievement list (locked + unlocked) for richer display
      try {
        const aRes = await fetch(
          `/api/achievements${uid ? `?uid=${encodeURIComponent(uid)}` : ""}`,
          { cache: "no-store" },
        );
        if (aRes.ok) {
          const aJson = (await aRes.json()) as AchievementsApiResponse;
          setAchievementsFull(aJson.achievements);
          setProgress(aJson.progress);
        }
      } catch {
        // non-fatal — fall back to profile-only achievements
      }
    } catch {
      toast.error("Network error — could not load profile");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    (async () => {
      await fetchProfile();
    })();
  }, [fetchProfile]);

  // Scroll to top when switching profile target
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, [uid]);

  if (loading || !data) return <ProfileSkeleton />;

  return (
    <ProfileView
      data={data}
      achievementsFull={achievementsFull}
      progress={progress}
      onRefresh={fetchProfile}
    />
  );
}

// ---------------------------------------------------------------------------
// Loaded view
// ---------------------------------------------------------------------------
function ProfileView({
  data,
  achievementsFull,
  progress,
  onRefresh,
}: {
  data: ProfileData;
  achievementsFull: FullAchievement[] | null;
  progress:
    | Record<string, { current: number; needed: number; metric: string }>
    | null;
  onRefresh: () => Promise<void> | void;
}) {
  const { user, levelInfo, stats, submissions, contributionCalendar, timeline } = data;
  const xpToNext =
    levelInfo.maxXp === null ? 0 : Math.max(0, levelInfo.xpForLevel - levelInfo.xpIntoLevel);
  const progressPct = Math.round((levelInfo.progress || 0) * 100);
  const activeDays = useMemo(
    () => Object.values(contributionCalendar || {}).filter((n) => n > 0).length,
    [contributionCalendar],
  );
  const weeklyBuckets = useMemo(
    () => weeklySubmissionBuckets(submissions, 12),
    [submissions],
  );

  // Use the full achievement list if available (so we can show locked ones too).
  // Otherwise fall back to unlocked-only from the profile payload.
  const achList: FullAchievement[] = useMemo(() => {
    if (achievementsFull && achievementsFull.length > 0) return achievementsFull;
    return data.achievements.map((a) => ({ ...a, unlocked: true, unlockedAt: a.unlockedAt }));
  }, [achievementsFull, data.achievements]);

  const featuredBadges = user.featuredBadges || [];
  const unlockedByKey = useMemo(() => {
    const map: Record<string, FullAchievement> = {};
    for (const a of achList) if (a.unlocked) map[a.key] = a;
    return map;
  }, [achList]);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex flex-col gap-4 sm:gap-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <HeaderCard
            user={user}
            levelInfo={levelInfo}
            stats={stats}
            xpToNext={xpToNext}
            progressPct={progressPct}
            isOwn={data.isOwn}
            onUpdated={onRefresh}
          />
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4"
        >
          <StatCard
            icon={CheckCircle2}
            label="Solved"
            value={stats.solvedCount}
            accent="from-emerald-500/15 to-emerald-500/0"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <StatCard
            icon={Zap}
            label="Attempts"
            value={stats.attempts}
            accent="from-amber-500/15 to-amber-500/0"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <StatCard
            icon={Target}
            label="Success"
            value={`${stats.successRate}%`}
            accent="from-primary/15 to-primary/0"
            iconColor="text-primary"
          />
          <StatCard
            icon={Sparkles}
            label="XP"
            value={(user.xp || 0).toLocaleString()}
            accent="from-primary/15 to-primary/0"
            iconColor="text-primary"
          />
          <StatCard
            icon={Award}
            label="Achievements"
            value={data.achievements.length}
            accent="from-amber-500/15 to-amber-500/0"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <StatCard
            icon={Medal}
            label="Certificates"
            value={data.certificates.length}
            accent="from-violet-500/15 to-violet-500/0"
            iconColor="text-violet-600 dark:text-violet-400"
          />
        </motion.div>

        {/* Featured badges row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <FeaturedBadges
            featuredKeys={featuredBadges}
            unlockedByKey={unlockedByKey}
            isOwn={data.isOwn}
            onUpdated={onRefresh}
            achList={achList}
          />
        </motion.div>

        {/* Contribution calendar + Performance chart */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.11 }}
            className="xl:col-span-2"
          >
            <Card className="p-4 sm:p-6 h-full">
              <CardHeader className="px-0 pt-0">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      Coding activity
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {activeDays > 0 ? (
                        <>
                          <span className="font-medium text-foreground">{activeDays}</span>{" "}
                          active day{activeDays === 1 ? "" : "s"} in the last year
                        </>
                      ) : (
                        "Contribution grid will light up as challenges are solved."
                      )}
                    </CardDescription>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
                    <Flame className="h-3.5 w-3.5 text-amber-500" />
                    Current streak:{" "}
                    <span className="font-semibold text-foreground">{user.currentStreak || 0}</span>{" "}
                    · Longest:{" "}
                    <span className="font-semibold text-foreground">{user.longestStreak || 0}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-0">
                {activeDays === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center">
                    <Sparkles className="h-5 w-5 mx-auto text-primary mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {data.isOwn
                        ? "Solve your first challenge to light up the grid!"
                        : "No coding activity recorded yet."}
                    </p>
                  </div>
                ) : (
                  <ContributionCalendar data={contributionCalendar || {}} />
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.14 }}
          >
            <Card className="p-4 sm:p-6 h-full">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Performance
                </CardTitle>
                <CardDescription className="mt-1">
                  Submissions per week · last 12 weeks
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <PerformanceChart data={weeklyBuckets} />
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Achievements */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.16 }}
        >
          <AchievementsSection
            achList={achList}
            progress={progress}
            isOwn={data.isOwn}
          />
        </motion.div>

        {/* Certificates */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.18 }}
        >
          <CertificatesSection certificates={data.certificates} />
        </motion.div>

        {/* Timeline + Challenge history */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="lg:col-span-1"
          >
            <TimelineSection timeline={timeline} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.22 }}
            className="lg:col-span-2"
          >
            <ChallengeHistory submissions={submissions} />
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Header card
// ---------------------------------------------------------------------------
function HeaderCard({
  user,
  levelInfo,
  xpToNext,
  progressPct,
  isOwn,
  onUpdated,
}: {
  user: ProfileUser;
  levelInfo: LevelInfo;
  stats: ProfileStats;
  xpToNext: number;
  progressPct: number;
  isOwn: boolean;
  onUpdated: () => Promise<void> | void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const memberSince = useMemo(() => {
    try {
      return format(parseISO(user.createdAt), "MMM d, yyyy");
    } catch {
      return "—";
    }
  }, [user.createdAt]);

  return (
    <Card className="overflow-hidden p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
        {/* Avatar */}
        <div className="flex items-center justify-center sm:items-start">
          <div className="rounded-full ring-4 ring-primary/10 shadow-sm overflow-hidden">
            <AvatarSvg config={user.avatar || {}} size={128} />
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
            {user.isBanned && (
              <Badge variant="destructive" className="text-xs">
                Banned
              </Badge>
            )}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{user.uid}</span>
            {user.username && (
              <span className="inline-flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">@</span>
                <span className="font-medium text-foreground">{user.username}</span>
              </span>
            )}
          </div>

          {user.bio ? (
            <p className="mt-3 text-sm text-foreground/80 leading-relaxed max-w-2xl">
              {user.bio}
            </p>
          ) : isOwn ? (
            <p className="mt-3 text-sm text-muted-foreground italic">
              No bio yet — add one to tell others about yourself.
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span
              className="inline-flex items-center gap-1.5 font-medium"
              style={{ color: levelInfo.color }}
            >
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: levelInfo.color }}
              />
              {levelInfo.tier} · Level {levelInfo.level}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="font-semibold text-foreground">{(user.xp || 0).toLocaleString()}</span>
              XP
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-semibold text-foreground">{user.currentStreak || 0}</span>
              day streak
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-semibold text-foreground">{user.longestStreak || 0}</span>
              longest
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              Joined {memberSince}
            </span>
          </div>

          {/* Level progress */}
          <div className="mt-5 max-w-2xl">
            {levelInfo.maxXp === null ? (
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>Max tier reached</span>
                <span className="font-semibold text-foreground">
                  {levelInfo.tier} · Level {levelInfo.level}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>
                  <span className="font-semibold text-foreground">
                    {levelInfo.xpIntoLevel.toLocaleString()}
                  </span>{" "}
                  / {levelInfo.xpForLevel.toLocaleString()} XP this level
                </span>
                <span>
                  <span className="font-semibold text-primary">{xpToNext.toLocaleString()}</span>{" "}
                  XP to next level
                </span>
              </div>
            )}
            <Progress value={progressPct} className="h-2" />
          </div>

          {/* Action buttons */}
          {isOwn && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Button variant="default" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4 mr-1.5" />
                Edit profile
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/profile/avatar">
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Customize avatar
                </Link>
              </Button>
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md">
                  <EditProfileForm
                    user={user}
                    onSaved={async () => {
                      setEditOpen(false);
                      await onUpdated();
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Edit profile form (inside Dialog)
// ---------------------------------------------------------------------------
function EditProfileForm({
  user,
  onSaved,
}: {
  user: ProfileUser;
  onSaved: () => void;
}) {
  const [bio, setBio] = useState(user.bio || "");
  const [username, setUsername] = useState(user.username || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, username: username.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to save");
        return;
      }
      toast.success("Profile updated");
      onSaved();
    } catch {
      toast.error("Network error — could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit profile</DialogTitle>
        <DialogDescription>
          Update your handle and bio. Your UID, level and stats are managed by the platform.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label htmlFor="username">Username / handle</Label>
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. code_ninja"
            maxLength={40}
          />
          <p className="text-xs text-muted-foreground">
            Optional — shown as @{username.trim() || "handle"} on your profile.
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell the community a bit about you — your favourite language, what you're learning, or your next goal."
            rows={5}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length} / 500</p>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="ghost" disabled={saving}>
            Cancel
          </Button>
        </DialogClose>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
          {!saving && <Save className="h-4 w-4 ml-1.5" />}
        </Button>
      </DialogFooter>
    </>
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
  value: number | string;
  suffix?: string;
  accent: string;
  iconColor: string;
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div
        className={cn(
          "absolute -top-6 -right-6 h-20 w-20 rounded-full blur-2xl opacity-60 bg-gradient-to-br",
          accent,
        )}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-2xl font-bold tracking-tight truncate">
            {value}
            {suffix && (
              <span className="text-sm text-muted-foreground font-medium ml-1">{suffix}</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{label}</div>
        </div>
        <div
          className={cn(
            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
            iconColor,
            "bg-muted/40",
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Featured badges row + selection dialog
// ---------------------------------------------------------------------------
function FeaturedBadges({
  featuredKeys,
  unlockedByKey,
  isOwn,
  onUpdated,
  achList,
}: {
  featuredKeys: string[];
  unlockedByKey: Record<string, FullAchievement>;
  isOwn: boolean;
  onUpdated: () => Promise<void> | void;
  achList: FullAchievement[];
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(featuredKeys);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(featuredKeys);
  }, [featuredKeys]);

  const unlockedForSelection = useMemo(
    () => achList.filter((a) => a.unlocked),
    [achList],
  );

  function toggle(key: string) {
    setDraft((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      if (prev.length >= 6) {
        toast.message("You can feature up to 6 badges");
        return prev;
      }
      return [...prev, key];
    });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featuredBadges: draft }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to save badges");
        return;
      }
      toast.success("Featured badges updated");
      setOpen(false);
      await onUpdated();
    } catch {
      toast.error("Network error — could not save badges");
    } finally {
      setSaving(false);
    }
  }

  const featured = featuredKeys
    .map((k) => unlockedByKey[k])
    .filter(Boolean) as FullAchievement[];

  return (
    <Card className="p-4 sm:p-6">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" />
              Featured badges
            </CardTitle>
            <CardDescription className="mt-1">
              {featured.length > 0
                ? "The achievements this coder is most proud of."
                : isOwn
                  ? "Pick up to 6 unlocked achievements to showcase on your profile."
                  : "No badges featured yet."}
            </CardDescription>
          </div>
          {isOwn && (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Select badges
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {featured.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center">
            <Star className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {isOwn
                ? unlockedForSelection.length === 0
                  ? "Solve challenges to unlock achievements, then feature them here."
                  : "Click “Select badges” to feature your unlocked achievements."
                : "No featured badges to show."}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {featured.map((a) => {
              const styles = rarityStyles(a.rarity);
              const Icon = resolveAchievementIcon(a.icon);
              return (
                <Tooltip key={a.id}>
                  <TooltipTrigger asChild>
                    <div className="shrink-0 w-28 rounded-xl border border-border/60 bg-muted/20 p-3 text-center cursor-default hover:shadow-sm transition-shadow">
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
                      <div
                        className={cn(
                          "text-[10px] mt-1 uppercase tracking-wide font-medium",
                          styles.label,
                        )}
                      >
                        {a.rarity}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[220px] text-xs">
                    <div className="font-semibold">{a.name}</div>
                    <div className="opacity-90 mt-0.5">{a.description}</div>
                    {a.xpReward > 0 && <div className="opacity-75 mt-1">+{a.xpReward} XP</div>}
                    {a.unlockedAt && (
                      <div className="opacity-75">Unlocked {relativeTime(a.unlockedAt)}</div>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </CardContent>

      {/* Selection dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Featured badges</DialogTitle>
            <DialogDescription>
              Choose up to 6 unlocked achievements to display on your profile. Selected:{" "}
              <span className="font-semibold text-foreground">{draft.length}</span> / 6
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[50vh] overflow-y-auto custom-scrollbar -mx-1 px-1">
            {unlockedForSelection.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <Award className="h-6 w-6 mx-auto mb-2 opacity-60" />
                Solve challenges to unlock achievements first.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {unlockedForSelection.map((a) => {
                  const styles = rarityStyles(a.rarity);
                  const Icon = resolveAchievementIcon(a.icon);
                  const checked = draft.includes(a.key);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggle(a.key)}
                      className={cn(
                        "flex items-start gap-2.5 rounded-xl border p-3 text-left transition-colors",
                        checked
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border/60 bg-muted/20 hover:bg-muted/40",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        className="mt-0.5 pointer-events-none"
                        tabIndex={-1}
                        aria-hidden
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "h-7 w-7 rounded-full flex items-center justify-center ring-1.5 shrink-0",
                              styles.ring,
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="text-xs font-semibold leading-tight line-clamp-1">
                            {a.name}
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                          {a.description}
                        </div>
                        <div className={cn("text-[10px] mt-1 uppercase font-medium", styles.label)}>
                          {a.rarity}
                          {a.xpReward > 0 && ` · +${a.xpReward} XP`}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost" disabled={saving}>
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={save} disabled={saving || unlockedForSelection.length === 0}>
              {saving ? "Saving…" : "Save featured"}
              {!saving && <Save className="h-4 w-4 ml-1.5" />}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Contribution calendar (52 weeks)
// ---------------------------------------------------------------------------
function ContributionCalendar({ data }: { data: Record<string, number> }) {
  const grid = useMemo(() => {
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayIdx = (todayMid.getDay() + 6) % 7;
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
                const count = isFuture ? 0 : data?.[key] || 0;
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
                        ? key
                        : `${count} submission${count === 1 ? "" : "s"} · ${key}`}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>
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
// Performance chart (recharts bar — submissions per week, last 12 weeks)
// ---------------------------------------------------------------------------
function PerformanceChart({
  data,
}: {
  data: { week: string; label: string; submissions: number; solved: number }[];
}) {
  const anyActivity = data.some((d) => d.submissions > 0);
  if (!anyActivity) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center h-[240px] flex flex-col items-center justify-center">
        <TrendingUp className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          No submissions yet — your weekly activity will appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="h-[240px] w-full -ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "currentColor" }}
            tickLine={false}
            axisLine={{ stroke: "currentColor", strokeOpacity: 0.2 }}
            className="text-muted-foreground"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "currentColor" }}
            tickLine={false}
            axisLine={false}
            className="text-muted-foreground"
            width={28}
          />
          <RTooltip
            cursor={{ fill: "var(--muted)", fillOpacity: 0.3 }}
            contentStyle={{
              backgroundColor: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
              color: "var(--foreground)",
            }}
            labelStyle={{ color: "var(--foreground)", fontWeight: 600 }}
          />
          <Bar dataKey="submissions" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.solved > 0 ? "var(--brand)" : "color-mix(in oklch, var(--brand) 40%, transparent)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Achievements section
// ---------------------------------------------------------------------------
function AchievementsSection({
  achList,
  progress,
  isOwn,
}: {
  achList: FullAchievement[];
  progress:
    | Record<string, { current: number; needed: number; metric: string }>
    | null;
  isOwn: boolean;
}) {
  const unlockedCount = achList.filter((a) => a.unlocked).length;

  // Sort: unlocked first, then by rarity weight, then by name
  const sorted = useMemo(() => {
    const rarityWeight: Record<string, number> = {
      legendary: 0,
      epic: 1,
      rare: 2,
      common: 3,
    };
    return [...achList].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      const ra = rarityWeight[(a.rarity || "common").toLowerCase()] ?? 9;
      const rb = rarityWeight[(b.rarity || "common").toLowerCase()] ?? 9;
      if (ra !== rb) return ra - rb;
      return a.name.localeCompare(b.name);
    });
  }, [achList]);

  return (
    <Card className="p-4 sm:p-6">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Achievements
            </CardTitle>
            <CardDescription className="mt-1">
              <span className="font-semibold text-foreground">{unlockedCount}</span>{" "}
              of {achList.length} unlocked
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {achList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center">
            <Award className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No achievements defined.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {sorted.map((a) => {
              const styles = rarityStyles(a.rarity);
              const Icon = resolveAchievementIcon(a.icon);
              const prog = progress?.[a.key];
              const showProgress =
                isOwn && !a.unlocked && prog && prog.needed > 0 && typeof prog.current === "number";
              const pct = showProgress
                ? Math.min(100, Math.round((prog!.current / prog!.needed) * 100))
                : 0;
              return (
                <div
                  key={a.id}
                  className={cn(
                    "relative rounded-xl border p-3 transition-shadow hover:shadow-sm",
                    a.unlocked
                      ? cn("bg-muted/20", styles.border)
                      : "bg-muted/10 border-border/60",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center ring-2 shrink-0 relative",
                        a.unlocked
                          ? styles.ring
                          : "bg-muted text-muted-foreground ring-border/60 grayscale",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {!a.unlocked && (
                        <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-background flex items-center justify-center border border-border">
                          <Lock className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "text-xs font-semibold leading-tight line-clamp-1",
                          !a.unlocked && "text-muted-foreground",
                        )}
                      >
                        {a.name}
                      </div>
                      <div
                        className={cn(
                          "text-[10px] mt-0.5 uppercase tracking-wide font-medium",
                          a.unlocked ? styles.label : "text-muted-foreground/70",
                        )}
                      >
                        {a.rarity}
                        {a.xpReward > 0 && ` · +${a.xpReward} XP`}
                      </div>
                    </div>
                  </div>
                  <p
                    className={cn(
                      "text-[11px] mt-2 leading-snug line-clamp-2",
                      a.unlocked ? "text-muted-foreground" : "text-muted-foreground/60",
                    )}
                  >
                    {a.description}
                  </p>
                  {a.unlocked && a.unlockedAt ? (
                    <div className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      Unlocked {relativeTime(a.unlockedAt)}
                    </div>
                  ) : showProgress ? (
                    <div className="mt-1.5">
                      <Progress value={pct} className="h-1.5" />
                      <div className="text-[10px] text-muted-foreground mt-1 flex items-center justify-between">
                        <span>{prog!.metric.replace(/_/g, " ")}</span>
                        <span className="font-medium">
                          {prog!.current} / {prog!.needed}
                        </span>
                      </div>
                    </div>
                  ) : !a.unlocked ? (
                    <div className="text-[10px] text-muted-foreground/60 mt-1.5 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      {isOwn ? "In progress — keep going!" : "Locked"}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Certificates section
// ---------------------------------------------------------------------------
function CertificatesSection({ certificates }: { certificates: CertificateItem[] }) {
  return (
    <Card className="p-4 sm:p-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <Medal className="h-4 w-4 text-primary" />
          Certificates
        </CardTitle>
        <CardDescription className="mt-1">
          {certificates.length > 0
            ? "Earned level certificates — each is verifiable via its unique cert id."
            : "No certificates earned yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {certificates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center">
            <ScrollText className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Reach a new tier (Beginner → Intermediate → Advanced → Pro) to earn your first certificate.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {certificates.map((c) => (
              <div
                key={c.id}
                className="relative rounded-xl border border-border/60 bg-gradient-to-br from-primary/5 to-transparent p-4 overflow-hidden"
              >
                <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full blur-2xl opacity-40 bg-primary/20" />
                <div className="relative">
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="secondary"
                      className="bg-primary/10 text-primary border-primary/20"
                    >
                      <TrophyIcon className="h-3 w-3 mr-1" />
                      {c.level}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Tier {c.tierLevel}
                    </span>
                  </div>
                  <div className="mt-3 text-sm font-semibold">{c.studentName}</div>
                  <div className="text-xs text-muted-foreground font-mono">{c.studentUid}</div>
                  <div className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Issued {(() => {
                      try {
                        return format(parseISO(c.issuedAt), "MMM d, yyyy");
                      } catch {
                        return "—";
                      }
                    })()}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono mt-1 truncate">
                    ID: {c.certId}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button asChild size="sm" variant="default" className="flex-1 h-8 text-xs">
                      <Link href={`/certificates?uid=${encodeURIComponent(c.studentUid)}&cert=${c.certId}`}>
                        <Download className="h-3.5 w-3.5 mr-1" />
                        View / Download
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Timeline section
// ---------------------------------------------------------------------------
function TimelineSection({ timeline }: { timeline: TimelineItem[] }) {
  return (
    <Card className="p-4 sm:p-6 h-full">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="flex items-center gap-2">
          <ActivityIcon className="h-4 w-4 text-primary" />
          Activity timeline
        </CardTitle>
        <CardDescription className="mt-1">
          Recent events on this profile.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        {timeline.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center">
            <ActivityIcon className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Activity will appear here once submissions start coming in.
            </p>
          </div>
        ) : (
          <div className="relative max-h-[28rem] overflow-y-auto custom-scrollbar pl-1">
            <div
              className="absolute left-[15px] top-2 bottom-2 w-px bg-border/60"
              aria-hidden
            />
            <ol className="space-y-1">
              {timeline.slice(0, 30).map((t) => {
                const { Icon, color } = activityIcon(t.type);
                return (
                  <li key={t.id} className="relative flex gap-3 pb-4 last:pb-0">
                    <div
                      className={cn(
                        "relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ring-2 ring-background",
                        color,
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 pt-0.5">
                      <div className="text-sm leading-snug">{t.description}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                        <Clock className="h-3 w-3" />
                        {relativeTime(t.createdAt)}
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
// Challenge history table
// ---------------------------------------------------------------------------
function ChallengeHistory({ submissions }: { submissions: SubmissionItem[] }) {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filtered = useMemo(() => {
    if (statusFilter === "all") return submissions;
    if (statusFilter === "passed") return submissions.filter((s) => s.passedAll);
    if (statusFilter === "failed") return submissions.filter((s) => !s.passedAll);
    return submissions;
  }, [submissions, statusFilter]);

  return (
    <Card className="p-4 sm:p-6 h-full">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-4 w-4 text-primary" />
              Challenge history
            </CardTitle>
            <CardDescription className="mt-1">
              {submissions.length > 0
                ? `${submissions.length} submission${submissions.length === 1 ? "" : "s"} recorded.`
                : "No submissions yet."}
            </CardDescription>
          </div>
          {submissions.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              {[
                { key: "all", label: "All" },
                { key: "passed", label: "Passed" },
                { key: "failed", label: "Failed" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setStatusFilter(opt.key)}
                  className={cn(
                    "px-2.5 py-1 rounded-md font-medium transition-colors",
                    statusFilter === opt.key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center">
            <Code2 className="h-5 w-5 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {submissions.length === 0
                ? "Submit your first solution to start building a history."
                : "No submissions match the current filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar -mx-1 px-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Challenge</TableHead>
                  <TableHead className="hidden sm:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Lang</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Attempt</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="hidden md:table-cell text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 50).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/challenges/${s.challengeSlug}`}
                        className="text-foreground hover:text-primary transition-colors"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="line-clamp-1">{s.challengeTitle}</span>
                          <span className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className={cn("text-[10px] px-1.5 py-0", difficultyColor(s.difficulty))}
                            >
                              {s.difficulty}
                            </Badge>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {s.category}
                            </Badge>
                          </span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className={cn("text-[11px] font-medium", submissionStatusColor(s.status))}
                      >
                        {s.passedAll && <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {s.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <span className="font-mono text-[11px] uppercase text-muted-foreground">
                        {s.language}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-xs text-muted-foreground">
                      #{s.attemptNumber}
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          "text-xs font-semibold tabular-nums",
                          s.xpAwarded > 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {s.xpAwarded > 0 ? `+${s.xpAwarded}` : "—"}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right text-xs text-muted-foreground whitespace-nowrap">
                      {relativeTime(s.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-5 sm:gap-6">
          <Skeleton className="h-[128px] w-[128px] rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-8 w-56" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-12 w-full max-w-2xl" />
            <Skeleton className="h-2.5 w-full rounded-full" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="p-4">
            <Skeleton className="h-8 w-12 mb-2" />
            <Skeleton className="h-3 w-20" />
          </Card>
        ))}
      </div>

      <Card className="p-4 sm:p-6">
        <Skeleton className="h-6 w-40 mb-3" />
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-24 rounded-xl" />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        <Card className="xl:col-span-2 p-4 sm:p-6">
          <Skeleton className="h-6 w-40 mb-4" />
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
        </Card>
        <Card className="p-4 sm:p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-[240px] w-full rounded-md" />
        </Card>
      </div>

      <Card className="p-4 sm:p-6">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="lg:col-span-1 p-4 sm:p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
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
        <Card className="lg:col-span-2 p-4 sm:p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-md" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
