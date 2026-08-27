"use client";

import { createElement, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Award,
  Code2,
  CheckCircle2,
  Zap,
  Sparkles,
  ShieldCheck,
  Trophy,
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
  Lock,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types — mirror of GET /api/achievements response
// ---------------------------------------------------------------------------
interface AchievementItem {
  id: string;
  key: string;
  name: string;
  description: string;
  rarity: string;
  icon: string;
  category: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface ProgressEntry {
  current: number;
  needed: number;
  metric: string;
}

interface AchievementsResponse {
  achievements: AchievementItem[];
  progress: Record<string, ProgressEntry> | null;
  stats: { total: number; unlocked: number };
}

type Category = "all" | "milestone" | "streak" | "speed" | "skill" | "consistency";

// ---------------------------------------------------------------------------
// Icon resolver (mirrors profile/dashboard)
// ---------------------------------------------------------------------------
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
        ring: "ring-slate-400/60 bg-slate-500/15 text-slate-600 dark:text-slate-300",
        label: "text-slate-600 dark:text-slate-300",
        border: "border-slate-500/30",
        chip: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
        dot: "bg-slate-400",
      };
    case "rare":
      return {
        ring: "ring-emerald-400/60 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
        label: "text-emerald-600 dark:text-emerald-300",
        border: "border-emerald-500/30",
        chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
        dot: "bg-emerald-400",
      };
    case "epic":
      return {
        ring: "ring-amber-400/60 bg-amber-500/15 text-amber-600 dark:text-amber-300",
        label: "text-amber-600 dark:text-amber-300",
        border: "border-amber-500/30",
        chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
        dot: "bg-amber-400",
      };
    case "legendary":
      return {
        ring: "ring-rose-400/60 bg-gradient-to-br from-amber-500/25 to-rose-500/25 text-rose-600 dark:text-rose-300",
        label: "text-rose-600 dark:text-rose-300",
        border: "border-rose-500/30",
        chip: "bg-gradient-to-br from-amber-500/20 to-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30",
        dot: "bg-gradient-to-br from-amber-400 to-rose-500",
      };
    default:
      return {
        ring: "ring-slate-400/60 bg-slate-500/15 text-slate-600 dark:text-slate-300",
        label: "text-slate-600 dark:text-slate-300",
        border: "border-slate-500/30",
        chip: "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30",
        dot: "bg-slate-400",
      };
  }
}

function rarityWeight(r: string) {
  switch ((r || "common").toLowerCase()) {
    case "legendary": return 4;
    case "epic": return 3;
    case "rare": return 2;
    case "common": return 1;
    default: return 0;
  }
}

