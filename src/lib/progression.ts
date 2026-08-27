import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Level tiers & progression
// ---------------------------------------------------------------------------
export const TIERS = [
  { name: "Beginner", level: 1, minXp: 0, maxXp: 499, color: "#16a34a" },
  { name: "Beginner", level: 2, minXp: 500, maxXp: 1499, color: "#16a34a" },
  { name: "Intermediate", level: 3, minXp: 1500, maxXp: 3499, color: "#0ea5e9" },
  { name: "Intermediate", level: 4, minXp: 3500, maxXp: 6499, color: "#0ea5e9" },
  { name: "Advanced", level: 5, minXp: 6500, maxXp: 9999, color: "#d97706" },
  { name: "Advanced", level: 6, minXp: 10000, maxXp: 14999, color: "#d97706" },
  { name: "Pro", level: 7, minXp: 15000, maxXp: 21999, color: "#7c3aed" },
  { name: "Pro", level: 8, minXp: 22000, maxXp: 29999, color: "#7c3aed" },
  { name: "Pro", level: 9, minXp: 30000, maxXp: null, color: "#7c3aed" },
] as const;

export interface LevelInfo {
  level: number;
  tier: string;
  minXp: number;
  maxXp: number | null;
  nextLevelXp: number | null;
  progress: number; // 0..1 toward next level
  xpIntoLevel: number;
  xpForLevel: number;
  color: string;
}

export function computeLevelInfo(xp: number): LevelInfo {
  let current = TIERS[0];
  for (const t of TIERS) {
    if (xp >= t.minXp && (t.maxXp === null || xp <= t.maxXp)) {
      current = t;
      break;
    }
  }
  const idx = TIERS.indexOf(current);
  const next = idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
  const xpIntoLevel = xp - current.minXp;
  const xpForLevel = current.maxXp === null ? 0 : current.maxXp - current.minXp + 1;
  const progress =
    current.maxXp === null
      ? 1
      : Math.min(1, xpIntoLevel / (current.maxXp - current.minXp + 1));
  return {
    level: current.level,
    tier: current.name,
    minXp: current.minXp,
    maxXp: current.maxXp,
    nextLevelXp: next ? next.minXp : null,
    progress,
    xpIntoLevel,
    xpForLevel,
    color: current.color,
  };
}

// ---------------------------------------------------------------------------
// Streak logic — based on actual successful submission dates
// ---------------------------------------------------------------------------
function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string;
}

export async function recomputeStreak(userId: string): Promise<StreakResult> {
  // Pull distinct dates of successful submissions, ordered desc
  const rows = await db.activityLog.findMany({
    where: { userId, type: "solve" },
    select: { date: true },
    distinct: ["date"],
    orderBy: { date: "desc" },
  });
  const dates = rows.map((r) => r.date).filter(Boolean).sort((a, b) => (a < b ? 1 : -1));
  if (dates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, lastActiveDate: "" };
  }
  // longest streak from sorted descending dates
  let longest = 1;
  let cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = new Date(dates[i - 1] + "T00:00:00Z");
    const now = new Date(dates[i] + "T00:00:00Z");
    const diffDays = Math.round((prev.getTime() - now.getTime()) / 86400000);
    if (diffDays === 1) cur++;
    else cur = 1;
    longest = Math.max(longest, cur);
  }
  // current streak: count consecutive days back from today/yesterday
  const today = ymd(new Date());
  const yesterday = ymd(new Date(Date.now() - 86400000));
  let current = 0;
  let pointer = dates[0];
  if (pointer !== today && pointer !== yesterday) {
    current = 0;
  } else {
    current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1] + "T00:00:00Z");
      const now = new Date(dates[i] + "T00:00:00Z");
      const diffDays = Math.round((prev.getTime() - now.getTime()) / 86400000);
      if (diffDays === 1) current++;
      else break;
    }
  }
  return { currentStreak: current, longestStreak: longest, lastActiveDate: dates[0] };
}

// ---------------------------------------------------------------------------
// XP awarding — idempotent. Primary XP only on FIRST successful solve.
// Small bonus for first-attempt success.
// ---------------------------------------------------------------------------
export const XP_RULES = {
  solveEasy: 10,
  solveMedium: 20,
  solveHard: 35,
  solveExpert: 60,
  firstAttemptBonus: 0.25, // 25% bonus
};

export function xpForDifficulty(difficulty: string): number {
  switch ((difficulty || "").toLowerCase()) {
    case "easy":
      return XP_RULES.solveEasy;
    case "medium":
      return XP_RULES.solveMedium;
    case "hard":
      return XP_RULES.solveHard;
    case "expert":
      return XP_RULES.solveExpert;
    default:
      return XP_RULES.solveMedium;
  }
}
