"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Users,
  Code2,
  FileCode2,
  Zap,
  ShieldAlert,
  Flame,
  Target,
  Ban,
  ArrowRight,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Activity,
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { AvatarSvg } from "@/components/avatar-svg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { cn } from "@/lib/utils";
import {
  statusColor, yearBadge, yearLabel, langLabel, fmtDateTime, relTime, fmtMs,
} from "@/app/admin/_lib";

interface Totals {
  totalParticipants: number;
  activeParticipants: number;
  year1: number;
  year2: number;
  totalChallenges: number;
  publishedChallenges: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  unsuccessful: number;
  avgAttemptsPerSolved: number;
  totalXp: number;
  activeStreaks: number;
  streakGte7: number;
  streakGte30: number;
  banned: number;
  pendingFlags: number;
  confirmedFlags: number;
  totalAchievements: number;
  unlockedAchievements: number;
  totalCertificates: number;
}

interface RecentSub {
  id: string;
  user: { uid: string; name: string; year?: string };
  challenge: { id: string; title: string; slug: string };
  language: string;
  status: string;
  passedAll: boolean;
  attemptNumber: number;
  createdAt: string;
}

interface SeriesPoint { day: string; y1: number; y2: number; y1Accepted: number; y2Accepted: number; }

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tint,
  href,
  loading,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tint: "emerald" | "amber" | "rose" | "primary" | "violet";
  href?: string;
  loading?: boolean;
}) {
  const tintMap: Record<string, string> = {
    emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 ring-emerald-500/30",
    amber: "bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-amber-500/30",
    rose: "bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-rose-500/30",
    primary: "bg-primary/15 text-primary ring-primary/30",
    violet: "bg-violet-500/15 text-violet-700 dark:text-violet-400 ring-violet-500/30",
  };
  const inner = (
    <>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center ring-1", tintMap[tint])}>
            <Icon className="h-5 w-5" />
          </div>
          {sub && <div className="text-right text-[11px] text-muted-foreground">{sub}</div>}
        </div>
        <div className="mt-3">
          {loading ? (
            <Skeleton className="h-8 w-20 mb-1" />
          ) : (
            <div className="text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
          )}
          <div className="text-xs font-medium text-muted-foreground mt-1">{label}</div>
        </div>
      </CardContent>
      {href && (
        <CardFooter className="pt-0 pb-3">
          <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            View <ArrowRight className="h-3 w-3" />
          </Link>
        </CardFooter>
      )}
    </>
  );
  return (
    <Card className={cn("border-border/60", href && "transition-shadow hover:shadow-md")}>
      {href ? <Link href={href} className="block">{inner}</Link> : inner}
    </Card>
  );
}

function StatCardSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="pt-5 pb-4">
        <Skeleton className="h-10 w-10 rounded-xl mb-3" />
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-24" />
      </CardContent>
    </Card>
  );
}

