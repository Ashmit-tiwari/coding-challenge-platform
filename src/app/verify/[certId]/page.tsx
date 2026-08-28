"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, Award, Trophy, CheckCircle2,
  Calendar, User, ArrowLeft, ExternalLink, GraduationCap, Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export default function PublicVerifyPage() {
  const params = useParams();
  const certId = params?.certId as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!certId) return;
    async function verify() {
      setLoading(true);
      try {
        const res = await fetch(`/api/verify/${encodeURIComponent(certId)}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error || "Certificate verification failed.");
          return;
        }
        setData(json);
      } catch {
        setError("Network error while connecting to verification registry.");
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [certId]);

  const cert = data?.certificate;

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl space-y-6"
      >
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Platform
          </Link>
          <div className="brand-gradient h-12 w-12 rounded-2xl flex items-center justify-center text-brand-foreground mx-auto shadow-md">
            <Award className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Official Certificate Verification</h1>
          <p className="text-xs text-muted-foreground">
            A-I-M-L Club Central Academic & Competition Credential Registry
          </p>
        </div>

        <Card className={cn(
          "border shadow-lg transition-all overflow-hidden",
          data?.isValid ? "border-emerald-500/50 bg-card" : "border-rose-500/50 bg-card"
        )}>
          <div className={cn("h-1.5 w-full", data?.isValid ? "bg-emerald-500" : "bg-rose-500")} />

          <CardContent className="p-6 sm:p-8 space-y-6">
            {loading ? (
              <div className="space-y-4 py-4">
                <Skeleton className="h-8 w-3/4 mx-auto" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : error || !data?.isValid ? (
              <div className="py-6 text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto">
                  <ShieldAlert className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400">Invalid or Revoked Certificate</h2>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    The requested verification ID <span className="font-mono font-semibold">{certId}</span> could not be verified in the authoritative database.
                  </p>
                </div>
                <Badge variant="outline" className="border-rose-500/40 text-rose-600 text-xs">
                  Status: NOT VERIFIED
                </Badge>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Validity Seal */}
                <div className="flex items-center justify-between border-b border-border/60 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> AUTHENTIC & VALID
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Issued by {cert.issuerName}
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-mono text-xs">
                    VALID
                  </Badge>
                </div>

                {/* Details Grid */}
                <div className="space-y-4 text-xs">
                  <div className="space-y-1">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Certificate Title</div>
                    <div className="text-lg font-bold text-foreground">{cert.title}</div>
                    {cert.description && (
                      <div className="text-xs text-muted-foreground">{cert.description}</div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Awarded To</div>
                      <div className="font-bold text-sm text-foreground">{cert.recipientName}</div>
                      <div className="text-[11px] text-muted-foreground">Year {cert.recipientYear} Participant</div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Issue Date</div>
                      <div className="font-semibold text-sm">
                        {new Date(cert.issueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </div>
                      <div className="text-[11px] text-muted-foreground">Permanent Record</div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/40 bg-muted/20 p-3 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-muted-foreground uppercase">Registry ID</div>
                      <div className="font-mono font-bold text-amber-500 text-xs">{cert.verificationId}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-500">
                      Tamper-Proof
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-[11px] text-muted-foreground">
          © 2026 A-I-M-L Coding Challenge Platform • All verification hashes are cryptographically signed.
        </div>
      </motion.div>
    </div>
  );
}