function relativeTime(iso?: string | null): string {
  if (!iso) return "";
  try {
    return formatDistanceToNowStrict(parseISO(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

function metricLabel(metric: string): string {
  switch (metric) {
    case "solved_count": return "challenges solved";
    case "streak_days": return "day streak";
    case "longest_streak_days": return "best streak days";
    case "submission_count": return "submissions";
    case "first_attempt_solve": return "first-attempt solves";
    case "perfect_submission": return "perfect submissions";
    case "zero_warnings_solve": return "zero-warning solves";
    case "debugging_master": return "debug wins";
    case "test_crusher": return "tests crushed";
    case "consistency_king": return "consistent weeks";
    case "category_complete": return "in category";
    case "difficulty_solved": return "at difficulty";
    case "tier_reached": return "tier reached";
    case "speed_ms": return "fastest solve (ms)";
    case "first_solve": return "first solve";
    case "first_code_right": return "first code right";
    default: return metric.replace(/_/g, " ");
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AchievementsPage() {
  return (
    <AuthGuard>
      <AchievementsContent />
    </AuthGuard>
  );
}

function AchievementsContent() {
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [category, setCategory] = useState<Category>("all");

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/achievements", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load achievements");
      const json = (await res.json()) as AchievementsResponse;
      setData(json);
    } catch (err) {
      console.error(err);
      toast.error("Could not load achievements. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const handleEvaluate = async () => {
    setEvaluating(true);
    try {
      // The actual API route is POST /api/achievements (no separate /evaluate path exists);
      // it re-runs the achievement evaluator and returns { unlocked: [...] }.
      const res = await fetch("/api/achievements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Evaluate failed");
      const json = await res.json();
      const unlockedCount = Array.isArray(json?.unlocked) ? json.unlocked.length : 0;
      if (unlockedCount > 0) {
        toast.success(`Unlocked ${unlockedCount} new achievement${unlockedCount === 1 ? "" : "s"}!`);
      } else {
        toast.info("Re-evaluated. No new achievements unlocked — keep going!");
      }
      await fetchAchievements();
    } catch (err) {
      console.error(err);
      toast.error("Could not re-evaluate achievements. Try again later.");
    } finally {
      setEvaluating(false);
    }
  };

  const sortedAchievements = useMemo(() => {
    const all = data?.achievements || [];
    return [...all].sort((a, b) => {
      // Unlocked first
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      // Then rarity desc
      const r = rarityWeight(b.rarity) - rarityWeight(a.rarity);
      if (r !== 0) return r;
      // Then XP desc
      if (b.xpReward !== a.xpReward) return b.xpReward - a.xpReward;
      // Then by name
      return a.name.localeCompare(b.name);
    });
  }, [data]);

  const filtered = useMemo(() => {
    if (category === "all") return sortedAchievements;
    return sortedAchievements.filter((a) => a.category === category);
  }, [sortedAchievements, category]);

  const stats = data?.stats || { total: 0, unlocked: 0 };
  const progressPct =
    stats.total > 0 ? Math.round((stats.unlocked / stats.total) * 100) : 0;

  return (
    <TooltipProvider delayDuration={120}>
      <div className="space-y-6">
        {/* Page header */}
        <PageHeader />

        {/* Progress + evaluate */}
        <Card className="relative overflow-hidden border-primary/30">
          <div className="absolute inset-0 opacity-20 brand-gradient pointer-events-none" />
          <CardContent className="relative p-5 sm:p-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-3 w-full" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-9 w-32 rounded-lg" />
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold">Achievement progress</h2>
                      <Badge className="bg-primary/10 text-primary border-primary/30 gap-1">
                        <Trophy className="h-3 w-3" /> {stats.unlocked} / {stats.total}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      You&apos;ve unlocked {stats.unlocked} of {stats.total}{" "}
                      achievements — {progressPct}% complete.
                    </p>
                  </div>
                  <Button
                    onClick={handleEvaluate}
                    disabled={evaluating}
                    className="gap-2"
                    variant="default"
                  >
                    {evaluating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    {evaluating ? "Evaluating…" : "Evaluate"}
                  </Button>
                </div>
                <div className="mt-4">
                  <Progress value={progressPct} className="h-3" />
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-1.5">
                    <span>{stats.unlocked} unlocked</span>
                    <span>{stats.total - stats.unlocked} remaining</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Category filter */}
        <Tabs
          value={category}
          onValueChange={(v) => setCategory(v as Category)}
        >
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="milestone">Milestone</TabsTrigger>
            <TabsTrigger value="streak">Streak</TabsTrigger>
            <TabsTrigger value="speed">Speed</TabsTrigger>
            <TabsTrigger value="skill">Skill</TabsTrigger>
            <TabsTrigger value="consistency">Consistency</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Rarity legend */}
        <RarityLegend />

        {/* Achievement grid */}
        {loading ? (
          <AchievementGridSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((a, i) => (
              <AchievementCard
                key={a.id}
                achievement={a}
                progress={data?.progress?.[a.key] || null}
                delay={Math.min(i * 0.025, 0.4)}
              />
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------
function PageHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3">
        <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground shadow-sm">
          <Award className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Achievements
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Unlock badges by hitting milestones, keeping streaks, solving fast,
            and crushing difficulty tiers.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Rarity legend
// ---------------------------------------------------------------------------
function RarityLegend() {
  const items = [
    { rarity: "common", label: "Common" },
    { rarity: "rare", label: "Rare" },
    { rarity: "epic", label: "Epic" },
    { rarity: "legendary", label: "Legendary" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <span className="text-muted-foreground font-medium">Rarity:</span>
      {items.map((it) => {
        const s = rarityStyles(it.rarity);
        return (
          <span
            key={it.rarity}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium",
              s.chip,
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", s.dot)} />
            {it.label}
          </span>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Achievement card
// ---------------------------------------------------------------------------
function AchievementIconRender({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = resolveAchievementIcon(name);
  return createElement(Icon, { className });
}

function AchievementCard({
  achievement,
  progress,
  delay,
}: {
  achievement: AchievementItem;
  progress: ProgressEntry | null;
  delay: number;
}) {
  const s = rarityStyles(achievement.rarity);
  const unlocked = achievement.unlocked;
  const pct =
    progress && progress.needed > 0
      ? Math.min(100, Math.round((progress.current / progress.needed) * 100))
      : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card
        className={cn(
          "relative h-full overflow-hidden transition-all",
          unlocked ? cn("hover:shadow-md", s.border) : "opacity-60",
        )}
      >
        {unlocked && (
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-1",
              achievement.rarity === "legendary"
                ? "bg-gradient-to-r from-amber-500 via-rose-500 to-amber-500"
                : achievement.rarity === "epic"
                ? "bg-amber-400"
                : achievement.rarity === "rare"
                ? "bg-emerald-400"
                : "bg-slate-300",
            )}
          />
        )}
        <CardContent className="p-4 sm:p-5 flex flex-col gap-3 h-full">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                "relative h-14 w-14 rounded-full ring-2 flex items-center justify-center shrink-0",
                s.ring,
                !unlocked && "grayscale",
              )}
            >
              <AchievementIconRender name={achievement.icon} className="h-6 w-6" />
              {!unlocked && (
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-background border border-border flex items-center justify-center">
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-sm leading-tight truncate">
                  {achievement.name}
                </h3>
              </div>
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wide font-bold",
                    s.label,
                  )}
                >
                  {achievement.rarity}
                </span>
                <span className="text-muted-foreground text-[10px]">·</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {achievement.category}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground line-clamp-3">
            {achievement.description}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-[11px]">
              <Zap className="h-3 w-3" />
              +{achievement.xpReward} XP
            </Badge>
            {unlocked ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[11px]">
                <CheckCircle2 className="h-3 w-3" /> Unlocked
              </Badge>
            ) : (
              <Badge className="bg-muted text-muted-foreground border-border gap-1 text-[11px]">
                <Lock className="h-3 w-3" /> Locked
              </Badge>
            )}
          </div>

          {/* Footer */}
          {unlocked ? (
            <div className="mt-auto pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
              Unlocked {relativeTime(achievement.unlockedAt)}
            </div>
          ) : progress && progress.needed > 0 ? (
            <div className="mt-auto pt-2 border-t border-border/60">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-muted-foreground capitalize">
                  {metricLabel(progress.metric)}
                </span>
                <span className="font-mono font-semibold">
                  {Math.min(progress.current, progress.needed)} / {progress.needed}
                </span>
              </div>
              <Progress value={pct} className="h-1.5" />
            </div>
          ) : (
            <div className="mt-auto pt-2 border-t border-border/60 text-[11px] text-muted-foreground flex items-center gap-1">
              <Lock className="h-3 w-3" /> In progress — keep going!
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="py-16 flex flex-col items-center justify-center gap-3 text-center">
        <div className="rounded-full bg-amber-500/10 p-4 text-amber-600 dark:text-amber-300">
          <Award className="h-8 w-8" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">No achievements yet</p>
          <p className="text-sm text-muted-foreground max-w-md">
            Start solving challenges to unlock your first one! Achievements
            appear here as you hit milestones, streaks, speed, and skill goals.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------
function AchievementGridSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden">
        <CardContent className="p-6 space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-full" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
