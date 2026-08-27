"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BarChart3, Users, FileCode2, CheckCircle2, Trophy, Loader2, ArrowUpDown,
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import { difficultyColor } from "@/app/admin/_lib";

interface AnalyticsResponse {
  participants: { year1: number; year2: number; total: number; participationRate: { year1: number; year2: number } };
  submissions: { year1: number; year2: number; accepted: { year1: number; year2: number }; successRate: { year1: number; year2: number } };
  solvedChallenges: { year1: number; year2: number };
  challengePerformance: { id: string; title: string; slug: string; difficulty: string; category: string; xpReward: number; y1Solved: number; y2Solved: number; y1Attempts: number; y2Attempts: number }[];
  series: { day: string; y1: number; y2: number; y1Accepted: number; y2Accepted: number }[];
}

type SortKey = "title" | "y1Solved" | "y2Solved" | "y1Attempts" | "y2Attempts";

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("y1Solved");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics`);
      if (!res.ok) { toast.error("Failed to load analytics"); return; }
      const d = await res.json();
      setData(d);
    } catch {
      toast.error("Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const sortedPerf = useMemo(() => {
    if (!data?.challengePerformance) return [];
    const arr = [...data.challengePerformance];
    arr.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "title") cmp = (a.title || "").localeCompare(b.title || "");
      else cmp = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [data, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  return (
    <AdminGuard>
      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="flex items-center gap-3">
            <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
              <p className="text-sm text-muted-foreground">Year-over-year participation, acceptance rates and per-challenge performance.</p>
            </div>
          </div>
        </motion.div>

        {/* Year comparison cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        ) : data && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {/* Year 1 */}
            <Card className="border-emerald-500/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Year 1
                  </CardTitle>
                  <Badge variant="outline" className="text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                    <Users className="h-3 w-3 mr-1" /> {data.participants.year1}
                  </Badge>
                </div>
                <CardDescription className="text-xs">First-year cohort engagement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Participation rate</span>
                    <span className="font-semibold tabular-nums">{data.participants.participationRate.year1}%</span>
                  </div>
                  <Progress value={data.participants.participationRate.year1} className="h-2 bg-emerald-500/10 [&>div]:bg-emerald-500" />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Stat label="Submissions" value={data.submissions.year1} icon={<FileCode2 className="h-3 w-3" />} />
                  <Stat label="Accepted" value={data.submissions.accepted.year1} icon={<CheckCircle2 className="h-3 w-3" />} />
                  <Stat label="Solved (ch)" value={data.solvedChallenges.year1} icon={<Trophy className="h-3 w-3" />} />
                </div>
                <div className="text-xs text-muted-foreground pt-1">
                  Success rate: <span className="font-medium text-emerald-700 dark:text-emerald-400">{data.submissions.successRate.year1}%</span>
                </div>
              </CardContent>
            </Card>
            {/* Year 2 */}
            <Card className="border-amber-500/30">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Year 2
                  </CardTitle>
                  <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/30">
                    <Users className="h-3 w-3 mr-1" /> {data.participants.year2}
                  </Badge>
                </div>
                <CardDescription className="text-xs">Second-year cohort engagement</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Participation rate</span>
                    <span className="font-semibold tabular-nums">{data.participants.participationRate.year2}%</span>
                  </div>
                  <Progress value={data.participants.participationRate.year2} className="h-2 bg-amber-500/10 [&>div]:bg-amber-500" />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <Stat label="Submissions" value={data.submissions.year2} icon={<FileCode2 className="h-3 w-3" />} />
                  <Stat label="Accepted" value={data.submissions.accepted.year2} icon={<CheckCircle2 className="h-3 w-3" />} />
                  <Stat label="Solved (ch)" value={data.solvedChallenges.year2} icon={<Trophy className="h-3 w-3" />} />
                </div>
                <div className="text-xs text-muted-foreground pt-1">
                  Success rate: <span className="font-medium text-amber-700 dark:text-amber-400">{data.submissions.successRate.year2}%</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-primary" /> Submissions · last 14 days
              </CardTitle>
              <CardDescription className="text-xs">Daily totals by cohort</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                {loading ? <Skeleton className="h-full w-full" /> : data?.series && data.series.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                      <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "rgba(127,127,127,0.06)" }} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="y1" name="Year 1" fill="oklch(0.55 0.14 158)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="y2" name="Year 2" fill="oklch(0.7 0.16 70)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No activity in the last 14 days.</div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Accepted submissions · last 14 days
              </CardTitle>
              <CardDescription className="text-xs">Successful attempts by cohort</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                {loading ? <Skeleton className="h-full w-full" /> : data?.series && data.series.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                      <XAxis dataKey="day" tickFormatter={(d: string) => d.slice(5)} tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip cursor={{ fill: "rgba(127,127,127,0.06)" }} contentStyle={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--popover)", color: "var(--popover-foreground)", fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="y1Accepted" name="Year 1 accepted" fill="oklch(0.55 0.14 158)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="y2Accepted" name="Year 2 accepted" fill="oklch(0.7 0.16 70)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No accepted activity in the last 14 days.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Solved challenges bar */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" /> Distinct challenges solved
            </CardTitle>
            <CardDescription className="text-xs">Per cohort — first to solve each challenge counts once per user.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-32 w-full" />
            ) : data ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">Year 1</span>
                    <span className="text-sm font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{data.solvedChallenges.year1}</span>
                  </div>
                  <Progress value={Math.min(100, (data.solvedChallenges.year1 / Math.max(data.challengePerformance.length || 1, 1)) * 100)} className="h-3 bg-emerald-500/10 [&>div]:bg-emerald-500" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium">Year 2</span>
                    <span className="text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-400">{data.solvedChallenges.year2}</span>
                  </div>
                  <Progress value={Math.min(100, (data.solvedChallenges.year2 / Math.max(data.challengePerformance.length || 1, 1)) * 100)} className="h-3 bg-amber-500/10 [&>div]:bg-amber-500" />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Per-challenge performance */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Per-challenge performance
            </CardTitle>
            <CardDescription className="text-xs">Click a column header to sort.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar max-h-[540px]">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <TableHead className="font-medium">
                      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("title")}>
                        Challenge <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="font-medium">Difficulty</TableHead>
                    <TableHead className="font-medium">Category</TableHead>
                    <TableHead className="font-medium text-right">
                      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("y1Solved")}>
                        Y1 solved <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="font-medium text-right">
                      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("y2Solved")}>
                        Y2 solved <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="font-medium text-right">
                      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("y1Attempts")}>
                        Y1 attempts <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead className="font-medium text-right">
                      <button className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => toggleSort("y2Attempts")}>
                        Y2 attempts <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                      </TableRow>
                    ))
                  ) : sortedPerf.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-10 text-sm text-muted-foreground">
                        No published challenges with data yet.
                      </TableCell>
                    </TableRow>
                  ) : sortedPerf.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-sm">{c.title}</TableCell>
                      <TableCell>
                        <span className={cn("text-[11px] px-1.5 py-0.5 rounded border", difficultyColor(c.difficulty))}>{c.difficulty}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.category}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-emerald-700 dark:text-emerald-400 font-medium">{c.y1Solved}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-amber-700 dark:text-amber-400 font-medium">{c.y2Solved}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{c.y1Attempts}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{c.y2Attempts}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/60 p-2.5">
      <div className="text-[10px] text-muted-foreground flex items-center gap-1">{icon}{label}</div>
      <div className="text-lg font-semibold tabular-nums mt-0.5">{value}</div>
    </div>
  );
}
