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

function getPosition(title: string): { label: string; rank: number; color: string } {
  const t = (title || "").toLowerCase();
  if (t.includes("winner") && !t.includes("runner"))
    return { label: "WINNER", rank: 1, color: "#FFD700" };
  if (t.includes("first runner"))
    return { label: "FIRST RUNNER-UP", rank: 2, color: "#C0C0C0" };
  if (t.includes("second runner"))
    return { label: "SECOND RUNNER-UP", rank: 3, color: "#CD7F32" };
  return { label: "", rank: 0, color: "#1a4fa0" };
}

function getCitation(title: string, recipientName: string): string {
  const pos = getPosition(title);
  const pronoun = "their";
  if (pos.rank === 1)
    return `for ${pronoun} outstanding performance and securing Winner in the Weekly Coding Challenges organized by the AI & ML Club, Chandigarh University in collaboration with byteXL`;
  if (pos.rank === 2)
    return `for ${pronoun} exceptional performance and securing First Runner-Up in the Weekly Coding Challenges organized by the AI & ML Club, Chandigarh University in collaboration with byteXL`;
  if (pos.rank === 3)
    return `for ${pronoun} outstanding performance and securing Second Runner-Up in the Weekly Coding Challenges organized by the AI & ML Club, Chandigarh University in collaboration with byteXL`;
  if (title.toLowerCase().includes("excellence") || title.toLowerCase().includes("xp"))
    return `for demonstrating coding excellence, algorithmic mastery, and achieving a distinguished milestone in the Weekly Coding Challenges organized by the AI & ML Club, Chandigarh University in collaboration with byteXL`;
  if (title.toLowerCase().includes("particip"))
    return `for active participation, commitment, and successfully solving coding challenges in the Weekly Coding Challenges organized by the AI & ML Club, Chandigarh University in collaboration with byteXL`;
  return `for demonstrating excellence, commitment, and active contribution in the Weekly Coding Challenges organized by the AI & ML Club, Chandigarh University in collaboration with byteXL`;
}

function getDisplayTitle(title: string): string {
  const pos = getPosition(title);
  if (pos.rank > 0) return pos.label;
  const t = title.toUpperCase();
  if (t.includes("CERTIFICATE")) return title;
  return title;
}

