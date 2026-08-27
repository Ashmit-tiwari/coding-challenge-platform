"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Sparkles,
  Zap,
  Clock,
  Cpu,
  Trophy,
  Flame,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  Calendar,
  Users,
  CheckCircle2,
  CircleSlash,
  Code2,
  Play,
  Star,
  ChevronRight,
} from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types — mirror of /api/challenges + /api/challenges/weekly
// ---------------------------------------------------------------------------
interface ChallengeListItem {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  difficulty: string;
  category: string;
  topic?: string | null;
  xpReward: number;
  targetYear?: string | null;
  isWeekly: boolean;
  weekLabel?: string | null;
  weekStartsAt?: string | null;
  weekEndsAt?: string | null;
  timeLimitMs: number;
  memoryLimitMb: number;
  languages: string[];
  createdAt: string;
  testCasesCount: number;
  submissionsCount: number;
  userState: { solved: boolean; attempted: boolean; attempts: number } | null;
}

interface WeeklyChallenge {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  category: string;
  xpReward: number;
  weekLabel?: string | null;
  weekStartsAt?: string | null;
  weekEndsAt?: string | null;
  description?: string | null;
  participationCount: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DIFFICULTIES = [
  { value: "Easy", label: "Easy" },
  { value: "Medium", label: "Medium" },
  { value: "Hard", label: "Hard" },
  { value: "Expert", label: "Expert" },
];

const CATEGORIES = [
  "Python",
  "C++",
  "DSA",
  "Algorithms",
  "SQL",
  "AI",
  "ML",
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "solved", label: "Most solved" },
  { value: "xp", label: "XP high → low" },
];

const LANG_ICONS: Record<string, string> = {
  python: "🐍",
  cpp: "⚙️",
  javascript: "✨",
};

const LANG_LABELS: Record<string, string> = {
  python: "Python 3",
  cpp: "C++ 17",
  javascript: "JavaScript",
};

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

