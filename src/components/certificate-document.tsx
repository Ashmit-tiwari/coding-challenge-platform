"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download, Printer, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface CertificateData {
  verificationId: string;
  title: string;
  description?: string | null;
  recipientName: string;
  recipientUid?: string;
  recipientYear?: string;
  issueDate: string;
  status?: string;
  category?: string;
  issuerName?: string;
}

function getCitation(title: string): string {
  const t = (title || "").toLowerCase();
  if (t.includes("winner") && !t.includes("runner"))
    return "for outstanding performance and securing Winner in the Weekly Coding Challenges organized by the A-I-M-L Club.";
  if (t.includes("first runner"))
    return "for exceptional performance and securing First Runner-Up in the Weekly Coding Challenges organized by the A-I-M-L Club.";
  if (t.includes("second runner"))
    return "for outstanding problem-solving and securing Second Runner-Up in the Weekly Coding Challenges organized by the A-I-M-L Club.";
  if (t.includes("excellence") || t.includes("1000") || t.includes("xp"))
    return "for demonstrating coding excellence, algorithmic mastery, and achieving the 1000 XP milestone in challenges organized by the A-I-M-L Club.";
  if (t.includes("participant") || t.includes("participation"))
    return "for active participation, commitment, and successfully solving coding challenges organized by the A-I-M-L Club.";
  return "for demonstrating excellence, commitment, and active contribution to the A-I-M-L Club, and for achieving a distinguished milestone in their journey.";
}

export function CertificateDocument({
  data,
  showActions = true,
}: {
  data: CertificateData;
  showActions?: boolean;
}) {
  const certRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const formattedDate = data.issueDate
    ? new Date(data.issueDate).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "September 2026";

  const handlePrint = () => window.print();

  const handleDownloadImage = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const image = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = image;
      link.download = `Certificate_${data.recipientName.replace(/\s+/g, "_")}.png`;
      link.click();
    } catch {
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  const displayTitle = data.title.toUpperCase().includes("CERTIFICATE")
    ? data.title
    : `Certificate of ${data.title}`;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* ═══════════════════════════════════════════════════ */}
      {/* THE CERTIFICATE                                     */}
      {/* ═══════════════════════════════════════════════════ */}
      <div
        ref={certRef}
        className="relative w-full aspect-[1.414/1] min-h-[560px] overflow-hidden select-none"
        style={{ background: "#ffffff" }}
      >
        {/* ── Outer navy border ── */}
        <div className="absolute inset-0 border-[6px] border-[#1a1f5e]" />

        {/* ── Inner decorative border ── */}
        <div className="absolute inset-3 border-2 border-[#3b46a8]/40" />
        <div className="absolute inset-5 border border-[#6673d4]/25" />

        {/* ── Corner ornaments (subtle geometric) ── */}
        {[
          "top-6 left-6",
          "top-6 right-6 rotate-90",
          "bottom-6 left-6 -rotate-90",
          "bottom-6 right-6 rotate-180",
        ].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-10 h-10 pointer-events-none`}>
            <svg viewBox="0 0 40 40" className="w-full h-full">
              <path d="M0 0 L16 0 L16 3 L3 3 L3 16 L0 16 Z" fill="#1a1f5e" />
              <circle cx="8" cy="8" r="1.5" fill="#3b46a8" />
            </svg>
          </div>
        ))}

        {/* ── Subtle horizontal divider lines ── */}
        <div className="absolute top-[32%] left-12 right-12 flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#1a1f5e]/30 to-transparent" />
          <div className="h-2 w-2 rotate-45 bg-[#3b46a8]/40" />
          <div className="h-2 w-2 rotate-45 bg-[#1a1f5e]/60" />
          <div className="h-2 w-2 rotate-45 bg-[#3b46a8]/40" />
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#1a1f5e]/30 to-transparent" />
        </div>

        {/* ── Certificate content ── */}
        <div className="absolute inset-8 sm:inset-12 flex flex-col items-center justify-between py-6 sm:py-10 text-center">

          {/* ▸ TOP: Club Name — large, centered, clean ◂ */}
          <div className="space-y-1">
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-black tracking-[0.2em] text-[#1a1f5e] uppercase"
              style={{ fontFamily: "'Georgia', 'Palatino Linotype', 'Times New Roman', serif" }}
            >
              A-I-M-L CLUB
            </h1>
            <div className="text-[10px] sm:text-xs tracking-[0.35em] text-[#5a64b8] uppercase font-semibold">
              Chandigarh University
            </div>
          </div>

          {/* ▸ MIDDLE: Title + Presented To + Name + Citation ◂ */}
          <div className="space-y-4 w-full max-w-lg mt-2">

            {/* Dynamic Title */}
            <h2
              className="text-xl sm:text-2xl md:text-3xl font-extrabold uppercase tracking-wider text-[#1a1f5e]"
              style={{ fontFamily: "'Georgia', 'Palatino Linotype', serif" }}
            >
              {displayTitle}
            </h2>

            {/* Divider */}
            <div className="flex items-center gap-2 justify-center">
              <div className="w-12 h-px bg-[#1a1f5e]/30" />
              <div className="h-1.5 w-1.5 rotate-45 bg-[#3b46a8]" />
              <div className="w-12 h-px bg-[#1a1f5e]/30" />
            </div>

            {/* Presented to */}
            <p
              className="text-sm sm:text-base text-[#555] italic"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              This is proudly presented to
            </p>

            {/* Student Full Name */}
            <div className="pt-1 pb-2">
              <div
                className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#0e1654] tracking-wide inline-block px-6 pb-2 border-b-2 border-[#3b46a8]/50"
                style={{
                  fontFamily: "'Brush Script MT', 'Dancing Script', 'Segoe Script', cursive, serif",
                  fontStyle: "italic",
                }}
              >
                {data.recipientName}
              </div>
            </div>

            {/* Citation */}
            <p
              className="text-xs sm:text-sm text-[#444] leading-relaxed max-w-md mx-auto"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              {data.description || getCitation(data.title)}
            </p>
          </div>

          {/* ▸ BOTTOM: Date only (no verification ID) ◂ */}
          <div className="pt-4 w-full">
            <div className="text-[10px] uppercase tracking-widest text-[#888] font-semibold">
              Date Issued
            </div>
            <div
              className="text-sm font-semibold text-[#1a1f5e] mt-0.5"
              style={{ fontFamily: "'Georgia', serif" }}
            >
              {formattedDate}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* ACTION BAR                                          */}
      {/* ═══════════════════════════════════════════════════ */}
      {showActions && (
        <div className="flex items-center justify-between gap-3 p-4 bg-card border border-border/70 rounded-xl shadow-sm flex-wrap">
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-mono text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" /> Authenticated by A-I-M-L Club
          </Badge>

          <div className="flex items-center gap-2">
            <Link
              href={`/verify/${data.verificationId}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Verify
            </Link>

            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5 text-xs font-semibold">
              <Printer className="h-4 w-4" /> Print
            </Button>

            <Button
              size="sm"
              onClick={handleDownloadImage}
              disabled={downloading}
              className="bg-[#1a1f5e] hover:bg-[#141852] text-white font-semibold gap-1.5 text-xs shadow-sm"
            >
              <Download className="h-4 w-4" /> {downloading ? "Generating..." : "Download HD"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
