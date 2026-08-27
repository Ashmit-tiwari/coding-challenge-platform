"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft, Code2, Loader2, Save, Trash2, EyeOff, ArrowUpRight, Calendar,
  AlertTriangle, Plus, X, ChevronUp, ChevronDown, FileText, Eye, ListChecks,
  Cpu, Clock, Zap, Sparkles,
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { difficultyColor, statusColor, fmtDate } from "@/app/admin/_lib";

const LANGUAGES = ["python", "cpp", "javascript", "java", "c", "go", "rust"];
const DIFFICULTIES = ["easy", "medium", "hard", "expert"];
const CATEGORIES = ["algorithms", "data-structures", "math", "strings", "dp", "greedy", "graphs", "trees", "recursion", "misc"];

interface TestCaseRow {
  id?: string;
  name: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  isSample: boolean;
  order?: number;
}
interface Example { input: string; output: string; explanation?: string; }

interface FullChallenge {
  id: string; slug: string; title: string; description: string | null; statement: string;
  difficulty: string; category: string; topic: string | null; xpReward: number;
  targetYear: string | null; isWeekly: boolean; weekLabel: string | null;
  weekStartsAt: string | null; weekEndsAt: string | null;
  timeLimitMs: number; memoryLimitMb: number;
  languages: string[]; constraints: string | null; examples: Example[];
  inputFormat: string | null; outputFormat: string | null;
  starterCode: Record<string, string>;
  status: string; version: number; createdAt: string; updatedAt: string;
}

interface ChallengeDetail {
  challenge: FullChallenge;
  solutionRef: string | null;
  createdBy: string | null;
  testCases: TestCaseRow[];
  submissionsCount: number;
}