function categoryColor(c?: string) {
  switch ((c || "").toLowerCase()) {
    case "python":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "c++":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "dsa":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "algorithms":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300";
    case "sql":
      return "bg-teal-500/10 text-teal-700 dark:text-teal-300";
    case "ai":
    case "ai/ml":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "ml":
      return "bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function formatMs(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
  return `${ms}ms`;
}

function formatDateShort(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

// Live countdown — ticks every second, displays "Xd Yh Zm Ws" (compact)
function useCountdown(target?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (!isFinite(ms) || ms <= 0) return { ended: true, label: "Ended", d: 0, h: 0, m: 0, s: 0 };
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  parts.push(`${h}h`);
  parts.push(`${m}m`);
  parts.push(`${s}s`);
  return { ended: false, label: parts.join(" "), d, h, m, s };
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ChallengesPage() {
  return (
    <AuthGuard>
      <ChallengesExplorer />
    </AuthGuard>
  );
}

function ChallengesExplorer() {
  const [loading, setLoading] = useState(true);
  const [weekly, setWeekly] = useState<WeeklyChallenge | null>(null);
  const [challenges, setChallenges] = useState<ChallengeListItem[]>([]);
  const [total, setTotal] = useState(0);

  // Filters
  const [q, setQ] = useState("");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");
  const [year, setYear] = useState<string>("all");
  const [weeklyOnly, setWeeklyOnly] = useState(false);
  const [sort, setSort] = useState<string>("newest");

  // Pagination — cap rendering
  const [visibleCount, setVisibleCount] = useState(24);
  const RENDER_CAP = 60;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (difficulty !== "all") params.set("difficulty", difficulty);
      if (category !== "all") params.set("category", category);
      if (year !== "all") params.set("year", year);
      if (weeklyOnly) params.set("weekly", "true");
      if (q.trim()) params.set("q", q.trim());
      const [weeklyRes, listRes] = await Promise.all([
        fetch("/api/challenges/weekly", { cache: "no-store" }),
        fetch(`/api/challenges?${params.toString()}`, { cache: "no-store" }),
      ]);
      if (weeklyRes.ok) {
        const wd = await weeklyRes.json();
        setWeekly(wd.weekly || null);
      }
      if (listRes.ok) {
        const ld = await listRes.json();
        setChallenges(ld.challenges || []);
        setTotal(ld.total || 0);
      } else {
        toast.error("Failed to load challenges");
      }
    } catch (e) {
      toast.error("Network error — please retry");
    } finally {
      setLoading(false);
      setVisibleCount(24);
    }
  }, [q, difficulty, category, year, weeklyOnly]);

  // Debounce search input
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(() => {
      if (cancelled) return;
      fetchAll();
    }, q ? 350 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, difficulty, category, year, weeklyOnly]);

  // Sorted view
  const sortedChallenges = useMemo(() => {
    const arr = [...challenges];
    if (sort === "solved") {
      arr.sort((a, b) => (b.submissionsCount || 0) - (a.submissionsCount || 0));
    } else if (sort === "xp") {
      arr.sort((a, b) => (b.xpReward || 0) - (a.xpReward || 0));
    } else {
      arr.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return arr;
  }, [challenges, sort]);

  const visibleChallenges = sortedChallenges.slice(0, visibleCount);

  // Stats for filter bar
  const stats = useMemo(() => {
    let solved = 0,
      attempted = 0,
      unattempted = 0;
    for (const c of challenges) {
      if (c.userState?.solved) solved++;
      else if (c.userState?.attempted) attempted++;
      else unattempted++;
    }
    return { solved, attempted, unattempted, total: challenges.length };
  }, [challenges]);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Coding <span className="text-brand-gradient">Challenges</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sharpen your skills across Python, C++, DSA, SQL, and AI/ML. Solve weekly challenges for bonus XP and climb the leaderboard.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAll}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
        </header>

        {/* Weekly hero */}
        <WeeklyHero weekly={weekly} loading={loading} />

        {/* Filter bar — sticky under nav */}
        <div className="sticky top-16 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b border-border/60">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by title, description, category, topic…"
                  className="pl-9"
                  aria-label="Search challenges"
                />
              </div>

              {/* Selects */}
              <div className="flex flex-wrap items-center gap-2">
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger size="sm" className="w-[130px]">
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All difficulties</SelectItem>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger size="sm" className="w-[130px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger size="sm" className="w-[130px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    <SelectItem value="1">First Year</SelectItem>
                    <SelectItem value="2">Second Year</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger size="sm" className="w-[150px]">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Weekly only toggle */}
                <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 h-9">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <label htmlFor="weeklyOnly" className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                        Weekly only
                      </label>
                    </TooltipTrigger>
                    <TooltipContent>Show only featured weekly challenges</TooltipContent>
                  </Tooltip>
                  <Switch
                    id="weeklyOnly"
                    checked={weeklyOnly}
                    onCheckedChange={setWeeklyOnly}
                    aria-label="Weekly only"
                  />
                </div>
              </div>
            </div>

            {/* Counts row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Filter className="h-3 w-3" />
                <span className="font-semibold text-foreground">{stats.total}</span>
                <span>matching</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="font-semibold text-foreground">{stats.solved}</span>
                <span>solved</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Flame className="h-3 w-3 text-amber-500" />
                <span className="font-semibold text-foreground">{stats.attempted}</span>
                <span>attempted</span>
              </span>
              <span className="flex items-center gap-1.5">
                <CircleSlash className="h-3 w-3 text-muted-foreground" />
                <span className="font-semibold text-foreground">{stats.unattempted}</span>
                <span>new</span>
              </span>
            </div>
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <ChallengeGridSkeleton />
        ) : visibleChallenges.length === 0 ? (
          <EmptyState onReset={() => {
            setQ("");
            setDifficulty("all");
            setCategory("all");
            setYear("all");
            setWeeklyOnly(false);
            setSort("newest");
          }} />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {visibleChallenges.map((c, i) => (
                <ChallengeCard key={c.id} c={c} index={i} />
              ))}
            </div>

            {/* Load more / pagination */}
            {sortedChallenges.length > visibleCount && visibleCount < RENDER_CAP && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    setVisibleCount((v) => Math.min(v + 24, RENDER_CAP))
                  }
                  className="gap-2"
                >
                  Load more
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            {sortedChallenges.length > RENDER_CAP && (
              <p className="text-center text-xs text-muted-foreground">
                Showing first {RENDER_CAP} of {sortedChallenges.length} matching challenges. Refine filters to narrow results.
              </p>
            )}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Weekly hero
