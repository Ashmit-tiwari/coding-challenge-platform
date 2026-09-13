"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileCode2, Search, ArrowRight, Star, Fingerprint, Loader2, Calendar, Zap, Clock,
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { AvatarSvg } from "@/components/avatar-svg";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { statusColor, yearBadge, yearLabel, langLabel, fmtMs, fmtDateTime, relTime, shortId } from "@/app/admin/_lib";

interface SubmissionAttempt {
  id: string;
  attemptNumber: number;
  language: string;
  status: string;
  passedAll: boolean;
  passedCount: number;
  totalTests: number;
  execTimeMs: number;
  xpAwarded: number;
  isFinal: boolean;
  fingerprint?: string | null;
  tabSwitchesCount?: number;
  pasteCount?: number;
  totalPastedLines?: number;
  createdAt: string;
}

interface GroupedSubmissionRow {
  id: string;
  user: { id?: string; uid: string; name: string; year?: string; avatar?: any };
  challenge: { id: string; title: string; slug: string; difficulty: string; category: string };
  latestLanguage: string;
  latestStatus: string;
  passedAll: boolean;
  latestPassedCount: number;
  totalTests: number;
  attemptCount: number;
  totalTabSwitches: number;
  totalPasteCount: number;
  totalPastedLines: number;
  latestCreatedAt: string;
  firstCreatedAt: string;
  xpAwarded: number;
  hasAccepted: boolean;
  bestStatus: string;
  attempts: SubmissionAttempt[];
}

interface RawSubmissionRow extends SubmissionAttempt {
  user: { id?: string; uid: string; name: string; year?: string; avatar?: any };
  challenge: { id: string; title: string; slug: string; difficulty: string; category: string };
}

const STATUS_OPTIONS = ["", "accepted", "wrong_answer", "time_limit", "memory_limit", "runtime_error", "compile_error"];
const LANG_OPTIONS = ["", "python", "cpp", "javascript", "java", "c", "go", "rust"];

