"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ShieldAlert, Loader2, ArrowRight, Filter, RefreshCw, CheckCircle2, XCircle,
  AlertTriangle, Eye, Search,
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { statusColor, simColor, fmtDateTime, relTime, langLabel } from "@/app/admin/_lib";

interface FlagRow {
  id: string;
  similarity: number;
  method: string;
  reason: string;
  status: string;
  adminNote?: string | null;
  reviewer?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  a: { submissionId: string; user: { uid: string; name: string; year?: string }; challenge: { id: string; title: string; slug: string }; language: string; attemptNumber: number; createdAt: string; status: string };
  b: { submissionId: string; user: { uid: string; name: string; year?: string }; challenge: { id: string; title: string; slug: string }; language: string; attemptNumber: number; createdAt: string; status: string };
}

interface ChallengeOption { id: string; title: string; slug: string; }

export default function AdminIntegrityPage() {
  const [flags, setFlags] = useState<FlagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("pending");
  const [minScore, setMinScore] = useState(0.5);
  const [counts, setCounts] = useState({ pending: 0, confirmed: 0, reviewed: 0, dismissed: 0, total: 0 });

  // review dialog
  const [reviewTarget, setReviewTarget] = useState<FlagRow | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"reviewed" | "dismissed" | "confirmed">("reviewed");
  const [reviewNote, setReviewNote] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);

  // recompute dialog
  const [recomputeOpen, setRecomputeOpen] = useState(false);
  const [challenges, setChallenges] = useState<ChallengeOption[]>([]);
  const [recomputeChallenge, setRecomputeChallenge] = useState<string>("");
  const [recomputing, setRecomputing] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status && status !== "all") params.set("status", status);
      params.set("minScore", String(minScore));
      const res = await fetch(`/api/admin/integrity?${params.toString()}`);
      if (!res.ok) { toast.error("Failed to load flags"); setFlags([]); return; }
      const d = await res.json();
      setFlags(d.flags || []);
      // also compute counts from a parallel fetch of all
      const allRes = await fetch(`/api/admin/integrity`);
      if (allRes.ok) {
        const all = await allRes.json();
        const list: FlagRow[] = all.flags || [];
        setCounts({
          pending: list.filter((f) => f.status === "pending").length,
          confirmed: list.filter((f) => f.status === "confirmed").length,
          reviewed: list.filter((f) => f.status === "reviewed").length,
          dismissed: list.filter((f) => f.status === "dismissed").length,
          total: list.length,
        });
      }
    } catch {
      toast.error("Failed to load flags");
    } finally {
      setLoading(false);
    }
  }, [status, minScore]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openRecompute = async () => {
    setRecomputeOpen(true);
    try {
      const res = await fetch(`/api/admin/challenges?status=all`);
      if (res.ok) {
        const d = await res.json();
        setChallenges(d.challenges || []);
      }
    } catch {}
  };

  const handleRecompute = async () => {
    if (!recomputeChallenge) { toast.error("Pick a challenge"); return; }
    setRecomputing(true);
    try {
      const res = await fetch(`/api/admin/integrity/recompute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: recomputeChallenge }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || "Recompute failed"); return; }
      toast.success(`Scanned ${d.submissionsScanned || 0} submissions · ${d.flagsCreated || 0} new flag${(d.flagsCreated || 0) === 1 ? "" : "s"}`);
      setRecomputeOpen(false);
      setRecomputeChallenge("");
      fetchList();
    } finally {
      setRecomputing(false);
    }
  };

  const handleReview = async () => {
    if (!reviewTarget) return;
    setReviewSaving(true);
    try {
      const res = await fetch(`/api/admin/integrity/${reviewTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reviewStatus, adminNote: reviewNote }),
      });
      if (!res.ok) { toast.error("Failed to update flag"); return; }
      toast.success(`Flag marked as ${reviewStatus}`);
      setReviewTarget(null);
      setReviewNote("");
      fetchList();
    } finally {
      setReviewSaving(false);
    }
  };

  const STATUS_TABS = [
    { v: "pending", label: "Pending", color: "amber" },
    { v: "reviewed", label: "Reviewed", color: "emerald" },
    { v: "confirmed", label: "Confirmed", color: "rose" },
    { v: "dismissed", label: "Dismissed", color: "muted" },
    { v: "all", label: "All", color: "primary" },
  ];

  return (
    <AdminGuard>
      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Integrity monitoring</h1>
              <p className="text-sm text-muted-foreground">Plagiarism flags surfaced by the code similarity engine.</p>
            </div>
          </div>
          <Button onClick={openRecompute} variant="outline">
            <RefreshCw className="h-4 w-4 mr-1.5" /> Recompute similarity
          </Button>
        </motion.div>

        {/* Counts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-amber-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Pending review</span>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="text-2xl font-semibold mt-1 tabular-nums text-amber-700 dark:text-amber-400">{counts.pending}</div>
            </CardContent>
          </Card>
          <Card className="border-emerald-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Reviewed</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-semibold mt-1 tabular-nums text-emerald-700 dark:text-emerald-400">{counts.reviewed}</div>
            </CardContent>
          </Card>
          <Card className="border-rose-500/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Confirmed plagiarism</span>
                <XCircle className="h-4 w-4 text-rose-600" />
              </div>
              <div className="text-2xl font-semibold mt-1 tabular-nums text-rose-700 dark:text-rose-400">{counts.confirmed}</div>
            </CardContent>
          </Card>
          <Card className="border-border/60">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Dismissed / total</span>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="text-2xl font-semibold mt-1 tabular-nums text-muted-foreground">
                {counts.dismissed} <span className="text-base text-muted-foreground">/ {counts.total}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col md:flex-row gap-4 md:items-end">
              <div className="flex-1">
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</Label>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_TABS.map((s) => (
                    <Button
                      key={s.v}
                      variant={status === s.v ? "default" : "outline"}
                      size="sm"
                      onClick={() => setStatus(s.v)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="md:w-72">
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Minimum similarity</Label>
                  <span className="text-xs tabular-nums font-mono">{(minScore * 100).toFixed(0)}%</span>
                </div>
                <Slider
                  value={[minScore]}
                  min={0}
                  max={1}
                  step={0.05}
                  onValueChange={(v) => setMinScore(v[0])}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Flag list */}
        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border/60"><CardContent className="pt-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
            ))
          ) : flags.length === 0 ? (
            <Card className="border-dashed border-border/60">
              <CardContent className="py-14 text-center">
                <ShieldAlert className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="mt-3 text-sm font-medium">No integrity flags match the current filters.</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lower the similarity threshold, run "Recompute similarity", or check the pending status.
                </p>
              </CardContent>
            </Card>
          ) : flags.map((flag) => {
            const sim = simColor(flag.similarity);
            const pct = (flag.similarity * 100).toFixed(1);
            return (
              <Card key={flag.id} className={cn("border-border/60", flag.status === "confirmed" && "border-rose-500/40")}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <div className={cn("h-14 w-14 rounded-xl flex items-center justify-center ring-1", sim.bg, sim.ring)}>
                        <span className={cn("text-xl font-bold tabular-nums", sim.color)}>{pct}%</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={cn("text-xs font-semibold uppercase tracking-wide", sim.color)}>{sim.label} similarity</span>
                          <span className="text-[11px] text-muted-foreground">·</span>
                          <span className="text-xs text-muted-foreground">{flag.method}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">{flag.reason}</div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={cn("text-[11px] px-1.5 py-0.5 rounded border", statusColor(flag.status))}>
                            {flag.status}
                          </span>
                          {flag.reviewer && (
                            <span className="text-[11px] text-muted-foreground">by {flag.reviewer} · {relTime(flag.reviewedAt)}</span>
                          )}
                          <span className="text-[11px] text-muted-foreground">· {relTime(flag.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/integrity/${flag.id}`}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Compare <ArrowRight className="h-3 w-3 ml-1" />
                        </Link>
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setReviewTarget(flag); setReviewStatus((flag.status as any) || "reviewed"); setReviewNote(flag.adminNote || ""); }}>
                        Review
                      </Button>
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border/60 p-3 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-medium">Submission A</div>
                        <span className={cn("text-[10px] px-1 py-px rounded border", statusColor(flag.a.status))}>{flag.a.status}</span>
                      </div>
                      <div className="text-muted-foreground">
                        <Link href={`/admin/submissions/${flag.a.submissionId}`} className="font-medium hover:text-primary hover:underline">{flag.a.user.name || flag.a.user.uid}</Link>
                        <span className="mx-1.5">·</span>
                        <Link href={`/admin/challenges/${flag.a.challenge.id}`} className="hover:text-primary hover:underline">{flag.a.challenge.title}</Link>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {langLabel(flag.a.language)} · attempt #{flag.a.attemptNumber} · {fmtDateTime(flag.a.createdAt)}
                      </div>
                    </div>
                    <div className="rounded-lg border border-border/60 p-3 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="font-medium">Submission B</div>
                        <span className={cn("text-[10px] px-1 py-px rounded border", statusColor(flag.b.status))}>{flag.b.status}</span>
                      </div>
                      <div className="text-muted-foreground">
                        <Link href={`/admin/submissions/${flag.b.submissionId}`} className="font-medium hover:text-primary hover:underline">{flag.b.user.name || flag.b.user.uid}</Link>
                        <span className="mx-1.5">·</span>
                        <Link href={`/admin/challenges/${flag.b.challenge.id}`} className="hover:text-primary hover:underline">{flag.b.challenge.title}</Link>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {langLabel(flag.b.language)} · attempt #{flag.b.attemptNumber} · {fmtDateTime(flag.b.createdAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Review dialog */}
        <Dialog open={!!reviewTarget} onOpenChange={(o) => { if (!o) { setReviewTarget(null); setReviewNote(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-primary" /> Review flag
              </DialogTitle>
              <DialogDescription>
                Set a status and optional admin note. Reviews are audit-logged.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</Label>
                <Select value={reviewStatus} onValueChange={(v) => setReviewStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reviewed">Reviewed (acknowledged, no penalty)</SelectItem>
                    <SelectItem value="confirmed">Confirmed plagiarism (take action)</SelectItem>
                    <SelectItem value="dismissed">Dismissed (false positive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Admin note</Label>
                <Textarea
                  rows={3}
                  placeholder="e.g. Same solution as user X — confirmed copy. Action: deduct 50 XP and notify student."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setReviewTarget(null); setReviewNote(""); }} disabled={reviewSaving}>Cancel</Button>
              <Button onClick={handleReview} disabled={reviewSaving}>
                {reviewSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                Save review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Recompute dialog */}
        <Dialog open={recomputeOpen} onOpenChange={setRecomputeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" /> Recompute similarity
              </DialogTitle>
              <DialogDescription>
                Pick a challenge to re-fingerprint every submission and re-evaluate all pairs above threshold.
                This may create new flags but will not remove existing ones.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Challenge</Label>
              <Select value={recomputeChallenge} onValueChange={setRecomputeChallenge}>
                <SelectTrigger><SelectValue placeholder="Select a challenge" /></SelectTrigger>
                <SelectContent>
                  {challenges.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title} <span className="text-muted-foreground ml-2 font-mono text-[10px]">/{c.slug}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRecomputeOpen(false)} disabled={recomputing}>Cancel</Button>
              <Button onClick={handleRecompute} disabled={recomputing}>
                {recomputing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                Run recompute
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminGuard>
  );
}
