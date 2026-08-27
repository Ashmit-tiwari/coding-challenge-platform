"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Settings, Loader2, Save, Plus, X, AlertTriangle, Megaphone, Code2, Tag, Gauge,
  ShieldCheck, Languages, Trophy,
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Announcement { title: string; body: string; }

interface SettingsResponse {
  settings: {
    platform_name?: string;
    leaderboard_scope_default?: string;
    supported_languages?: string[];
    categories?: string[];
    difficulties?: string[];
    similarity_threshold?: number;
    rate_limit_submissions_per_min?: number;
    announcements?: Announcement[];
  };
  keys: string[];
}

const DEFAULTS = {
  platform_name: "Weekly Coding Challenges 2.0",
  leaderboard_scope_default: "overall",
  supported_languages: ["python", "cpp", "javascript", "java"],
  categories: ["algorithms", "data-structures", "math", "strings", "dp", "greedy", "graphs", "trees", "recursion", "misc"],
  difficulties: ["easy", "medium", "hard", "expert"],
  similarity_threshold: 0.7,
  rate_limit_submissions_per_min: 10,
  announcements: [] as Announcement[],
};

function TagsInput({
  label, values, onChange, placeholder,
}: {
  label: string; values: string[]; onChange: (v: string[]) => void; placeholder?: string;
}) {
  const [input, setInput] = useState("");
  const add = () => {
    const v = input.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    if (v && !values.includes(v)) onChange([...values, v]);
    setInput("");
  };
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</Label>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-8">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-primary/10 text-primary border border-primary/30">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} className="hover:text-rose-500" aria-label={`Remove ${v}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {values.length === 0 && <span className="text-xs text-muted-foreground">None yet.</span>}
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder || "Type a value and press Enter…"}
          className="text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // editable local form
  const [platformName, setPlatformName] = useState(DEFAULTS.platform_name);
  const [scopeDefault, setScopeDefault] = useState(DEFAULTS.leaderboard_scope_default);
  const [languages, setLanguages] = useState<string[]>(DEFAULTS.supported_languages);
  const [categories, setCategories] = useState<string[]>(DEFAULTS.categories);
  const [difficulties, setDifficulties] = useState<string[]>(DEFAULTS.difficulties);
  const [similarityThreshold, setSimilarityThreshold] = useState(DEFAULTS.similarity_threshold);
  const [rateLimit, setRateLimit] = useState(DEFAULTS.rate_limit_submissions_per_min);
  const [announcements, setAnnouncements] = useState<Announcement[]>(DEFAULTS.announcements);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/settings`);
      if (!res.ok) { toast.error("Failed to load settings"); return; }
      const d: SettingsResponse = await res.json();
      setData(d);
      const s = { ...DEFAULTS, ...(d.settings || {}) } as any;
      setPlatformName(s.platform_name);
      setScopeDefault(s.leaderboard_scope_default);
      setLanguages(Array.isArray(s.supported_languages) ? s.supported_languages : []);
      setCategories(Array.isArray(s.categories) ? s.categories : []);
      setDifficulties(Array.isArray(s.difficulties) ? s.difficulties : []);
      setSimilarityThreshold(Number(s.similarity_threshold) || 0.7);
      setRateLimit(Number(s.rate_limit_submissions_per_min) || 10);
      setAnnouncements(Array.isArray(s.announcements) ? s.announcements : []);
    } catch {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body = {
        platform_name: platformName,
        leaderboard_scope_default: scopeDefault,
        supported_languages: languages,
        categories,
        difficulties,
        similarity_threshold: similarityThreshold,
        rate_limit_submissions_per_min: Number(rateLimit),
        announcements,
      };
      const res = await fetch(`/api/admin/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.error || "Failed to save settings"); return; }
      toast.success(`Settings saved (${(d.updated || []).length} keys updated)`);
      setConfirmOpen(false);
      fetchSettings();
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminGuard>
      <div className="space-y-5">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <div className="flex items-center gap-3">
            <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
              <p className="text-sm text-muted-foreground">Platform-wide configuration. Changes apply to the entire site.</p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <>
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" /> Platform
                </CardTitle>
                <CardDescription className="text-xs">Identity and default behaviours.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Platform name</Label>
                  <Input value={platformName} onChange={(e) => setPlatformName(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Leaderboard default scope</Label>
                  <Select value={scopeDefault} onValueChange={setScopeDefault}>
                    <SelectTrigger className="max-w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="overall">Overall</SelectItem>
                      <SelectItem value="year1">First Year</SelectItem>
                      <SelectItem value="year2">Second Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Languages className="h-4 w-4 text-primary" /> Supported languages
                  </CardTitle>
                  <CardDescription className="text-xs">Languages students may submit solutions in.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TagsInput label="Languages" values={languages} onChange={setLanguages} placeholder="e.g. python, cpp, javascript…" />
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" /> Categories
                  </CardTitle>
                  <CardDescription className="text-xs">Topic categories challenges can be tagged with.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TagsInput label="Categories" values={categories} onChange={setCategories} placeholder="e.g. algorithms, dp…" />
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-primary" /> Difficulties
                  </CardTitle>
                  <CardDescription className="text-xs">Difficulty levels challenges can be tagged with.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TagsInput label="Difficulties" values={difficulties} onChange={setDifficulties} placeholder="e.g. easy, medium, hard…" />
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Gauge className="h-4 w-4 text-primary" /> Integrity & limits
                  </CardTitle>
                  <CardDescription className="text-xs">Plagiarism threshold and rate limiting.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Similarity threshold (auto-flag)</Label>
                      <span className="text-xs tabular-nums font-mono">{(similarityThreshold * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                      value={[similarityThreshold]}
                      min={0.3}
                      max={0.95}
                      step={0.05}
                      onValueChange={(v) => setSimilarityThreshold(v[0])}
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Pairs scoring above this are auto-flagged for review.
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">Submissions per minute (per user)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={rateLimit}
                      onChange={(e) => setRateLimit(Number(e.target.value))}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Announcements */}
            <Card className="border-border/60">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Megaphone className="h-4 w-4 text-amber-500" /> Announcements
                  </CardTitle>
                  <CardDescription className="text-xs">Broadcast messages shown to all students on the dashboard.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAnnouncements([...announcements, { title: "", body: "" }])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add announcement
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {announcements.length === 0 ? (
                  <div className="text-xs text-muted-foreground py-6 text-center border border-dashed border-border/60 rounded-lg">
                    No announcements. Click "Add announcement" to compose one.
                  </div>
                ) : announcements.map((a, i) => (
                  <div key={i} className="rounded-lg border border-border/60 p-3 space-y-2 relative">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium">Announcement {i + 1}</span>
                      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-rose-600" onClick={() => setAnnouncements(announcements.filter((_, j) => j !== i))}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Title (e.g. Week 5 challenge now live!)"
                      value={a.title}
                      onChange={(e) => setAnnouncements(announcements.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
                    />
                    <Textarea
                      rows={2}
                      placeholder="Body (Markdown supported)…"
                      value={a.body}
                      onChange={(e) => setAnnouncements(announcements.map((x, j) => j === i ? { ...x, body: e.target.value } : x))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Danger zone */}
            <Card className="border-rose-500/40 bg-rose-500/5">
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-rose-500/15 text-rose-700 dark:text-rose-400 ring-1 ring-rose-500/40 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-rose-700 dark:text-rose-400">Danger zone</div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Saving these settings affects the entire platform. Lowering the similarity threshold will surface more
                      plagiarism flags; raising the rate limit may impact grading throughput. Changes are audit-logged.
                    </p>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Button onClick={() => setConfirmOpen(true)} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                    Save all settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" /> Confirm platform-wide save
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will overwrite the platform settings shown above for all users immediately. Are you sure?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Save settings
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminGuard>
  );
}