function SubmissionsContent() {
  const searchParams = useSearchParams();
  const [groupedRows, setGroupedRows] = useState<GroupedSubmissionRow[]>([]);
  const [rawRows, setRawRows] = useState<RawSubmissionRow[]>([]);
  const [isGroupedView, setIsGroupedView] = useState(true);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(searchParams.get("userId") || "");
  const [challengeId, setChallengeId] = useState(searchParams.get("challengeId") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [language, setLanguage] = useState(searchParams.get("language") || "");
  const [limit, setLimit] = useState(searchParams.get("limit") || "50");

  // Selected group for viewing attempt history drawer/dialog
  const [selectedGroup, setSelectedGroup] = useState<GroupedSubmissionRow | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (userId.trim()) params.set("userId", userId.trim());
      if (challengeId.trim()) params.set("challengeId", challengeId.trim());
      if (status) params.set("status", status);
      if (language) params.set("language", language);
      if (limit) params.set("limit", limit);
      if (isGroupedView) params.set("groupBy", "user_challenge");

      const res = await fetch(`/api/admin/submissions?${params.toString()}`);
      if (!res.ok) {
        toast.error("Failed to load submissions");
        setGroupedRows([]);
        setRawRows([]);
        return;
      }
      const d = await res.json();
      if (d.grouped) {
        setGroupedRows(d.submissions || []);
      } else {
        setRawRows(d.submissions || []);
      }
    } catch {
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [userId, challengeId, status, language, limit, isGroupedView]);

  useEffect(() => {
    const t = setTimeout(fetchList, 150);
    return () => clearTimeout(t);
  }, [fetchList]);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground shadow-sm">
              <FileCode2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Submissions</h1>
              <p className="text-sm text-muted-foreground">
                {isGroupedView
                  ? "Grouped view: one entry per participant & challenge with full attempt history."
                  : "Raw stream view: browsing every individual code submission."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-muted/60 p-1 rounded-xl border border-border/70 self-start sm:self-auto">
            <Button
              variant={isGroupedView ? "default" : "ghost"}
              size="sm"
              className="text-xs h-8 px-3 rounded-lg"
              onClick={() => setIsGroupedView(true)}
            >
              1 Entry Per Participant
            </Button>
            <Button
              variant={!isGroupedView ? "default" : "ghost"}
              size="sm"
              className="text-xs h-8 px-3 rounded-lg"
              onClick={() => setIsGroupedView(false)}
            >
              All Attempts (Raw Stream)
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Filter bar */}
      <Card className="border-border/60">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">User ID</Label>
              <Input placeholder="Filter by user ID" value={userId} onChange={(e) => setUserId(e.target.value)} className="font-mono text-xs" />
            </div>
            <div className="md:col-span-3">
              <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Challenge ID</Label>
              <Input placeholder="Filter by challenge ID" value={challengeId} onChange={(e) => setChallengeId(e.target.value)} className="font-mono text-xs" />
            </div>
            <div className="md:col-span-2">
              <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Status</Label>
              <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Any status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any status</SelectItem>
                  {STATUS_OPTIONS.filter(Boolean).map((s) => <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Language</Label>
              <Select value={language || "all"} onValueChange={(v) => setLanguage(v === "all" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Any language" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any language</SelectItem>
                  {LANG_OPTIONS.filter(Boolean).map((l) => <SelectItem key={l} value={l}>{langLabel(l)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Limit</Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar max-h-[680px]">
            {isGroupedView ? (
              // GROUPED VIEW TABLE (1 Row Per Participant Per Challenge)
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <TableHead className="font-medium">Participant</TableHead>
                    <TableHead className="font-medium">Challenge</TableHead>
                    <TableHead className="font-medium">Attempts</TableHead>
                    <TableHead className="font-medium">Overall Status</TableHead>
                    <TableHead className="font-medium">Integrity Signals</TableHead>
                    <TableHead className="font-medium">Lang</TableHead>
                    <TableHead className="font-medium text-right">Latest Test Pass</TableHead>
                    <TableHead className="font-medium text-right">XP Earned</TableHead>
                    <TableHead className="font-medium">Latest Activity</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><div><Skeleton className="h-3 w-24" /><Skeleton className="h-2 w-20" /></div></div></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-7 w-20" /></TableCell>
                      </TableRow>
                    ))
                  ) : groupedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-sm text-muted-foreground">
                        <div className="inline-flex flex-col items-center gap-2">
                          <FileCode2 className="h-8 w-8 text-muted-foreground/50" />
                          <div>No submissions match the current filters.</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : groupedRows.map((g) => {
                    const hasFlags = g.totalTabSwitches > 0 || g.totalPastedLines > 0;
                    return (
                      <TableRow key={g.id} className="hover:bg-muted/30">
                        {/* Participant */}
                        <TableCell>
                          <Link href={`/admin/participants/${g.user.id || (g.user.uid === g.user.name ? g.user.uid : "")}`} className="flex items-center gap-2 group">
                            <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-border/60 flex-shrink-0">
                              <AvatarSvg config={g.user.avatar ? (typeof g.user.avatar === "object" && "config" in g.user.avatar ? (g.user.avatar as any).config : g.user.avatar) : {}} size={32} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium truncate group-hover:text-primary">{g.user.name || g.user.uid}</div>
                              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                <span className="font-mono">{g.user.uid}</span>
                                {g.user.year && <span className={cn("px-1 py-px rounded text-[10px] border", yearBadge(g.user.year))}>{yearLabel(g.user.year)}</span>}
                              </div>
                            </div>
                          </Link>
                        </TableCell>

                        {/* Challenge */}
                        <TableCell>
                          <div className="text-sm font-medium">{g.challenge.title}</div>
                          <div className="text-[10px] text-muted-foreground capitalize">{g.challenge.difficulty} · {g.challenge.category}</div>
                        </TableCell>

                        {/* Attempts count */}
                        <TableCell>
                          <Badge variant="outline" className={cn(
                            "text-xs font-semibold px-2 py-0.5",
                            g.attemptCount > 1 ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground"
                          )}>
                            {g.attemptCount} {g.attemptCount === 1 ? "Attempt" : "Attempts"}
                          </Badge>
                        </TableCell>

                        {/* Best / Latest Status */}
                        <TableCell>
                          <span className={cn("text-[11px] px-2 py-0.5 rounded font-medium border inline-flex items-center gap-1", statusColor(g.hasAccepted ? "Accepted" : g.latestStatus))}>
                            {g.hasAccepted ? "Accepted" : g.latestStatus}
                            {g.hasAccepted && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                          </span>
                        </TableCell>

                        {/* Anti-cheat / Integrity Telemetry */}
                        <TableCell>
                          {hasFlags ? (
                            <div className="flex flex-col gap-1 items-start">
                              {g.totalTabSwitches > 0 && (
                                <Badge className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border-rose-500/50 text-[10px] font-bold gap-1 shadow-sm whitespace-nowrap">
                                  🚨 {g.totalTabSwitches} Switch{g.totalTabSwitches > 1 ? "es" : ""}
                                </Badge>
                              )}
                              {g.totalPastedLines > 0 && (
                                <Badge className="bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 border-red-500/50 text-[10px] font-bold gap-1 shadow-sm whitespace-nowrap">
                                  📋 {g.totalPastedLines} Pasted Lines
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                              ✓ 0 (Clean)
                            </Badge>
                          )}
                        </TableCell>

                        {/* Language */}
                        <TableCell className="text-xs text-muted-foreground">{langLabel(g.latestLanguage)}</TableCell>

                        {/* Latest Passed Tests */}
                        <TableCell className="text-right text-xs tabular-nums font-mono">
                          <span className={g.passedAll ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-muted-foreground"}>
                            {g.latestPassedCount}/{g.totalTests}
                          </span>
                        </TableCell>

                        {/* XP */}
                        <TableCell className="text-right text-xs">
                          {g.xpAwarded > 0 ? (
                            <span className="text-amber-700 dark:text-amber-400 font-medium">+{g.xpAwarded}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>

                        {/* Activity timestamp */}
                        <TableCell className="text-xs text-muted-foreground" title={fmtDateTime(g.latestCreatedAt)}>
                          {relTime(g.latestCreatedAt)}
                        </TableCell>

                        {/* Actions: View Attempts History Drawer + View Latest Code */}
                        <TableCell>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs gap-1"
                              onClick={() => setSelectedGroup(g)}
                            >
                              <Clock className="h-3 w-3" />
                              History ({g.attemptCount})
                            </Button>
                            <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                              <Link href={`/admin/submissions/${g.id}`}>
                                Code <ArrowRight className="h-3 w-3 ml-1" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              // RAW STREAM TABLE (All Attempts)
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <TableHead className="font-medium">Participant</TableHead>
                    <TableHead className="font-medium">Challenge</TableHead>
                    <TableHead className="font-medium">Lang</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Integrity</TableHead>
                    <TableHead className="font-medium text-right">Passed</TableHead>
                    <TableHead className="font-medium text-right">Attempt</TableHead>
                    <TableHead className="font-medium text-right">Time</TableHead>
                    <TableHead className="font-medium">Fingerprint</TableHead>
                    <TableHead className="font-medium text-right">XP</TableHead>
                    <TableHead className="font-medium">Final</TableHead>
                    <TableHead className="font-medium">Submitted</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="flex items-center gap-2"><Skeleton className="h-8 w-8 rounded-full" /><div><Skeleton className="h-3 w-24" /><Skeleton className="h-2 w-20" /></div></div></TableCell>
                        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-6" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-7 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : rawRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={13} className="text-center py-12 text-sm text-muted-foreground">
                        <div className="inline-flex flex-col items-center gap-2">
                          <FileCode2 className="h-8 w-8 text-muted-foreground/50" />
                          <div>No submissions match the current filters.</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : rawRows.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/admin/participants/${s.user.id || (s.user.uid === s.user.name ? s.user.uid : "")}`} className="flex items-center gap-2 group">
                          <div className="h-8 w-8 rounded-full overflow-hidden ring-1 ring-border/60 flex-shrink-0">
                            <AvatarSvg config={s.user.avatar ? (typeof s.user.avatar === "object" && "config" in s.user.avatar ? (s.user.avatar as any).config : s.user.avatar) : {}} size={32} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate group-hover:text-primary">{s.user.name || s.user.uid}</div>
                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                              <span className="font-mono">{s.user.uid}</span>
                              {s.user.year && <span className={cn("px-1 py-px rounded text-[10px] border", yearBadge(s.user.year))}>{yearLabel(s.user.year)}</span>}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{s.challenge.title}</div>
                        <div className="text-[10px] text-muted-foreground capitalize">{s.challenge.difficulty} · {s.challenge.category}</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{langLabel(s.language)}</TableCell>
                      <TableCell>
                        <span className={cn("text-[11px] px-1.5 py-0.5 rounded border", statusColor(s.status))}>
                          {s.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {(s.tabSwitchesCount || 0) > 0 || (s.totalPastedLines || 0) > 0 ? (
                          <div className="flex flex-col gap-1 items-start">
                            {(s.tabSwitchesCount || 0) > 0 && (
                              <Badge className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border-rose-500/50 text-[10px] font-bold gap-1 shadow-sm whitespace-nowrap">
                                🚨 {s.tabSwitchesCount} Tab Switch{s.tabSwitchesCount > 1 ? "es" : ""}
                              </Badge>
                            )}
                            {(s.totalPastedLines || 0) > 0 && (
                              <Badge className="bg-red-500/20 hover:bg-red-500/30 text-red-700 dark:text-red-300 border-red-500/50 text-[10px] font-bold gap-1 shadow-sm whitespace-nowrap">
                                📋 {s.totalPastedLines} Pasted Lines
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px]">
                            ✓ 0 (Clean)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        <span className={s.passedAll ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                          {s.passedCount}/{s.totalTests}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">#{s.attemptNumber}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{fmtMs(s.execTimeMs)}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
                          <Fingerprint className="h-3 w-3" />
                          {s.fingerprint ? shortId(s.fingerprint, 10) : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {s.xpAwarded > 0 ? (
                          <span className="text-amber-700 dark:text-amber-400 font-medium">+{s.xpAwarded}</span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {s.isFinal ? (
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground" title={fmtDateTime(s.createdAt)}>
                        {relTime(s.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                            <Link href={`/admin/submissions/${s.id}`}>
                              View code <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {!loading && (
            <div className="px-4 py-3 border-t border-border/60 text-xs text-muted-foreground flex items-center justify-between">
              <span>
                Showing {isGroupedView ? groupedRows.length : rawRows.length} {isGroupedView ? "participant challenge entries" : "submissions"}.
              </span>
              {isGroupedView && (
                <span className="text-[11px] text-muted-foreground/80">
                  Each row encapsulates all tries, tab switches, and pasted lines for that question.
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ATTEMPT HISTORY DIALOG / DRAWER */}
      {selectedGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-background border border-border/70 rounded-2xl max-w-3xl w-full max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-border/60 bg-muted/20 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Participant Submission History</span>
                  <Badge variant="outline" className="text-xs font-mono">{selectedGroup.attemptCount} Attempts</Badge>
                </div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span>{selectedGroup.user.name || selectedGroup.user.uid}</span>
                  <span className="text-muted-foreground font-normal">on</span>
                  <span className="text-primary">{selectedGroup.challenge.title}</span>
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-2">
                  <span>Total Tab Switches:</span>
                  <Badge className={selectedGroup.totalTabSwitches > 0 ? "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 text-[10px]" : "bg-muted text-[10px]"}>
                    🚨 {selectedGroup.totalTabSwitches}
                  </Badge>
                  <span>•</span>
                  <span>Total Pasted Lines:</span>
                  <Badge className={selectedGroup.totalPastedLines > 0 ? "bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40 text-[10px]" : "bg-muted text-[10px]"}>
                    📋 {selectedGroup.totalPastedLines}
                  </Badge>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full" onClick={() => setSelectedGroup(null)}>
                ✕
              </Button>
            </div>

            {/* Modal Content: Chronological List of Attempts */}
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3">
              {selectedGroup.attempts.map((att) => (
                <div
                  key={att.id}
                  className="p-3.5 rounded-xl border border-border/60 bg-card hover:border-primary/40 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="font-mono text-[10px] bg-muted/80 text-foreground border-border/80">
                        Attempt #{att.attemptNumber}
                      </Badge>
                      <span className={cn("text-[11px] px-2 py-0.5 rounded font-medium border", statusColor(att.status))}>
                        {att.status}
                      </span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {langLabel(att.language)}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {att.passedCount}/{att.totalTests} tests passed
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {fmtMs(att.execTimeMs)}
                      </span>
                      <span>•</span>
                      <span>Tab Switches: <strong className={att.tabSwitchesCount ? "text-rose-500" : ""}>{att.tabSwitchesCount ?? 0}</strong></span>
                      <span>•</span>
                      <span>Pasted Lines: <strong className={att.totalPastedLines ? "text-red-500" : ""}>{att.totalPastedLines ?? 0}</strong></span>
                      <span>•</span>
                      <span title={fmtDateTime(att.createdAt)}>{relTime(att.createdAt)}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <Button asChild size="sm" variant="outline" className="h-8 px-3 text-xs gap-1">
                      <Link href={`/admin/submissions/${att.id}`} target="_blank">
                        Inspect Code <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-border/60 bg-muted/30 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedGroup(null)}>
                Close History
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionsFallback() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Card className="border-border/60">
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3"><Skeleton className="h-9 w-full" /></div>
            <div className="md:col-span-3"><Skeleton className="h-9 w-full" /></div>
            <div className="md:col-span-2"><Skeleton className="h-9 w-full" /></div>
            <div className="md:col-span-2"><Skeleton className="h-9 w-full" /></div>
            <div className="md:col-span-2"><Skeleton className="h-9 w-full" /></div>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/60">
        <CardContent className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminSubmissionsPage() {
  return (
    <AdminGuard>
      <Suspense fallback={<SubmissionsFallback />}>
        <SubmissionsContent />
      </Suspense>
    </AdminGuard>
  );
}