// ---------------------------------------------------------------------------
function WeeklyHero({ weekly, loading }: { weekly: WeeklyChallenge | null; loading: boolean }) {
  const countdown = useCountdown(weekly?.weekEndsAt);

  if (loading) {
    return (
      <Card className="overflow-hidden border-0 brand-gradient text-brand-foreground">
        <div className="h-44 sm:h-56 animate-pulse" />
      </Card>
    );
  }

  if (!weekly) {
    return (
      <Card className="overflow-hidden border-dashed">
        <CardContent className="flex flex-col sm:flex-row items-center gap-4 p-6 text-center sm:text-left">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center shrink-0">
            <Calendar className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-lg">No active weekly challenge</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Check back soon — a fresh weekly challenge drops every Monday with bonus XP and leaderboard glory.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/leaderboard">View leaderboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden border-0 brand-gradient text-brand-foreground">
        {/* Decorative blurs */}
        <div className="absolute -top-20 -right-10 w-72 h-72 rounded-full bg-white/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-10 w-72 h-72 rounded-full bg-amber-300/20 blur-3xl pointer-events-none" />
        <CardContent className="relative p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge className="bg-white/15 text-brand-foreground border-white/20 backdrop-blur">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Weekly Challenge
                </Badge>
                {weekly.weekLabel && (
                  <Badge className="bg-white/10 text-brand-foreground border-white/20">
                    <Calendar className="h-3 w-3 mr-1" />
                    {weekly.weekLabel}
                  </Badge>
                )}
                <Badge className="bg-white/15 text-brand-foreground border-white/20">
                  <Zap className="h-3 w-3 mr-1" />
                  +{weekly.xpReward} XP
                </Badge>
                <Badge className="bg-white/10 text-brand-foreground border-white/20">
                  {weekly.category}
                </Badge>
                <Badge className="bg-white/10 text-brand-foreground border-white/20">
                  {weekly.difficulty}
                </Badge>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {weekly.title}
              </h2>
              {weekly.description && (
                <p className="text-sm sm:text-base text-brand-foreground/85 mt-2 line-clamp-2 max-w-2xl">
                  {weekly.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  <span className="font-semibold">{weekly.participationCount}</span>
                  <span className="text-brand-foreground/75">participating</span>
                </span>
                {weekly.weekStartsAt && weekly.weekEndsAt && (
                  <span className="flex items-center gap-1.5 text-brand-foreground/85">
                    <Calendar className="h-4 w-4" />
                    {formatDateShort(weekly.weekStartsAt)} – {formatDateShort(weekly.weekEndsAt)}
                  </span>
                )}
              </div>
            </div>

            {/* Countdown + CTA */}
            <div className="lg:w-72 shrink-0">
              <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-brand-foreground/75 mb-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Time remaining
                </div>
                {countdown?.ended ? (
                  <div className="text-xl font-mono font-semibold">
                    Challenge ended
                  </div>
                ) : countdown ? (
                  <div className="flex items-baseline gap-1 font-mono font-semibold">
                    {countdown.d > 0 && (
                      <span className="text-2xl sm:text-3xl tabular-nums">{countdown.d}<span className="text-sm text-brand-foreground/70 ml-0.5 mr-1">d</span></span>
                    )}
                    <span className="text-2xl sm:text-3xl tabular-nums">{String(countdown.h).padStart(2, "0")}<span className="text-sm text-brand-foreground/70 ml-0.5 mr-1">h</span></span>
                    <span className="text-2xl sm:text-3xl tabular-nums">{String(countdown.m).padStart(2, "0")}<span className="text-sm text-brand-foreground/70 ml-0.5 mr-1">m</span></span>
                    <span className="text-xl tabular-nums text-brand-foreground/80">{String(countdown.s).padStart(2, "0")}<span className="text-sm ml-0.5">s</span></span>
                  </div>
                ) : null}
                <Button
                  asChild
                  size="sm"
                  className="mt-4 w-full bg-white text-primary hover:bg-white/90"
                >
                  <Link href={`/challenges/${weekly.slug}`}>
                    <Play className="h-4 w-4 mr-1.5" />
                    Start challenge
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Challenge card
// ---------------------------------------------------------------------------
function ChallengeCard({ c, index }: { c: ChallengeListItem; index: number }) {
  const status = c.userState;
  const statusPill = status?.solved
    ? { label: "Solved", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: CheckCircle2 }
    : status?.attempted
      ? { label: "Attempted", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30", icon: Flame }
      : { label: "New", cls: "bg-muted text-muted-foreground border-border", icon: CircleSlash };

  const StatusIcon = statusPill.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.2) }}
    >
      <Link href={`/challenges/${c.slug}`} className="block h-full group">
        <Card className="h-full transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary/40 hover:ring-1 hover:ring-primary/20 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  <Badge variant="outline" className={cn("text-[10px]", difficultyColor(c.difficulty))}>
                    {c.difficulty}
                  </Badge>
                  {c.isWeekly && (
                    <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                      <Sparkles className="h-3 w-3 mr-0.5" />
                      Weekly
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-base font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                  {c.title}
                </CardTitle>
              </div>
              <Badge variant="outline" className={cn("shrink-0 text-[10px]", statusPill.cls)}>
                <StatusIcon className="h-3 w-3 mr-0.5" />
                {statusPill.label}
              </Badge>
            </div>
            {c.description ? (
              <CardDescription className="text-xs line-clamp-2 mt-1.5">
                {c.description}
              </CardDescription>
            ) : (
              <CardDescription className="text-xs mt-1.5 italic">
                {c.topic || c.category}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="pb-3 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              <Badge variant="secondary" className={cn("text-[10px]", categoryColor(c.category))}>
                {c.category}
              </Badge>
              {c.topic && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  {c.topic}
                </Badge>
              )}
              {c.targetYear && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Y{c.targetYear}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <div>
                  <div className="font-semibold">{c.xpReward}</div>
                  <div className="text-[10px] text-muted-foreground">XP</div>
                </div>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5">
                    <Clock className="h-3.5 w-3.5 text-emerald-500" />
                    <div>
                      <div className="font-semibold">{formatMs(c.timeLimitMs)}</div>
                      <div className="text-[10px] text-muted-foreground">time</div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Time limit per test case</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5">
                    <Cpu className="h-3.5 w-3.5 text-violet-500" />
                    <div>
                      <div className="font-semibold">{c.memoryLimitMb}MB</div>
                      <div className="text-[10px] text-muted-foreground">mem</div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Memory limit</TooltipContent>
              </Tooltip>
            </div>
          </CardContent>

          <CardFooter className="pt-0 border-t border-border/40 mt-auto">
            <div className="flex items-center justify-between w-full pt-3">
              <div className="flex items-center gap-1">
                {c.languages.length > 0 ? (
                  c.languages.map((l) => (
                    <Tooltip key={l}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-muted px-1 text-xs font-mono font-semibold">
                          {LANG_ICONS[l] || l[0]?.toUpperCase()}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{LANG_LABELS[l] || l}</TooltipContent>
                    </Tooltip>
                  ))
                ) : (
                  <span className="text-[10px] text-muted-foreground">No language restrictions</span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Trophy className="h-3 w-3" />
                <span className="font-medium">{c.submissionsCount}</span>
                <span className="hidden sm:inline">submissions</span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center text-center py-16 px-6">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Search className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold text-lg">No challenges found</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md">
          Try adjusting your filters — maybe loosen the difficulty, clear the search box, or expand the category selection.
        </p>
        <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={onReset}>
          <Filter className="h-4 w-4" />
          Reset filters
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function ChallengeGridSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-44 sm:h-56 rounded-2xl" />
      <div className="h-16 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {Array.from({ length: 9 }).map((_, i) => (
          <Card key={i} className="flex flex-col">
            <CardHeader className="pb-3">
              <Skeleton className="h-5 w-16 mb-2" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full mt-2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-1/2 mb-3" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-6 w-full mt-2" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
