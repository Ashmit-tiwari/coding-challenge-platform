"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, ShieldAlert, Loader2, Fingerprint, Clock, Calendar, Save, CheckCircle2, XCircle,
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { AvatarSvg } from "@/components/avatar-svg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  statusColor, simColor, yearBadge, yearLabel, langLabel, fmtDateTime, relTime,
} from "@/app/admin/_lib";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface SideSubmission {
  submissionId: string;
  user: { id: string; uid: string; name: string; year?: string; batch?: string | null; avatar?: any };
  challenge: { id: string; title: string; slug: string };
  language: string;
  attemptNumber: number;
  status: string;
  code: string;
  createdAt: string;
}

interface CompareResponse {
  flag: { id: string; similarity: number; method: string; reason: string; status: string; adminNote?: string | null; createdAt: string };
  live: { score: number; method: string; reason: string; fingerprint?: string };
  a: SideSubmission;
  b: SideSubmission;
}

function CodePane({ code, language, side }: { code: string; language: string; side: "A" | "B" }) {
  const lang = (language || "python").toLowerCase();
  return (
    <div className="rounded-lg overflow-hidden border border-border/60">
      <div className="px-3 py-2 flex items-center justify-between bg-muted/40 border-b border-border/60">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Submission {side}</div>
        <div className="text-[11px] text-muted-foreground font-mono">{code ? code.split("\n").length : 0} lines · {language}</div>
      </div>
      <div className="max-h-[640px] overflow-auto custom-scrollbar bg-[#1e1e1e]">
        <SyntaxHighlighter
          language={lang === "cpp" ? "cpp" : lang === "js" ? "javascript" : lang}
          style={vscDarkPlus}
          showLineNumbers
          customStyle={{
            margin: 0,
            padding: "16px",
            fontSize: 12,
            background: "#1e1e1e",
            fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
          }}
          lineNumberStyle={{ color: "#6b7280", paddingRight: "16px", userSelect: "none" }}
          wrapLongLines
        >
          {code || "// empty"}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export default function IntegrityComparePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pairId = (params?.pairId as string) || searchParams.get("pair") || "";

  const [data, setData] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [reviewStatus, setReviewStatus] = useState<"pending" | "reviewed" | "dismissed" | "confirmed">("pending");
  const [reviewNote, setReviewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCompare = useCallback(async () => {
    if (!pairId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/integrity/compare/${pairId}`);
      if (!res.ok) {
        if (res.status === 404) toast.error("Flag not found");
        else toast.error("Failed to load comparison");
        setData(null);
        return;
      }
      const d = await res.json();
      setData(d);
      setReviewStatus((d.flag?.status as any) || "pending");
      setReviewNote(d.flag?.adminNote || "");
    } catch {
      toast.error("Failed to load comparison");
    } finally {
      setLoading(false);
    }
  }, [pairId]);

  useEffect(() => { fetchCompare(); }, [fetchCompare]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/integrity/${pairId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reviewStatus, adminNote: reviewNote }),
      });
      if (!res.ok) { toast.error("Failed to update flag"); return; }
      toast.success("Review saved");
      fetchCompare();
    } finally {
      setSaving(false);
    }
  };

  if (loading || !data) {
    return (
      <AdminGuard>
        <div className="space-y-4">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
        </div>
      </AdminGuard>
    );
  }

  const sim = simColor(data.flag.similarity);
  const pct = (data.flag.similarity * 100).toFixed(1);
  const livePct = data.live?.score ? (data.live.score * 100).toFixed(1) : null;

  return (
    <AdminGuard>
      <div className="space-y-5">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/admin/integrity"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to integrity</Link>
          </Button>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className={cn("border-border/60 overflow-hidden", data.flag.status === "confirmed" && "border-rose-500/40")}>
            <div className="h-1 brand-gradient" />
            <CardContent className="pt-5">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className={cn("h-20 w-20 rounded-2xl flex items-center justify-center ring-2 flex-shrink-0", sim.bg, sim.ring)}>
                  <span className={cn("text-2xl font-bold tabular-nums", sim.color)}>{pct}%</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-semibold tracking-tight">Plagiarism comparison</h1>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded border", statusColor(data.flag.status))}>{data.flag.status}</span>
                    <span className={cn("text-xs font-semibold uppercase tracking-wide", sim.color)}>{sim.label}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{data.flag.reason}</div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1.5">
                    <span>Method: <span className="font-mono">{data.flag.method}</span></span>
                    <span>·</span>
                    <span>Flagged {relTime(data.flag.createdAt)}</span>
                    {livePct && (
                      <>
                        <span>·</span>
                        <span>Live recompute: <span className={cn("font-mono font-medium", simColor(Number(livePct) / 100).color)}>{livePct}%</span></span>
                      </>
                    )}
                    {data.live?.fingerprint && (
                      <>
                        <span>·</span>
                        <span className="font-mono">fp: {data.live.fingerprint.slice(0, 14)}…</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[{ side: "A" as const, sub: data.a }, { side: "B" as const, sub: data.b }].map(({ side, sub }) => (
            <Card key={side} className="border-border/60">
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full overflow-hidden ring-1 ring-border/60 flex-shrink-0">
                    <AvatarSvg config={sub.user.avatar ? (typeof sub.user.avatar === "object" && "config" in sub.user.avatar ? (sub.user.avatar as any).config : sub.user.avatar) : {}} size={48} />
                  </div>
                  <div className="min-w-0">
                    <Link href={`/admin/participants/${sub.user.id}`} className="font-medium text-sm hover:text-primary hover:underline truncate">
                      {sub.user.name || sub.user.uid}
                    </Link>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span className="font-mono">{sub.user.uid}</span>
                      {sub.user.year && <span className={cn("px-1 py-px rounded text-[10px] border", yearBadge(sub.user.year))}>{yearLabel(sub.user.year)}</span>}
                    </div>
                  </div>
                  <div className="ml-auto">
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded border", statusColor(sub.status))}>{sub.status}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border/60 p-2.5">
                    <div className="text-muted-foreground text-[10px]">Challenge</div>
                    <Link href={`/admin/challenges/${sub.challenge.id}`} className="font-medium hover:text-primary hover:underline truncate block">
                      {sub.challenge.title}
                    </Link>
                  </div>
                  <div className="rounded-lg border border-border/60 p-2.5">
                    <div className="text-muted-foreground text-[10px]">Language</div>
                    <div className="font-medium">{langLabel(sub.language)}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-2.5">
                    <div className="text-muted-foreground text-[10px]">Attempt</div>
                    <div className="font-medium">#{sub.attemptNumber}</div>
                  </div>
                  <div className="rounded-lg border border-border/60 p-2.5">
                    <div className="text-muted-foreground text-[10px]">Submitted</div>
                    <div className="font-medium text-[11px]" title={fmtDateTime(sub.createdAt)}>{relTime(sub.createdAt)}</div>
                  </div>
                </div>
                <Link href={`/admin/submissions/${sub.submissionId}`} className="text-xs text-primary hover:underline">
                  Open submission {side} →
                </Link>
                <CodePane code={sub.code} language={sub.language} side={side} />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Review controls */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" /> Admin review
            </CardTitle>
            <CardDescription className="text-xs">Set the status and add an optional note. Reviews are audit-logged.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Status</Label>
                <Select value={reviewStatus} onValueChange={(v) => setReviewStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending (no decision yet)</SelectItem>
                    <SelectItem value="reviewed">Reviewed (acknowledged, no penalty)</SelectItem>
                    <SelectItem value="confirmed">Confirmed plagiarism (take action)</SelectItem>
                    <SelectItem value="dismissed">Dismissed (false positive)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                  Save review
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Admin note</Label>
              <Textarea
                rows={3}
                placeholder="e.g. Same solution structure and identifier names — confirmed copy. Action: deduct 50 XP from both, notify students."
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  );
}
