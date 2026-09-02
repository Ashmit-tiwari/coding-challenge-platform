"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, FileCode2, Loader2, Star, Fingerprint, Clock, Zap, Trophy, Calendar,
  CheckCircle2, XCircle, AlertCircle, Eye, EyeOff, User, Code2, Award,
  AlertTriangle, Copy, ShieldAlert, Sparkles, Check,
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { AvatarSvg } from "@/components/avatar-svg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  statusColor, yearBadge, yearLabel, langLabel, fmtMs, fmtDateTime, relTime, shortId,
} from "@/app/admin/_lib";
// Code syntax highlighter
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface SubmissionUser {
  id: string; uid: string; name: string; year?: string; batch?: string | null;
  avatar?: any;
}
interface SubmissionChallenge {
  id: string; title: string; slug: string; difficulty: string; category: string; xpReward: number;
}
interface RuntimeTest {
  name?: string; passed?: boolean; hidden?: boolean; isSample?: boolean;
  execMs?: number; stdout?: string; stderr?: string; expected?: string; actual?: string;
}

interface SubmissionDetail {
  id: string;
  code: string;
  language: string;
  status: string;
  passedAll: boolean;
  passedCount: number;
  totalTests: number;
  attemptNumber: number;
  execTimeMs: number;
  isFinal: boolean;
  firstAttempt: boolean;
  xpAwarded: number;
  fingerprint?: string | null;
  tabSwitchesCount?: number;
  pasteCount?: number;
  totalPastedLines?: number;
  pastedLines?: number[];
  integrityMetadata?: any;
  runtimeDetail: RuntimeTest[];
  createdAt: string;
  user: SubmissionUser;
  challenge: SubmissionChallenge;
}

