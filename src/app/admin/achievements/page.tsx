"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Award, Trophy, Medal, Crown, Flame, Zap, ShieldCheck, Sparkles, Star,
  Code2, Plus, Edit, Trash2, CheckCircle2, Lock, Search, Filter, RefreshCw,
  Eye, UserCheck, AlertTriangle, ExternalLink, Calendar, Check, X, ShieldAlert,
  GraduationCap, ScrollText, CheckCircle
} from "lucide-react";
import { AdminGuard } from "@/components/admin-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
import { cn } from "@/lib/utils";

const ICONS = [
  "Award", "Trophy", "Medal", "Crown", "Flame", "Zap", "ShieldCheck",
  "Sparkles", "Star", "Code2", "GraduationCap", "ScrollText", "Target", "Rocket"
];

const CATEGORIES = [
  "XP Milestone", "Challenge", "Weekly Challenge", "Streak",
  "Competition", "Special", "Participation", "Leadership"
];

const REQUIREMENT_TYPES = [
  { value: "xp_threshold", label: "XP Threshold (e.g. 500 XP)" },
  { value: "challenges_count", label: "Number of Challenges Solved" },
  { value: "accepted_submissions", label: "Number of Accepted Submissions" },
  { value: "submission_count", label: "Total Submissions Attempted" },
  { value: "weekly_winner", label: "Weekly Challenge Winner" },
  { value: "streak", label: "Daily Coding Streak (Days)" },
  { value: "manual", label: "Manual Award Only (Admin Discretion)" },
];

const RARITIES = ["common", "rare", "epic", "legendary"];

interface BadgeItem {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  rarity: string;
  icon: string;
  requirementType: string;
  requirementValue: number;
  xpReward: number;
  isActive: boolean;
  unlockCount: number;
}

interface CertificateTemplateItem {
  id: string;
  name: string;
  description: string;
  category: string;
  requirementType: string;
  requirementValue: number;
  isAutomatic: boolean;
  isActive: boolean;
  issuerName: string;
  badgeColor: string;
  issuedCount: number;
}

interface IssuedCertItem {
  id: string;
  verificationId: string;
  title: string;
  recipientName: string;
  recipientUid: string;
  recipientYear: string;
  issueDate: string;
  status: string;
  template: { name: string; category: string };
  user: { id: string; name: string; uid: string };
}

interface ParticipantItem {
  id: string;
  name: string;
  uid: string;
  year: string;
  xp: number;
}

