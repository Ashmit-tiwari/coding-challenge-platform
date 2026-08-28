"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Code2, Search, Plus, Loader2, Trash2, Eye, ArrowUpRight, EyeOff, Calendar,
  FileText, ListChecks, Filter, ArrowRight, Sparkles, AlertTriangle, Save, X,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  difficultyColor, statusColor, fmtDate,
} from "@/app/admin/_lib";

interface ChallengeListItem {
  id: string; slug: string; title: string; difficulty: string; category: string;
  topic?: string | null; xpReward: number; targetYear?: string | null;
  isWeekly: boolean; weekLabel?: string | null;
  status: string; createdAt: string; updatedAt: string;
  testCasesCount: number; submissionsCount: number;
  languages?: string[];
}

const LANGUAGES = ["python", "cpp", "javascript", "java", "c", "go", "rust"];
const DIFFICULTIES = ["easy", "medium", "hard", "expert"];
const CATEGORIES = ["algorithms", "data-structures", "math", "strings", "dp", "greedy", "graphs", "trees", "recursion", "misc"];

interface Example { input: string; output: string; explanation?: string; }
interface TestCaseInput { name: string; input: string; expectedOutput: string; isHidden: boolean; isSample: boolean; }

const emptyForm = {
  slug: "", title: "", statement: "", description: "",
  difficulty: "easy", category: "algorithms", topic: "",
  xpReward: 10, targetYear: "", isWeekly: false, weekLabel: "",
  timeLimitMs: 2000, memoryLimitMb: 256,
  languages: ["python", "cpp", "javascript"],
  constraints: "", inputFormat: "", outputFormat: "",
  starterCode: {} as Record<string, string>,
  status: "draft",
  examples: [] as Example[],
  testCases: [] as TestCaseInput[],
};

