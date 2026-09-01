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
        backgroundColor: "#060919",
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
      {/* Certificate Frame with Cyber Circuit Glowing Background */}
      <div
        ref={certRef}
        className="relative w-full aspect-[1.414/1] min-h-[560px] rounded-2xl p-6 sm:p-10 overflow-hidden shadow-2xl flex flex-col justify-between select-none text-slate-900 bg-slate-950"
        style={{
          backgroundImage: "url('/certificates/custom-aiml-template.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      >
        {/* Top Header Placeholder Spacer (preserves the graphic header in template) */}
        <div className="pt-20 sm:pt-24 text-center z-10">
          {/* In Association with byteXL */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 backdrop-blur-sm border border-indigo-100 shadow-sm">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-600">
              In Association With
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/bytexl-logo.png"
              alt="byteXL"
              className="h-5 sm:h-6 w-auto object-contain inline-block mix-blend-multiply"
            />
          </div>
        </div>

        {/* Dynamic Title / Presented To / Student Name / Citation Block */}
        <div className="relative text-center z-10 my-auto space-y-3 px-4 sm:px-12 pt-2">
          {/* Dynamic Achievement Title */}
          <div className="text-xl sm:text-2xl md:text-3xl font-extrabold uppercase tracking-wider text-[#0e185f] font-serif">
            {data.title.toUpperCase().includes("CERTIFICATE") ? data.title : `CERTIFICATE OF ${data.title.toUpperCase()}`}
          </div>

          <div className="text-xs sm:text-sm text-slate-600 font-sans tracking-wide">
            This is proudly presented to
          </div>

          {/* Dynamic Student Name in Flowing Script Calligraphy */}
          <div className="py-1">
            <div
              className="text-3xl sm:text-5xl md:text-6xl font-serif italic font-bold text-[#0c134f] tracking-wide inline-block px-8 pb-1 border-b-2 border-indigo-300 drop-shadow-sm"
              style={{
                fontFamily: "'Dancing Script', 'Playfair Display', 'Brush Script MT', cursive, serif",
              }}
            >
              {data.recipientName}
            </div>
          </div>

          {/* Citation Body Text */}
          <p className="text-xs sm:text-sm text-slate-700 max-w-lg mx-auto leading-relaxed pt-1">
            {data.description || (
              <>
                for demonstrating excellence, commitment, and active contribution to the{" "}
                <strong className="text-[#0c134f] font-bold">A-I-M-L Club, Chandigarh University</strong> in collaboration with{" "}
                <strong className="text-slate-900 font-bold">byteXL</strong>, and for achieving a distinguished milestone in their journey.
              </>
            )}
          </p>
        </div>

        {/* Bottom Verification Footer */}
        <div className="relative z-10 pb-2 px-4 sm:px-8 flex items-center justify-between text-xs text-slate-700 font-sans">
          <div className="text-left space-y-0.5">
            <div className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Date Issued</div>
            <div className="font-semibold text-slate-800 text-xs">{formattedDate}</div>
          </div>

          <div className="text-right space-y-0.5">
            <div className="text-[9px] uppercase font-bold tracking-wider text-slate-500">Verification ID</div>
            <div className="font-mono font-bold text-[#0c134f] text-xs">{data.verificationId}</div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      {showActions && (
        <div className="flex items-center justify-between gap-3 p-4 bg-card border border-border/70 rounded-xl shadow-sm flex-wrap">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-mono text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" /> Authenticated by Chandigarh University, A-I-M-L Club & byteXL
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
