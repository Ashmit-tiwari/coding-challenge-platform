"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Bug,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleSlash,
  Clock,
  Cpu,
  Code2,
  Crown,
  FileCode2,
  Flame,
  Gauge,
  Hammer,
  History,
  Loader2,
  Lock,
  Medal,
  PartyPopper,
  Play,
  RefreshCw,
  Sparkles,
  Star,
  Terminal,
  TrendingUp,
  Trophy,
  Wand2,
  XCircle,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import { AvatarSvg } from "@/components/avatar-svg";
import { useAuth } from "@/lib/store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types — mirror of /api/challenges/[slug] + /api/submissions response
// ---------------------------------------------------------------------------
interface SampleTest {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  isSample?: boolean;
  isHidden?: boolean;
}

interface UserSubmission {
  id: string;
  language: string;
  status: string;
  passedAll: boolean;
  attemptNumber: number;
  createdAt: string;
  execTimeMs: number;
}

interface UserState {
  solved: boolean;
  attempted: boolean;
  attempts: number;
  submissions: UserSubmission[];
}

interface Challenge {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  statement: string;
  difficulty: string;
  category: string;
  topic?: string | null;
  xpReward: number;
  targetYear?: string | null;
  isWeekly: boolean;
  weekLabel?: string | null;
  weekStartsAt?: string | null;
  weekEndsAt?: string | null;
  timeLimitMs: number;
  memoryLimitMb: number;
  languages: string[];
  constraints?: string | null;
  examples: { input: string; output: string; explanation?: string }[];
  inputFormat?: string | null;
  outputFormat?: string | null;
  starterCode: Record<string, string>;
  createdAt: string;
}

interface ChallengeDetailResponse {
  challenge: Challenge;
  sampleTests: SampleTest[];
  hiddenTestsCount: number;
  userState: UserState | null;
}

interface TestResult {
  name: string;
  isHidden: boolean;
  status: string;
  passed: boolean;
  execTimeMs: number;
  stdout: string;
  stderr: string;
  expected?: string;
  message?: string;
}

