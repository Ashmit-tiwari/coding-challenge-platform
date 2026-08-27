"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Award,
  Medal,
  ScrollText,
  ShieldCheck,
  Download,
  Printer,
  CheckCircle2,
  Lock,
  Sparkles,
  Zap,
  Trophy,
  Crown,
  Star,
  type LucideIcon,
} from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CertificateItem {
  id: string;
  certId: string;
  userId: string;
  level: string;
  tierLevel: number;
  issuedAt: string;
  studentName: string;
  studentUid: string;
  year: string;
}

interface DashboardStats {
  solvedCount: number;
}

type TierKey = "Beginner" | "Intermediate" | "Advanced" | "Pro";

interface TierDef {
  key: TierKey;
  label: string;
  requiredSolves: number;
  requiredLevel: number;
  icon: LucideIcon;
  color: string;
  blurb: string;
}

const TIERS: TierDef[] = [
  {
    key: "Beginner",
    label: "Beginner",
    requiredSolves: 3,
    requiredLevel: 1,
    icon: Award,
    color: "from-emerald-400/30 to-emerald-500/10 border-emerald-500/40",
    blurb: "Just getting started — prove your fundamentals.",
  },
  {
    key: "Intermediate",
    label: "Intermediate",
    requiredSolves: 8,
    requiredLevel: 4,
    icon: ShieldCheck,
    color: "from-amber-400/30 to-amber-500/10 border-amber-500/40",
    blurb: "Solid command across multiple challenges.",
  },
  {
    key: "Advanced",
    label: "Advanced",
    requiredSolves: 15,
    requiredLevel: 6,
    icon: Trophy,
    color: "from-orange-400/30 to-orange-500/10 border-orange-500/40",
    blurb: "You can handle hard problems with confidence.",
  },
  {
    key: "Pro",
    label: "Pro",
    requiredSolves: 25,
    requiredLevel: 9,
    icon: Crown,
    color: "from-rose-400/30 to-rose-500/10 border-rose-500/40",
    blurb: "Elite tier — the platform's top coders.",
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function CertificatesPage() {
  return (
    <AuthGuard>
      <CertificatesContent />
    </AuthGuard>
  );
}

function CertificatesContent() {
  const { student } = useAuth();
  const [certs, setCerts] = useState<CertificateItem[]>([]);
  const [solvedCount, setSolvedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState<TierKey | null>(null);
  const [printCert, setPrintCert] = useState<CertificateItem | null>(null);

  const fetchCerts = useCallback(async () => {
    try {
      const res = await fetch("/api/certificates", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load certificates");
      const json = await res.json();
      setCerts(json.certificates || []);
    } catch (err) {
      console.error(err);
      toast.error("Could not load certificates.");
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = await res.json();
      setSolvedCount(json?.stats?.solvedCount || 0);
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchCerts(), fetchDashboard()]);
      setLoading(false);
    })();
  }, [fetchCerts, fetchDashboard]);

  const handleIssue = async (tier: TierKey) => {
    setIssuing(tier);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: tier }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || `You are not yet eligible for the ${tier} certificate.`);
        return;
      }
      if (json.newlyIssued) {
        toast.success(`🎉 ${tier} certificate issued!`);
      } else {
        toast.info(`You already hold the ${tier} certificate.`);
      }
      await fetchCerts();
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong while issuing the certificate.");
    } finally {
      setIssuing(null);
    }
  };

  const handlePrint = (cert: CertificateItem) => {
    setPrintCert(cert);
    // Wait for the print-area div to render before triggering print
    setTimeout(() => {
      window.print();
    }, 50);
  };

  // Map of issued certs by level
  const issuedByLevel = useMemo(() => {
    const m = new Map<string, CertificateItem>();
    for (const c of certs) m.set(c.level, c);
    return m;
  }, [certs]);

  return (
    <div className="space-y-6">
      {/* Inline print stylesheet — hides everything except the active print area */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            position: absolute !important;
            inset: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="no-print"
      >
        <div className="flex items-center gap-3">
          <div className="brand-gradient h-10 w-10 rounded-xl flex items-center justify-center text-brand-foreground shadow-sm">
            <Award className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Certificates
            </h1>
            <p className="text-sm text-muted-foreground max-w-2xl">
              Earn tier certificates as you solve more challenges. Each
              certificate has a unique verification ID.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tier eligibility cards */}
      <section className="no-print space-y-3">
        <h2 className="text-lg font-semibold">Tier eligibility</h2>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {TIERS.map((tier, i) => (
              <TierCard
                key={tier.key}
                tier={tier}
                solvedCount={solvedCount}
                issued={issuedByLevel.get(tier.key) || null}
                issuing={issuing === tier.key}
                onIssue={() => handleIssue(tier.key)}
                onView={(c) => handlePrint(c)}
                delay={Math.min(i * 0.05, 0.2)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Earned certificates */}
      <section className="no-print space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" /> Earned certificates
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-44 w-full rounded-xl" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : certs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 flex flex-col items-center justify-center gap-3 text-center">
              <div className="rounded-full bg-amber-500/10 p-4 text-amber-600 dark:text-amber-300">
                <ScrollText className="h-8 w-8" />
              </div>
              <div>
                <p className="font-semibold">No certificates earned yet</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Solve challenges to meet the tier thresholds above. Your
                  first certificate unlocks at 3 distinct solves.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {certs.map((cert, i) => (
              <EarnedCertificateCard
                key={cert.id}
                cert={cert}
                onPrint={() => handlePrint(cert)}
                delay={Math.min(i * 0.05, 0.2)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Hidden printable certificate — only rendered when printCert is set */}
      {printCert && (
        <PrintableCertificate cert={printCert} studentName={student?.name} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tier eligibility card
// ---------------------------------------------------------------------------
function TierCard({
  tier,
  solvedCount,
  issued,
  issuing,
  onIssue,
  onView,
  delay,
}: {
  tier: TierDef;
  solvedCount: number;
  issued: CertificateItem | null;
  issuing: boolean;
  onIssue: () => void;
  onView: (c: CertificateItem) => void;
  delay: number;
}) {
  const meetsSolves = solvedCount >= tier.requiredSolves;
  const isIssued = !!issued;
  const eligible = meetsSolves && !isIssued;
  const dim = !meetsSolves && !isIssued;

  const solvesRemaining = Math.max(0, tier.requiredSolves - solvedCount);
  const pct = Math.min(100, Math.round((solvedCount / tier.requiredSolves) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card
        className={cn(
          "relative h-full overflow-hidden border bg-gradient-to-b",
          tier.color,
          dim && "opacity-70 grayscale",
        )}
      >
        <CardContent className="p-5 flex flex-col gap-3 h-full">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-background/70 backdrop-blur border border-border/60 flex items-center justify-center shrink-0">
              <tier.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold leading-tight">{tier.label}</h3>
              <p className="text-[11px] text-muted-foreground line-clamp-1">
                {tier.blurb}
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Solves</span>
              <span className="font-mono font-semibold">
                {Math.min(solvedCount, tier.requiredSolves)} / {tier.requiredSolves}
              </span>
            </div>
            <Progress value={pct} className="h-1.5" />
            <div className="text-[10px] text-muted-foreground mt-1">
              Level requirement: L{tier.requiredLevel}+ · You&apos;re at L{tier.requiredLevel <= solvedCount / 5 + 1 ? tier.requiredLevel : tier.requiredLevel}
            </div>
          </div>

          {isIssued ? (
            <Button
              className="mt-auto gap-2"
              variant="default"
              onClick={() => onView(issued!)}
            >
              <Download className="h-4 w-4" /> View / Download
            </Button>
          ) : eligible ? (
            <Button
              className="mt-auto gap-2"
              onClick={onIssue}
              disabled={issuing}
            >
              {issuing ? (
                <>
                  <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  Issuing…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Issue certificate
                </>
              )}
            </Button>
          ) : (
            <Button
              className="mt-auto gap-2"
              variant="outline"
              disabled
            >
              <Lock className="h-4 w-4" /> Solve {solvesRemaining} more {solvesRemaining === 1 ? "challenge" : "challenges"}
            </Button>
          )}

          {isIssued && (
            <div className="text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Issued on{" "}
              {format(parseISO(issued.issuedAt), "MMM d, yyyy")}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Earned certificate card (with print button + verification info)
// ---------------------------------------------------------------------------
function EarnedCertificateCard({
  cert,
  onPrint,
  delay,
}: {
  cert: CertificateItem;
  onPrint: () => void;
  delay: number;
}) {
  const issuedDate = format(parseISO(cert.issuedAt), "MMMM d, yyyy");
  const tierMeta = TIERS.find((t) => t.key === cert.level);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="relative overflow-hidden">
        <div className="brand-gradient absolute inset-x-0 top-0 h-1.5" />
        <CardContent className="p-5 sm:p-6">
          {/* Certificate preview */}
          <div className="relative rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/5 via-background to-amber-500/5 p-5 sm:p-6 overflow-hidden">
            <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
            <div className="relative flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="brand-gradient h-9 w-9 rounded-lg flex items-center justify-center text-brand-foreground font-bold text-sm shadow-sm">
                    W
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                      Weekly Coding Challenges 2.0
                    </div>
                    <div className="text-xs font-semibold">
                      Certificate of Completion
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {tierMeta && <tierMeta.icon className="h-3 w-3" />}
                  {cert.level}
                </div>
              </div>

              {/* Body */}
              <div className="py-2 text-center">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  This certificate is proudly presented to
                </div>
                <div className="text-2xl sm:text-3xl font-bold mt-1 text-brand-gradient truncate">
                  {cert.studentName}
                </div>
                <div className="text-[11px] font-mono text-muted-foreground mt-1">
                  {cert.studentUid} · {cert.year === "1" ? "First Year" : "Second Year"}
                </div>
              </div>

              {/* Footer */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/60">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Tier
                  </div>
                  <div className="text-sm font-semibold">{cert.level}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Level
                  </div>
                  <div className="text-sm font-semibold">L{cert.tierLevel}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    Issued
                  </div>
                  <div className="text-sm font-semibold">{issuedDate}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Verification info */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
              <div>
                <div className="text-muted-foreground">Verify with ID</div>
                <div className="font-mono font-semibold">{cert.certId}</div>
              </div>
            </div>
            <Button onClick={onPrint} className="gap-2" variant="default">
              <Printer className="h-4 w-4" /> Download / Print
            </Button>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            This certificate can be independently verified using the
            verification ID above. Each ID is unique and tamper-evident.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Printable certificate (hidden visually, only visible when printing)
// ---------------------------------------------------------------------------
function PrintableCertificate({
  cert,
  studentName,
}: {
  cert: CertificateItem;
  studentName?: string;
}) {
  const issuedDate = format(parseISO(cert.issuedAt), "MMMM d, yyyy");
  const tierMeta = TIERS.find((t) => t.key === cert.level);
  const TierIcon = tierMeta?.icon || Award;
  const displayName = cert.studentName || studentName || "Student";

  return (
    <div
      className="print-area fixed inset-0 z-[-1] opacity-0 pointer-events-none"
      aria-hidden
    >
      {/* Print-optimized certificate — sized for landscape A4 / Letter */}
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          padding: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "white",
          fontFamily: "Georgia, 'Times New Roman', serif",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "1000px",
            padding: "48px 56px",
            background: "linear-gradient(135deg, #fafaf7 0%, #ffffff 100%)",
            border: "3px solid #16a34a",
            borderRadius: "12px",
            boxShadow: "inset 0 0 0 6px #fafaf7, inset 0 0 0 8px #d97706",
          }}
        >
          {/* Top corner decorations */}
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              right: "16px",
              bottom: "16px",
              border: "1px solid #d4d4d8",
              borderRadius: "8px",
              pointerEvents: "none",
            }}
          />
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "32px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg, #16a34a 0%, #d97706 100%)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                W
              </div>
              <div>
                <div
                  style={{
                    fontSize: "10px",
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    color: "#64748b",
                    fontWeight: 600,
                  }}
                >
                  Weekly Coding Challenges 2.0
                </div>
                <div style={{ fontSize: "14px", fontWeight: 600 }}>
                  Certificate of Completion
                </div>
              </div>
            </div>
            <div
              style={{
                padding: "8px 14px",
                borderRadius: "999px",
                border: "1px solid #16a34a",
                background: "rgba(22, 163, 74, 0.08)",
                color: "#15803d",
                fontSize: "12px",
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {tierMeta?.label || cert.level}
            </div>
          </div>

          {/* Body */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div
              style={{
                fontSize: "12px",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                color: "#64748b",
              }}
            >
              This certificate is proudly presented to
            </div>
            <div
              style={{
                fontSize: "44px",
                fontWeight: 700,
                marginTop: "12px",
                marginBottom: "8px",
                background: "linear-gradient(135deg, #16a34a 0%, #d97706 100%)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                fontFamily: "Georgia, serif",
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: "13px",
                color: "#475569",
                fontFamily: "monospace",
              }}
            >
              {cert.studentUid} · {cert.year === "1" ? "First Year" : "Second Year"}
            </div>
            <div
              style={{
                marginTop: "20px",
                fontSize: "14px",
                color: "#334155",
                maxWidth: "640px",
                margin: "20px auto 0",
                lineHeight: 1.6,
              }}
            >
              In recognition of successfully meeting the requirements for the{" "}
              <strong>{cert.level}</strong> tier by solving the required number
              of distinct coding challenges on the WCC 2.0 platform. Awarded
              the rank of <strong>Level {cert.tierLevel}</strong>.
            </div>
          </div>

          {/* Decorative icon */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                border: "2px solid #d97706",
                background: "rgba(217, 119, 6, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#d97706",
                fontWeight: 700,
              }}
            >
              <TierIcon size={28} />
            </div>
          </div>

          {/* Footer: signature + meta */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "24px",
              paddingTop: "24px",
              borderTop: "1px solid #d4d4d8",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "#64748b",
                }}
              >
                Issued on
              </div>
              <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "4px" }}>
                {issuedDate}
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "#64748b",
                }}
              >
                Signature
              </div>
              <div
                style={{
                  marginTop: "8px",
                  paddingTop: "8px",
                  borderTop: "1px solid #475569",
                  fontSize: "13px",
                  fontStyle: "italic",
                  fontFamily: "'Brush Script MT', cursive",
                }}
              >
                WCC 2.0 Committee
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div
                style={{
                  fontSize: "10px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  color: "#64748b",
                }}
              >
                Verification ID
              </div>
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  fontFamily: "monospace",
                  marginTop: "4px",
                  color: "#15803d",
                }}
              >
                {cert.certId}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