export default function AdminChallengesPage() {
  const [list, setList] = useState<ChallengeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createTab, setCreateTab] = useState("details");
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<ChallengeListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      const res = await fetch(`/api/admin/challenges?${params.toString()}`);
      if (!res.ok) { toast.error("Failed to load challenges"); setList([]); return; }
      const d = await res.json();
      setList(d.challenges || []);
    } catch {
      toast.error("Failed to load challenges");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const filtered = (list as ChallengeListItem[]).filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      (c.category || "").toLowerCase().includes(q)
    );
  });

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/challenges/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) { toast.error("Failed to update status"); return; }
      toast.success(`Challenge marked as ${newStatus}`);
      fetchList();
    } catch {
      toast.error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/challenges/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete challenge"); return; }
      toast.success("Challenge deleted");
      setDeleteTarget(null);
      fetchList();
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = async () => {
    if (!form.slug || !form.title || !form.statement) {
      toast.error("Slug, title and statement are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/admin/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          targetYear: form.targetYear || null,
          weekLabel: form.isWeekly ? form.weekLabel : null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || "Failed to create challenge"); return; }
      toast.success("Challenge created");
      setCreateOpen(false);
      setForm(emptyForm);
      fetchList();
    } finally {
      setCreating(false);
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Challenges</h1>
              <p className="text-sm text-muted-foreground">Author, publish, archive and delete platform challenges.</p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Create challenge
          </Button>
        </motion.div>

        {/* Filter bar */}
        <Card className="border-border/60">
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-col md:flex-row gap-3 md:items-end justify-between">
              <div className="flex flex-wrap gap-2">
                {[
                  { v: "all", label: "All" },
                  { v: "draft", label: "Draft" },
                  { v: "published", label: "Published" },
                  { v: "archived", label: "Archived" },
                ].map((s) => (
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
              <div className="md:w-72">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Filter by title, slug, category…"
                    className="pl-9"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
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
                    <TableHead className="font-medium">Title</TableHead>
                    <TableHead className="font-medium">Difficulty</TableHead>
                    <TableHead className="font-medium">Category</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="font-medium">Weekly</TableHead>
                    <TableHead className="font-medium text-right">XP</TableHead>
                    <TableHead className="font-medium text-right">Tests</TableHead>
                    <TableHead className="font-medium text-right">Subs</TableHead>
                    <TableHead className="font-medium">Created</TableHead>
                    <TableHead className="font-medium text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-7 w-28" /></TableCell>
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-sm text-muted-foreground">
                        <div className="inline-flex flex-col items-center gap-2">
                          <Code2 className="h-8 w-8 text-muted-foreground/50" />
                          <div>No challenges match the current filters.</div>
                          <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)} className="mt-2">
                            <Plus className="h-3.5 w-3.5 mr-1.5" /> Create your first challenge
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <div className="min-w-0">
                            <Link href={`/admin/challenges/${c.id}`} className="font-medium text-sm hover:text-primary hover:underline">
                              {c.title}
                            </Link>
                            <div className="text-[11px] text-muted-foreground font-mono">/{c.slug}</div>
                            {c.topic && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">{c.topic}</div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn("text-[11px] px-1.5 py-0.5 rounded border", difficultyColor(c.difficulty))}>
                          {c.difficulty}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{c.category}</TableCell>
                      <TableCell>
                        <span className={cn("text-[11px] px-1.5 py-0.5 rounded border", statusColor(c.status))}>
                          {c.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {c.isWeekly ? (
                          <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-500/30 text-[10px]">
                            <Sparkles className="h-2.5 w-2.5 mr-1" />
                            {c.weekLabel || "weekly"}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-amber-700 dark:text-amber-400 font-medium tabular-nums">{c.xpReward}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{c.testCasesCount}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        <Link href={`/admin/submissions?challengeId=${c.id}`} className="hover:text-primary hover:underline">
                          {c.submissionsCount}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{fmtDate(c.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button asChild size="sm" variant="ghost" className="h-7 px-2">
                            <Link href={`/admin/challenges/${c.id}`}>
                              <Eye className="h-3.5 w-3.5" /> <span className="ml-1 text-xs">Edit</span>
                            </Link>
                          </Button>
                          {c.status === "published" ? (
                            <Button
                              size="sm" variant="ghost" className="h-7 px-2 text-amber-700 dark:text-amber-400"
                              onClick={() => handleStatusChange(c.id, "draft")}
                              title="Unpublish"
                            >
                              <EyeOff className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <Button
                              size="sm" variant="ghost" className="h-7 px-2 text-emerald-700 dark:text-emerald-400"
                              onClick={() => handleStatusChange(c.id, "published")}
                              title="Publish"
                            >
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {c.status !== "archived" && (
                            <Button
                              size="sm" variant="ghost" className="h-7 px-2"
                              onClick={() => handleStatusChange(c.id, "archived")}
                              title="Archive"
                            >
                              <Calendar className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 px-2 text-rose-600 hover:text-rose-700"
                            onClick={() => setDeleteTarget(c)}
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {!loading && filtered.length > 0 && (
              <div className="px-4 py-3 border-t border-border/60 text-xs text-muted-foreground">
                Showing {filtered.length} challenge{filtered.length === 1 ? "" : "s"}.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create dialog */}
        <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setForm(emptyForm); }}>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" /> Create new challenge
              </DialogTitle>
              <DialogDescription>
                Fill in the metadata, statement, examples and test cases. You can refine it in the editor after creation.
              </DialogDescription>
            </DialogHeader>

            <Tabs value={createTab} onValueChange={setCreateTab} className="flex-1 min-h-0 flex flex-col">
              <TabsList className="self-start">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="statement">Statement</TabsTrigger>
                <TabsTrigger value="examples">Examples</TabsTrigger>
                <TabsTrigger value="tests">Test cases</TabsTrigger>
                <TabsTrigger value="starter">Starter</TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 min-h-0 pr-3 -mr-3">
                <div className="pr-3 space-y-4 pt-2">
                  <TabsContent value="details" className="space-y-3 mt-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1.5 block">Title</Label>
                        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Two Sum" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Slug (URL)</Label>
                        <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })} placeholder="two-sum" className="font-mono" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Difficulty</Label>
                        <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DIFFICULTIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Category</Label>
                        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Topic (optional)</Label>
                        <Input value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="arrays, hashmaps" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">XP reward</Label>
                        <Input type="number" value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Target year (optional)</Label>
                        <Select value={form.targetYear} onValueChange={(v) => setForm({ ...form, targetYear: v })}>
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
                        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
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
                        <Input type="number" value={form.timeLimitMs} onChange={(e) => setForm({ ...form, timeLimitMs: Number(e.target.value) })} />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Memory limit (MB)</Label>
                        <Input type="number" value={form.memoryLimitMb} onChange={(e) => setForm({ ...form, memoryLimitMb: Number(e.target.value) })} />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Supported languages</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {LANGUAGES.map((l) => {
                          const sel = form.languages.includes(l);
                          return (
                            <button
                              key={l}
                              type="button"
                              onClick={() => setForm({ ...form, languages: sel ? form.languages.filter((x) => x !== l) : [...form.languages, l] })}
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
                      <Switch checked={form.isWeekly} onCheckedChange={(v) => setForm({ ...form, isWeekly: v })} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Weekly challenge</div>
                        <div className="text-xs text-muted-foreground">Featured on the weekly board and eligible for the weekly winners list.</div>
                      </div>
                    </div>
                    {form.isWeekly && (
                      <div>
                        <Label className="text-xs mb-1.5 block">Week label</Label>
                        <Input value={form.weekLabel} onChange={(e) => setForm({ ...form, weekLabel: e.target.value })} placeholder="Week 3 · Foundations" />
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="statement" className="space-y-3 mt-0">
                    <div>
                      <Label className="text-xs mb-1.5 block">Short statement (one-liner shown in listings)</Label>
                      <Textarea value={form.statement} onChange={(e) => setForm({ ...form, statement: e.target.value })} rows={2} placeholder="Find two indices in the array that sum to the target." />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Description (full problem statement, Markdown supported)</Label>
                      <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={6} placeholder="Given an array of integers and a target value, return indices of the two numbers such that they add up to target..." />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block">Constraints</Label>
                      <Textarea value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} rows={3} placeholder={"1 ≤ nums.length ≤ 10^4\n-10^9 ≤ nums[i] ≤ 10^9"} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs mb-1.5 block">Input format</Label>
                        <Textarea value={form.inputFormat} onChange={(e) => setForm({ ...form, inputFormat: e.target.value })} rows={3} placeholder="First line: n and target..." />
                      </div>
                      <div>
                        <Label className="text-xs mb-1.5 block">Output format</Label>
                        <Textarea value={form.outputFormat} onChange={(e) => setForm({ ...form, outputFormat: e.target.value })} rows={3} placeholder="Two space-separated indices..." />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="examples" className="space-y-3 mt-0">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Visible examples shown to students</Label>
                      <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, examples: [...form.examples, { input: "", output: "", explanation: "" }] })}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add example
                      </Button>
                    </div>
                    {form.examples.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border/60 rounded-lg">
                        No examples yet. Click "Add example" to insert one.
                      </div>
                    ) : form.examples.map((ex, i) => (
                      <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">Example {i + 1}</span>
                          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-rose-600" onClick={() => setForm({ ...form, examples: form.examples.filter((_, j) => j !== i) })}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] mb-1 block">Input</Label>
                            <Textarea rows={2} value={ex.input} onChange={(e) => { const arr = [...form.examples]; arr[i] = { ...arr[i], input: e.target.value }; setForm({ ...form, examples: arr }); }} className="font-mono text-xs" />
                          </div>
                          <div>
                            <Label className="text-[11px] mb-1 block">Output</Label>
                            <Textarea rows={2} value={ex.output} onChange={(e) => { const arr = [...form.examples]; arr[i] = { ...arr[i], output: e.target.value }; setForm({ ...form, examples: arr }); }} className="font-mono text-xs" />
                          </div>
                        </div>
                        <div>
                          <Label className="text-[11px] mb-1 block">Explanation (optional)</Label>
                          <Input value={ex.explanation || ""} onChange={(e) => { const arr = [...form.examples]; arr[i] = { ...arr[i], explanation: e.target.value }; setForm({ ...form, examples: arr }); }} />
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="tests" className="space-y-3 mt-0">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Test cases used for grading</Label>
                      <Button type="button" size="sm" variant="outline" onClick={() => setForm({ ...form, testCases: [...form.testCases, { name: `Test ${form.testCases.length + 1}`, input: "", expectedOutput: "", isHidden: true, isSample: false }] })}>
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add test case
                      </Button>
                    </div>
                    {form.testCases.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border/60 rounded-lg">
                        No test cases yet. At least one is recommended.
                      </div>
                    ) : form.testCases.map((tc, i) => (
                      <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2 relative">
                        <div className="flex items-center justify-between gap-2">
                          <Input
                            className="font-mono text-xs max-w-40"
                            value={tc.name}
                            onChange={(e) => { const arr = [...form.testCases]; arr[i] = { ...arr[i], name: e.target.value }; setForm({ ...form, testCases: arr }); }}
                            placeholder={`Test ${i + 1}`}
                          />
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                              <Switch checked={tc.isSample} onCheckedChange={(v) => { const arr = [...form.testCases]; arr[i] = { ...arr[i], isSample: v }; setForm({ ...form, testCases: arr }); }} />
                              Sample
                            </label>
                            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                              <Switch checked={tc.isHidden} onCheckedChange={(v) => { const arr = [...form.testCases]; arr[i] = { ...arr[i], isHidden: v }; setForm({ ...form, testCases: arr }); }} />
                              Hidden
                            </label>
                            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-rose-600" onClick={() => setForm({ ...form, testCases: form.testCases.filter((_, j) => j !== i) })}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[11px] mb-1 block">Input</Label>
                            <Textarea rows={2} value={tc.input} onChange={(e) => { const arr = [...form.testCases]; arr[i] = { ...arr[i], input: e.target.value }; setForm({ ...form, testCases: arr }); }} className="font-mono text-xs" />
                          </div>
                          <div>
                            <Label className="text-[11px] mb-1 block">Expected output</Label>
                            <Textarea rows={2} value={tc.expectedOutput} onChange={(e) => { const arr = [...form.testCases]; arr[i] = { ...arr[i], expectedOutput: e.target.value }; setForm({ ...form, testCases: arr }); }} className="font-mono text-xs" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="starter" className="space-y-3 mt-0">
                    <Label className="text-xs">Starter code per language</Label>
                    {form.languages.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-4 text-center border border-dashed border-border/60 rounded-lg">
                        Select at least one supported language on the Details tab.
                      </div>
                    ) : form.languages.map((l) => (
                      <div key={l}>
                        <Label className="text-[11px] mb-1 block">{l}</Label>
                        <Textarea
                          rows={4}
                          className="font-mono text-xs"
                          value={form.starterCode[l] || ""}
                          onChange={(e) => setForm({ ...form, starterCode: { ...form.starterCode, [l]: e.target.value } })}
                          placeholder={`# ${l} starter code...`}
                        />
                      </div>
                    ))}
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>

            <DialogFooter className="mt-3">
              <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(emptyForm); }} disabled={creating}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Create challenge
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" /> Delete challenge?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete <span className="font-medium">{deleteTarget?.title}</span> along with all of its test cases and all associated submission records. This action cannot be undone.
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
