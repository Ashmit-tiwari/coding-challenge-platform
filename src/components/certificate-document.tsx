"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Download, Printer, ExternalLink, ShieldCheck, CheckCircle2 } from "lucide-react";
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

export function getCertificateCitation(title: string) {
  const t = (title || "").toLowerCase();
  if (t.includes("winner") && !t.includes("runner")) {
    return {
      medal: "🥇",
      text: (
        <>
          for outstanding performance and securing <strong className="text-indigo-950 font-bold">Winner</strong> in the Weekly Coding Challenges organized by the <strong className="text-indigo-900 font-bold">AI & ML Club, Chandigarh University</strong> in collaboration with <strong className="text-slate-900 font-bold">byteXL</strong>.
        </>
      ),
    };
  }
  if (t.includes("first runner")) {
    return {
      medal: "🥈",
      text: (
        <>
          for exceptional performance and securing <strong className="text-indigo-950 font-bold">First Runner-Up</strong> in the Weekly Coding Challenges organized by the <strong className="text-indigo-900 font-bold">AI & ML Club, Chandigarh University</strong> in collaboration with <strong className="text-slate-900 font-bold">byteXL</strong>.
        </>
      ),
    };
  }
  if (t.includes("second runner")) {
    return {
      medal: "🥉",
      text: (
        <>
          for outstanding problem solving and securing <strong className="text-indigo-950 font-bold">Second Runner-Up</strong> in the Weekly Coding Challenges organized by the <strong className="text-indigo-900 font-bold">AI & ML Club, Chandigarh University</strong> in collaboration with <strong className="text-slate-900 font-bold">byteXL</strong>.
        </>
      ),
    };
  }
  if (t.includes("excellence") || t.includes("1000") || t.includes("xp")) {
    return {
      medal: "⭐",
      text: (
        <>
          for demonstrating excellence, algorithmic mastery, and achieving the <strong className="text-indigo-950 font-bold">1000 XP Milestone</strong> in coding challenges organized by the <strong className="text-indigo-900 font-bold">AI & ML Club, Chandigarh University</strong> in collaboration with <strong className="text-slate-900 font-bold">byteXL</strong>.
        </>
      ),
    };
  }
  if (t.includes("participant") || t.includes("participation")) {
    return {
      medal: "🎖️",
      text: (
        <>
          for active participation, commitment, and successfully solving coding challenges organized by the <strong className="text-indigo-900 font-bold">AI & ML Club, Chandigarh University</strong> in collaboration with <strong className="text-slate-900 font-bold">byteXL</strong>.
        </>
      ),
    };
  }
  return {
    medal: "⭐",
    text: (
      <>
        for demonstrating excellence, commitment, and active contribution to the <strong className="text-indigo-900 font-bold">AI & ML Club, Chandigarh University</strong>, and for achieving a distinguished milestone in collaboration with <strong className="text-slate-900 font-bold">byteXL</strong>.
      </>
    ),
  };
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

  const citation = getCertificateCitation(data.title);

  const handlePrint = () => {
    window.print();
  };

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
      link.download = `Certificate_${data.recipientName.replace(/\s+/g, "_")}_${data.verificationId}.png`;
      link.click();
    } catch (err) {
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Certificate Frame */}
      <div
        ref={certRef}
        className="relative w-full aspect-[1.414/1] min-h-[540px] rounded-2xl p-8 sm:p-12 overflow-hidden border-4 border-indigo-500/40 shadow-2xl flex flex-col justify-between select-none text-slate-900 bg-white"
        style={{
          background: "radial-gradient(ellipse at 50% 25%, #ffffff 0%, #f8faff 60%, #eef2ff 100%)",
        }}
      >
        {/* Tech Circuit Cyber Frame Corners */}
        <div className="absolute top-0 left-0 w-32 h-32 pointer-events-none opacity-80">
          <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-600 fill-none stroke-current" strokeWidth="2">
            <path d="M0,20 L40,20 L60,0" />
            <path d="M0,40 L30,40 L50,20 L80,20" />
            <circle cx="60" cy="0" r="3" className="fill-cyan-400 stroke-none" />
            <circle cx="80" cy="20" r="3" className="fill-indigo-500 stroke-none" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-80 transform rotate-90">
          <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-600 fill-none stroke-current" strokeWidth="2">
            <path d="M0,20 L40,20 L60,0" />
            <path d="M0,40 L30,40 L50,20 L80,20" />
            <circle cx="60" cy="0" r="3" className="fill-cyan-400 stroke-none" />
            <circle cx="80" cy="20" r="3" className="fill-indigo-500 stroke-none" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 w-32 h-32 pointer-events-none opacity-80 transform -rotate-90">
          <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-600 fill-none stroke-current" strokeWidth="2">
            <path d="M0,20 L40,20 L60,0" />
            <path d="M0,40 L30,40 L50,20 L80,20" />
            <circle cx="60" cy="0" r="3" className="fill-cyan-400 stroke-none" />
            <circle cx="80" cy="20" r="3" className="fill-indigo-500 stroke-none" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 w-32 h-32 pointer-events-none opacity-80 transform rotate-180">
          <svg viewBox="0 0 100 100" className="w-full h-full text-indigo-600 fill-none stroke-current" strokeWidth="2">
            <path d="M0,20 L40,20 L60,0" />
            <path d="M0,40 L30,40 L50,20 L80,20" />
            <circle cx="60" cy="0" r="3" className="fill-cyan-400 stroke-none" />
            <circle cx="80" cy="20" r="3" className="fill-indigo-500 stroke-none" />
          </svg>
        </div>

        {/* Outer and Inner Border Frame */}
        <div className="absolute inset-3 border-2 border-indigo-200/80 rounded-xl pointer-events-none" />
        <div className="absolute inset-5 border border-indigo-400/40 rounded-lg pointer-events-none" />

        {/* 1. TOP HEADER: Chandigarh University + AI & ML Club Name + byteXL */}
        <div className="relative text-center space-y-1.5 z-10 pt-2">
          {/* Chandigarh University Header Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-rose-50 border border-rose-200 shadow-sm">
            <div className="h-5 w-5 bg-red-600 text-white font-bold text-[10px] rounded flex items-center justify-center tracking-tighter">
              CU
            </div>
            <span className="text-[11px] font-bold tracking-tight text-slate-900 uppercase">
              Chandigarh University
            </span>
          </div>

          {/* Clean Text-Only Name of AIML Club */}
          <div className="pt-1.5">
            <h1 className="text-2xl sm:text-3xl font-black tracking-widest text-indigo-950 font-serif uppercase">
              A-I-M-L CLUB
            </h1>
            <div className="text-[10px] font-bold tracking-[0.3em] text-indigo-600 uppercase mt-0.5">
              DEPARTMENT OF COMPUTER SCIENCE & ENGINEERING
            </div>
          </div>

          {/* IN ASSOCIATION WITH byteXL */}
          <div className="pt-1.5 flex items-center justify-center gap-2 text-xs text-slate-600 font-medium">
            <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">
              In Association With
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/bytexl-logo.png"
              alt="byteXL"
              className="h-6 sm:h-7 w-auto object-contain inline-block mix-blend-multiply drop-shadow-sm"
            />
          </div>
        </div>

        {/* 2. MIDDLE SECTION: Certificate Title, Presented To, Student Name, Citation */}
        <div className="relative text-center space-y-3 z-10 my-auto py-2">
          {/* Laurels & Dynamic Achievement Title */}
          <div className="flex items-center justify-center gap-3">
            <span className="text-indigo-600 text-xl font-serif">🌿</span>
            <h2 className="text-xl sm:text-3xl font-extrabold uppercase tracking-wide text-indigo-950 font-serif">
              {data.title}
            </h2>
            <span className="text-indigo-600 text-xl font-serif transform scale-x-[-1]">🌿</span>
          </div>

          {/* C E R T I F I C A T E */}
          <div className="text-[11px] uppercase tracking-[0.4em] font-extrabold text-indigo-600">
            C E R T I F I C A T E
          </div>
          <div className="text-xs text-slate-500 font-serif italic">
            Proudly presented to
          </div>

          {/* Student Full Name in Elegant Script / Calligraphy */}
          <div className="py-1">
            <div className="text-3xl sm:text-5xl font-serif italic font-bold text-indigo-950 tracking-wide inline-block px-8 border-b-2 border-indigo-400 pb-1">
              {data.recipientName}
            </div>
          </div>

          {/* Dynamic Citation Paragraph written for each title */}
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed px-4">
            {citation.text}
          </p>
        </div>

        {/* 3. BOTTOM FOOTER: Date, Medal Badge, Verification ID */}
        <div className="relative z-10 pt-4 border-t border-indigo-100 flex items-center justify-between text-xs text-slate-600">
          {/* Left: Issue Date */}
          <div className="text-left space-y-0.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Date Issued</div>
            <div className="font-semibold text-slate-800 text-xs">{formattedDate}</div>
          </div>

          {/* Center: Official Medal / Stamp */}
          <div className="flex flex-col items-center">
            <div className="h-14 w-14 rounded-full border-2 border-indigo-400/80 bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-white shadow-md flex items-center justify-center font-bold text-lg">
              {citation.medal}
            </div>
            <span className="text-[8px] uppercase tracking-widest text-indigo-900 font-extrabold mt-1">
              OFFICIAL CERTIFIED
            </span>
          </div>

          {/* Right: Verification ID */}
          <div className="text-right space-y-0.5">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Verification ID</div>
            <div className="font-mono font-bold text-indigo-600 text-xs">{data.verificationId}</div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {showActions && (
        <div className="flex items-center justify-between gap-3 p-4 bg-card border border-border/70 rounded-xl shadow-sm flex-wrap">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-mono text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Authenticated by A-I-M-L Club & byteXL
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/verify/${data.verificationId}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 text-xs font-medium text-foreground hover:bg-muted/80 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Public Verification Link
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-semibold"
            >
              <Printer className="h-4 w-4" /> Print
            </Button>

            <Button
              size="sm"
              onClick={handleDownloadImage}
              disabled={downloading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold gap-1.5 text-xs shadow-sm"
            >
              <Download className="h-4 w-4" /> {downloading ? "Generating HD PNG..." : "Download HD Image"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
