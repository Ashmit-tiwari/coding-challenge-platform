"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Trophy, Medal, Award, CheckCircle2, Search, Filter, Eye, Trash2,
  Calendar, Code2, Clock, Check, AlertTriangle, ArrowRight, UserCheck,
  Sparkles, RefreshCw
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AvatarSvg } from "@/components/avatar-svg";
import { cn } from "@/lib/utils";

interface DeclaredWinner {
  id: string;
  weekLabel: string;
  year: string;
  rank: number;
  title: string;
  adminNote?: string | null;
  createdAt: string;
  user: {
    id: string;
    uid: string;
    name: string;
    year: string;
    batch: string;
    avatar: any;
  };
  submission?: {
    id: string;
    language: string;
    code: string;
    status: string;
    passedCount: number;
    totalTests: number;
    execTimeMs: number;
    createdAt: string;
  } | null;
  challenge?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  declaredBy?: {
    username: string;
  } | null;
}

interface CandidateSubmission {
  id: string;
  userId: string;
  user: {
    id: string;
    uid: string;
    name: string;
    year: string;
    batch: string;
    avatar: any;
  };
  challenge?: {
    id: string;
    title: string;
    slug: string;
    weekLabel: string;
  };
  language: string;
  code: string;
  status: string;
  passedAll: boolean;
  passedCount: number;
  totalTests: number;
  execTimeMs: number;
  createdAt: string;
}

interface WeeklyChallengeItem {
  id: string;
  title: string;
  slug: string;
  weekLabel: string | null;
  xpReward: number;
}

