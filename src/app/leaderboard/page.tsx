"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Trophy,
  Flame,
  Crown,
  Medal,
  Zap,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  Star,
  Code2,
  CheckCircle2,
  ShieldCheck,
  Gauge,
  Bug,
  Calendar,
  Hammer,
  Binary,
  Mountain,
  Award,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import { AvatarSvg } from "@/components/avatar-svg";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store";

// ---------------------------------------------------------------------------
// Types — mirrors of GET /api/leaderboard response
// ---------------------------------------------------------------------------
interface AchievementChip {
  key: string;
  icon: string;
  rarity: string;
  name: string;
}

interface LeaderboardRow {
  rank: number;
  id: string;
  uid: string;
  name: string;
  year: string;
  avatar: Record<string, string>;
  xp: number;
  level: number;
  levelName: string;
  solvedCount: number;
  currentStreak: number;
  longestStreak: number;
  achievements: AchievementChip[];
  isMe: boolean;
}

interface HallOfFameEntry {
  id?: string;
  weekLabel: string;
  year?: string;
  rank?: number;
  title?: string;
  adminNote?: string | null;
  createdAt?: string;
  challenge?: { title: string; slug: string } | null;
  user: {
    id: string;
    uid: string;
    name: string;
    year: string;
    avatar: Record<string, string>;
  };
}

type Scope = "overall" | "year1" | "year2";
type Period = "all" | "weekly" | "monthly";
type Movement = "up" | "down" | "same" | "new";

interface LeaderboardData {
  leaderboard: LeaderboardRow[];
  scope: Scope;
  period: Period;
  myMovement: Movement;
  hallOfFame: HallOfFameEntry[];
}

// ---------------------------------------------------------------------------
// Shared icon resolvers (mirrors profile/dashboard conventions)
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

function rarityRing(rarity: string): string {
  switch ((rarity || "common").toLowerCase()) {
    case "common":
      return "ring-slate-400/60 bg-slate-500/10 text-slate-600 dark:text-slate-300";
    case "rare":
      return "ring-emerald-400/60 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
    case "epic":
      return "ring-amber-400/60 bg-amber-500/10 text-amber-600 dark:text-amber-300";
    case "legendary":
      return "ring-rose-400/60 bg-gradient-to-br from-amber-500/20 to-rose-500/20 text-rose-600 dark:text-rose-300";
    default:
      return "ring-slate-400/60 bg-slate-500/10 text-slate-600 dark:text-slate-300";
  }
}

function yearLabel(year?: string) {
  if (year === "1") return "First Year";
  if (year === "2") return "Second Year";
  return year || "—";
}

