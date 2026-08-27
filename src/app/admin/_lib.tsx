"use client";

// Shared admin UI helpers used across admin pages.
// Small, focused, no external deps.

export const difficultyColor = (d: string): string => {
  switch ((d || "").toLowerCase()) {
    case "easy":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "medium":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "hard":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30";
    case "expert":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const statusColor = (s: string): string => {
  switch ((s || "").toLowerCase()) {
    case "accepted":
    case "passed":
    case "published":
    case "confirmed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "wrong_answer":
    case "wrong":
    case "failed":
    case "rejected":
    case "banned":
      return "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";
    case "time_limit":
    case "timeout":
    case "memory_limit":
    case "runtime_error":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "compile_error":
    case "error":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30";
    case "draft":
      return "bg-muted text-muted-foreground border-border";
    case "archived":
      return "bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-500/30";
    case "pending":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "reviewed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "dismissed":
      return "bg-muted text-muted-foreground border-border";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
};

export const yearBadge = (y?: string | null): string => {
  if (y === "1") return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (y === "2") return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-muted text-muted-foreground border-border";
};

export const yearLabel = (y?: string | null): string =>
  y === "1" ? "Year 1" : y === "2" ? "Year 2" : "—";

export function fmtDate(d?: string | Date | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

export function fmtDateTime(d?: string | Date | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

export function fmtMs(ms?: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function relTime(d?: string | Date | null): string {
  if (!d) return "—";
  const t = new Date(d).getTime();
  if (!Number.isFinite(t)) return "—";
  const diff = t - Date.now();
  const abs = Math.abs(diff);
  const sign = diff >= 0 ? "in " : "";
  const past = diff >= 0 ? "" : " ago";
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${sign}${mins}m${past}`;
  if (hrs < 24) return `${sign}${hrs}h${past}`;
  if (days < 30) return `${sign}${days}d${past}`;
  return fmtDate(d);
}

export function shortId(s?: string | null, n = 6): string {
  if (!s) return "—";
  return s.length <= n ? s : `${s.slice(0, n)}…`;
}

export function simColor(score: number): { color: string; bg: string; ring: string; label: string } {
  if (score >= 0.85) return { color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-500/10", ring: "ring-rose-500/40", label: "Critical" };
  if (score >= 0.7) return { color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10", ring: "ring-amber-500/40", label: "High" };
  if (score >= 0.5) return { color: "text-yellow-700 dark:text-yellow-400", bg: "bg-yellow-500/10", ring: "ring-yellow-500/40", label: "Medium" };
  return { color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-emerald-500/40", label: "Low" };
}

export const LANG_LABELS: Record<string, string> = {
  python: "Python",
  cpp: "C++",
  javascript: "JavaScript",
  js: "JavaScript",
  java: "Java",
  c: "C",
  go: "Go",
  rust: "Rust",
};

export function langLabel(l?: string | null): string {
  if (!l) return "—";
  return LANG_LABELS[l.toLowerCase()] || l;
}

export function safeArr<T>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

export function safeObj<T = Record<string, any>>(v: any, fallback: T = {} as T): T {
  return v && typeof v === "object" && !Array.isArray(v) ? v : fallback;
}
