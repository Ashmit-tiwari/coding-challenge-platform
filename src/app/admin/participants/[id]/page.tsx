"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Zap, CheckCircle2, Flame, Award, Trophy, Ban, Coins, Loader2,
  ShieldCheck, UserX, UserCheck, Calendar, FileText, Activity, AlertTriangle, Star,
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { AvatarSvg } from "@/components/avatar-svg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  statusColor, yearBadge, yearLabel, fmtDate, fmtDateTime, relTime,
} from "@/app/admin/_lib";

interface DetailUser {
  id: string; uid: string; name: string; year?: string; batch?: string | null;
  avatar: Record<string, string>;
  xp: number; level: number; levelName: string;
  currentStreak: number; longestStreak: number;
  isBanned: boolean; createdAt: string;
  bio?: string | null; username?: string | null;
  featuredBadges: string[]; titles: string[];
}
interface LevelInfo {
  level: number; tier: string; minXp: number; maxXp: number | null;
  nextLevelXp: number | null; progress: number;
  xpIntoLevel: number; xpForLevel: number; color: string;
}
interface Submission {
  id: string; challengeId: string; language: string; status: string;
  passedAll: boolean; passedCount: number; totalTests: number;
  attemptNumber: number; execTimeMs: number; xpAwarded: number;
  isFinal: boolean; createdAt: string;
  challenge: { id: string; title: string; slug: string; difficulty: string; category: string; xpReward: number };
}
interface AchievementRow {
  id: string; name: string; description?: string | null;
  rarity: string; category: string; xpReward: number; icon?: string | null;
  unlockedAt: string;
}
interface CertRow { id: string; level: string; certId: string; issuedAt: string; }
interface ActivityRow { id: string; type: string; message?: string | null; createdAt: string; }

interface DetailResponse {
  user: DetailUser;
  levelInfo: LevelInfo;
  stats: { solvedCount: number; attempts: number; successRate: number };
  achievements: AchievementRow[];
  certificates: CertRow[];
  submissions: Submission[];
  activity: ActivityRow[];
}

const RARITY_COLOR: Record<string, string> = {
  common: "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300",
  rare: "border-emerald-400 text-emerald-700 dark:text-emerald-400",
  epic: "border-amber-400 text-amber-700 dark:text-amber-400",
  legendary: "border-rose-400 text-rose-700 dark:text-rose-400",
};

function ActivityIconRender({ type }: { type: string }) {
  const t = (type || "").toLowerCase();
  if (t.includes("solve")) return <CheckCircle2 className="h-4 w-4" />;
  if (t.includes("submission") || t.includes("attempt")) return <FileText className="h-4 w-4" />;
  if (t.includes("achievement") || t.includes("badge")) return <Award className="h-4 w-4" />;
  if (t.includes("streak")) return <Flame className="h-4 w-4" />;
  if (t.includes("xp")) return <Zap className="h-4 w-4" />;
  if (t.includes("certificate") || t.includes("cert")) return <Trophy className="h-4 w-4" />;
  if (t.includes("register")) return <Users className="h-4 w-4" />;
  return <Activity className="h-4 w-4" />;
}