interface SubmissionResult {
  submission: {
    id: string;
    status: string;
    passedAll: boolean;
    passedCount: number;
    totalTests: number;
    attemptNumber: number;
    execTimeMs: number;
    xpAwarded: number;
    xpBreakdown: { base: number; firstAttemptBonus: number; total: number } | null;
    firstAttempt: boolean;
  };
  results: TestResult[];
  newlySolved: boolean;
  leveledUp: boolean;
  levelInfo: { level: number; tier: string } | null;
  unlockedAchievements: {
    id: string;
    key: string;
    name: string;
    description: string;
    rarity: string;
    icon: string;
    xpReward: number;
  }[];
  newCertificates: { id: string; certId: string; level: number; tierLevel: number }[];
  nextAttemptNumber: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LANG_LABELS: Record<string, string> = {
  python: "Python 3",
  cpp: "C++ 17",
  javascript: "JavaScript",
};

const LANG_MONO: Record<string, string> = {
  python: "py",
  cpp: "cpp",
  javascript: "js",
};

const ACHIEVEMENT_ICONS: Record<string, LucideIcon> = {
  Code2,
  Code: Code2,
  CheckCircle2,
  Zap,
  Sparkles,
  ShieldCheck: Award,
  Trophy,
  Award,
  Crown,
  Flame,
  Gauge,
  Bug,
  Calendar,
  Hammer,
  Medal,
  Binary: Code2,
  Mountain: Trophy,
  Star,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function difficultyColor(d?: string) {
  switch ((d || "").toLowerCase()) {
    case "easy":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "medium":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "hard":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "expert":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function submissionStatusColor(s: string) {
  switch ((s || "").toLowerCase()) {
    case "accepted":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30";
    case "wrong answer":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30";
    case "compilation error":
    case "runtime error":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30";
    case "time limit exceeded":
    case "memory limit exceeded":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30";
    case "internal error":
      return "bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function formatMs(ms: number) {
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s`;
  return `${ms}ms`;
}

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNowStrict(new Date(iso), { addSuffix: true });
  } catch {
    return "just now";
  }
}

function rarityStyles(rarity: string) {
  switch ((rarity || "common").toLowerCase()) {
    case "common":
      return "bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-slate-500/30";
    case "rare":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 ring-emerald-500/30";
    case "epic":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-300 ring-amber-500/30";
    case "legendary":
      return "bg-gradient-to-br from-amber-500/25 to-rose-500/25 text-rose-600 dark:text-rose-300 ring-rose-500/30";
    default:
      return "bg-slate-500/15 text-slate-600 dark:text-slate-300 ring-slate-500/30";
  }
}

// Live countdown — ticks every second
function useCountdown(target?: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (!isFinite(ms) || ms <= 0) return { ended: true, label: "Ended", d: 0, h: 0, m: 0, s: 0 };
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return { ended: false, label: `${d}d ${h}h ${m}m ${s}s`, d, h, m, s };
}

function storageKey(challengeId: string, lang: string) {
  return `wcc-code:${challengeId}:${lang}`;
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------
export default function ChallengeDetailPage() {
  return (
    <AuthGuard>
      <ChallengeDetail />
    </AuthGuard>
  );
}

function ChallengeDetail() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug as string;
  const { student } = useAuth();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<ChallengeDetailResponse | null>(null);

  // Editor state
  const [language, setLanguage] = useState<string>("python");
  const [code, setCode] = useState<string>("");
  // Track which language's starter is currently loaded so we can swap when language changes
  const starterRef = useRef<Record<string, string>>({});

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [runMode, setRunMode] = useState<"run" | "submit">("submit");

  // Collapsible submission history
  const [historyOpen, setHistoryOpen] = useState(false);

  // Refetch
  const fetchData = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    setNotFound(false);
    try {
      const res = await fetch(`/api/challenges/${slug}`, { cache: "no-store" });
      if (res.status === 404) {
        setNotFound(true);
        return;
      }
      if (!res.ok) {
        toast.error("Failed to load challenge");
        return;
      }
      const json = (await res.json()) as ChallengeDetailResponse;
      setData(json);
      // pick default language
      const langs = json.challenge.languages || [];
      const initialLang = langs.length > 0 ? langs[0] : "python";
      setLanguage(initialLang);
      // build starter ref
      starterRef.current = { ...(json.challenge.starterCode || {}) };
      // load code from localStorage or starter
      const stored = typeof window !== "undefined" ? localStorage.getItem(storageKey(json.challenge.id, initialLang)) : null;
      setCode(stored ?? json.challenge.starterCode?.[initialLang] ?? "");
    } catch (e) {
      toast.error("Network error — please retry");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Persist code to localStorage (debounced via effect)
  useEffect(() => {
    if (!data?.challenge || !code) return;
    const id = setTimeout(() => {
      try {
        localStorage.setItem(storageKey(data.challenge.id, language), code);
      } catch {}
    }, 300);
    return () => clearTimeout(id);
  }, [code, language, data?.challenge]);

  // When language changes, swap code (preserve user edits unless current == starter of old lang)
  const handleLanguageChange = useCallback(
    (newLang: string) => {
      if (!data?.challenge) return;
      const challenge = data.challenge;
      const oldStarter = starterRef.current[language] ?? "";
      const stored = typeof window !== "undefined"
        ? localStorage.getItem(storageKey(challenge.id, newLang))
        : null;
      let nextCode = "";
      // if current code is empty or matches old starter, swap to new starter (or stored)
      if (code.trim() === "" || code === oldStarter) {
        nextCode = stored ?? starterRef.current[newLang] ?? "";
      } else {
        // user has typed something — keep their code
        nextCode = stored ?? code;
      }
      setLanguage(newLang);
      setCode(nextCode);
    },
    [data?.challenge, language, code],
  );

  const supportedLangs = useMemo(
    () => data?.challenge.languages || [],
    [data?.challenge.languages],
  );

  // Submit / run handler
  const handleRun = useCallback(
    async (mode: "run" | "submit") => {
      if (!data?.challenge) return;
      if (!code.trim()) {
        toast.error("Code is empty — write your solution first");
        return;
      }
      if (supportedLangs.length > 0 && !supportedLangs.includes(language)) {
        toast.error(`${LANG_LABELS[language] || language} is not supported for this challenge.`);
        return;
      }
      setRunMode(mode);
      if (mode === "submit") setSubmitting(true);
      else setRunning(true);
      setResult(null);
      try {
        const res = await fetch("/api/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            challengeId: data.challenge.id,
            language,
            code,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          toast.error(json?.error || "Submission failed");
          return;
        }
        setResult(json as SubmissionResult);

        // Celebrate
        if (json.newlySolved) {
          toast.success("🎉 Challenge solved!", {
            description: `+${json.submission.xpAwarded} XP earned${json.submission.firstAttempt ? " · First-attempt bonus!" : ""}`,
          });
        } else if ((json as SubmissionResult).submission.passedAll && !(json as SubmissionResult).newlySolved) {
          toast.success("Accepted — already solved before (no XP for repeat solve)");
        } else if (mode === "submit") {
          toast.warning(`${(json as SubmissionResult).submission.status} — keep trying!`);
        }
        if (json.leveledUp) {
          toast.success(`Level up! You reached ${json.levelInfo?.tier || "next"} tier`, {
            description: `New level: ${json.levelInfo?.level}`,
          });
        }
        if (json.unlockedAchievements?.length) {
          for (const a of json.unlockedAchievements.slice(0, 3)) {
            toast.success(`🏆 Achievement unlocked: ${a.name}`, {
              description: a.description,
            });
          }
        }
        if (json.newCertificates?.length) {
          for (const c of json.newCertificates) {
            toast.success(`📜 Certificate earned (Level ${c.level})`);
          }
        }

        // refresh user state (XP/level may have changed)
        // Re-fetch the challenge detail to update userState
        setTimeout(() => fetchData(), 500);
      } catch (e) {
        toast.error("Network error — submission not recorded");
      } finally {
        setSubmitting(false);
        setRunning(false);
      }
    },
    [data?.challenge, code, language, supportedLangs, fetchData],
  );

  // Keyboard shortcut Ctrl/Cmd+Enter
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (!submitting && !running && code.trim()) {
          handleRun("submit");
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleRun, submitting, running, code]);

  if (loading) return <ChallengeSkeleton />;
  if (notFound || !data) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center text-center py-16 px-6">
          <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
            <Code2 className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Challenge not found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            This challenge may have been unpublished or the link is broken. Browse the catalog to find more.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4 gap-2">
            <Link href="/challenges">
              <ArrowLeft className="h-4 w-4" />
              Back to challenges
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { challenge, sampleTests, hiddenTestsCount, userState } = data;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col gap-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link href="/challenges" className="hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" />
            Challenges
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium line-clamp-1">{challenge.title}</span>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start">
          {/* Left column — problem statement */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1 custom-scrollbar"
          >
            <ProblemPanel
              challenge={challenge}
              hiddenTestsCount={hiddenTestsCount}
              sampleTests={sampleTests}
              userState={userState}
              historyOpen={historyOpen}
              setHistoryOpen={setHistoryOpen}
            />
          </motion.div>

          {/* Right column — workspace */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="flex flex-col gap-4"
          >
            {/* User strip */}
            <UserStrip student={student} challenge={challenge} />

            {/* Editor */}
            <EditorPanel
              challenge={challenge}
              language={language}
              setLanguage={handleLanguageChange}
              code={code}
              setCode={setCode}
              starterRef={starterRef}
              supportedLangs={supportedLangs}
            />

            {/* Action bar */}
            <ActionBar
              onRun={() => handleRun("run")}
              onSubmit={() => handleRun("submit")}
              running={running}
              submitting={submitting}
              codeEmpty={!code.trim()}
            />

            {/* Results */}
            {(running || submitting) && (
              <Card>
                <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {submitting ? "Submitting and running all tests…" : "Running sample tests…"}
                </CardContent>
              </Card>
            )}
            {result && !running && !submitting && (
              <ResultsPanel result={result} runMode={runMode} challenge={challenge} />
            )}
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Problem panel (left column)
// ---------------------------------------------------------------------------
function ProblemPanel({
  challenge,
  sampleTests,
  hiddenTestsCount,
  userState,
  historyOpen,
  setHistoryOpen,
}: {
  challenge: Challenge;
  sampleTests: SampleTest[];
  hiddenTestsCount: number;
  userState: UserState | null;
  historyOpen: boolean;
  setHistoryOpen: (v: boolean) => void;
}) {
  const countdown = useCountdown(challenge.weekEndsAt);

  const statusBanner = userState?.solved
    ? { cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", icon: CheckCircle2, text: `✓ Solved in ${userState.attempts} ${userState.attempts === 1 ? "attempt" : "attempts"}` }
    : userState?.attempted
      ? { cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30", icon: Flame, text: `Attempted ${userState.attempts} ${userState.attempts === 1 ? "time" : "times"} — keep going` }
      : { cls: "bg-muted text-muted-foreground border-border", icon: CircleSlash, text: "Not attempted yet" };

  const BannerIcon = statusBanner.icon;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-1.5 mb-2">
          <Badge variant="outline" className={cn("text-[10px]", difficultyColor(challenge.difficulty))}>
            {challenge.difficulty}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">{challenge.category}</Badge>
          {challenge.topic && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground">{challenge.topic}</Badge>
          )}
          {challenge.isWeekly && (
            <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
              <Sparkles className="h-3 w-3 mr-0.5" />
              {challenge.weekLabel || "Weekly"}
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight">
          {challenge.title}
        </CardTitle>
        {challenge.description && (
          <CardDescription className="text-sm mt-1">{challenge.description}</CardDescription>
        )}

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
          <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
            <Zap className="h-3.5 w-3.5 text-amber-500" />
            <div>
              <div className="font-semibold">{challenge.xpReward}</div>
              <div className="text-[10px] text-muted-foreground">XP reward</div>
            </div>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                <Clock className="h-3.5 w-3.5 text-emerald-500" />
                <div>
                  <div className="font-semibold">{formatMs(challenge.timeLimitMs)}</div>
                  <div className="text-[10px] text-muted-foreground">time limit</div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Time limit per test case</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                <Cpu className="h-3.5 w-3.5 text-violet-500" />
                <div>
                  <div className="font-semibold">{challenge.memoryLimitMb}MB</div>
                  <div className="text-[10px] text-muted-foreground">memory</div>
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent>Memory limit</TooltipContent>
          </Tooltip>
          {challenge.targetYear && (
            <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
              <Calendar className="h-3.5 w-3.5 text-sky-500" />
              <div>
                <div className="font-semibold">Y{challenge.targetYear}</div>
                <div className="text-[10px] text-muted-foreground">target</div>
              </div>
            </div>
          )}
        </div>

        {/* Weekly countdown */}
        {challenge.isWeekly && challenge.weekEndsAt && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-muted-foreground">
              {countdown?.ended ? "Weekly challenge has ended" : "Time remaining:"}
            </span>
            {!countdown?.ended && countdown && (
              <span className="font-mono font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                {countdown.d > 0 && `${countdown.d}d `}
                {String(countdown.h).padStart(2, "0")}h {String(countdown.m).padStart(2, "0")}m {String(countdown.s).padStart(2, "0")}s
              </span>
            )}
          </div>
        )}

        {/* Status banner */}
        <div className={cn("mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium", statusBanner.cls)}>
          <BannerIcon className="h-4 w-4" />
          {statusBanner.text}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4 text-sm">
        {/* Markdown statement */}
        {challenge.statement && (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:leading-relaxed prose-code:before:content-none prose-code:after:content-none prose-code:bg-muted prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-pre:bg-muted prose-pre:text-foreground prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-lg prose-h2:text-base prose-h3:text-sm prose-strong:text-foreground prose-a:text-primary">
            <ReactMarkdown>{challenge.statement}</ReactMarkdown>
          </div>
        )}

        {/* Input/Output format */}
        {(challenge.inputFormat || challenge.outputFormat) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {challenge.inputFormat && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Input Format</div>
                <div className="text-xs leading-relaxed">{challenge.inputFormat}</div>
              </div>
            )}
            {challenge.outputFormat && (
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1">Output Format</div>
                <div className="text-xs leading-relaxed">{challenge.outputFormat}</div>
              </div>
            )}
          </div>
        )}

        {/* Constraints */}
        {challenge.constraints && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Constraints</div>
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs leading-relaxed whitespace-pre-line">
              {challenge.constraints}
            </div>
          </div>
        )}

        {/* Examples */}
        {challenge.examples?.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-1.5">Examples</div>
            <div className="space-y-2">
              {challenge.examples.map((ex, i) => (
                <ExampleBlock key={i} index={i} ex={ex} />
              ))}
            </div>
          </div>
        )}

        {/* Sample tests */}
        {sampleTests.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Sample Test Cases ({sampleTests.length})
              </div>
              {hiddenTestsCount > 0 && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  <Lock className="h-3 w-3 mr-0.5" />
                  +{hiddenTestsCount} hidden
                </Badge>
              )}
            </div>
            <div className="space-y-2">
              {sampleTests.map((t) => (
                <SampleTestBlock key={t.id} test={t} />
              ))}
            </div>
          </div>
        )}

        {/* Submission history */}
        {userState && userState.submissions.length > 0 && (
          <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
            <Card className="border-dashed">
              <CollapsibleTrigger asChild>
                <button className="flex items-center justify-between w-full p-3 hover:bg-muted/40 transition-colors text-left">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <History className="h-4 w-4 text-muted-foreground" />
                    Your submissions
                    <Badge variant="secondary" className="text-[10px]">{userState.submissions.length}</Badge>
                  </div>
                  {historyOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-3 pb-3">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">#</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Lang</TableHead>
                        <TableHead className="text-xs hidden sm:table-cell">Time</TableHead>
                        <TableHead className="text-xs text-right">When</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userState.submissions.slice(0, 30).map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs font-mono">{s.attemptNumber}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={cn("text-[10px]", submissionStatusColor(s.status))}>
                              {s.passedAll && <CheckCircle2 className="h-3 w-3 mr-0.5" />}
                              {s.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-mono uppercase hidden sm:table-cell">
                            {LANG_MONO[s.language] || s.language}
                          </TableCell>
                          <TableCell className="text-xs font-mono hidden sm:table-cell">
                            {formatMs(s.execTimeMs)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground text-right">
                            {relativeTime(s.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

function ExampleBlock({ index, ex }: { index: number; ex: { input: string; output: string; explanation?: string } }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="bg-muted/50 px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
        Example {index + 1}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Input</div>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">{ex.input || "(empty)"}</pre>
        </div>
        <div className="p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Output</div>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all">{ex.output}</pre>
        </div>
      </div>
      {ex.explanation && (
        <div className="px-3 py-2 border-t border-border bg-muted/20 text-xs">
          <span className="font-semibold text-muted-foreground">Explanation: </span>
          {ex.explanation}
        </div>
      )}
    </div>
  );
}

function SampleTestBlock({ test }: { test: SampleTest }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="bg-muted/50 px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
        <FileCode2 className="h-3.5 w-3.5 text-muted-foreground" />
        {test.name}
        {test.isHidden && (
          <Badge variant="outline" className="text-[10px] ml-auto">
            <Lock className="h-2.5 w-2.5 mr-0.5" />
            hidden
          </Badge>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border">
        <div className="p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Input</div>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto custom-scrollbar">{test.input || "(empty)"}</pre>
        </div>
        <div className="p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Expected Output</div>
          <pre className="text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-y-auto custom-scrollbar">{test.expectedOutput}</pre>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// User strip (right column header)
// ---------------------------------------------------------------------------
function UserStrip({ student, challenge }: { student: any; challenge: Challenge }) {
  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center justify-between gap-3 p-3">
        <div className="flex items-center gap-2 min-w-0">
          <AvatarSvg config={student?.avatar || {}} size={36} />
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight truncate">{student?.name}</div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              {student?.levelName || "Beginner"} · Lvl {student?.level || 1}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="outline" className="text-[10px]">
            <Zap className="h-3 w-3 mr-0.5 text-amber-500" />
            {student?.xp ?? 0} XP
          </Badge>
          {challenge.isWeekly && (
            <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
              <Sparkles className="h-3 w-3 mr-0.5" />
              Weekly
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Editor panel (right column)
// ---------------------------------------------------------------------------
function EditorPanel({
  challenge,
  language,
  setLanguage,
  code,
  setCode,
  starterRef,
  supportedLangs,
}: {
  challenge: Challenge;
  language: string;
  setLanguage: (l: string) => void;
  code: string;
  setCode: (c: string) => void;
  starterRef: React.MutableRefObject<Record<string, string>>;
  supportedLangs: string[];
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLPreElement>(null);
  const charCount = code.length;

  const lineCount = useMemo(() => Math.max(code.split("\n").length, 1), [code]);
  const lineNumbers = useMemo(
    () => Array.from({ length: lineCount }, (_, i) => i + 1).join("\n"),
    [lineCount],
  );

  // Sync scroll: textarea → gutter
  const handleScroll = useCallback(() => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  // Tab inserts 4 spaces
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const ta = e.currentTarget;
        const start = ta.selectionStart;
        const end = ta.selectionEnd;
        const insert = "    ";
        const next = code.slice(0, start) + insert + code.slice(end);
        setCode(next);
        // restore cursor after React updates
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = start + insert.length;
        });
      }
    },
    [code, setCode],
  );

  // Format — trim trailing whitespace on each line
  const handleFormat = useCallback(() => {
    const formatted = code
      .split("\n")
      .map((l) => l.replace(/\s+$/, ""))
      .join("\n");
    setCode(formatted);
    toast.success("Formatted — trimmed trailing whitespace");
  }, [code, setCode]);

  // Reset to starter
  const handleReset = useCallback(() => {
    const starter = starterRef.current[language] ?? "";
    if (!starter) {
      toast.info(`No starter code for ${LANG_LABELS[language] || language}`);
      return;
    }
    setCode(starter);
    toast.success("Reset to starter code");
  }, [language, setCode, starterRef]);

  const supportedLangOptions = supportedLangs.length > 0 ? supportedLangs : ["python", "cpp", "javascript"];

  return (
    <Card className="overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <FileCode2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold">Solution Editor</span>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger size="sm" className="w-[150px] h-8">
              <SelectValue placeholder="Language" />
            </SelectTrigger>
            <SelectContent>
              {supportedLangOptions.map((l) => (
                <SelectItem key={l} value={l}>
                  {LANG_LABELS[l] || l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={handleFormat}>
                <Wand2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Format</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Trim trailing whitespace</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={handleReset}>
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset to starter code for {LANG_LABELS[language] || language}</TooltipContent>
          </Tooltip>
          <span className="text-[10px] text-muted-foreground ml-1 font-mono tabular-nums">
            {charCount} chars
          </span>
        </div>
      </div>

      {/* Editor */}
      <div className="relative flex bg-card" style={{ height: 360 }}>
        {/* Line-number gutter */}
        <pre
          ref={gutterRef}
          aria-hidden
          className="select-none overflow-hidden text-right text-xs font-mono leading-[1.5] py-3 pl-3 pr-2 m-0 text-muted-foreground/60 bg-muted/30 border-r border-border"
          style={{ minWidth: 48, scrollbarWidth: "none" }}
        >
          {lineNumbers}
        </pre>
        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={`// Write your ${LANG_LABELS[language] || language} solution here…\n// Tab inserts 4 spaces · Ctrl/Cmd+Enter to submit`}
          className="flex-1 resize-none bg-card text-foreground text-xs font-mono leading-[1.5] p-3 outline-none border-0 custom-scrollbar"
          style={{ tabSize: 4 }}
          aria-label="Solution code editor"
        />
      </div>

      {/* Footer hint */}
      <div className="border-t border-border bg-muted/30 px-3 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          <Terminal className="h-3 w-3" />
          {LANG_LABELS[language] || language} · Tab = 4 spaces
        </span>
        <span className="hidden sm:inline">
          <kbd className="px-1 py-0.5 rounded border border-border bg-card text-[10px] font-mono">Ctrl</kbd>
          {" + "}
          <kbd className="px-1 py-0.5 rounded border border-border bg-card text-[10px] font-mono">Enter</kbd>
          {" to submit"}
        </span>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Action bar — Run / Submit
// ---------------------------------------------------------------------------
function ActionBar({
  onRun,
  onSubmit,
  running,
  submitting,
  codeEmpty,
}: {
  onRun: () => void;
  onSubmit: () => void;
  running: boolean;
  submitting: boolean;
  codeEmpty: boolean;
}) {
  const busy = running || submitting;
  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            onClick={onRun}
            disabled={busy || codeEmpty}
            className="gap-2"
          >
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {running ? "Running…" : "Run"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Run your code against all test cases (counts as a submission)</TooltipContent>
      </Tooltip>
      <Button
        onClick={onSubmit}
        disabled={busy || codeEmpty}
        className="gap-2 flex-1 sm:flex-none sm:min-w-[180px]"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        {submitting ? "Submitting…" : "Submit solution"}
      </Button>
      <span className="text-[10px] text-muted-foreground ml-auto hidden sm:inline">
        Submissions are rate-limited (8 / min)
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Results panel
// ---------------------------------------------------------------------------
function ResultsPanel({ result, runMode, challenge }: { result: SubmissionResult; runMode: "run" | "submit"; challenge: Challenge }) {
  const { submission, results, newlySolved, leveledUp, levelInfo, unlockedAchievements, newCertificates } = result;
  const accepted = submission.passedAll;
  const showCelebration = newlySolved || leveledUp || unlockedAchievements.length > 0 || newCertificates.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-3"
    >
      {/* Overall status banner */}
      <Card className={cn(
        "border-2",
        accepted ? "border-emerald-500/40 bg-emerald-500/5" : "border-rose-500/40 bg-rose-500/5",
      )}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                accepted ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" : "bg-rose-500/15 text-rose-600 dark:text-rose-300",
              )}>
                {accepted ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("text-lg font-bold", accepted ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300")}>
                    {accepted ? "Accepted" : submission.status}
                  </span>
                  {submission.firstAttempt && accepted && (
                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30">
                      <Sparkles className="h-3 w-3 mr-0.5" />
                      First attempt!
                    </Badge>
                  )}
                  {newlySolved && (
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                      <Trophy className="h-3 w-3 mr-0.5" />
                      Newly solved
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Attempt #{submission.attemptNumber} · {submission.passedCount}/{submission.totalTests} tests passed · {formatMs(submission.execTimeMs)} total
                </div>
              </div>
            </div>
            {/* XP / level info */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {submission.xpAwarded > 0 ? (
                <div className="flex items-center gap-1.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2.5 py-1.5 border border-amber-500/30">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="font-semibold">+{submission.xpAwarded} XP</span>
                  {submission.xpBreakdown && submission.xpBreakdown.firstAttemptBonus > 0 && (
                    <span className="text-[10px] opacity-80">
                      (base {submission.xpBreakdown.base} + {submission.xpBreakdown.firstAttemptBonus} bonus)
                    </span>
                  )}
                </div>
              ) : accepted && !newlySolved ? (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">Already solved · no XP for repeat</Badge>
              ) : null}
              {leveledUp && levelInfo && (
                <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30">
                  <TrendingUp className="h-3 w-3 mr-0.5" />
                  Level {levelInfo.level} · {levelInfo.tier}
                </Badge>
              )}
            </div>
          </div>

          {/* Celebration area */}
          {showCelebration && (
            <div className="mt-4 pt-4 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {unlockedAchievements.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">
                    <PartyPopper className="h-3.5 w-3.5" />
                    New achievements unlocked
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {unlockedAchievements.map((a) => {
                      const Icon = ACHIEVEMENT_ICONS[a.icon] || Award;
                      return (
                        <Tooltip key={a.id}>
                          <TooltipTrigger asChild>
                            <div className={cn("flex items-center gap-1.5 rounded-md px-2 py-1 ring-1", rarityStyles(a.rarity))}>
                              <Icon className="h-3.5 w-3.5" />
                              <span className="text-xs font-medium">{a.name}</span>
                              {a.xpReward > 0 && <span className="text-[10px] opacity-80">+{a.xpReward}</span>}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <div className="font-semibold">{a.name}</div>
                              <div className="text-xs">{a.description}</div>
                              <div className="text-[10px] uppercase">{a.rarity}</div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              )}
              {newCertificates.length > 0 && (
                <div className="rounded-lg border border-violet-500/30 bg-violet-500/5 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 dark:text-violet-300 mb-2">
                    <Medal className="h-3.5 w-3.5" />
                    New certificate earned
                  </div>
                  <div className="space-y-1">
                    {newCertificates.map((c) => (
                      <div key={c.id} className="flex items-center gap-1.5 text-xs">
                        <Award className="h-3 w-3" />
                        <span>Level {c.level} · Tier {c.tierLevel}</span>
                        <span className="text-[10px] text-muted-foreground font-mono">({c.certId})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {newlySolved && !leveledUp && unlockedAchievements.length === 0 && newCertificates.length === 0 && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Trophy className="h-3.5 w-3.5" />
                  Challenge solved — keep the streak alive!
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-test results */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            Test Results
            <Badge variant="secondary" className="text-[10px]">
              {submission.passedCount}/{submission.totalTests} passed
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="max-h-96 overflow-y-auto custom-scrollbar space-y-2">
            {results.map((r, i) => (
              <TestResultRow key={i} result={r} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Footer actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/leaderboard">
            <Trophy className="h-4 w-4" />
            View on leaderboard
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link href="/challenges">
            Next challenge
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </motion.div>
  );
}

function TestResultRow({ result }: { result: TestResult }) {
  const [expanded, setExpanded] = useState(false);
  const passed = result.passed;
  const hasOutputToShow = !result.isHidden && (result.stdout || result.stderr || result.expected);
  const showDiff = !passed && !result.isHidden && (result.stdout || result.expected);

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      passed ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5",
    )}>
      <div className="flex items-center justify-between gap-2 p-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {passed ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-semibold truncate">{result.name}</span>
          {result.isHidden && (
            <Badge variant="outline" className="text-[10px] text-muted-foreground shrink-0">
              <Lock className="h-2.5 w-2.5 mr-0.5" />
              hidden
            </Badge>
          )}
          <Badge variant="outline" className={cn("text-[10px] shrink-0", submissionStatusColor(result.status))}>
            {result.status}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums">
            {formatMs(result.execTimeMs)}
          </span>
          {hasOutputToShow && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-[10px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded hover:bg-muted"
              aria-label="Toggle details"
            >
              {expanded ? "Hide" : "Details"}
            </button>
          )}
        </div>
      </div>

      {expanded && hasOutputToShow && (
        <div className="px-2.5 pb-2.5 border-t border-border/60 pt-2 space-y-2">
          {/* Diff for failed sample tests */}
          {showDiff && result.expected !== undefined && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Your output</div>
                <pre className={cn(
                  "text-xs font-mono whitespace-pre-wrap break-all p-2 rounded bg-card border max-h-40 overflow-y-auto custom-scrollbar",
                  passed ? "border-emerald-500/30" : "border-rose-500/30",
                )}>
                  {result.stdout || "(no output)"}
                </pre>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Expected</div>
                <pre className="text-xs font-mono whitespace-pre-wrap break-all p-2 rounded bg-card border border-emerald-500/30 max-h-40 overflow-y-auto custom-scrollbar">
                  {result.expected || "(no output)"}
                </pre>
              </div>
            </div>
          )}
          {/* stderr / message */}
          {result.stderr && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-rose-600 dark:text-rose-400 mb-1">Error / stderr</div>
              <pre className="text-xs font-mono whitespace-pre-wrap break-all p-2 rounded bg-rose-500/5 border border-rose-500/30 max-h-40 overflow-y-auto custom-scrollbar">
                {result.stderr}
              </pre>
            </div>
          )}
          {result.message && (
            <div className="text-xs text-muted-foreground italic">{result.message}</div>
          )}
          {/* Pass-through stdout when accepted */}
          {passed && result.stdout && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Output</div>
              <pre className="text-xs font-mono whitespace-pre-wrap break-all p-2 rounded bg-card border border-border max-h-40 overflow-y-auto custom-scrollbar">
                {result.stdout}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Hidden test failure — minimal info */}
      {!passed && result.isHidden && (
        <div className="px-2.5 pb-2.5 pt-1 border-t border-border/60 text-xs text-muted-foreground italic">
          {result.message || "Hidden test case failed. The expected output is not revealed."}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton
// ---------------------------------------------------------------------------
function ChallengeSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-1.5 mb-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-14" />
          </div>
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-3 w-full mt-1" />
          <div className="grid grid-cols-4 gap-2 mt-3">
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
      <div className="flex flex-col gap-4">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-[360px] rounded-xl" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