// Medal SVG for ranked positions
function MedalBadge({ rank, color }: { rank: number; color: string }) {
  if (rank === 0) return null;
  return (
    <div className="flex flex-col items-center mt-2">
      <svg viewBox="0 0 80 100" className="w-12 h-16 sm:w-16 sm:h-20">
        {/* Ribbon */}
        <path d="M25 0 L25 40 L40 30 L55 40 L55 0Z" fill="#c41e3a" />
        <path d="M25 0 L25 40 L40 30 L40 0Z" fill="#d42e4a" />
        {/* Medal circle */}
        <circle cx="40" cy="58" r="22" fill={color} stroke="#8B6914" strokeWidth="2" />
        <circle cx="40" cy="58" r="17" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" />
        {/* Rank number */}
        <text x="40" y="65" textAnchor="middle" fill="white" fontSize="20" fontWeight="bold" fontFamily="serif">{rank}</text>
      </svg>
    </div>
  );
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
    link.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400&family=Great+Vibes&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Montserrat:wght@400;600;700;800&display=swap";
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
      const canvas = await html2canvas(certRef.current, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const image = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = image;
      a.download = `Certificate_${data.recipientName.replace(/\s+/g, "_")}.png`;
      a.click();
    } catch { window.print(); }
    finally { setDownloading(false); }
  };

  const position = getPosition(data.title);
  const displayTitle = getDisplayTitle(data.title);
  const citation = data.description || getCitation(data.title, data.recipientName);

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div
        ref={certRef}
        className="relative w-full aspect-[1.414/1] min-h-[560px] overflow-hidden select-none bg-white"
      >
        {/* ── Blue/purple circuit-tech border frame (matching uploaded template) ── */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 707" preserveAspectRatio="none">
          {/* Gradient background edges — blue tech frame */}
          <defs>
            <linearGradient id="borderGradL" x1="0" y1="0" x2="0.15" y2="0">
              <stop offset="0%" stopColor="#1a3a8f" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#2d5fd3" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="borderGradR" x1="1" y1="0" x2="0.85" y2="0">
              <stop offset="0%" stopColor="#1a3a8f" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#2d5fd3" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="borderGradT" x1="0" y1="0" x2="0" y2="0.12">
              <stop offset="0%" stopColor="#1a3a8f" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="borderGradB" x1="0" y1="1" x2="0" y2="0.88">
              <stop offset="0%" stopColor="#3b2d8f" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="cornerGlow">
              <stop offset="0%" stopColor="#6c5ce7" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#6c5ce7" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Side gradient overlays */}
          <rect x="0" y="0" width="120" height="707" fill="url(#borderGradL)" />
          <rect x="880" y="0" width="120" height="707" fill="url(#borderGradR)" />
          <rect x="0" y="0" width="1000" height="80" fill="url(#borderGradT)" />
          <rect x="0" y="627" width="1000" height="80" fill="url(#borderGradB)" />

          {/* Corner glow effects */}
          <circle cx="0" cy="0" r="180" fill="url(#cornerGlow)" opacity="0.3" />
          <circle cx="1000" cy="0" r="180" fill="url(#cornerGlow)" opacity="0.3" />
          <circle cx="0" cy="707" r="180" fill="url(#cornerGlow)" opacity="0.4" />
          <circle cx="1000" cy="707" r="180" fill="url(#cornerGlow)" opacity="0.4" />

          {/* Top-left circuit traces */}
          <path d="M0 50 L80 50 L120 20 L220 20" stroke="#3b5bdb" strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M0 90 L50 90 L90 50 L170 50" stroke="#4f6fff" strokeWidth="1.5" fill="none" opacity="0.4" />
          <path d="M0 130 L30 130 L60 100 L130 100" stroke="#6c8aff" strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M20 0 L20 60 L50 90" stroke="#3b5bdb" strokeWidth="1.5" fill="none" opacity="0.5" />
          <path d="M60 0 L60 30 L90 50" stroke="#4f6fff" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="220" cy="20" r="4" fill="#4f6fff" opacity="0.7" />
          <circle cx="170" cy="50" r="3" fill="#6c8aff" opacity="0.5" />
          <circle cx="130" cy="100" r="3" fill="#8ba4ff" opacity="0.4" />
          <circle cx="120" cy="20" r="2.5" fill="#4f6fff" opacity="0.6" />
          <circle cx="80" cy="50" r="2" fill="#6c8aff" opacity="0.5" />

          {/* Top-right circuit traces */}
          <path d="M1000 50 L920 50 L880 20 L780 20" stroke="#3b5bdb" strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M1000 90 L950 90 L910 50 L830 50" stroke="#4f6fff" strokeWidth="1.5" fill="none" opacity="0.4" />
          <path d="M1000 130 L970 130 L940 100 L870 100" stroke="#6c8aff" strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M980 0 L980 60 L950 90" stroke="#3b5bdb" strokeWidth="1.5" fill="none" opacity="0.5" />
          <path d="M940 0 L940 30 L910 50" stroke="#4f6fff" strokeWidth="1" fill="none" opacity="0.3" />
          <circle cx="780" cy="20" r="4" fill="#4f6fff" opacity="0.7" />
          <circle cx="830" cy="50" r="3" fill="#6c8aff" opacity="0.5" />
          <circle cx="870" cy="100" r="3" fill="#8ba4ff" opacity="0.4" />

          {/* Bottom-left circuit traces */}
          <path d="M0 657 L80 657 L120 687 L220 687" stroke="#5b3bdb" strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M0 617 L50 617 L90 657 L170 657" stroke="#7c5fff" strokeWidth="1.5" fill="none" opacity="0.4" />
          <path d="M0 577 L30 577 L60 607 L130 607" stroke="#9c8aff" strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M20 707 L20 647 L50 617" stroke="#5b3bdb" strokeWidth="1.5" fill="none" opacity="0.5" />
          <circle cx="220" cy="687" r="4" fill="#7c5fff" opacity="0.7" />
          <circle cx="170" cy="657" r="3" fill="#9c8aff" opacity="0.5" />

          {/* Bottom-right circuit traces */}
          <path d="M1000 657 L920 657 L880 687 L780 687" stroke="#5b3bdb" strokeWidth="2" fill="none" opacity="0.6" />
          <path d="M1000 617 L950 617 L910 657 L830 657" stroke="#7c5fff" strokeWidth="1.5" fill="none" opacity="0.4" />
          <path d="M1000 577 L970 577 L940 607 L870 607" stroke="#9c8aff" strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M980 707 L980 647 L950 617" stroke="#5b3bdb" strokeWidth="1.5" fill="none" opacity="0.5" />
          <circle cx="780" cy="687" r="4" fill="#7c5fff" opacity="0.7" />
          <circle cx="830" cy="657" r="3" fill="#9c8aff" opacity="0.5" />

          {/* Small decorative circuit dots scattered along edges */}
          <circle cx="300" cy="10" r="2" fill="#4f6fff" opacity="0.3" />
          <circle cx="400" cy="5" r="1.5" fill="#6c8aff" opacity="0.25" />
          <circle cx="700" cy="10" r="2" fill="#4f6fff" opacity="0.3" />
          <circle cx="600" cy="5" r="1.5" fill="#6c8aff" opacity="0.25" />
          <circle cx="300" cy="697" r="2" fill="#7c5fff" opacity="0.3" />
          <circle cx="700" cy="697" r="2" fill="#7c5fff" opacity="0.3" />
          <circle cx="5" cy="300" r="2" fill="#4f6fff" opacity="0.3" />
          <circle cx="5" cy="400" r="2" fill="#4f6fff" opacity="0.3" />
          <circle cx="995" cy="300" r="2" fill="#4f6fff" opacity="0.3" />
          <circle cx="995" cy="400" r="2" fill="#4f6fff" opacity="0.3" />
        </svg>

        {/* ── Certificate content ── */}
        <div className="absolute inset-0 flex flex-col items-center justify-between py-6 sm:py-10 px-8 sm:px-16 text-center z-10">

          {/* ▸ TOP: Chandigarh University branding ◂ */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              {/* CU Logo placeholder - red shield icon */}
              <div className="w-8 h-10 sm:w-10 sm:h-12 flex items-center justify-center">
                <svg viewBox="0 0 40 48" className="w-full h-full">
                  <rect x="2" y="2" width="36" height="44" rx="4" fill="#cc0000" stroke="#990000" strokeWidth="1.5" />
                  <text x="20" y="20" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="serif">CU</text>
                  <text x="20" y="38" textAnchor="middle" fill="white" fontSize="5" fontFamily="sans-serif">UNIVERSITY</text>
                </svg>
              </div>
              <div className="text-left">
                <div
                  className="text-sm sm:text-lg font-extrabold text-[#1a3068] uppercase tracking-wide"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  CHANDIGARH
                </div>
                <div
                  className="text-xs sm:text-sm font-bold text-[#cc0000] uppercase tracking-wider -mt-0.5"
                  style={{ fontFamily: "'Montserrat', sans-serif" }}
                >
                  UNIVERSITY
                </div>
                <div
                  className="text-[7px] sm:text-[9px] text-[#1a3068]/60 italic tracking-wide"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Discover. Learn. Empower.
                </div>
              </div>
            </div>
          </div>

          {/* ▸ AM LOGO + AI & ML CLUB ◂ */}
          <div className="space-y-1 -mt-2">
            <h1
              className="text-5xl sm:text-6xl md:text-7xl font-black text-[#1a3a8f] tracking-wider leading-none"
              style={{ fontFamily: "'Montserrat', sans-serif", letterSpacing: "0.08em" }}
            >
              AM
            </h1>
            <p
              className="text-xs sm:text-sm font-bold text-[#1a3068] tracking-[0.35em] uppercase"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              AI & ML CLUB
            </p>
          </div>

          {/* ▸ IN ASSOCIATION WITH byteXL ◂ */}
          <div className="space-y-0.5 -mt-2">
            <p
              className="text-[10px] sm:text-xs tracking-[0.2em] text-[#555] uppercase font-semibold"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              IN ASSOCIATION WITH
            </p>
            <p
              className="text-lg sm:text-xl font-extrabold text-[#1a1f5e]"
              style={{ fontFamily: "'Montserrat', sans-serif" }}
            >
              byte<span className="text-sm sm:text-base align-super font-bold text-[#cc0000]">XL</span>
            </p>
          </div>

          {/* ▸ POSITION TITLE ◂ */}
          <div className="space-y-2 -mt-1 w-full">
            {position.rank > 0 ? (
              <>
                {/* Decorative divider with position */}
                <div className="flex items-center justify-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1a3a8f]/40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1a3a8f]/40" />
                    <div className="w-12 sm:w-20 h-0.5 bg-[#1a3a8f]/30" />
                  </div>
                  <h2
                    className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-wider text-[#1a1f5e]"
                    style={{ fontFamily: "'Montserrat', sans-serif" }}
                  >
                    {displayTitle}
                  </h2>
                  <div className="flex items-center gap-1">
                    <div className="w-12 sm:w-20 h-0.5 bg-[#1a3a8f]/30" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1a3a8f]/40" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#1a3a8f]/40" />
                  </div>
                </div>

                {/* CERTIFICATE text */}
                <div className="flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 rounded-full bg-amber-500/50" />
                    <div className="w-8 sm:w-14 h-px bg-amber-500/40" />
                  </div>
                  <p
                    className="text-sm sm:text-base tracking-[0.5em] text-[#888] uppercase font-semibold"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    CERTIFICATE
                  </p>
                  <div className="flex items-center gap-1">
                    <div className="w-8 sm:w-14 h-px bg-amber-500/40" />
                    <div className="w-1 h-1 rounded-full bg-amber-500/50" />
                  </div>
                </div>
              </>
            ) : (
              <h2
                className="text-xl sm:text-2xl md:text-3xl font-bold uppercase tracking-widest text-[#1a1f5e]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {data.title.toUpperCase().includes("CERTIFICATE") ? data.title : `Certificate of ${data.title}`}
              </h2>
            )}

            {/* Proudly presented to */}
            <p
              className="text-sm sm:text-base text-[#666] italic"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              Proudly presented to
            </p>
          </div>

          {/* ▸ STUDENT NAME — Flowing Calligraphy ◂ */}
          <div className="-mt-2">
            <div
              className="text-4xl sm:text-5xl md:text-6xl text-[#1a1f5e] inline-block px-6 pb-2"
              style={{
                fontFamily: "'Great Vibes', cursive",
                borderBottom: "2px solid rgba(26, 58, 143, 0.25)",
              }}
            >
              {data.recipientName}
            </div>
          </div>

          {/* ▸ CITATION ◂ */}
          <p
            className="text-xs sm:text-sm text-[#444] leading-relaxed max-w-lg mx-auto -mt-1"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(11px, 1.5vw, 15px)" }}
          >
            {citation}
          </p>

          {/* ▸ MEDAL BADGE ◂ */}
          <div className="-mt-2">
            <MedalBadge rank={position.rank} color={position.color} />
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
              className="bg-[#1a3a8f] hover:bg-[#142d6e] text-white font-semibold gap-1.5 text-xs shadow-sm"
            >
              <Download className="h-4 w-4" /> {downloading ? "Generating..." : "Download HD"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
