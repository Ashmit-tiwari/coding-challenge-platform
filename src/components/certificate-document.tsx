"use client";

import { useRef, useState, useEffect } from "react";
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
    return "for outstanding performance and securing Winner in the Weekly Coding Challenges.";
  if (t.includes("first runner"))
    return "for exceptional performance and securing First Runner-Up in the Weekly Coding Challenges.";
  if (t.includes("second runner"))
    return "for outstanding problem-solving and securing Second Runner-Up in the Weekly Coding Challenges.";
  if (t.includes("excellence") || t.includes("1000") || t.includes("xp"))
    return "for demonstrating coding excellence, algorithmic mastery, and achieving the 1000 XP milestone.";
  if (t.includes("participant") || t.includes("participation"))
    return "for active participation, commitment, and successfully solving coding challenges.";
  return "for demonstrating excellence, commitment, and active contribution, and for achieving a distinguished milestone in their journey.";
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
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    const link = document.createElement("link");
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Great+Vibes&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    link.onload = () => setFontsLoaded(true);
    return () => { document.head.removeChild(link); };
  }, []);

  const formattedDate = data.issueDate
    ? new Date(data.issueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "September 2026";

  const handlePrint = () => window.print();

  const handleDownloadImage = async () => {
    if (!certRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(certRef.current, { scale: 3, useCORS: true, backgroundColor: "#0b1026" });
      const image = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = image;
      a.download = `Certificate_${data.recipientName.replace(/\s+/g, "_")}.png`;
      a.click();
    } catch { window.print(); }
    finally { setDownloading(false); }
  };

  const displayTitle = data.title.toUpperCase().includes("CERTIFICATE")
    ? data.title
    : `Certificate of ${data.title}`;

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div
        ref={certRef}
        className="relative w-full aspect-[1.414/1] min-h-[560px] overflow-hidden select-none"
        style={{ background: "linear-gradient(135deg, #0b1026 0%, #141a3a 30%, #1a2352 60%, #0f1533 100%)" }}
      >
        {/* ── Glowing corner circuit decorations ── */}
        <svg className="absolute top-0 left-0 w-full h-full pointer-events-none" viewBox="0 0 1000 707">
          {/* Top-left circuit */}
          <path d="M0 80 L60 80 L100 40 L180 40" stroke="#4f6fff" strokeWidth="1.5" fill="none" opacity="0.5" />
          <path d="M0 120 L40 120 L80 80 L140 80" stroke="#3b5bdb" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="180" cy="40" r="4" fill="#6c8aff" opacity="0.6" />
          <circle cx="140" cy="80" r="3" fill="#4f6fff" opacity="0.4" />
          <circle cx="100" cy="40" r="2.5" fill="#8ba4ff" opacity="0.5" />
          {/* Top-right circuit */}
          <path d="M1000 80 L940 80 L900 40 L820 40" stroke="#4f6fff" strokeWidth="1.5" fill="none" opacity="0.5" />
          <path d="M1000 120 L960 120 L920 80 L860 80" stroke="#3b5bdb" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="820" cy="40" r="4" fill="#6c8aff" opacity="0.6" />
          <circle cx="860" cy="80" r="3" fill="#4f6fff" opacity="0.4" />
          {/* Bottom-left circuit */}
          <path d="M0 627 L60 627 L100 667 L180 667" stroke="#4f6fff" strokeWidth="1.5" fill="none" opacity="0.5" />
          <path d="M0 587 L40 587 L80 627 L140 627" stroke="#3b5bdb" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="180" cy="667" r="4" fill="#6c8aff" opacity="0.6" />
          {/* Bottom-right circuit */}
          <path d="M1000 627 L940 627 L900 667 L820 667" stroke="#4f6fff" strokeWidth="1.5" fill="none" opacity="0.5" />
          <path d="M1000 587 L960 587 L920 627 L860 627" stroke="#3b5bdb" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="820" cy="667" r="4" fill="#6c8aff" opacity="0.6" />
          {/* Glow spots */}
          <circle cx="50" cy="50" r="60" fill="url(#glow1)" opacity="0.15" />
          <circle cx="950" cy="50" r="60" fill="url(#glow1)" opacity="0.15" />
          <circle cx="50" cy="657" r="60" fill="url(#glow1)" opacity="0.12" />
          <circle cx="950" cy="657" r="60" fill="url(#glow1)" opacity="0.12" />
          <circle cx="500" cy="353" r="200" fill="url(#glow2)" opacity="0.06" />
          <defs>
            <radialGradient id="glow1"><stop offset="0%" stopColor="#6c8aff" /><stop offset="100%" stopColor="transparent" /></radialGradient>
            <radialGradient id="glow2"><stop offset="0%" stopColor="#a5b4fc" /><stop offset="100%" stopColor="transparent" /></radialGradient>
          </defs>
        </svg>

        {/* ── Inner white certificate plaque ── */}
        <div className="absolute inset-6 sm:inset-10 rounded-sm bg-white shadow-2xl" style={{ boxShadow: "0 0 60px rgba(79, 111, 255, 0.15)" }} />

        {/* ── Gold decorative border inside white area ── */}
        <div className="absolute inset-8 sm:inset-12 border-2 border-amber-400/50 rounded-sm pointer-events-none" />
        <div className="absolute inset-9 sm:inset-[52px] border border-amber-300/25 rounded-sm pointer-events-none" />

        {/* ── Gold corner flourishes ── */}
        {[
          "top-9 left-9 sm:top-[52px] sm:left-[52px]",
          "top-9 right-9 sm:top-[52px] sm:right-[52px] -scale-x-100",
          "bottom-9 left-9 sm:bottom-[52px] sm:left-[52px] -scale-y-100",
          "bottom-9 right-9 sm:bottom-[52px] sm:right-[52px] -scale-x-100 -scale-y-100",
        ].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-12 h-12 sm:w-16 sm:h-16 pointer-events-none`}>
            <svg viewBox="0 0 60 60" className="w-full h-full">
              <path d="M2 2 C2 2 2 20 2 28 C2 30 4 30 6 28 C10 22 14 14 22 10 C28 6 30 4 28 2 C20 2 2 2 2 2Z" fill="none" stroke="#c9930e" strokeWidth="1.5" opacity="0.7" />
              <path d="M2 2 L18 2" stroke="#c9930e" strokeWidth="2" opacity="0.5" />
              <path d="M2 2 L2 18" stroke="#c9930e" strokeWidth="2" opacity="0.5" />
              <circle cx="5" cy="5" r="1.5" fill="#d4a418" opacity="0.6" />
            </svg>
          </div>
        ))}

        {/* ── Certificate content ── */}
        <div className="absolute inset-10 sm:inset-16 flex flex-col items-center justify-between py-4 sm:py-8 text-center">

          {/* ▸ TOP: Single header line ◂ */}
          <div className="space-y-1">
            <p
              className="text-[11px] sm:text-xs tracking-[0.25em] text-amber-700/80 uppercase font-semibold"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Chandigarh University · AIML Club · In Association With byteXL
            </p>
          </div>

          {/* ▸ TITLE BLOCK ◂ */}
          <div className="space-y-5 w-full max-w-lg">
            {/* Club Name — Big, Stylish */}
            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-black text-[#1a1f5e] tracking-wider leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              A-I-M-L CLUB
            </h1>

            {/* Gold ornamental divider */}
            <div className="flex items-center justify-center gap-2">
              <div className="w-16 sm:w-24 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-amber-500 fill-current"><path d="M12 2L15 9H21L16 14L18 21L12 17L6 21L8 14L3 9H9L12 2Z" /></svg>
              <div className="w-16 sm:w-24 h-px bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
            </div>

            {/* Dynamic Title */}
            <h2
              className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-widest text-[#1a1f5e]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {displayTitle}
            </h2>

            {/* Presented to */}
            <p
              className="text-sm sm:text-base text-[#666] italic"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              This is proudly presented to
            </p>

            {/* Dynamic Student Name — Flowing Calligraphy */}
            <div className="py-1">
              <div
                className="text-4xl sm:text-5xl md:text-6xl text-[#1a1f5e] inline-block px-6 pb-2"
                style={{
                  fontFamily: "'Great Vibes', cursive",
                  borderBottom: "2px solid rgba(201, 147, 14, 0.4)",
                }}
              >
                {data.recipientName}
              </div>
            </div>

            {/* Citation */}
            <p
              className="text-xs sm:text-sm text-[#555] leading-relaxed max-w-md mx-auto"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(11px, 1.5vw, 15px)" }}
            >
              {data.description || getCitation(data.title)}
            </p>
          </div>

          {/* ▸ BOTTOM: Date only ◂ */}
          <div className="pt-2">
            <div
              className="text-[10px] sm:text-xs uppercase tracking-[0.2em] text-[#999] font-semibold"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Date Issued
            </div>
            <div
              className="text-sm sm:text-base font-semibold text-[#1a1f5e] mt-0.5"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {formattedDate}
            </div>
          </div>
        </div>
      </div>

      {/* ── Action Bar ── */}
      {showActions && (
        <div className="flex items-center justify-between gap-3 p-4 bg-card border border-border/70 rounded-xl shadow-sm flex-wrap">
          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-mono text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" /> Authenticated
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
