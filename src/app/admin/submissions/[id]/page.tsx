"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, FileCode2, Loader2, Star, Fingerprint, Clock, Zap, Trophy, Calendar,
  CheckCircle2, XCircle, AlertCircle, Eye, EyeOff, User, Code2, Award,
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { AvatarSvg } from "@/components/avatar-svg";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  runtimeDetail: RuntimeTest[];
  createdAt: string;
  user: SubmissionUser;
  challenge: SubmissionChallenge;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const lang = (language || "python").toLowerCase();
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
          lineNumberStyle={{ color: "#6b7280", paddingRight: "16px", userSelect: "none" }}
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
                      <Badge variant="outline" className="font-mono text-[10px]"><Fingerprint className="h-3 w-3 mr-1" /> {shortId(data.fingerprint, 12)}</Badge>
                    )}
                    <Badge variant="outline"><Calendar className="h-3 w-3 mr-1" /> {fmtDateTime(data.createdAt)}</Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              {/* Code */}
              <div className="lg:col-span-3 space-y-3">
                <Card className="border-border/60">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Code2 className="h-4 w-4 text-primary" /> Submitted code
                    </CardTitle>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {data.code ? data.code.split("\n").length : 0} lines · {data.language}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <CodeBlock code={data.code} language={data.language} />
                  </CardContent>
                </Card>
              </div>

              {/* Test results */}
              <div className="lg:col-span-2 space-y-3">
                <Card className="border-border/60">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="h-4 w-4 text-primary" /> Test case results
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {data.passedCount}/{data.totalTests} passed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {tests.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-6 text-center">
                        No per-test runtime detail recorded.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[640px] overflow-y-auto custom-scrollbar pr-1">
                        {tests.map((t, i) => {
                          const passed = !!t.passed;
                          return (
                            <div key={i} className={cn(
                              "rounded-lg border p-3 text-xs",
                              passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5",
                            )}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5">
                                  {passed ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : <XCircle className="h-3.5 w-3.5 text-rose-600" />}
                                  <span className="font-medium">{t.name || `Test ${i + 1}`}</span>
                                  {t.hidden ? (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground px-1 py-px rounded bg-muted/40">
                                      <EyeOff className="h-2.5 w-2.5" /> hidden
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground px-1 py-px rounded bg-muted/40">
                                      <Eye className="h-2.5 w-2.5" /> visible
                                    </span>
                                  )}
                                  {t.isSample && (
                                    <span className="text-[10px] text-amber-700 dark:text-amber-400 px-1 py-px rounded bg-amber-500/15 border border-amber-500/30">sample</span>
                                  )}
                                </div>
                                {typeof t.execMs === "number" && (
                                  <span className="text-[10px] text-muted-foreground tabular-nums">{fmtMs(t.execMs)}</span>
                                )}
                              </div>
                              {!passed && (t.stderr || t.actual || t.expected) && (
                                <div className="mt-2 space-y-1.5 font-mono text-[11px]">
                                  {t.expected && (
                                    <div>
                                      <span className="text-muted-foreground">expected:</span>
                                      <pre className="whitespace-pre-wrap bg-muted/30 rounded p-1.5 mt-0.5">{t.expected}</pre>
                                    </div>
                                  )}
                                  {t.actual && (
                                    <div>
                                      <span className="text-muted-foreground">actual:</span>
                                      <pre className="whitespace-pre-wrap bg-rose-500/10 rounded p-1.5 mt-0.5">{t.actual}</pre>
                                    </div>
                                  )}
                                  {t.stderr && (
                                    <div>
                                      <span className="text-muted-foreground">stderr:</span>
                                      <pre className="whitespace-pre-wrap bg-rose-500/10 rounded p-1.5 mt-0.5 text-rose-700 dark:text-rose-300">{t.stderr}</pre>
                                    </div>
                                  )}
                                </div>
                              )}
                              {passed && t.stdout && (
                                <div className="mt-2 font-mono text-[11px]">
                                  <span className="text-muted-foreground">stdout:</span>
                                  <pre className="whitespace-pre-wrap bg-muted/30 rounded p-1.5 mt-0.5">{t.stdout}</pre>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
