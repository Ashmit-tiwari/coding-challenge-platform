// UID validation: university ID pattern 25LBCSxxxx or 26LBCSxxxx
// First two digits determine academic year: 25 -> 2nd year, 26 -> 1st year.
// Designed to be extended: additional batches (e.g. 24, 27) can be added via BATCH_MAP.

export const UID_REGEX = /^(25|26)LBCS\d{4}$/;

export const BATCH_MAP: Record<string, { year: string; label: string; batch: string }> = {
  "25": { year: "2", label: "Second Year", batch: "2025" },
  "26": { year: "1", label: "First Year", batch: "2026" },
};

export interface ParsedUid {
  valid: boolean;
  uid: string;
  year?: string; // "1" | "2"
  yearLabel?: string;
  batch?: string;
  error?: string;
}

export function parseUid(uid: string): ParsedUid {
  const cleaned = (uid || "").trim().toUpperCase();
  if (!cleaned) return { valid: false, uid: "", error: "UID is required." };
  if (!UID_REGEX.test(cleaned)) {
    return {
      valid: false,
      uid: cleaned,
      error: "UID must match the pattern 25LBCSxxxx or 26LBCSxxxx (4 digits).",
    };
  }
  const prefix = cleaned.slice(0, 2);
  const meta = BATCH_MAP[prefix];
  if (!meta) {
    return { valid: false, uid: cleaned, error: "Unsupported batch prefix." };
  }
  return {
    valid: true,
    uid: cleaned,
    year: meta.year,
    yearLabel: meta.label,
    batch: meta.batch,
  };
}

export function yearFromUid(uid: string): string | null {
  const p = parseUid(uid);
  return p.valid ? p.year ?? null : null;
}
