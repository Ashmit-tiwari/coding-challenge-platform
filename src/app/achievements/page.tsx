"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Award, Trophy, Medal, Crown, Flame, Zap, ShieldCheck, Sparkles, Star,
  Code2, CheckCircle2, Lock, Download, Printer, ExternalLink, RefreshCw,
  GraduationCap, ScrollText, Check, ShieldAlert, FileText, ArrowRight, Eye
} from "lucide-react";
import { AuthGuard } from "@/components/auth-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { CertificateDocument, CertificateData } from "@/components/certificate-document";
import { cn } from "@/lib/utils";

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
  unlocked: boolean;
  unlockedAt: string | null;
  awardType: string;
  reason?: string | null;
  progress: {
    current: number;
    needed: number;
    progressPct: number;
    remaining: number;
  };
}

export default function AchievementsPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateData[]>([]);
  const [stats, setStats] = useState<any>({});
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [viewCert, setViewCert] = useState<CertificateData | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/achievements", { cache: "no-store" });
      if (!res.ok) {
        toast.error("Failed to load achievements");
        return;
      }
      const data = await res.json();
      setUser(data.user);
      setBadges(data.badges || []);
      setCertificates(data.certificates || []);
      setStats(data.stats || {});
    } catch {
      toast.error("Error loading achievements");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categories = ["all", "XP Milestone", "Challenge", "Weekly Challenge", "Streak", "Special", "Participation"];

  const filteredBadges = badges.filter((b) => {
    if (selectedCategory === "all") return true;
    return b.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  return (
    <AuthGuard>
      <div className="space-y-8 pb-16 max-w-6xl mx-auto">
        {/* Hero Progress Header */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card/90 to-primary/5 p-6 sm:p-8"
        >
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
                <Trophy className="h-3.5 w-3.5" /> Achievements & Honors
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight">Your Hall of Achievements</h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                Unlock official badges, level milestones, and verifiable certificates as you conquer challenges.
              </p>
            </div>

            <div className="flex items-center gap-4 bg-background/80 backdrop-blur-sm border border-border/60 rounded-xl p-4 shadow-sm w-full md:w-auto justify-around">
              <div className="text-center px-3">
                <div className="text-xs text-muted-foreground">Total XP</div>
                <div className="text-2xl font-black text-amber-500 flex items-center justify-center gap-1">
                  <Zap className="h-5 w-5" /> {user?.xp || 0}
                </div>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <div className="text-center px-3">
                <div className="text-xs text-muted-foreground">Badges</div>
                <div className="text-2xl font-black text-primary">
                  {stats.unlockedBadges || 0} <span className="text-xs text-muted-foreground font-normal">/ {stats.totalBadges || 0}</span>
                </div>
              </div>
              <div className="h-8 w-px bg-border/60" />
              <div className="text-center px-3">
                <div className="text-xs text-muted-foreground">Certificates</div>
                <div className="text-2xl font-black text-emerald-500">{stats.totalCertificates || 0}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section 1: VERIFIED CERTIFICATES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-indigo-500" />
              <h2 className="text-lg font-bold tracking-tight">Official Verifiable Certificates</h2>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              {certificates.length} Earned
            </Badge>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-xl" />
              ))}
            </div>
          ) : certificates.length === 0 ? (
            <Card className="border-dashed border-border/70 bg-muted/20">
              <CardContent className="py-8 text-center space-y-2">
                <GraduationCap className="h-8 w-8 text-muted-foreground mx-auto" />
                <div className="font-semibold text-sm">No certificates earned yet</div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Earn XP milestones or win weekly coding challenges to receive official certificates verified by Chandigarh University, AI & ML Club, and byteXL.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {certificates.map((cert) => (
                <Card
                  key={cert.verificationId}
                  className="border border-indigo-500/30 bg-gradient-to-br from-card via-card to-indigo-500/5 hover:border-indigo-500 transition-all shadow-sm overflow-hidden"
                >
                  <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-600 text-xl font-bold">
                            🎓
                          </div>
                          <div>
                            <div className="font-bold text-base leading-tight">{cert.title}</div>
                            <div className="text-xs text-muted-foreground">{cert.issuerName || "AI & ML Club • byteXL"}</div>
                          </div>
                        </div>
                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] gap-1 font-mono">
                          <CheckCircle2 className="h-3 w-3" /> {cert.status || "VALID"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {cert.description || "Awarded for exceptional problem-solving and competitive coding excellence."}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-border/50 flex items-center justify-between text-xs flex-wrap gap-2">
                      <div className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">
                        ID: {cert.verificationId}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewCert(cert)}
                          className="h-7 text-xs gap-1 font-medium border-indigo-500/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/10"
                        >
                          <Eye className="h-3 w-3" /> View & Download Certificate
                        </Button>
                        <Link
                          href={`/verify/${cert.verificationId}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          Verify <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: BADGES & ACHIEVEMENTS */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <h2 className="text-lg font-bold tracking-tight">Badges & Milestones</h2>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setSelectedCategory(c)}
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                    selectedCategory.toLowerCase() === c.toLowerCase()
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  {c === "all" ? "All Badges" : c}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : filteredBadges.length === 0 ? (
            <Card className="border-dashed border-border/70 bg-muted/20">
              <CardContent className="py-8 text-center text-muted-foreground text-xs">
                No badges found in this category.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBadges.map((badge) => (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={cn(
                    "border transition-all h-full flex flex-col justify-between relative overflow-hidden",
                    badge.unlocked
                      ? "border-amber-500/40 bg-card shadow-sm hover:border-amber-500/70"
                      : "border-border/60 bg-muted/10 opacity-80"
                  )}>
                    {badge.unlocked && (
                      <div className="absolute top-0 right-0 h-16 w-16 overflow-hidden pointer-events-none">
                        <div className="absolute transform rotate-45 bg-amber-500 text-white font-black text-[9px] py-0.5 right-[-35px] top-[18px] w-[120px] text-center shadow-sm">
                          UNLOCKED
                        </div>
                      </div>
                    )}

                    <CardContent className="p-5 space-y-4">
                      <div>
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "h-12 w-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border",
                            badge.unlocked
                              ? "bg-amber-500/10 border-amber-500/40 text-amber-500 ring-2 ring-amber-500/20"
                              : "bg-muted border-border/60 text-muted-foreground grayscale"
                          )}>
                            {badge.unlocked ? "🏆" : "🔒"}
                          </div>
                          <div className="min-w-0 flex-1 pr-6">
                            <div className="font-bold text-sm leading-snug truncate">{badge.name}</div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                                {badge.category}
                              </Badge>
                              {badge.xpReward > 0 && (
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-amber-500">
                                  +{badge.xpReward} XP
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                          {badge.description}
                        </p>
                      </div>

                      {/* Progress Bar & Unlock Condition */}
                      <div className="space-y-1.5 pt-2 border-t border-border/40">
                        {badge.unlocked ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-emerald-500 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Completed
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              {badge.unlockedAt ? new Date(badge.unlockedAt).toLocaleDateString() : "Earned"}
                            </span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground font-medium text-[11px]">Progress</span>
                              <span className="font-mono text-[11px] font-bold">
                                {badge.progress.current} / {badge.progress.needed} {badge.requirementType === "xp_threshold" ? "XP" : ""}
                              </span>
                            </div>
                            <Progress value={badge.progress.progressPct} className="h-2" />
                            <div className="text-[10px] text-muted-foreground text-right font-medium">
                              {badge.progress.remaining > 0 ? `${badge.progress.remaining} ${badge.requirementType === "xp_threshold" ? "XP" : "more"} remaining` : "Locked"}
                            </div>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* VIEW / DOWNLOAD CERTIFICATE MODAL */}
        <Dialog open={!!viewCert} onOpenChange={(o) => { if (!o) setViewCert(null); }}>
          <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader className="mb-2">
              <DialogTitle className="flex items-center gap-2 text-base">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
                Official Certificate Viewer
              </DialogTitle>
              <DialogDescription className="text-xs">
                Rendered with dynamic credentials from Chandigarh University, AI & ML Club, and byteXL.
              </DialogDescription>
            </DialogHeader>

            {viewCert && <CertificateDocument data={viewCert} showActions={true} />}
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