export default function AdminAchievementsPage() {
  const [activeTab, setActiveTab] = useState<string>("badges");
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState<any>({});
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [certificateTemplates, setCertificateTemplates] = useState<CertificateTemplateItem[]>([]);
  const [issuedCertificates, setIssuedCertificates] = useState<IssuedCertItem[]>([]);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Create/Edit Badge Dialog State
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false);
  const [editingBadge, setEditingBadge] = useState<BadgeItem | null>(null);
  const [badgeForm, setBadgeForm] = useState({
    name: "",
    description: "",
    category: "XP Milestone",
    rarity: "common",
    icon: "Award",
    requirementType: "xp_threshold",
    requirementValue: 100,
    xpReward: 0,
    isActive: true,
  });

  // Create/Edit Certificate Template Dialog State
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<CertificateTemplateItem | null>(null);
  const [certForm, setCertForm] = useState({
    name: "",
    description: "",
    category: "Milestone",
    requirementType: "xp_threshold",
    requirementValue: 1000,
    isAutomatic: true,
    isActive: true,
    issuerName: "A-I-M-L Club",
    badgeColor: "#eab308",
  });

  // Manual Award Dialog State
  const [awardDialogOpen, setAwardDialogOpen] = useState(false);
  const [awardForm, setAwardForm] = useState({
    userId: "",
    type: "badge" as "badge" | "certificate",
    targetId: "",
    reason: "",
  });
  const [confirmAwardOpen, setConfirmAwardOpen] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<{ itemType: "badge" | "certificate"; id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/achievements");
      if (!res.ok) {
        toast.error("Failed to load achievements");
        return;
      }
      const data = await res.json();
      setStats(data.stats || {});
      setBadges(data.badges || []);
      setCertificateTemplates(data.certificateTemplates || []);
      setIssuedCertificates(data.issuedCertificates || []);
      setParticipants(data.participants || []);
    } catch {
      toast.error("An error occurred while loading achievements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open Create Badge
  const handleOpenCreateBadge = () => {
    setEditingBadge(null);
    setBadgeForm({
      name: "",
      description: "",
      category: "XP Milestone",
      rarity: "common",
      icon: "Award",
      requirementType: "xp_threshold",
      requirementValue: 100,
      xpReward: 0,
      isActive: true,
    });
    setBadgeDialogOpen(true);
  };

  // Open Edit Badge
  const handleOpenEditBadge = (badge: BadgeItem) => {
    setEditingBadge(badge);
    setBadgeForm({
      name: badge.name,
      description: badge.description,
      category: badge.category,
      rarity: badge.rarity,
      icon: badge.icon,
      requirementType: badge.requirementType,
      requirementValue: badge.requirementValue,
      xpReward: badge.xpReward,
      isActive: badge.isActive,
    });
    setBadgeDialogOpen(true);
  };

  // Save Badge (Create or Update)
  const handleSaveBadge = async () => {
    if (!badgeForm.name.trim() || !badgeForm.description.trim()) {
      toast.error("Name and description are required");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingBadge;
      const res = await fetch("/api/admin/achievements", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: "badge",
          id: editingBadge?.id,
          ...badgeForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save badge");
        return;
      }
      toast.success(isEdit ? "Badge updated successfully!" : "Badge created successfully!");
      setBadgeDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Failed to save badge");
    } finally {
      setSaving(false);
    }
  };

  // Open Create Certificate Template
  const handleOpenCreateCert = () => {
    setEditingCert(null);
    setCertForm({
      name: "",
      description: "",
      category: "Milestone",
      requirementType: "xp_threshold",
      requirementValue: 1000,
      isAutomatic: true,
      isActive: true,
      issuerName: "A-I-M-L Club",
      badgeColor: "#eab308",
    });
    setCertDialogOpen(true);
  };

  // Open Edit Certificate Template
  const handleOpenEditCert = (template: CertificateTemplateItem) => {
    setEditingCert(template);
    setCertForm({
      name: template.name,
      description: template.description,
      category: template.category,
      requirementType: template.requirementType,
      requirementValue: template.requirementValue,
      isAutomatic: template.isAutomatic,
      isActive: template.isActive,
      issuerName: template.issuerName,
      badgeColor: template.badgeColor,
    });
    setCertDialogOpen(true);
  };

  // Save Certificate Template
  const handleSaveCert = async () => {
    if (!certForm.name.trim() || !certForm.description.trim()) {
      toast.error("Name and description are required");
      return;
    }
    setSaving(true);
    try {
      const isEdit = !!editingCert;
      const res = await fetch("/api/admin/achievements", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemType: "certificate",
          id: editingCert?.id,
          ...certForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save certificate template");
        return;
      }
      toast.success(isEdit ? "Certificate template updated!" : "Certificate template created!");
      setCertDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Failed to save certificate template");
    } finally {
      setSaving(false);
    }
  };

  // Delete Item
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/achievements?itemType=${deleteTarget.itemType}&id=${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete");
        return;
      }
      toast.success(`Deleted ${deleteTarget.name}`);
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error("Failed to delete item");
    } finally {
      setSaving(false);
    }
  };

  // Submit Manual Award
  const handleExecuteAward = async () => {
    if (!awardForm.userId || !awardForm.targetId) {
      toast.error("Please select both a student and an award");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/achievements/award", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(awardForm),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to award achievement");
        return;
      }
      toast.success("Achievement awarded successfully!");
      setConfirmAwardOpen(false);
      setAwardDialogOpen(false);
      fetchData();
    } catch {
      toast.error("Failed to award achievement");
    } finally {
      setSaving(false);
    }
  };

  // Filter badges
  const filteredBadges = badges.filter((b) => {
    if (selectedCategory !== "all" && b.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.description.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedStudent = participants.find((p) => p.id === awardForm.userId);
  const selectedAwardItem = awardForm.type === "badge"
    ? badges.find((b) => b.id === awardForm.targetId)
    : certificateTemplates.find((c) => c.id === awardForm.targetId);

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between gap-4 flex-wrap"
        >
          <div className="flex items-center gap-3">
            <div className="brand-gradient h-11 w-11 rounded-xl flex items-center justify-center text-brand-foreground shadow-md">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Achievements & Certifications</h1>
              <p className="text-sm text-muted-foreground">
                Dynamically create, manage, and award badges and certificates for all participants.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAwardForm({ userId: "", type: "badge", targetId: "", reason: "" });
                setAwardDialogOpen(true);
              }}
              className="gap-1.5"
            >
              <UserCheck className="h-4 w-4 text-amber-500" /> Award Manually
            </Button>
            <Button variant="outline" size="sm" onClick={() => fetchData()} disabled={loading} className="gap-2">
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </motion.div>

        {/* Overview Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="border-border/60 bg-card/60">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground font-medium">Total Badges</div>
              <div className="text-2xl font-bold mt-1 text-primary">{stats.totalBadges || 0}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Active catalog</div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground font-medium">Certificates</div>
              <div className="text-2xl font-bold mt-1 text-amber-500">{stats.totalCertificateTemplates || 0}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Active templates</div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground font-medium">Issued Certificates</div>
              <div className="text-2xl font-bold mt-1 text-emerald-500">{stats.totalIssuedCerts || 0}</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">Students certified</div>
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/60">
            <CardContent className="pt-4 pb-4">
              <div className="text-xs text-muted-foreground font-medium">Most Unlocked Badge</div>
              <div className="text-sm font-bold mt-1.5 truncate">
                {stats.mostUnlockedBadge ? `🏆 ${stats.mostUnlockedBadge.name}` : "None yet"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {stats.mostUnlockedBadge ? `${stats.mostUnlockedBadge.unlockCount} unlocks` : "0 unlocks"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tab Controls */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <TabsList className="grid grid-cols-3 w-80 sm:w-96">
              <TabsTrigger value="badges" className="text-xs font-semibold">
                🏆 Badges ({badges.length})
              </TabsTrigger>
              <TabsTrigger value="certificates" className="text-xs font-semibold">
                🎓 Certificates ({certificateTemplates.length})
              </TabsTrigger>
              <TabsTrigger value="issued" className="text-xs font-semibold">
                📜 Issued Logs
              </TabsTrigger>
            </TabsList>

            {activeTab === "badges" && (
              <Button size="sm" onClick={handleOpenCreateBadge} className="gap-1.5 font-semibold">
                <Plus className="h-4 w-4" /> Create Badge
              </Button>
            )}
            {activeTab === "certificates" && (
              <Button size="sm" onClick={handleOpenCreateCert} className="gap-1.5 font-semibold">
                <Plus className="h-4 w-4" /> Create Certificate
              </Button>
            )}
          </div>

          {/* TAB 1: BADGES MANAGEMENT */}
          <TabsContent value="badges" className="space-y-4 mt-0">
            <Card className="border-border/60">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-48">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="h-8 text-xs font-medium">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="w-full sm:w-64">
                    <div className="relative">
                      <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search badges..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-44 rounded-xl" />
                ))
              ) : filteredBadges.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
                  No badges found. Click "+ Create Badge" to add your first one!
                </div>
              ) : (
                filteredBadges.map((badge) => (
                  <Card key={badge.id} className={cn(
                    "border transition-all relative overflow-hidden",
                    badge.isActive ? "border-border/70 hover:border-primary/50" : "border-dashed border-border/40 opacity-70"
                  )}>
                    <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 text-lg">
                              🏆
                            </div>
                            <div>
                              <div className="font-bold text-sm leading-none">{badge.name}</div>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1 capitalize">
                                {badge.category}
                              </Badge>
                            </div>
                          </div>
                          <Badge
                            className={cn(
                              "text-[10px] font-mono",
                              badge.rarity === "legendary" ? "bg-amber-500/20 text-amber-400 border-amber-500/40" :
                              badge.rarity === "epic" ? "bg-purple-500/20 text-purple-400 border-purple-500/40" :
                              badge.rarity === "rare" ? "bg-sky-500/20 text-sky-400 border-sky-500/40" :
                              "bg-slate-500/20 text-slate-300 border-slate-500/40"
                            )}
                          >
                            {badge.rarity}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                          {badge.description}
                        </p>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-border/40">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Requirement:</span>
                          <span className="font-semibold text-foreground">
                            {badge.requirementType === "xp_threshold" && `${badge.requirementValue} XP`}
                            {badge.requirementType === "challenges_count" && `${badge.requirementValue} Challenges`}
                            {badge.requirementType === "accepted_submissions" && `${badge.requirementValue} Solves`}
                            {badge.requirementType === "streak" && `${badge.requirementValue} Days Streak`}
                            {badge.requirementType === "weekly_winner" && "Weekly Winner"}
                            {badge.requirementType === "manual" && "Manual Admin Award"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Unlocked by:</span>
                          <Badge variant="secondary" className="text-[10px] font-semibold">
                            {badge.unlockCount} students
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <Badge variant={badge.isActive ? "default" : "outline"} className="text-[10px]">
                            {badge.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditBadge(badge)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget({ itemType: "badge", id: badge.id, name: badge.name })}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB 2: CERTIFICATES MANAGEMENT */}
          <TabsContent value="certificates" className="space-y-4 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-xl" />
                ))
              ) : certificateTemplates.length === 0 ? (
                <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
                  No certificate templates found. Click "+ Create Certificate" to create one!
                </div>
              ) : (
                certificateTemplates.map((template) => (
                  <Card key={template.id} className="border border-border/70 hover:border-amber-500/50 transition-all overflow-hidden relative">
                    <div className="h-1 bg-amber-500 w-full" />
                    <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                              <GraduationCap className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="font-bold text-sm leading-none">{template.name}</div>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 mt-1">
                                {template.category}
                              </Badge>
                            </div>
                          </div>
                          <Badge variant={template.isAutomatic ? "secondary" : "outline"} className="text-[10px]">
                            {template.isAutomatic ? "Automatic" : "Manual Award"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                          {template.description}
                        </p>
                      </div>

                      <div className="space-y-3 pt-2 border-t border-border/40 text-xs">
                        <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                          <span>Requirement:</span>
                          <span className="font-semibold text-foreground">
                            {template.requirementType === "xp_threshold" && `${template.requirementValue} XP`}
                            {template.requirementType === "challenges_count" && `${template.requirementValue} Solves`}
                            {template.requirementType === "weekly_winner" && "Weekly Winner"}
                            {template.requirementType === "manual" && "Manual Only"}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground">Issued to:</span>
                          <Badge variant="secondary" className="text-[10px] font-semibold text-amber-500">
                            {template.issuedCount} students
                          </Badge>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <Badge variant={template.isActive ? "default" : "outline"} className="text-[10px]">
                            {template.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditCert(template)}
                              className="h-7 w-7 p-0"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget({ itemType: "certificate", id: template.id, name: template.name })}
                              className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {/* TAB 3: ISSUED CERTIFICATES AUDIT LOG */}
          <TabsContent value="issued" className="space-y-4 mt-0">
            <Card className="border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Issued Certificates Audit Log</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {issuedCertificates.length} certificate{issuedCertificates.length === 1 ? "" : "s"} issued
                  </span>
                </CardTitle>
                <CardDescription>
                  Live verification records for all earned and manually awarded certificates.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Verification ID</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead>UID / Year</TableHead>
                        <TableHead>Certificate Title</TableHead>
                        <TableHead>Issue Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <TableRow key={i}>
                            <TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell>
                          </TableRow>
                        ))
                      ) : issuedCertificates.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                            No certificates issued yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        issuedCertificates.map((cert) => (
                          <TableRow key={cert.id} className="hover:bg-muted/30">
                            <TableCell>
                              <span className="font-mono text-xs font-bold text-amber-500">
                                {cert.verificationId}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {cert.recipientName}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {cert.recipientUid} (Yr {cert.recipientYear})
                            </TableCell>
                            <TableCell className="text-xs font-semibold">
                              {cert.title}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(cert.issueDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <Badge className={cn(
                                "text-[10px]",
                                cert.status === "VALID" ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" : "bg-rose-500/15 text-rose-500 border-rose-500/30"
                              )}>
                                {cert.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link
                                href={`/verify/${cert.verificationId}`}
                                target="_blank"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                              >
                                Verify <ExternalLink className="h-3 w-3" />
                              </Link>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* CREATE / EDIT BADGE DIALOG */}
        <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                {editingBadge ? "Edit Badge" : "Create New Badge"}
              </DialogTitle>
              <DialogDescription>
                Define the badge metadata, unlock rules, and XP milestones.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Badge Name *</Label>
                  <Input
                    placeholder="e.g. 500 XP Club"
                    value={badgeForm.name}
                    onChange={(e) => setBadgeForm({ ...badgeForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={badgeForm.category}
                    onValueChange={(val) => setBadgeForm({ ...badgeForm, category: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description *</Label>
                <Textarea
                  placeholder="e.g. Earn 500 XP across platform challenges."
                  value={badgeForm.description}
                  onChange={(e) => setBadgeForm({ ...badgeForm, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Unlock Condition Type</Label>
                  <Select
                    value={badgeForm.requirementType}
                    onValueChange={(val) => setBadgeForm({ ...badgeForm, requirementType: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REQUIREMENT_TYPES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Requirement Target Value</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="500"
                    value={badgeForm.requirementValue}
                    onChange={(e) => setBadgeForm({ ...badgeForm, requirementValue: Number(e.target.value) })}
                    disabled={badgeForm.requirementType === "weekly_winner" || badgeForm.requirementType === "manual"}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Rarity</Label>
                  <Select
                    value={badgeForm.rarity}
                    onValueChange={(val) => setBadgeForm({ ...badgeForm, rarity: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RARITIES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Optional XP Reward on Unlock</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={badgeForm.xpReward}
                    onChange={(e) => setBadgeForm({ ...badgeForm, xpReward: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div>
                  <Label className="text-xs font-semibold block">Badge Active</Label>
                  <span className="text-[11px] text-muted-foreground">Participants can unlock this badge when active.</span>
                </div>
                <Switch
                  checked={badgeForm.isActive}
                  onCheckedChange={(c) => setBadgeForm({ ...badgeForm, isActive: c })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setBadgeDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSaveBadge} disabled={saving} className="font-semibold">
                {saving ? "Saving..." : editingBadge ? "Update Badge" : "Create Badge"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CREATE / EDIT CERTIFICATE TEMPLATE DIALOG */}
        <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
          <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-amber-500" />
                {editingCert ? "Edit Certificate Template" : "Create Certificate Template"}
              </DialogTitle>
              <DialogDescription>
                Configure certificate title, issuing rules, and eligibility criteria.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Certificate Title *</Label>
                  <Input
                    placeholder="e.g. Coding Excellence"
                    value={certForm.name}
                    onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Category</Label>
                  <Select
                    value={certForm.category}
                    onValueChange={(val) => setCertForm({ ...certForm, category: val })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Milestone">Milestone</SelectItem>
                      <SelectItem value="Challenge">Challenge</SelectItem>
                      <SelectItem value="Weekly Champion">Weekly Champion</SelectItem>
                      <SelectItem value="Participation">Participation</SelectItem>
                      <SelectItem value="Special">Special Recognition</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Description *</Label>
                <Textarea
                  placeholder="e.g. Awarded to participants achieving 1000 XP in competitive programming."
                  value={certForm.description}
                  onChange={(e) => setCertForm({ ...certForm, description: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Issuing Mode</Label>
                  <Select
                    value={certForm.isAutomatic ? "auto" : "manual"}
                    onValueChange={(val) => setCertForm({ ...certForm, isAutomatic: val === "auto" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automatic (System issues on criteria)</SelectItem>
                      <SelectItem value="manual">Manual Award Only (Admin issues)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {certForm.isAutomatic && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Requirement Condition</Label>
                    <Select
                      value={certForm.requirementType}
                      onValueChange={(val) => setCertForm({ ...certForm, requirementType: val })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="xp_threshold">XP Threshold</SelectItem>
                        <SelectItem value="challenges_count">Challenges Solved</SelectItem>
                        <SelectItem value="weekly_winner">Weekly Challenge Winner</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {certForm.isAutomatic && certForm.requirementType !== "weekly_winner" && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Target Value (e.g. 1000 XP or 10 Solves)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={certForm.requirementValue}
                    onChange={(e) => setCertForm({ ...certForm, requirementValue: Number(e.target.value) })}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Issuing Authority Name</Label>
                <Input
                  value={certForm.issuerName}
                  onChange={(e) => setCertForm({ ...certForm, issuerName: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCertDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={handleSaveCert} disabled={saving} className="font-semibold">
                {saving ? "Saving..." : editingCert ? "Update Template" : "Create Template"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MANUAL AWARD DIALOG */}
        <Dialog open={awardDialogOpen} onOpenChange={setAwardDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-amber-500" />
                Manually Award Achievement / Certificate
              </DialogTitle>
              <DialogDescription>
                Award a special badge or certificate to any participant directly.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Select Participant *</Label>
                <Select
                  value={awardForm.userId}
                  onValueChange={(val) => setAwardForm({ ...awardForm, userId: val })}
                >
                  <SelectTrigger className="font-medium">
                    <SelectValue placeholder="Choose student..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {participants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.uid}) — Yr {p.year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Award Type</Label>
                  <Select
                    value={awardForm.type}
                    onValueChange={(val: any) => setAwardForm({ ...awardForm, type: val, targetId: "" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="badge">🏆 Badge</SelectItem>
                      <SelectItem value="certificate">🎓 Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Select Award Item *</Label>
                  <Select
                    value={awardForm.targetId}
                    onValueChange={(val) => setAwardForm({ ...awardForm, targetId: val })}
                  >
                    <SelectTrigger><SelectValue placeholder="Choose item..." /></SelectTrigger>
                    <SelectContent className="max-h-60">
                      {awardForm.type === "badge" ? (
                        badges.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            🏆 {b.name}
                          </SelectItem>
                        ))
                      ) : (
                        certificateTemplates.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            🎓 {c.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Award Reason / Note (Optional)</Label>
                <Textarea
                  placeholder="e.g. Outstanding performance in Week 5 challenge."
                  value={awardForm.reason}
                  onChange={(e) => setAwardForm({ ...awardForm, reason: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAwardDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => setConfirmAwardOpen(true)}
                disabled={!awardForm.userId || !awardForm.targetId}
                className="font-semibold"
              >
                Award to Student
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* CONFIRM MANUAL AWARD DIALOG */}
        <AlertDialog open={confirmAwardOpen} onOpenChange={setConfirmAwardOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" /> Confirm Manual Award
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2 pt-2">
                <p>
                  Are you sure you want to award <strong className="text-foreground">{selectedAwardItem?.name}</strong> to <strong className="text-foreground">{selectedStudent?.name}</strong> ({selectedStudent?.uid})?
                </p>
                <p className="text-xs text-muted-foreground">
                  The student will immediately receive a notification and see this in their Achievements dashboard.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExecuteAward}
                disabled={saving}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                {saving ? "Awarding..." : "Confirm & Award"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* DELETE CONFIRMATION DIALOG */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="h-5 w-5" /> Delete {deleteTarget?.itemType === "badge" ? "Badge" : "Certificate"}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong className="text-foreground">{deleteTarget?.name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={saving}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              >
                {saving ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminGuard>
  );
}
