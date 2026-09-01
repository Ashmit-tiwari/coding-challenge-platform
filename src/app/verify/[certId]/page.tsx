"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ShieldCheck, ShieldAlert, Award, Trophy, CheckCircle2,
  Calendar, User, ArrowLeft, ExternalLink, GraduationCap, Sparkles
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CertificateDocument } from "@/components/certificate-document";
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl space-y-6"
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
            A-I-M-L Club & byteXL Central Academic & Competition Credential Registry
          </p>
        </div>

        {loading ? (
          <Card className="p-8">
            <div className="space-y-4 py-8 max-w-lg mx-auto">
              <Skeleton className="h-8 w-3/4 mx-auto" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </Card>
        ) : error || !data?.isValid ? (
          <Card className="border border-rose-500/50 bg-card p-8 text-center space-y-4">
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
          </Card>
        ) : (
          <div className="space-y-4">
            <CertificateDocument data={cert} showActions={true} />
          </div>
        )}

        <div className="text-center text-[11px] text-muted-foreground">
          © 2026 AI & ML Club, Chandigarh University in association with byteXL • All verification hashes are digitally signed.
        </div>
      </motion.div>
    </div>
  );
}