function yearBadgeClass(year?: string) {
  if (year === "1")
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
  if (year === "2")
    return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function LeaderboardPage() {
  return (
    <AuthGuard>
      <LeaderboardContent />
    </AuthGuard>
  );
}

function LeaderboardContent() {
  const { student } = useAuth();
  const [scope, setScope] = useState<Scope>("overall");
  const [period, setPeriod] = useState<Period>("all");
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (s: Scope, p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/leaderboard?scope=${s}&period=${p}&limit=50`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("Failed to load leaderboard");
      const json = await res.json();
      setData(json as LeaderboardData);
    } catch (err) {
      console.error(err);
      toast.error("Could not load the leaderboard. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(scope, period);
  }, [scope, period, fetchData]);

  const myRow = useMemo(
    () => (data?.leaderboard || []).find((r) => r.isMe) || null,
    [data],
  );

  const showPodium =
    scope === "overall" && period === "all" && (data?.leaderboard?.length || 0) >= 1;

  return (
    <TooltipProvider delayDuration={120}>
      <div className="space-y-6">
        {/* Page header */}
        <PageHeader
          title="Leaderboard"
          subtitle="Climb the ranks. Top performers across the WCC 2.0 platform, updated live as you solve challenges."
          icon={Trophy}
        />

        {/* Filter bar */}
        <Card className="overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Scope
                </span>
                <Tabs value={scope} onValueChange={(v) => setScope(v as Scope)}>
                  <TabsList>
                    <TabsTrigger value="overall">Overall</TabsTrigger>
                    <TabsTrigger value="year1">First Year</TabsTrigger>
                    <TabsTrigger value="year2">Second Year</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Period
                </span>
                <Select
                  value={period}
                  onValueChange={(v) => setPeriod(v as Period)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All-time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All-time</SelectItem>
                    <SelectItem value="weekly">Weekly (last 7d)</SelectItem>
                    <SelectItem value="monthly">Monthly (last 30d)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* My rank card */}
        {loading ? (
          <MyRankSkeleton />
        ) : myRow ? (
          <MyRankCard row={myRow} movement={data?.myMovement || "same"} />
        ) : student ? (
          <Card className="border-dashed border-amber-500/30 bg-amber-500/5">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-full bg-amber-500/15 p-2 text-amber-600 dark:text-amber-300">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">You&apos;re not ranked yet</p>
                <p className="text-sm text-muted-foreground">
                  Solve a challenge to appear on the {periodLabel(period)}{" "}
                  {scopeLabel(scope)} leaderboard.
                </p>
              </div>
              <Link
                href="/challenges"
                className="text-sm font-medium text-primary hover:underline"
              >
                Browse challenges →
              </Link>
            </CardContent>
          </Card>
        ) : null}

        {/* Top 3 podium */}
        {showPodium && !loading && (data?.leaderboard?.length || 0) >= 1 ? (
          <Podium rows={data?.leaderboard || []} />
        ) : null}

        {/* Ranked table */}
        {loading ? (
          <LeaderboardTableSkeleton />
        ) : (
          <RankedTable rows={data?.leaderboard || []} />
        )}

        {/* Hall of Fame */}
        <HallOfFame entries={data?.hallOfFame || []} loading={loading} />
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Page header
// ---------------------------------------------------------------------------
function PageHeader({
  title,
  subtitle,
  icon: Icon,
}: {
  title: string;
  subtitle: string;
  icon: LucideIcon;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center gap-3">
        <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}

function scopeLabel(s: Scope): string {
  if (s === "year1") return "First Year";
  if (s === "year2") return "Second Year";
  return "Overall";
}

function periodLabel(p: Period): string {
  if (p === "weekly") return "weekly";
  if (p === "monthly") return "monthly";
  return "all-time";
}

// ---------------------------------------------------------------------------
// My rank card
// ---------------------------------------------------------------------------
function MyRankCard({ row, movement }: { row: LeaderboardRow; movement: Movement }) {
  const movementEl = (() => {
    switch (movement) {
      case "up":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1">
            <ArrowUp className="h-3 w-3" /> Rising
          </Badge>
        );
      case "down":
        return (
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1">
            <ArrowDown className="h-3 w-3" /> Slipping
          </Badge>
        );
      case "new":
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1">
            <Sparkles className="h-3 w-3" /> NEW
          </Badge>
        );
      default:
        return (
          <Badge className="bg-muted text-muted-foreground border-border gap-1">
            <Minus className="h-3 w-3" /> Steady
          </Badge>
        );
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.05 }}
    >
      <Card className="relative border-primary/30 bg-primary/5 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none opacity-30 brand-gradient" />
        <CardContent className="relative p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Rank */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center rounded-2xl bg-background/80 backdrop-blur px-4 py-3 border border-primary/20 min-w-[88px]">
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Your rank
                </span>
                <span className="text-3xl font-bold text-primary leading-none mt-1">
                  #{row.rank}
                </span>
                <div className="mt-2">{movementEl}</div>
              </div>
              <AvatarSvg
                config={row.avatar || {}}
                size={72}
                className="ring-4 ring-primary/20 rounded-full shrink-0"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link
                    href={`/profile?uid=${row.uid}`}
                    className="text-lg font-semibold hover:text-primary truncate"
                  >
                    {row.name}
                  </Link>
                  <span className="text-xs text-muted-foreground font-mono">
                    {row.uid}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className={yearBadgeClass(row.year)}>
                    {yearLabel(row.year)}
                  </Badge>
                  <Badge className="bg-primary/10 text-primary border-primary/30 gap-1">
                    <TrendingUp className="h-3 w-3" /> L{row.level} · {row.levelName}
                  </Badge>
                </div>
              </div>
            </div>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:ml-auto w-full sm:w-auto">
              <StatTile
                label="XP"
                value={row.xp.toLocaleString()}
                icon={Zap}
                color="text-amber-600 dark:text-amber-300 bg-amber-500/10"
              />
              <StatTile
                label="Solved"
                value={row.solvedCount.toString()}
                icon={CheckCircle2}
                color="text-emerald-600 dark:text-emerald-300 bg-emerald-500/10"
              />
              <StatTile
                label="Streak"
                value={`${row.currentStreak}d`}
                icon={Flame}
                color="text-rose-600 dark:text-rose-300 bg-rose-500/10"
              />
              <StatTile
                label="Best"
                value={`${row.longestStreak}d`}
                icon={Trophy}
                color="text-primary bg-primary/10"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function StatTile({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-background/80 backdrop-blur border border-border/60 p-2.5">
      <div className={cn("rounded-lg p-1.5", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="text-sm font-semibold leading-tight truncate">{value}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top 3 podium — only scope=overall & period=all
// ---------------------------------------------------------------------------
function Podium({ rows }: { rows: LeaderboardRow[] }) {
  const top3 = rows.slice(0, 3);
  if (top3.length === 0) return null;
  // Display order: 2nd, 1st, 3rd
  const order = [top3[1], top3[0], top3[2]].filter(Boolean) as LeaderboardRow[];
  const heights = ["h-36", "h-44", "h-32"];
  const positions = [2, 1, 3];
  const tints = [
    "from-slate-400/30 to-slate-300/10 border-slate-400/40",
    "from-amber-400/40 to-amber-300/10 border-amber-400/50",
    "from-orange-400/30 to-orange-300/10 border-orange-400/40",
  ];
  const medalColors = [
    "text-slate-500",
    "text-amber-500",
    "text-orange-500",
  ];
  const rankLabels = ["2", "1", "3"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-amber-500" /> Top 3 — Podium
          </CardTitle>
          <CardDescription>
            The current gold, silver, and bronze coders of WCC 2.0.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end">
            {order.map((row, i) => {
              const pos = positions[i];
              const isGold = pos === 1;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "relative rounded-t-2xl border bg-gradient-to-b p-3 sm:p-4 flex flex-col items-center gap-3 text-center",
                    tints[i],
                    heights[i],
                    "justify-end",
                  )}
                >
                  {isGold && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Crown className="h-7 w-7 text-amber-500 drop-shadow" />
                    </div>
                  )}
                  <div className="relative">
                    <AvatarSvg
                      config={row.avatar || {}}
                      size={isGold ? 88 : 64}
                      className={cn(
                        "rounded-full mx-auto",
                        isGold
                          ? "ring-4 ring-amber-400/60"
                          : "ring-2 ring-slate-300/60",
                      )}
                    />
                    <div
                      className={cn(
                        "absolute -bottom-1 -right-1 rounded-full h-7 w-7 flex items-center justify-center text-xs font-bold bg-background border-2",
                        isGold ? "border-amber-400" : "border-slate-300",
                        medalColors[i],
                      )}
                    >
                      {rankLabels[i]}
                    </div>
                  </div>
                  <div className="min-w-0 w-full">
                    <Link
                      href={`/profile?uid=${row.uid}`}
                      className="block font-semibold text-sm sm:text-base hover:text-primary truncate"
                      title={row.name}
                    >
                      {row.name}
                    </Link>
                    <div className="text-[11px] text-muted-foreground font-mono truncate">
                      {row.uid}
                    </div>
                    <div
                      className={cn(
                        "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        medalColors[i],
                        "bg-background/70",
                      )}
                    >
                      <Medal className="h-3 w-3" /> {ordinal(pos)} place
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {row.xp.toLocaleString()} XP · {row.solvedCount} solved
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ordinal(n: number) {
  return n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
}

// ---------------------------------------------------------------------------
// Ranked table
// ---------------------------------------------------------------------------
function RankedTable({ rows }: { rows: LeaderboardRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 flex flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-muted p-3 text-muted-foreground">
            <Trophy className="h-7 w-7" />
          </div>
          <div>
            <p className="font-semibold">No ranked participants yet</p>
            <p className="text-sm text-muted-foreground">
              Be the first to solve a challenge and claim the #1 spot.
            </p>
          </div>
          <Link
            href="/challenges"
            className="text-sm font-medium text-primary hover:underline"
          >
            Browse challenges →
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.12 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" /> Rankings
          </CardTitle>
          <CardDescription>
            {rows.length} {rows.length === 1 ? "coder" : "coders"} ranked by XP,
            then streak, then seniority.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[64px] text-right">#</TableHead>
                  <TableHead>Participant</TableHead>
                  <TableHead className="hidden sm:table-cell">Year</TableHead>
                  <TableHead className="hidden md:table-cell">Level</TableHead>
                  <TableHead className="text-right">XP</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">
                    Solved
                  </TableHead>
                  <TableHead className="text-right hidden md:table-cell">
                    Streak
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Badges</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      row.isMe
                        ? "bg-primary/10 hover:bg-primary/15"
                        : "hover:bg-muted/50",
                    )}
                  >
                    <TableCell className="text-right font-mono text-sm">
                      <RankBadge rank={row.rank} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarSvg
                          config={row.avatar || {}}
                          size={36}
                          className="rounded-full shrink-0 ring-1 ring-border/60"
                        />
                        <div className="min-w-0">
                          <Link
                            href={`/profile?uid=${row.uid}`}
                            className={cn(
                              "font-medium hover:text-primary truncate block max-w-[160px] sm:max-w-none",
                              row.isMe && "text-primary",
                            )}
                          >
                            {row.name}
                            {row.isMe && (
                              <span className="ml-2 text-[10px] uppercase font-bold text-primary/70">
                                You
                              </span>
                            )}
                          </Link>
                          <div className="text-[11px] text-muted-foreground font-mono truncate">
                            {row.uid}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge
                        variant="outline"
                        className={yearBadgeClass(row.year)}
                      >
                        {yearLabel(row.year)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge className="bg-primary/10 text-primary border-primary/30 gap-1">
                        <TrendingUp className="h-3 w-3" /> L{row.level}
                      </Badge>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {row.levelName}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <Zap className="h-3 w-3 text-amber-500" />
                        {row.xp.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-sm">
                      <span className="inline-flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                        {row.solvedCount}
                      </span>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right text-sm">
                      <span className="inline-flex items-center gap-1">
                        <Flame
                          className={cn(
                            "h-3 w-3",
                            row.currentStreak > 0
                              ? "text-rose-500"
                              : "text-muted-foreground",
                          )}
                        />
                        {row.currentStreak}d
                      </span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        {row.achievements.slice(0, 4).map((a) => {
                          const Icon = resolveAchievementIcon(a.icon);
                          return (
                            <Tooltip key={a.key}>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "h-7 w-7 rounded-full ring-1 flex items-center justify-center",
                                    rarityRing(a.rarity),
                                  )}
                                >
                                  <Icon className="h-3.5 w-3.5" />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs">
                                  <div className="font-semibold">{a.name}</div>
                                  <div className="capitalize text-muted-foreground">
                                    {a.rarity}
                                  </div>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                        {row.achievements.length === 0 && (
                          <span className="text-[11px] text-muted-foreground">
                            —
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold text-xs">
        <Crown className="h-4 w-4" />
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-slate-400/15 text-slate-600 dark:text-slate-300 font-bold text-xs">
        <Medal className="h-4 w-4" />
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold text-xs">
        <Medal className="h-4 w-4" />
      </span>
    );
  }
  return <span className="text-muted-foreground">{rank}</span>;
}

// ---------------------------------------------------------------------------
// Hall of Fame
// ---------------------------------------------------------------------------
function HallOfFame({
  entries,
  loading,
}: {
  entries: HallOfFameEntry[];
  loading: boolean;
}) {
  // Group entries by weekLabel
  const groupedWeeks: Record<string, { weekLabel: string; year1: HallOfFameEntry[]; year2: HallOfFameEntry[] }> = {};

  for (const entry of entries) {
    const w = entry.weekLabel || "Weekly Challenge";
    if (!groupedWeeks[w]) {
      groupedWeeks[w] = { weekLabel: w, year1: [], year2: [] };
    }
    const y = String(entry.year || entry.user?.year || "1");
    if (y === "2") {
      groupedWeeks[w].year2.push(entry);
    } else {
      groupedWeeks[w].year1.push(entry);
    }
  }

  // Sort by rank within each year
  for (const w of Object.values(groupedWeeks)) {
    w.year1.sort((a, b) => (a.rank || 1) - (b.rank || 1));
    w.year2.sort((a, b) => (a.rank || 1) - (b.rank || 1));
  }

  const weeksList = Object.values(groupedWeeks);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      className="space-y-4"
    >
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-amber-500" /> Weekly Challenge Winners
              </CardTitle>
              <CardDescription>
                Admin-declared weekly winners & runner ups — evaluated separately for Year 1 and Year 2.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/30 text-xs gap-1 font-semibold">
              <Sparkles className="h-3 w-3" /> Admin Declared
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : weeksList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-amber-500/10 p-3 text-amber-600 dark:text-amber-300">
                <Trophy className="h-7 w-7" />
              </div>
              <div>
                <p className="font-semibold text-base">No weekly winners declared yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Weekly challenge winners will appear here once declared by administrators after code review.
                </p>
              </div>
            </div>
          ) : (
            weeksList.map((week) => (
              <div key={week.weekLabel} className="rounded-xl border border-border/60 p-4 bg-muted/10 space-y-4">
                <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="brand-gradient h-7 w-7 rounded-lg flex items-center justify-center text-brand-foreground font-bold text-xs">
                      W
                    </div>
                    <span className="font-bold text-sm tracking-tight">{week.weekLabel}</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Separate Cohort Results
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Year 1 Cohort */}
                  <div className="rounded-lg border border-border/60 bg-background/80 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 text-xs font-bold">
                        🎓 YEAR 1 COHORT
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">1st Year Students</span>
                    </div>

                    {week.year1.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border/50 rounded-md">
                        No Year 1 winners declared for this week.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {week.year1.map((w) => (
                          <div
                            key={w.id || w.user.id}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors",
                              w.rank === 1
                                ? "border-amber-500/40 bg-amber-500/5"
                                : w.rank === 2
                                ? "border-slate-400/40 bg-slate-400/5"
                                : "border-amber-700/40 bg-amber-700/5"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-sm">
                                {w.rank === 1 ? "🏆" : w.rank === 2 ? "🥈" : "🥉"}
                              </span>
                              <AvatarSvg config={w.user.avatar || {}} size={32} className="rounded-full flex-shrink-0" />
                              <div className="min-w-0">
                                <Link
                                  href={`/profile?uid=${w.user.uid}`}
                                  className="font-semibold text-xs hover:text-primary truncate block"
                                >
                                  {w.user.name}
                                </Link>
                                <span className="font-mono text-[10px] text-muted-foreground">{w.user.uid}</span>
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] font-semibold flex-shrink-0",
                                w.rank === 1 && "bg-amber-500/20 text-amber-700 dark:text-amber-300",
                                w.rank === 2 && "bg-slate-400/20 text-slate-700 dark:text-slate-300",
                                w.rank === 3 && "bg-amber-700/20 text-amber-800 dark:text-amber-400"
                              )}
                            >
                              {w.title || (w.rank === 1 ? "Winner" : w.rank === 2 ? "1st Runner Up" : "2nd Runner Up")}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Year 2 Cohort */}
                  <div className="rounded-lg border border-border/60 bg-background/80 p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold">
                        🎓 YEAR 2 COHORT
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">2nd Year Students</span>
                    </div>

                    {week.year2.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground border border-dashed border-border/50 rounded-md">
                        No Year 2 winners declared for this week.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {week.year2.map((w) => (
                          <div
                            key={w.id || w.user.id}
                            className={cn(
                              "flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors",
                              w.rank === 1
                                ? "border-amber-500/40 bg-amber-500/5"
                                : w.rank === 2
                                ? "border-slate-400/40 bg-slate-400/5"
                                : "border-amber-700/40 bg-amber-700/5"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="text-sm">
                                {w.rank === 1 ? "🏆" : w.rank === 2 ? "🥈" : "🥉"}
                              </span>
                              <AvatarSvg config={w.user.avatar || {}} size={32} className="rounded-full flex-shrink-0" />
                              <div className="min-w-0">
                                <Link
                                  href={`/profile?uid=${w.user.uid}`}
                                  className="font-semibold text-xs hover:text-primary truncate block"
                                >
                                  {w.user.name}
                                </Link>
                                <span className="font-mono text-[10px] text-muted-foreground">{w.user.uid}</span>
                              </div>
                            </div>
                            <Badge
                              variant="secondary"
                              className={cn(
                                "text-[10px] font-semibold flex-shrink-0",
                                w.rank === 1 && "bg-amber-500/20 text-amber-700 dark:text-amber-300",
                                w.rank === 2 && "bg-slate-400/20 text-slate-700 dark:text-slate-300",
                                w.rank === 3 && "bg-amber-700/20 text-amber-800 dark:text-amber-400"
                              )}
                            >
                              {w.title || (w.rank === 1 ? "Winner" : w.rank === 2 ? "1st Runner Up" : "2nd Runner Up")}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Skeletons
// ---------------------------------------------------------------------------
function MyRankSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-24 w-24 rounded-2xl" />
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="hidden sm:flex gap-2">
            <Skeleton className="h-12 w-24 rounded-xl" />
            <Skeleton className="h-12 w-24 rounded-xl" />
            <Skeleton className="h-12 w-24 rounded-xl" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderboardTableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 border-b border-border/40"
            >
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-6 w-16 rounded-full hidden sm:block" />
              <Skeleton className="h-4 w-12 hidden md:block" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
