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

interface SubmissionRow {
  id: string;
  user: { uid: string; name: string; year?: string; avatar?: any };
  challenge: { id: string; title: string; slug: string; difficulty: string; category: string };
  language: string;
  status: string;
  passedAll: boolean;
  passedCount: number;
  totalTests: number;
  attemptNumber: number;
  execTimeMs: number;
  xpAwarded: number;
  isFinal: boolean;
  fingerprint?: string | null;
  createdAt: string;
}

const STATUS_OPTIONS = ["", "accepted", "wrong_answer", "time_limit", "memory_limit", "runtime_error", "compile_error"];
const LANG_OPTIONS = ["", "python", "cpp", "javascript", "java", "c", "go", "rust"];

function SubmissionsContent() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(searchParams.get("userId") || "");
  const [challengeId, setChallengeId] = useState(searchParams.get("challengeId") || "");
  const [status, setStatus] = useState(searchParams.get("status") || "");
  const [language, setLanguage] = useState(searchParams.get("language") || "");
  const [limit, setLimit] = useState(searchParams.get("limit") || "50");

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (userId.trim()) params.set("userId", userId.trim());
      if (challengeId.trim()) params.set("challengeId", challengeId.trim());
      if (status) params.set("status", status);
      if (language) params.set("language", language);
      if (limit) params.set("limit", limit);
      const res = await fetch(`/api/admin/submissions?${params.toString()}`);
      if (!res.ok) { toast.error("Failed to load submissions"); setRows([]); return; }
      const d = await res.json();
      setRows(d.submissions || []);
    } catch {
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [userId, challengeId, status, language, limit]);

  useEffect(() => {
    const t = setTimeout(fetchList, 150);
    return () => clearTimeout(t);
  }, [fetchList]);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="flex items-center gap-3">
          <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground">
            <FileCode2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Submissions</h1>
            <p className="text-sm text-muted-foreground">Browse every submission across the platform with code inspection.</p>
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

      {/* Table */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="overflow-x-auto custom-scrollbar max-h-[680px]">
            <Table>
              <TableHeader className="bg-muted/40 sticky top-0 z-10">
                <TableRow className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  <TableHead className="font-medium">Participant</TableHead>
                  <TableHead className="font-medium">Challenge</TableHead>
                  <TableHead className="font-medium">Lang</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
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
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-sm text-muted-foreground">
                      <div className="inline-flex flex-col items-center gap-2">
                        <FileCode2 className="h-8 w-8 text-muted-foreground/50" />
                        <div>No submissions match the current filters.</div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/admin/participants/${s.user.uid === s.user.name ? s.user.uid : ""}`} className="flex items-center gap-2 group">
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
          </div>
          {!loading && rows.length > 0 && (
            <div className="px-4 py-3 border-t border-border/60 text-xs text-muted-foreground">
              Showing {rows.length} submission{rows.length === 1 ? "" : "s"}.
            </div>
          )}
        </CardContent>
      </Card>
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
