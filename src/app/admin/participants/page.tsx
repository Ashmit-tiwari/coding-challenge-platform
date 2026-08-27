"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Users, Search, Ban, ShieldCheck, Loader2, Zap, CheckCircle2, Flame,
  Trophy, Award, Calendar, ArrowRight, AlertTriangle, UserX, UserCheck, Coins,
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { AvatarSvg } from "@/components/avatar-svg";
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
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { yearBadge, yearLabel, fmtDate } from "@/app/admin/_lib";

interface Participant {
  id: string;
  uid: string;
  name: string;
  year?: string;
  batch?: string | null;
  avatar: Record<string, string>;
  xp: number;
  level: number;
  levelName: string;
  currentStreak: number;
  longestStreak: number;
  solvedCount: number;
  attempts: number;
  achievements: number;
  certificates: number;
  isBanned: boolean;
  createdAt: string;
}

export default function AdminParticipantsPage() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("all");
  const [order, setOrder] = useState("xp");
  const [limit, setLimit] = useState("100");

  const [banTarget, setBanTarget] = useState<Participant | null>(null);
  const [xpTarget, setXpTarget] = useState<Participant | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Adjust XP dialog state
  const [xpAmount, setXpAmount] = useState<string>("");
  const [xpReason, setXpReason] = useState<string>("");

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (year !== "all") params.set("year", year);
      if (order) params.set("order", order);
      if (limit) params.set("limit", limit);
      const res = await fetch(`/api/admin/participants?${params.toString()}`);
      if (!res.ok) {
        toast.error("Failed to load participants");
        setParticipants([]);
        return;
      }
      const d = await res.json();
      setParticipants(d.participants || []);
    } catch (err) {
      toast.error("Failed to load participants");
    } finally {
      setLoading(false);
    }
  }, [search, year, order, limit]);

  useEffect(() => {
    const t = setTimeout(fetchList, search ? 350 : 0);
    return () => clearTimeout(t);
  }, [fetchList, search]);

  const handleBan = async () => {
    if (!banTarget) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/participants/${banTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBanned: !banTarget.isBanned, reason: banTarget.isBanned ? "unbanned by admin" : "banned by admin" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || "Action failed");
        return;
      }
      toast.success(banTarget.isBanned ? "Participant unbanned" : "Participant banned");
      setBanTarget(null);
      fetchList();
    } finally {
      setActionLoading(false);
    }
  };

  const handleXpAdjust = async () => {
    if (!xpTarget) return;
    const amt = Number(xpAmount);
    if (!Number.isFinite(amt) || amt === 0) {
      toast.error("Enter a non-zero XP amount");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/participants/${xpTarget.id}`, {
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
      setXpTarget(null);
      setXpAmount("");
      setXpReason("");
      fetchList();
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="flex items-center gap-3">
            <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Participants</h1>
              <p className="text-sm text-muted-foreground">
                Search, audit, ban or adjust XP for any registered student.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Filter bar */}
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-6">
                <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Name, UID, or username…"
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Year</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    <SelectItem value="1">Year 1</SelectItem>
                    <SelectItem value="2">Year 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Order by</Label>
                <Select value={order} onValueChange={setOrder}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xp">XP (high → low)</SelectItem>
                    <SelectItem value="solved">Solved (high → low)</SelectItem>
                    <SelectItem value="streak">Current streak</SelectItem>
                    <SelectItem value="recent">Most recent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label className="text-[11px] font-medium text-muted-foreground mb-1.5 block">Limit</Label>
                <Select value={limit} onValueChange={setLimit}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="250">250</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="border-border/60">
          <CardContent className="p-0">
            <div className="overflow-x-auto custom-scrollbar max-h-[640px]">
              <Table>
                <TableHeader className="bg-muted/40 sticky top-0 z-10">
                  <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    <TableHead className="font-medium">Participant</TableHead>
                    <TableHead className="font-medium">Level</TableHead>
                    <TableHead className="font-medium text-right">XP</TableHead>
                    <TableHead className="font-medium text-right">Solved</TableHead>
                    <TableHead className="font-medium text-right">Attempts</TableHead>
                    <TableHead className="font-medium text-right">Streak</TableHead>
                    <TableHead className="font-medium text-right">Badges</TableHead>
                    <TableHead className="font-medium text-right">Certs</TableHead>
                    <TableHead className="font-medium">Created</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="flex items-center gap-2"><Skeleton className="h-9 w-9 rounded-full" /><div className="space-y-1"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-20" /></div></div></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-12" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-10" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-7 w-24" /></TableCell>
                      </TableRow>
                    ))
                  ) : participants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-sm text-muted-foreground">
                        <div className="inline-flex flex-col items-center gap-2">
                          <Users className="h-8 w-8 text-muted-foreground/50" />
                          <div>No participants match the current filters.</div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : participants.map((p) => (
                    <TableRow key={p.id} className={cn(p.isBanned && "opacity-70")}>
                      <TableCell>
                        <Link href={`/admin/participants/${p.id}`} className="flex items-center gap-2.5 group">
                          <div className="h-9 w-9 rounded-full overflow-hidden ring-1 ring-border/60 flex-shrink-0">
                            <AvatarSvg config={p.avatar || {}} size={36} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-sm truncate group-hover:text-primary">
                                {p.name || p.uid}
                              </span>
                              {p.isBanned && (
                                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30">
                                  <Ban className="h-2.5 w-2.5" /> banned
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span className="font-mono">{p.uid}</span>
                              {p.year && (
                                <span className={cn("px-1 py-px rounded text-[10px] border", yearBadge(p.year))}>
                                  {yearLabel(p.year)}
                                </span>
                              )}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[11px]">L{p.level}</Badge>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{p.levelName || "—"}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium tabular-nums">
                          <Zap className="h-3.5 w-3.5" />
                          {p.xp.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {p.solvedCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{p.attempts}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className={cn("inline-flex items-center gap-1", p.currentStreak > 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground")}>
                          <Flame className="h-3.5 w-3.5" />
                          {p.currentStreak}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-violet-700 dark:text-violet-400 tabular-nums">
                          <Award className="h-3.5 w-3.5" />
                          {p.achievements}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="inline-flex items-center gap-1 text-primary tabular-nums">
                          <Trophy className="h-3.5 w-3.5" />
                          {p.certificates}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(p.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                            <Link href={`/admin/participants/${p.id}`}>
                              View <ArrowRight className="h-3 w-3 ml-1" />
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={cn("h-7 px-2", p.isBanned ? "text-emerald-600 hover:text-emerald-700" : "text-rose-600 hover:text-rose-700")}
                            onClick={() => setBanTarget(p)}
                          >
                            {p.isBanned ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                            <span className="ml-1 text-xs">{p.isBanned ? "Unban" : "Ban"}</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => setXpTarget(p)}
                          >
                            <Coins className="h-3.5 w-3.5 text-amber-600" />
                            <span className="ml-1 text-xs">XP</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!loading && participants.length > 0 && (
              <div className="px-4 py-3 border-t border-border/60 text-xs text-muted-foreground">
                Showing {participants.length} participant{participants.length === 1 ? "" : "s"}.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ban confirm */}
        <AlertDialog open={!!banTarget} onOpenChange={(o) => { if (!o) setBanTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                {banTarget?.isBanned ? "Unban participant" : "Ban participant"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {banTarget?.isBanned
                  ? `This will restore access for ${banTarget?.name || banTarget?.uid}. They will be able to log in and submit again.`
                  : `This will block ${banTarget?.name || banTarget?.uid} from logging in or submitting. The action is logged in the audit trail.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBan}
                disabled={actionLoading}
                className={banTarget?.isBanned ? "" : "bg-rose-600 hover:bg-rose-700 text-white"}
              >
                {actionLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Confirm {banTarget?.isBanned ? "unban" : "ban"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* XP adjust */}
        <Dialog open={!!xpTarget} onOpenChange={(o) => { if (!o) { setXpTarget(null); setXpAmount(""); setXpReason(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" /> Adjust XP
              </DialogTitle>
              <DialogDescription>
                Apply an XP adjustment to <span className="font-medium">{xpTarget?.name || xpTarget?.uid}</span>.
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
              <Button variant="outline" onClick={() => { setXpTarget(null); setXpAmount(""); setXpReason(""); }} disabled={actionLoading}>
                Cancel
              </Button>
              <Button onClick={handleXpAdjust} disabled={actionLoading}>
                {actionLoading ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Coins className="h-4 w-4 mr-1.5" />}
                Apply adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