export default function ChallengeEditorPage() {
  const params = useParams();
  const id = (params?.id as string) || "";

  const [data, setData] = useState<ChallengeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [tab, setTab] = useState("details");
  const [previewLang, setPreviewLang] = useState("python");

  // Editable form state
  const [f, setF] = useState<FullChallenge | null>(null);
  const [solutionRef, setSolutionRef] = useState("");
  const [testCases, setTestCases] = useState<TestCaseRow[]>([]);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/challenges/${id}`);
      if (!res.ok) {
        if (res.status === 404) toast.error("Challenge not found");
        else toast.error("Failed to load challenge");
        setData(null);
        return;
      }
      const d = await res.json();
      setData(d);
      setF(d.challenge);
      setSolutionRef(d.solutionRef || "");
      setTestCases((d.testCases || []).map((t: any) => ({
        id: t.id, name: t.name, input: t.input, expectedOutput: t.expectedOutput,
        isHidden: t.isHidden, isSample: t.isSample, order: t.order,
      })));
    } catch {
      toast.error("Failed to load challenge");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const updateField = <K extends keyof FullChallenge>(k: K, v: FullChallenge[K]) => {
    setF((prev) => prev ? { ...prev, [k]: v } : prev);
  };

  const handleSave = async (extra?: Record<string, any>) => {
    if (!f) return;
    setSaving(true);
    try {
      const body: any = {
        title: f.title, slug: f.slug, statement: f.statement, description: f.description,
        difficulty: f.difficulty, category: f.category, topic: f.topic || null,
        xpReward: Number(f.xpReward), targetYear: f.targetYear || null,
        isWeekly: f.isWeekly, weekLabel: f.isWeekly ? f.weekLabel : null,
        timeLimitMs: Number(f.timeLimitMs), memoryLimitMb: Number(f.memoryLimitMb),
        constraints: f.constraints, inputFormat: f.inputFormat, outputFormat: f.outputFormat,
        status: f.status, languages: f.languages, examples: f.examples,
        starterCode: f.starterCode, testCases,
        solutionRef,
        ...extra,
      };
      const res = await fetch(`/api/admin/challenges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || "Failed to save"); return; }
      toast.success("Challenge saved");
      fetchDetail();
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (status: string) => {
    if (!f) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/challenges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) { toast.error("Failed to update status"); return; }
      toast.success(`Marked as ${status}`);
      setF({ ...f, status });
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/challenges/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete"); return; }
      toast.success("Challenge deleted");
      window.location.href = "/admin/challenges";
    } finally {
      setDeleting(false);
    }
  };

  const moveTestCase = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= testCases.length) return;
    const arr = [...testCases];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setTestCases(arr);
  };

  if (loading || !f) {
    return (
      <AdminGuard>
        <div className="space-y-4">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-80 w-full" />
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/admin/challenges"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to challenges</Link>
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSave()} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save
            </Button>
            {f.status === "published" ? (
              <Button variant="outline" size="sm" onClick={() => handleQuickStatus("draft")} disabled={saving}>
                <EyeOff className="h-3.5 w-3.5 mr-1" /> Unpublish
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleQuickStatus("published")} disabled={saving}>
                <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> Publish
              </Button>
            )}
            {f.status !== "archived" && (
              <Button variant="outline" size="sm" onClick={() => handleQuickStatus("archived")} disabled={saving}>
                <Calendar className="h-3.5 w-3.5 mr-1" /> Archive
              </Button>
            )}
            <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
            </Button>
          </div>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="border-border/60 overflow-hidden">
            <div className="h-1 brand-gradient" />
            <CardContent className="pt-5">
              <div className="flex items-start gap-3 flex-wrap">
                <div className="brand-gradient h-12 w-12 rounded-xl flex items-center justify-center text-brand-foreground flex-shrink-0">
                  <Code2 className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl font-semibold tracking-tight">{f.title}</h1>
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded border", difficultyColor(f.difficulty))}>{f.difficulty}</span>
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded border", statusColor(f.status))}>{f.status}</span>
                    {f.isWeekly && (
                      <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px]">
                        <Sparkles className="h-3 w-3 mr-1" /> {f.weekLabel || "weekly"}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground font-mono">/{f.slug}</div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <div className="flex items-center gap-1"><ListChecks className="h-3.5 w-3.5" /> {testCases.length} test cases</div>
                  <div className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" />
                    <Link href={`/admin/submissions?challengeId=${f.id}`} className="hover:text-primary hover:underline">
                      {data?.submissionsCount || 0} submissions
                    </Link>
                  </div>
                  <div className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {f.timeLimitMs}ms</div>
                  <div className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" /> {f.memoryLimitMb}MB</div>
                  <div className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" /> {f.xpReward} XP</div>
                  <div className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {fmtDate(f.createdAt)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="statement">Statement</TabsTrigger>
            <TabsTrigger value="tests">Test cases ({testCases.length})</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="starter">Starter code</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          {/* Details */}
          <TabsContent value="details" className="mt-3">
            <Card className="border-border/60">
              <CardContent className="pt-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">Title</Label>
                    <Input value={f.title} onChange={(e) => updateField("title", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Slug</Label>
                    <Input value={f.slug} onChange={(e) => updateField("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Difficulty</Label>
                    <Select value={f.difficulty} onValueChange={(v) => updateField("difficulty", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Category</Label>
                    <Select value={f.category} onValueChange={(v) => updateField("category", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Topic</Label>
                    <Input value={f.topic || ""} onChange={(e) => updateField("topic", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">XP reward</Label>
                    <Input type="number" value={f.xpReward} onChange={(e) => updateField("xpReward", Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Target year</Label>
                    <Select value={f.targetYear || ""} onValueChange={(v) => updateField("targetYear", v || null)}>
                      <SelectTrigger><SelectValue placeholder="Any year" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Any year</SelectItem>
                        <SelectItem value="1">Year 1</SelectItem>
                        <SelectItem value="2">Year 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Status</Label>
                    <Select value={f.status} onValueChange={(v) => updateField("status", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Time limit (ms)</Label>
                    <Input type="number" value={f.timeLimitMs} onChange={(e) => updateField("timeLimitMs", Number(e.target.value))} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Memory limit (MB)</Label>
                    <Input type="number" value={f.memoryLimitMb} onChange={(e) => updateField("memoryLimitMb", Number(e.target.value))} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Supported languages</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {LANGUAGES.map((l) => {
                      const sel = f.languages.includes(l);
                      return (
                        <button
                          key={l}
                          type="button"
                          onClick={() => updateField("languages", sel ? f.languages.filter((x) => x !== l) : [...f.languages, l])}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-md border transition-colors",
                            sel ? "bg-primary/15 text-primary border-primary/40" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted",
                          )}
                        >
                          {l}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-muted/30">
                  <Switch checked={f.isWeekly} onCheckedChange={(v) => updateField("isWeekly", v)} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">Weekly challenge</div>
                    <div className="text-xs text-muted-foreground">Featured on the weekly board.</div>
                  </div>
                  {f.isWeekly && (
                    <Input className="max-w-48" value={f.weekLabel || ""} onChange={(e) => updateField("weekLabel", e.target.value)} placeholder="Week label" />
                  )}
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Reference solution (admin-only, hidden from students)</Label>
                  <Textarea rows={5} className="font-mono text-xs" value={solutionRef} onChange={(e) => setSolutionRef(e.target.value)} placeholder="Reference solution for comparison / verification" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Statement */}
          <TabsContent value="statement" className="mt-3">
            <Card className="border-border/60">
              <CardContent className="pt-5 space-y-4">
                <div>
                  <Label className="text-xs mb-1.5 block">Short statement (one-liner for listings)</Label>
                  <Textarea rows={2} value={f.statement} onChange={(e) => updateField("statement", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Description (full problem, Markdown allowed)</Label>
                  <Textarea rows={8} value={f.description || ""} onChange={(e) => updateField("description", e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 block">Constraints</Label>
                  <Textarea rows={3} value={f.constraints || ""} onChange={(e) => updateField("constraints", e.target.value)} className="font-mono text-xs" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs mb-1.5 block">Input format</Label>
                    <Textarea rows={3} value={f.inputFormat || ""} onChange={(e) => updateField("inputFormat", e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs mb-1.5 block">Output format</Label>
                    <Textarea rows={3} value={f.outputFormat || ""} onChange={(e) => updateField("outputFormat", e.target.value)} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test cases */}
          <TabsContent value="tests" className="mt-3 space-y-3">
            <Card className="border-border/60">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Test cases used for grading</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setTestCases([...testCases, { name: `Test ${testCases.length + 1}`, input: "", expectedOutput: "", isHidden: true, isSample: false }])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add test case
                  </Button>
                </div>
                {testCases.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-8 text-center border border-dashed border-border/60 rounded-lg">
                    No test cases yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {testCases.map((tc, i) => (
                      <div key={tc.id || i} className="rounded-lg border border-border/60 p-3 space-y-2 relative">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            <div className="flex flex-col">
                              <button type="button" onClick={() => moveTestCase(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                                <ChevronUp className="h-3.5 w-3.5" />
                              </button>
                              <button type="button" onClick={() => moveTestCase(i, 1)} disabled={i === testCases.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30">
                                <ChevronDown className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground">#{i + 1}</span>
                            <Input
                              className="font-mono text-xs max-w-40 h-7"
                              value={tc.name}
                              onChange={(e) => setTestCases(testCases.map((t, j) => j === i ? { ...t, name: e.target.value } : t))}
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                              <Switch checked={tc.isSample} onCheckedChange={(v) => setTestCases(testCases.map((t, j) => j === i ? { ...t, isSample: v } : t))} />
                              Sample
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                              <Switch checked={tc.isHidden} onCheckedChange={(v) => setTestCases(testCases.map((t, j) => j === i ? { ...t, isHidden: v } : t))} />
                              Hidden
                            </label>
                            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-rose-600" onClick={() => setTestCases(testCases.filter((_, j) => j !== i))}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] mb-1 block">Input</Label>
                            <Textarea rows={2} value={tc.input} onChange={(e) => setTestCases(testCases.map((t, j) => j === i ? { ...t, input: e.target.value } : t))} className="font-mono text-xs" />
                          </div>
                          <div>
                            <Label className="text-[11px] mb-1 block">Expected output</Label>
                            <Textarea rows={2} value={tc.expectedOutput} onChange={(e) => setTestCases(testCases.map((t, j) => j === i ? { ...t, expectedOutput: e.target.value } : t))} className="font-mono text-xs" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-border/60 flex justify-end">
                  <Button onClick={() => handleSave()} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                    Save test cases
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Examples */}
          <TabsContent value="examples" className="mt-3 space-y-3">
            <Card className="border-border/60">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Examples (visible to students)</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => updateField("examples", [...(f.examples || []), { input: "", output: "", explanation: "" }])}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add example
                  </Button>
                </div>
                {(f.examples || []).length === 0 ? (
                  <div className="text-xs text-muted-foreground py-8 text-center border border-dashed border-border/60 rounded-lg">
                    No examples yet.
                  </div>
                ) : (f.examples || []).map((ex, i) => (
                  <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Example {i + 1}</span>
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-rose-600" onClick={() => updateField("examples", (f.examples || []).filter((_, j) => j !== i))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[11px] mb-1 block">Input</Label>
                        <Textarea rows={2} value={ex.input} onChange={(e) => updateField("examples", (f.examples || []).map((x, j) => j === i ? { ...x, input: e.target.value } : x))} className="font-mono text-xs" />
                      </div>
                      <div>
                        <Label className="text-[11px] mb-1 block">Output</Label>
                        <Textarea rows={2} value={ex.output} onChange={(e) => updateField("examples", (f.examples || []).map((x, j) => j === i ? { ...x, output: e.target.value } : x))} className="font-mono text-xs" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-[11px] mb-1 block">Explanation</Label>
                      <Input value={ex.explanation || ""} onChange={(e) => updateField("examples", (f.examples || []).map((x, j) => j === i ? { ...x, explanation: e.target.value } : x))} />
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-4 border-t border-border/60 flex justify-end">
                  <Button onClick={() => handleSave()} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                    Save examples
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Starter code */}
          <TabsContent value="starter" className="mt-3 space-y-3">
            <Card className="border-border/60">
              <CardContent className="pt-5 space-y-3">
                <Label className="text-sm font-medium">Starter code per language</Label>
                {f.languages.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border/60 rounded-lg">
                    Select at least one supported language on the Details tab.
                  </div>
                ) : f.languages.map((l) => (
                  <div key={l}>
                    <Label className="text-[11px] mb-1 block">{l}</Label>
                    <Textarea
                      rows={4}
                      className="font-mono text-xs"
                      value={f.starterCode?.[l] || ""}
                      onChange={(e) => updateField("starterCode", { ...(f.starterCode || {}), [l]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="pt-3 border-t border-border/60 flex justify-end">
                  <Button onClick={() => handleSave()} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                    Save starter code
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview */}
          <TabsContent value="preview" className="mt-3">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Eye className="h-4 w-4 text-primary" /> Student preview
                  </CardTitle>
                  {f.languages.length > 0 && (
                    <Select value={previewLang} onValueChange={setPreviewLang}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {f.languages.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <h3 className="font-semibold tracking-tight">{f.title}</h3>
                    <span className={cn("text-[11px] px-1.5 py-0.5 rounded border", difficultyColor(f.difficulty))}>{f.difficulty}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">{f.category}</span>
                    <span className="text-[11px] px-1.5 py-0.5 rounded text-amber-700 dark:text-amber-400 bg-amber-500/15 border border-amber-500/30">+{f.xpReward} XP</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{f.statement}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Description</h4>
                  <pre className="text-sm whitespace-pre-wrap font-sans">{f.description || "—"}</pre>
                </div>
                {(f.examples || []).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Examples</h4>
                      <div className="space-y-3">
                        {(f.examples || []).map((ex, i) => (
                          <div key={i} className="rounded-lg border border-border/60 p-3 text-xs">
                            <div className="font-medium mb-1.5">Example {i + 1}</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono">
                              <div><span className="text-muted-foreground">Input:</span> <pre className="whitespace-pre-wrap">{ex.input}</pre></div>
                              <div><span className="text-muted-foreground">Output:</span> <pre className="whitespace-pre-wrap">{ex.output}</pre></div>
                            </div>
                            {ex.explanation && <div className="mt-2 text-muted-foreground font-sans"><span className="font-medium">Explanation:</span> {ex.explanation}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border border-border/60 p-2.5"><div className="text-muted-foreground mb-1">Time limit</div><div className="font-medium">{f.timeLimitMs} ms</div></div>
                  <div className="rounded-lg border border-border/60 p-2.5"><div className="text-muted-foreground mb-1">Memory limit</div><div className="font-medium">{f.memoryLimitMb} MB</div></div>
                  <div className="rounded-lg border border-border/60 p-2.5"><div className="text-muted-foreground mb-1">Test cases</div><div className="font-medium">{testCases.length} ({testCases.filter((t) => !t.isHidden).length} visible)</div></div>
                </div>
                {(f.starterCode?.[previewLang]) && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Starter code · {previewLang}</h4>
                      <pre className="rounded-lg bg-muted/40 border border-border/60 p-3 text-xs font-mono overflow-x-auto">{f.starterCode[previewLang]}</pre>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" /> Delete challenge?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <span className="font-medium">{f.title}</span> along with all of its test cases. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminGuard>
  );
}