export default function AdminWinnersPage() {
  const [weeklyChallenges, setWeeklyChallenges] = useState<WeeklyChallengeItem[]>([]);
  const [declaredWinners, setDeclaredWinners] = useState<DeclaredWinner[]>([]);
  const [candidateSubmissions, setCandidateSubmissions] = useState<CandidateSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedWeek, setSelectedWeek] = useState<string>("");
  const [selectedYear, setSelectedYear] = useState<string>("1");
  const [search, setSearch] = useState("");

  // Code inspection modal state
  const [inspectSub, setInspectSub] = useState<CandidateSubmission | null>(null);

  // Winner declaration confirmation modal state
  const [confirmTarget, setConfirmTarget] = useState<{
    sub: CandidateSubmission;
    rank: number;
    title: string;
  } | null>(null);
  const [declaring, setDeclaring] = useState(false);

  // Revoke modal state
  const [revokeTarget, setRevokeTarget] = useState<DeclaredWinner | null>(null);
  const [revoking, setRevoking] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedWeek) params.set("weekLabel", selectedWeek);
      if (selectedYear) params.set("year", selectedYear);

      const res = await fetch(`/api/admin/winners?${params.toString()}`);
      if (!res.ok) {
        toast.error("Failed to load winner data");
        return;
      }
      const data = await res.json();
      setWeeklyChallenges(data.weeklyChallenges || []);
      setDeclaredWinners(data.declaredWinners || []);
      setCandidateSubmissions(data.candidateSubmissions || []);

      // If no week is selected yet, default to the first weekly challenge's weekLabel
      if (!selectedWeek && data.weeklyChallenges?.length > 0) {
        const first = data.weeklyChallenges[0];
        if (first.weekLabel) setSelectedWeek(first.weekLabel);
      }
    } catch {
      toast.error("Failed to load winner data");
    } finally {
      setLoading(false);
    }
  }, [selectedWeek, selectedYear]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeclare = async () => {
    if (!confirmTarget) return;
    setDeclaring(true);
    try {
      const res = await fetch("/api/admin/winners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekLabel: selectedWeek,
          challengeId: confirmTarget.sub.challenge?.id,
          year: selectedYear,
          rank: confirmTarget.rank,
          userId: confirmTarget.sub.userId,
          submissionId: confirmTarget.sub.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to declare winner");
        return;
      }
      toast.success(`Declared ${confirmTarget.sub.user.name} as Year ${selectedYear} ${confirmTarget.title} for ${selectedWeek}!`);
      setConfirmTarget(null);
      fetchData();
    } catch {
      toast.error("An error occurred while saving winner");
    } finally {
      setDeclaring(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/admin/winners?id=${revokeTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to revoke winner");
        return;
      }
      toast.success(`Revoked winner declaration for ${revokeTarget.user.name}`);
      setRevokeTarget(null);
      fetchData();
    } catch {
      toast.error("An error occurred while revoking winner");
    } finally {
      setRevoking(false);
    }
  };

  // Find winners for the active week & year
  const currentYearWinners = declaredWinners.filter(
    (w) => w.weekLabel === selectedWeek && w.year === selectedYear
  );
  const winner1 = currentYearWinners.find((w) => w.rank === 1);
  const winner2 = currentYearWinners.find((w) => w.rank === 2);
  const winner3 = currentYearWinners.find((w) => w.rank === 3);

  // Filter candidates by search
  const filteredCandidates = candidateSubmissions.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      s.user.name.toLowerCase().includes(q) ||
      s.user.uid.toLowerCase().includes(q) ||
      s.language.toLowerCase().includes(q)
    );
  });

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <div className="brand-gradient h-11 w-11 rounded-xl flex items-center justify-center text-brand-foreground shadow-md">
              <Trophy className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Weekly Winners Management</h1>
              <p className="text-sm text-muted-foreground">
                Inspect candidate solutions and manually declare separate Year 1 and Year 2 winners.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
          </Button>
        </motion.div>

        {/* Controls Bar: Week Selector & Year Selector */}
        <Card className="border-border/60 bg-card/60 backdrop-blur-sm">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-64">
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Select Weekly Challenge
                  </label>
                  <Select value={selectedWeek} onValueChange={setSelectedWeek}>
                    <SelectTrigger className="font-medium">
                      <SelectValue placeholder="Choose a week..." />
                    </SelectTrigger>
                    <SelectContent>
                      {weeklyChallenges.map((c) => (
                        <SelectItem key={c.id} value={c.weekLabel || c.title}>
                          {c.weekLabel || "Weekly"} — {c.title}
                        </SelectItem>
                      ))}
                      {weeklyChallenges.length === 0 && (
                        <SelectItem value="Week 1">Week 1</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Target Student Year
                  </label>
                  <Tabs value={selectedYear} onValueChange={setSelectedYear} className="w-auto">
                    <TabsList className="grid grid-cols-2 w-48">
                      <TabsTrigger value="1" className="text-xs font-semibold">
                        🎓 Year 1
                      </TabsTrigger>
                      <TabsTrigger value="2" className="text-xs font-semibold">
                        🎓 Year 2
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </div>

              <div className="w-full sm:w-64 self-end">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Search Candidates
                </label>
                <div className="relative">
                  <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search name or UID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Current Declared Winners Podium for the selected Week & Year */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold tracking-tight flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />
              Declared Podium — {selectedWeek || "Weekly Challenge"} (Year {selectedYear})
            </h2>
            <Badge variant="outline" className="text-xs font-normal">
              Year {selectedYear} Cohort
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1st Place / Winner */}
            <Card className={cn(
              "border relative overflow-hidden transition-all",
              winner1 ? "border-amber-500/50 bg-amber-500/5 shadow-md" : "border-dashed border-border/70 bg-muted/20"
            )}>
              <div className="h-1 bg-amber-500 w-full" />
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white gap-1 font-bold text-xs">
                    <Trophy className="h-3.5 w-3.5" /> 🏆 1st — Winner
                  </Badge>
                  {winner1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevokeTarget(winner1)}
                      className="h-6 px-2 text-rose-600 hover:text-rose-700 text-xs"
                    >
                      Revoke
                    </Button>
                  )}
                </div>

                {winner1 ? (
                  <div className="flex items-center gap-3">
                    <AvatarSvg config={winner1.user.avatar || {}} size={48} className="rounded-full ring-2 ring-amber-400" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm truncate">{winner1.user.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{winner1.user.uid}</div>
                      {winner1.submission && (
                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="font-mono">{winner1.submission.language}</span>
                          <span>•</span>
                          <span>{winner1.submission.execTimeMs}ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-5 text-center text-xs text-muted-foreground">
                    No Year {selectedYear} Winner declared yet.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2nd Place / 1st Runner Up */}
            <Card className={cn(
              "border relative overflow-hidden transition-all",
              winner2 ? "border-slate-400/50 bg-slate-400/5 shadow-md" : "border-dashed border-border/70 bg-muted/20"
            )}>
              <div className="h-1 bg-slate-400 w-full" />
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Badge variant="secondary" className="gap-1 font-bold text-xs">
                    <Medal className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" /> 🥈 2nd — 1st Runner Up
                  </Badge>
                  {winner2 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevokeTarget(winner2)}
                      className="h-6 px-2 text-rose-600 hover:text-rose-700 text-xs"
                    >
                      Revoke
                    </Button>
                  )}
                </div>

                {winner2 ? (
                  <div className="flex items-center gap-3">
                    <AvatarSvg config={winner2.user.avatar || {}} size={48} className="rounded-full ring-2 ring-slate-400" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm truncate">{winner2.user.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{winner2.user.uid}</div>
                      {winner2.submission && (
                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="font-mono">{winner2.submission.language}</span>
                          <span>•</span>
                          <span>{winner2.submission.execTimeMs}ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-5 text-center text-xs text-muted-foreground">
                    No Year {selectedYear} 1st Runner Up declared yet.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 3rd Place / 2nd Runner Up */}
            <Card className={cn(
              "border relative overflow-hidden transition-all",
              winner3 ? "border-amber-700/50 bg-amber-700/5 shadow-md" : "border-dashed border-border/70 bg-muted/20"
            )}>
              <div className="h-1 bg-amber-700 w-full" />
              <CardContent className="pt-5 pb-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <Badge variant="outline" className="gap-1 font-bold text-xs text-amber-700 dark:text-amber-500 border-amber-600/40">
                    <Award className="h-3.5 w-3.5" /> 🥉 3rd — 2nd Runner Up
                  </Badge>
                  {winner3 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevokeTarget(winner3)}
                      className="h-6 px-2 text-rose-600 hover:text-rose-700 text-xs"
                    >
                      Revoke
                    </Button>
                  )}
                </div>

                {winner3 ? (
                  <div className="flex items-center gap-3">
                    <AvatarSvg config={winner3.user.avatar || {}} size={48} className="rounded-full ring-2 ring-amber-700" />
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-sm truncate">{winner3.user.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{winner3.user.uid}</div>
                      {winner3.submission && (
                        <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="font-mono">{winner3.submission.language}</span>
                          <span>•</span>
                          <span>{winner3.submission.execTimeMs}ms</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-5 text-center text-xs text-muted-foreground">
                    No Year {selectedYear} 2nd Runner Up declared yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Candidate Submissions Table */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Candidate Submissions (Year {selectedYear})</span>
              <span className="text-xs font-normal text-muted-foreground">
                {filteredCandidates.length} submission{filteredCandidates.length === 1 ? "" : "s"} found
              </span>
            </CardTitle>
            <CardDescription>
              Review student code, test metrics, and execution time to choose and declare the winners.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>UID / Batch</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tests Passed</TableHead>
                    <TableHead>Exec Time</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredCandidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                        No submissions found for {selectedWeek} in Year {selectedYear}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCandidates.map((sub) => (
                      <TableRow key={sub.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <AvatarSvg config={sub.user.avatar || {}} size={32} className="rounded-full" />
                            <span className="font-medium text-sm">{sub.user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-mono text-xs text-muted-foreground">{sub.user.uid}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[11px] capitalize">
                            {sub.language}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "text-[11px] font-semibold",
                              sub.status === "Accepted"
                                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30"
                            )}
                          >
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">
                          {sub.passedCount} / {sub.totalTests}
                        </TableCell>
                        <TableCell className="font-mono text-xs tabular-nums">
                          {sub.execTimeMs}ms
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(sub.createdAt).toLocaleDateString()} {new Date(sub.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setInspectSub(sub)}
                              className="h-7 text-xs gap-1"
                            >
                              <Code2 className="h-3.5 w-3.5" /> Inspect
                            </Button>

                            <Select
                              onValueChange={(val) => {
                                const rank = Number(val);
                                const title = rank === 1 ? "Winner (1st)" : rank === 2 ? "1st Runner Up (2nd)" : "2nd Runner Up (3rd)";
                                setConfirmTarget({ sub, rank, title });
                              }}
                            >
                              <SelectTrigger className="h-7 w-28 text-xs font-semibold bg-primary/10 border-primary/30 text-primary">
                                <SelectValue placeholder="Declare..." />
                              </SelectTrigger>
                              <SelectContent align="end">
                                <SelectItem value="1">🏆 1st Winner</SelectItem>
                                <SelectItem value="2">🥈 1st Runner Up</SelectItem>
                                <SelectItem value="3">🥉 2nd Runner Up</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Inspect Code Modal */}
        <Dialog open={!!inspectSub} onOpenChange={(o) => { if (!o) setInspectSub(null); }}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between gap-2">
                <span>Code Submission — {inspectSub?.user.name}</span>
                <Badge variant="outline" className="font-mono capitalize text-xs">
                  {inspectSub?.language}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                UID: <span className="font-mono">{inspectSub?.user.uid}</span> • Status: <span className="font-semibold">{inspectSub?.status}</span> ({inspectSub?.passedCount}/{inspectSub?.totalTests} passed) • Execution Time: {inspectSub?.execTimeMs}ms
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto rounded-lg bg-zinc-950 p-4 font-mono text-xs text-zinc-100 border border-zinc-800">
              <pre className="whitespace-pre-wrap">{inspectSub?.code}</pre>
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between">
              <Button variant="outline" size="sm" onClick={() => setInspectSub(null)}>
                Close
              </Button>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-amber-700 dark:text-amber-400 border-amber-500/40"
                  onClick={() => {
                    if (inspectSub) {
                      setConfirmTarget({ sub: inspectSub, rank: 1, title: "Winner (1st)" });
                      setInspectSub(null);
                    }
                  }}
                >
                  <Trophy className="h-3.5 w-3.5 mr-1" /> Declare Winner
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (inspectSub) {
                      setConfirmTarget({ sub: inspectSub, rank: 2, title: "1st Runner Up (2nd)" });
                      setInspectSub(null);
                    }
                  }}
                >
                  <Medal className="h-3.5 w-3.5 mr-1" /> 1st Runner Up
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (inspectSub) {
                      setConfirmTarget({ sub: inspectSub, rank: 3, title: "2nd Runner Up (3rd)" });
                      setInspectSub(null);
                    }
                  }}
                >
                  <Award className="h-3.5 w-3.5 mr-1" /> 2nd Runner Up
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog before declaring */}
        <AlertDialog open={!!confirmTarget} onOpenChange={(o) => { if (!o) setConfirmTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" /> Confirm Winner Declaration
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 pt-2">
                <p>
                  Are you sure you want to declare <strong className="text-foreground">{confirmTarget?.sub.user.name}</strong> ({confirmTarget?.sub.user.uid}) as the <strong className="text-amber-600 dark:text-amber-400">Year {selectedYear} {confirmTarget?.title}</strong> for <strong className="text-foreground">{selectedWeek}</strong>?
                </p>
                <p className="text-xs text-muted-foreground">
                  This declaration will be saved separately for Year {selectedYear} and prominently featured in the Weekly Winners Hall of Fame.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={declaring}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeclare}
                disabled={declaring}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {declaring ? "Declaring..." : "Confirm & Declare"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Revoke Dialog */}
        <AlertDialog open={!!revokeTarget} onOpenChange={(o) => { if (!o) setRevokeTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" /> Revoke Winner Declaration?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to revoke the <strong className="text-foreground">{revokeTarget?.title}</strong> declaration for <strong className="text-foreground">{revokeTarget?.user.name}</strong> for {revokeTarget?.weekLabel}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={revoking}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevoke}
                disabled={revoking}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                {revoking ? "Revoking..." : "Revoke Declaration"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminGuard>
  );
}