export default function AdminOverviewPage() {
  const [totals, setTotals] = useState<Totals | null>(null);
  const [recent, setRecent] = useState<RecentSub[]>([]);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [dashRes, anaRes] = await Promise.all([
          fetch("/api/admin/dashboard"),
          fetch("/api/admin/analytics"),
        ]);
        if (!alive) return;
        if (dashRes.ok) {
          const d = await dashRes.json();
          setTotals(d.totals);
          setRecent(d.recentSubmissions || []);
        } else {
          toast.error("Failed to load dashboard");
        }
        if (anaRes.ok) {
          const a = await anaRes.json();
          setSeries(a.series || []);
        }
      } catch (err) {
        toast.error("Dashboard load failed");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const acceptedRate =
    totals && totals.totalSubmissions > 0
      ? ((totals.acceptedSubmissions / totals.totalSubmissions) * 100).toFixed(1)
      : "0";

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="flex items-center gap-3">
            <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
              <p className="text-sm text-muted-foreground">
                Real-time platform pulse: participants, challenges, submissions, integrity and engagement.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stat cards grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
            : totals && (
              <>
                <StatCard
                  icon={Users}
                  tint="emerald"
                  label="Total participants"
                  value={totals.totalParticipants}
                  sub={
                    <>
                      <div className="font-medium text-emerald-600">{totals.activeParticipants} active</div>
                      <div className="text-[10px] text-muted-foreground">last 7 days</div>
                    </>
                  }
                  href="/admin/participants"
                />
                <StatCard
                  icon={Code2}
                  tint="primary"
                  label="Total challenges"
                  value={totals.totalChallenges}
                  sub={
                    <>
                      <div className="font-medium text-primary">{totals.publishedChallenges} published</div>
                      <div className="text-[10px] text-muted-foreground">{totals.totalChallenges - totals.publishedChallenges} draft/archived</div>
                    </>
                  }
                  href="/admin/challenges"
                />
                <StatCard
                  icon={FileCode2}
                  tint="amber"
                  label="Total submissions"
                  value={totals.totalSubmissions}
                  sub={
                    <>
                      <div className="font-medium text-emerald-600">{acceptedRate}% accepted</div>
                      <div className="text-[10px] text-muted-foreground">{totals.unsuccessful} unsuccessful</div>
                    </>
                  }
                  href="/admin/submissions"
                />
                <StatCard
                  icon={Zap}
                  tint="amber"
                  label="Total XP generated"
                  value={totals.totalXp.toLocaleString()}
                  sub={<div className="text-[10px] text-muted-foreground">across all participants</div>}
                />
                <StatCard
                  icon={ShieldAlert}
                  tint="rose"
                  label="Pending integrity flags"
                  value={totals.pendingFlags}
                  sub={
                    <>
                      <div className="font-medium text-rose-600">{totals.confirmedFlags} confirmed</div>
                      <div className="text-[10px] text-muted-foreground">needs review</div>
                    </>
                  }
                  href="/admin/integrity"
                />
                <StatCard
                  icon={Flame}
                  tint="emerald"
                  label="Active streaks ≥7"
                  value={totals.streakGte7}
                  sub={
                    <>
                      <div className="font-medium text-emerald-700">{totals.streakGte30} ≥30 days</div>
                      <div className="text-[10px] text-muted-foreground">{totals.activeStreaks} total active</div>
                    </>
                  }
                />
                <StatCard
                  icon={Target}
                  tint="violet"
                  label="Avg attempts / solved"
                  value={totals.avgAttemptsPerSolved}
                  sub={<div className="text-[10px] text-muted-foreground">lower is better</div>}
                />
                <StatCard
                  icon={Ban}
                  tint="rose"
                  label="Banned accounts"
                  value={totals.banned}
                  sub={<div className="text-[10px] text-muted-foreground">review in Participants</div>}
                  href="/admin/participants"
                />
              </>
            )}
        </div>

        {/* Year split + chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
          <Card className="lg:col-span-1 border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" /> Year split
              </CardTitle>
              <CardDescription className="text-xs">Distribution of participants across cohorts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                if (loading || !totals) {
                  return (
                    <>
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </>
                  );
                }
                const total = Math.max(totals.year1 + totals.year2, 1);
                const y1Pct = (totals.year1 / total) * 100;
                const y2Pct = (totals.year2 / total) * 100;
                return (
                  <>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Year 1
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          <span className="font-medium text-foreground">{totals.year1}</span> · {y1Pct.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={y1Pct} className="h-2.5 bg-emerald-500/10 [&>div]:bg-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="inline-flex items-center gap-1.5 font-medium">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          Year 2
                        </span>
                        <span className="tabular-nums text-muted-foreground">
                          <span className="font-medium text-foreground">{totals.year2}</span> · {y2Pct.toFixed(0)}%
                        </span>
                      </div>
                      <Progress value={y2Pct} className="h-2.5 bg-amber-500/10 [&>div]:bg-amber-500" />
                    </div>
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold tabular-nums">{totals.totalParticipants}</span>
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Submissions · last 14 days
                  </CardTitle>
                  <CardDescription className="text-xs">Year 1 vs Year 2 daily activity</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[240px]">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : series.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    No submission activity in the last 14 days.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" vertical={false} />
                      <XAxis
                        dataKey="day"
                        tickFormatter={(d: string) => d.slice(5)}
                        tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "currentColor", opacity: 0.6 }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(127,127,127,0.06)" }}
                        contentStyle={{
                          borderRadius: 10,
                          border: "1px solid var(--border)",
                          background: "var(--popover)",
                          color: "var(--popover-foreground)",
                          fontSize: 12,
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="y1" name="Year 1" fill="oklch(0.55 0.14 158)" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="y2" name="Year 2" fill="oklch(0.7 0.16 70)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent submissions */}
        <Card className="border-border/60">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Recent submissions
              </CardTitle>
              <CardDescription className="text-xs">Latest activity across the platform</CardDescription>
            </div>
            <Link href="/admin/submissions">
              <Button variant="outline" size="sm">
                All submissions <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar max-h-[420px]">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 sticky top-0">
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Participant</th>
                    <th className="px-4 py-2.5 font-medium">Challenge</th>
                    <th className="px-4 py-2.5 font-medium">Lang</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Attempt</th>
                    <th className="px-4 py-2.5 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i}>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-16" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-10" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                      </tr>
                    ))
                  ) : recent.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No submissions yet.
                      </td>
                    </tr>
                  ) : (
                    recent.map((s) => (
                      <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{s.user.name || s.user.uid}</span>
                            {s.user.year && (
                              <span className={cn("text-[10px] px-1.5 py-0.5 rounded border", yearBadge(s.user.year))}>
                                {yearLabel(s.user.year)}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground font-mono">{s.user.uid}</div>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/submissions/${s.id}`}
                            className="text-foreground hover:text-primary hover:underline"
                          >
                            {s.challenge.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{langLabel(s.language)}</td>
                        <td className="px-4 py-3">
                          <span className={cn("inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded border", statusColor(s.status))}>
                            {s.passedAll ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground tabular-nums">#{s.attemptNumber}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs" title={fmtDateTime(s.createdAt)}>
                          {relTime(s.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