function CodeBlock({
  code,
  language,
  pastedLines = [],
  highlightPasted = true,
}: {
  code: string;
  language: string;
  pastedLines?: number[];
  highlightPasted?: boolean;
}) {
  const lang = (language || "python").toLowerCase();
  const pastedSet = useMemo(() => new Set(pastedLines || []), [pastedLines]);

  return (
    <div className="rounded-lg overflow-hidden border border-border/60">
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
          lineNumberStyle={(lineNumber: number) => ({
            color: highlightPasted && pastedSet.has(lineNumber) ? "#f87171" : "#6b7280",
            fontWeight: highlightPasted && pastedSet.has(lineNumber) ? "bold" : "normal",
            paddingRight: "16px",
            userSelect: "none",
          })}
          lineProps={(lineNumber: number) => {
            const isPasted = highlightPasted && pastedSet.has(lineNumber);
            return {
              style: {
                display: "block",
                backgroundColor: isPasted ? "rgba(239, 68, 68, 0.22)" : "transparent",
                borderLeft: isPasted ? "4px solid #ef4444" : "4px solid transparent",
                paddingLeft: "8px",
                position: "relative",
              },
            };
          }}
          wrapLongLines
        >
          {code || "// empty submission"}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

export default function SubmissionInspectorPage() {
  const params = useParams();
  const id = (params?.id as string) || "";
  const [data, setData] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [highlightPasted, setHighlightPasted] = useState(true);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`);
      if (!res.ok) {
        if (res.status === 404) toast.error("Submission not found");
        else toast.error("Failed to load submission");
        setData(null);
        return;
      }
      const d = await res.json();
      setData(d.submission);
    } catch {
      toast.error("Failed to load submission");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const tests = useMemo<RuntimeTest[]>(() => data?.runtimeDetail || [], [data]);
  const hasIntegrityFlags = (data?.tabSwitchesCount || 0) > 0 || (data?.pasteCount || 0) > 0;

  return (
    <AdminGuard>
      <div className="space-y-5">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/admin/submissions"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to submissions</Link>
          </Button>
        </div>

        {loading || !data ? (
          <>
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </>
        ) : (
          <>
            {/* Header */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <Card className="border-border/60 overflow-hidden">
                <div className="h-1 brand-gradient" />
                <CardContent className="pt-5">
                  <div className="flex flex-col lg:flex-row gap-5">
                    {/* User */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Participant</div>
                      <div className="flex items-center gap-2.5">
                        <div className="h-10 w-10 rounded-full overflow-hidden ring-1 ring-border/60">
                          <AvatarSvg config={data.user.avatar ? (typeof data.user.avatar === "object" && "config" in data.user.avatar ? (data.user.avatar as any).config : data.user.avatar) : {}} size={40} />
                        </div>
                        <div className="min-w-0">
                          <Link href={`/admin/participants/${data.user.id}`} className="font-medium text-sm hover:text-primary hover:underline">
                            {data.user.name || data.user.uid}
                          </Link>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="font-mono">{data.user.uid}</span>
                            {data.user.year && <span className={cn("px-1 py-px rounded text-[10px] border", yearBadge(data.user.year))}>{yearLabel(data.user.year)}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Challenge */}
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Challenge</div>
                      <Link href={`/admin/challenges/${data.challenge.id}`} className="font-medium text-sm hover:text-primary hover:underline">
                        {data.challenge.title}
                      </Link>
                      <div className="text-[11px] text-muted-foreground capitalize">{data.challenge.difficulty} · {data.challenge.category} · +{data.challenge.xpReward} XP</div>
                    </div>
                    {/* Status */}
                    <div className="flex-shrink-0">
                      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Status</div>
                      <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-1 rounded border", statusColor(data.status))}>
                        {data.passedAll ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {data.status}
                      </span>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="flex flex-wrap gap-3 text-xs">
                    <Badge variant="outline" className="font-mono"><Code2 className="h-3 w-3 mr-1" /> {langLabel(data.language)}</Badge>
                    <Badge variant="outline"><Clock className="h-3 w-3 mr-1" /> {fmtMs(data.execTimeMs)}</Badge>
                    <Badge variant="outline"><Calendar className="h-3 w-3 mr-1" /> Attempt #{data.attemptNumber}</Badge>
                    <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/30"><Zap className="h-3 w-3 mr-1" /> {data.xpAwarded > 0 ? `+${data.xpAwarded} XP` : "no XP"}</Badge>
                    <Badge variant="outline">{data.firstAttempt ? "First attempt" : "Retake"}</Badge>
                    {data.isFinal && <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/30"><Star className="h-3 w-3 mr-1" /> Final</Badge>}
                    {data.fingerprint && (
                      <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                        <Fingerprint className="h-3 w-3 mr-1" /> fp:{data.fingerprint.slice(0, 10)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* ANTI-CHEAT & CODE INTEGRITY TELEMETRY CARD */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, delay: 0.05 }}>
              <Card className={cn(
                "border overflow-hidden",
                hasIntegrityFlags ? "border-amber-500/50 bg-amber-500/5" : "border-border/60"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className={cn("h-4 w-4", hasIntegrityFlags ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")} />
                      <CardTitle className="text-sm font-semibold">Code Integrity & Anti-Cheat Telemetry</CardTitle>
                    </div>
                    {hasIntegrityFlags ? (
                      <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                        ⚠️ Suspicious Activity Logged
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                        ✓ Clean Session
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    Live telemetry recorded while the participant wrote and submitted this solution.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className={cn(
                      "p-3 rounded-lg border flex flex-col justify-between",
                      (data.tabSwitchesCount || 0) > 0 ? "bg-amber-500/10 border-amber-500/40 text-amber-900 dark:text-amber-200" : "bg-muted/30 border-border/60"
                    )}>
                      <div className="text-xs text-muted-foreground">Tab / Window Switches</div>
                      <div className="text-xl font-bold flex items-center gap-1.5 mt-1">
                        {(data.tabSwitchesCount || 0) > 0 ? "⚠️" : "✓"} {data.tabSwitchesCount || 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {(data.tabSwitchesCount || 0) > 0 ? "Participant navigated away during solving" : "No tab switching detected"}
                      </div>
                    </div>

                    <div className={cn(
                      "p-3 rounded-lg border flex flex-col justify-between",
                      (data.pasteCount || 0) > 0 ? "bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200" : "bg-muted/30 border-border/60"
                    )}>
                      <div className="text-xs text-muted-foreground">Paste Events</div>
                      <div className="text-xl font-bold flex items-center gap-1.5 mt-1">
                        {(data.pasteCount || 0) > 0 ? "📋" : "✓"} {data.pasteCount || 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {(data.pasteCount || 0) > 0 ? `${data.pasteCount} clipboard paste event(s)` : "No external pastes detected"}
                      </div>
                    </div>

                    <div className={cn(
                      "p-3 rounded-lg border flex flex-col justify-between",
                      (data.totalPastedLines || 0) > 0 ? "bg-rose-500/10 border-rose-500/40 text-rose-900 dark:text-rose-200" : "bg-muted/30 border-border/60"
                    )}>
                      <div className="text-xs text-muted-foreground">Total Pasted Lines</div>
                      <div className="text-xl font-bold flex items-center gap-1.5 mt-1">
                        {(data.totalPastedLines || 0) > 0 ? "🔴" : "✓"} {data.totalPastedLines || 0}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {(data.totalPastedLines || 0) > 0 ? "Highlighted in RED below in code editor" : "100% typed manually in editor"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Code */}
            <Card className="border-border/60">
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileCode2 className="h-4 w-4 text-primary" /> Submitted Code
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Exact source code evaluated by the judge runner.
                  </CardDescription>
                </div>

                {/* Red Highlight Toggle */}
                {(data.totalPastedLines || 0) > 0 && (
                  <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg text-xs">
                    <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <Label htmlFor="highlight-switch" className="text-xs font-semibold text-rose-700 dark:text-rose-300 cursor-pointer">
                      Highlight Pasted Lines in RED ({data.totalPastedLines} lines)
                    </Label>
                    <Switch
                      id="highlight-switch"
                      checked={highlightPasted}
                      onCheckedChange={setHighlightPasted}
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="pt-0">
                <CodeBlock
                  code={data.code}
                  language={data.language}
                  pastedLines={data.pastedLines || []}
                  highlightPasted={highlightPasted}
                />
              </CardContent>
            </Card>

            {/* Test case breakdown */}
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Test Case Results ({data.passedCount}/{data.totalTests} passed)</CardTitle>
                <CardDescription className="text-xs">Detailed per-test output, execution time, and error streams.</CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {tests.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No per-test runtime details available.</div>
                ) : (
                  tests.map((t, idx) => (
                    <div key={idx} className={cn("p-3 rounded-lg border text-xs space-y-2", t.passed ? "bg-emerald-500/5 border-emerald-500/30" : "bg-rose-500/5 border-rose-500/30")}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold flex items-center gap-1.5">
                          {t.passed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                          {t.name || `Test ${idx + 1}`}
                          {t.hidden && <Badge variant="secondary" className="text-[10px]">Hidden</Badge>}
                          {t.isSample && <Badge variant="outline" className="text-[10px]">Sample</Badge>}
                        </span>
                        <span className="text-muted-foreground text-[11px] font-mono">{t.execMs ? fmtMs(t.execMs) : ""}</span>
                      </div>
                      {t.expected !== undefined && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px] pt-1">
                          <div className="bg-background/80 p-2 rounded border border-border/60">
                            <div className="text-[10px] text-muted-foreground uppercase font-sans mb-1">Expected</div>
                            <pre className="overflow-x-auto whitespace-pre-wrap">{t.expected || "<empty>"}</pre>
                          </div>
                          <div className="bg-background/80 p-2 rounded border border-border/60">
                            <div className="text-[10px] text-muted-foreground uppercase font-sans mb-1">Actual</div>
                            <pre className="overflow-x-auto whitespace-pre-wrap">{t.actual || t.stdout || "<empty>"}</pre>
                          </div>
                        </div>
                      )}
                      {t.stderr && (
                        <div className="bg-background/80 p-2 rounded border border-rose-500/30 font-mono text-[11px] text-rose-600 dark:text-rose-400">
                          <div className="text-[10px] text-muted-foreground uppercase font-sans mb-1">Stderr</div>
                          <pre className="overflow-x-auto whitespace-pre-wrap">{t.stderr}</pre>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