export default function ParticipantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || "";

  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [banOpen, setBanOpen] = useState(false);
  const [xpOpen, setXpOpen] = useState(false);
  const [xpAmount, setXpAmount] = useState("");
  const [xpReason, setXpReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/participants/${id}`);
      if (!res.ok) {
        if (res.status === 404) toast.error("Participant not found");
        else toast.error("Failed to load participant");
        setData(null);
        return;
      }
      const d = await res.json();
      setData(d);
    } catch {
      toast.error("Failed to load participant");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleBanToggle = async () => {
    if (!data) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/participants/${data.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: !data.user.isBanned, reason: data.user.isBanned ? "unbanned by admin" : "banned by admin" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Action failed");
        return;
      }
      toast.success(data.user.isBanned ? "Unbanned" : "Banned");
      setBanOpen(false);
      fetchDetail();
    } finally {
      setActionLoading(false);
    }
  };

  const handleXpAdjust = async () => {
    if (!data) return;
    const amt = Number(xpAmount);
    if (!Number.isFinite(amt) || amt === 0) {
      toast.error("Enter a non-zero XP amount");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/participants/${data.user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adjustXp: amt, reason: xpReason || `Admin adjustment of ${amt} XP` }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Adjustment failed");
        return;
      }
      toast.success(`Adjusted ${amt > 0 ? "+" : ""}${amt} XP`);
      setXpOpen(false);
      setXpAmount("");
      setXpReason("");
      fetchDetail();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-5">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
            <Link href="/admin/participants"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to participants</Link>
          </Button>
        </div>

        {loading || !data ? (
          <>
            <Card className="border-border/60">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-5">
                  <Skeleton className="h-24 w-24 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-7 w-56" />
                    <Skeleton className="h-4 w-40" />
                    <div className="flex gap-2 pt-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
            <Skeleton className="h-64" />
          </>
        ) : (
          <>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <Card className={cn("border-border/60 overflow-hidden", data.user.isBanned && "border-rose-500/40")}>
                <div className="h-1 brand-gradient" />
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row gap-5">
                    <div className="relative flex-shrink-0 mx-auto lg:mx-0">
                      <div className="h-24 w-24 rounded-full overflow-hidden ring-4 ring-primary/15">
                        <AvatarSvg config={data.user.avatar || {}} size={96} />
                      </div>
                      {data.user.isBanned && (
                        <div className="absolute -bottom-1 -right-1 bg-rose-600 text-white rounded-full p-1.5 ring-2 ring-background">
                          <Ban className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-center lg:text-left">
                      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight">{data.user.name || data.user.uid}</h1>
                        {data.user.year && (
                          <span className={cn("text-xs px-2 py-0.5 rounded border", yearBadge(data.user.year))}>
                            {yearLabel(data.user.year)}
                          </span>
                        )}
                        {data.user.isBanned && (
                          <span className="text-xs px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 inline-flex items-center gap-1">
                            <Ban className="h-3 w-3" /> banned
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-muted-foreground font-mono">{data.user.uid}</div>
                      {data.user.bio && (
                        <p className="mt-3 text-sm text-muted-foreground max-w-prose">{data.user.bio}</p>
                      )}
                      <div className="mt-4 flex flex-wrap items-center justify-center lg:justify-start gap-2">
                        <Badge variant="outline" className="font-mono">
                          <ShieldCheck className="h-3 w-3 mr-1 text-primary" /> L{data.user.level} · {data.user.levelName}
                        </Badge>
                        <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/30">
                          <Zap className="h-3 w-3 mr-1" /> {data.user.xp.toLocaleString()} XP
                        </Badge>
                        <Badge variant="outline" className="text-rose-700 dark:text-rose-400 border-rose-500/30">
                          <Flame className="h-3 w-3 mr-1" /> {data.user.currentStreak}d streak
                        </Badge>
                        <Badge variant="outline" className="text-muted-foreground">
                          <Calendar className="h-3 w-3 mr-1" /> Joined {fmtDate(data.user.createdAt)}
                        </Badge>
                      </div>
                      <div className="mt-5 flex flex-wrap gap-2 justify-center lg:justify-start">
                        <Button onClick={() => setBanOpen(true)} variant={data.user.isBanned ? "default" : "destructive"} size="sm">
                          {data.user.isBanned ? <UserCheck className="h-4 w-4 mr-1.5" /> : <UserX className="h-4 w-4 mr-1.5" />}
                          {data.user.isBanned ? "Unban account" : "Ban account"}
                        </Button>
                        <Button onClick={() => setXpOpen(true)} variant="outline" size="sm">
                          <Coins className="h-4 w-4 mr-1.5 text-amber-600" /> Adjust XP
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <Card className="border-border/60">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">Distinct challenges solved</div>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-3xl font-semibold tabular-nums">{data.stats.solvedCount}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">across {data.stats.attempts} total attempts</div>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">Total attempts</div>
                    <FileText className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="mt-2 text-3xl font-semibold tabular-nums">{data.stats.attempts}</div>
                  <div className="text-[11px] text-muted-foreground mt-1">all-time submissions</div>
                </CardContent>
              </Card>
              <Card className="border-border/60">
                <CardContent className="pt-5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">Success rate</div>
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-2 text-3xl font-semibold tabular-nums">{data.stats.successRate}%</div>
                  <Progress value={data.stats.successRate} className="mt-2 h-1.5" />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Achievements */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-violet-500" /> Achievements ({data.achievements.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.achievements.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-6 text-center">No achievements unlocked.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                      {data.achievements.map((a) => (
                        <div key={a.id} className="flex items-start gap-2 p-2 rounded-lg border border-border/60 hover:bg-muted/40">
                          <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center ring-1", RARITY_COLOR[a.rarity] || RARITY_COLOR.common)}>
                            <Award className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate">{a.name}</div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              <span className={cn("uppercase tracking-wide", RARITY_COLOR[a.rarity] || RARITY_COLOR.common)}>{a.rarity}</span>
                              {a.category ? ` · ${a.category}` : ""}
                              {a.xpReward ? ` · +${a.xpReward} XP` : ""}
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {relTime(a.unlockedAt)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Certificates */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" /> Certificates ({data.certificates.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.certificates.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-6 text-center">No certificates issued.</div>
                  ) : (
                    <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                      {data.certificates.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 p-2 rounded-lg border border-border/60">
                          <div className="h-8 w-8 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/30 flex items-center justify-center">
                            <Trophy className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">Tier: {c.level}</div>
                            <div className="text-[11px] text-muted-foreground font-mono truncate">{c.certId}</div>
                          </div>
                          <div className="text-[10px] text-muted-foreground">{fmtDate(c.issuedAt)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Activity timeline */}
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" /> Activity log
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {data.activity.length === 0 ? (
                    <div className="text-xs text-muted-foreground py-6 text-center">No activity yet.</div>
                  ) : (
                    <div className="relative max-h-72 overflow-y-auto custom-scrollbar pr-1 pl-2">
                      <div className="absolute left-3 top-1 bottom-1 w-px bg-border/60" />
                      <div className="space-y-2">
                        {data.activity.map((l) => (
                          <div key={l.id} className="relative pl-5">
                            <div className="absolute left-1 top-1.5 h-2.5 w-2.5 rounded-full bg-primary/80 ring-2 ring-background" />
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-muted-foreground">
                                <ActivityIconRender type={l.type} />
                              </span>
                              <span className="font-medium capitalize">{l.type.replace(/_/g, " ")}</span>
                              <span className="text-[10px] text-muted-foreground ml-auto">{relTime(l.createdAt)}</span>
                            </div>
                            {l.message && <div className="text-[11px] text-muted-foreground mt-0.5">{l.message}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Submission history */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Submission history
                </CardTitle>
                <CardDescription className="text-xs">
                  Most recent {data.submissions.length} submission{data.submissions.length === 1 ? "" : "s"}.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto custom-scrollbar max-h-[480px]">
                  <Table>
                    <TableHeader className="bg-muted/40 sticky top-0">
                      <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        <TableHead className="font-medium">Challenge</TableHead>
                        <TableHead className="font-medium">Lang</TableHead>
                        <TableHead className="font-medium">Status</TableHead>
                        <TableHead className="font-medium text-right">Passed</TableHead>
                        <TableHead className="font-medium text-right">Attempt</TableHead>
                        <TableHead className="font-medium text-right">XP</TableHead>
                        <TableHead className="font-medium">Final</TableHead>
                        <TableHead className="font-medium">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.submissions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-10 text-sm text-muted-foreground">
                            No submissions yet.
                          </TableCell>
                        </TableRow>
                      ) : data.submissions.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Link href={`/admin/submissions/${s.id}`} className="text-sm hover:text-primary hover:underline">
                              {s.challenge.title}
                            </Link>
                            <div className="text-[10px] text-muted-foreground capitalize">
                              {s.challenge.difficulty} · {s.challenge.category}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.language}</TableCell>
                          <TableCell>
                            <span className={cn("text-[11px] px-1.5 py-0.5 rounded border", statusColor(s.status))}>
                              {s.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            <span className={s.passedAll ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                              {s.passedCount}/{s.totalTests}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">#{s.attemptNumber}</TableCell>
                          <TableCell className="text-right text-xs">
                            {s.xpAwarded > 0 ? (
                              <span className="text-amber-700 dark:text-amber-400 font-medium">+{s.xpAwarded}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {s.isFinal ? (
                              <Star className="h-4 w-4 text-amber-500" />
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground" title={fmtDateTime(s.createdAt)}>
                            {relTime(s.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Ban dialog */}
      <AlertDialog open={banOpen} onOpenChange={setBanOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {data?.user.isBanned ? "Unban participant" : "Ban participant"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {data?.user.isBanned
                ? `Restore access for ${data?.user.name || data?.user.uid}. They will be able to log in and submit again.`
                : `Block ${data?.user.name || data?.user.uid} from logging in or submitting. Action is audit-logged.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBanToggle}
              disabled={actionLoading}
              className={data?.user.isBanned ? "" : "bg-rose-600 hover:bg-rose-700 text-white"}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Confirm {data?.user.isBanned ? "unban" : "ban"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* XP adjust dialog */}
      <Dialog open={xpOpen} onOpenChange={(o) => { if (!o) { setXpOpen(false); setXpAmount(""); setXpReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-amber-500" /> Adjust XP
            </DialogTitle>
            <DialogDescription>
              Apply an XP adjustment to <span className="font-medium">{data?.user.name || data?.user.uid}</span>.
              Positive values reward, negative values deduct. Audit-logged.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">XP amount (signed integer)</Label>
              <Input
                type="number"
                placeholder="e.g. 50 or -100"
                value={xpAmount}
                onChange={(e) => setXpAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Reason (optional)</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Bonus for winning weekly challenge / Manual correction for duplicate XP"
                value={xpReason}
                onChange={(e) => setXpReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setXpOpen(false); setXpAmount(""); setXpReason(""); }} disabled={actionLoading}>
              Cancel
            </Button>
            <Button onClick={handleXpAdjust} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Coins className="h-4 w-4 mr-1.5" />}
              Apply adjustment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminGuard>
  );
}
