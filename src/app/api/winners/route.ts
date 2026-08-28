import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, safeJson } from "@/lib/api";

// GET /api/winners
// Public endpoint: Returns all admin-declared weekly winners grouped by week and year
export async function GET(req: NextRequest) {
  const winners = await db.weeklyWinner.findMany({
    orderBy: [{ weekLabel: "desc" }, { year: "asc" }, { rank: "asc" }],
    include: {
      user: {
        select: {
          id: true,
          uid: true,
          name: true,
          year: true,
          batch: true,
          xp: true,
          levelName: true,
          avatar: true,
        },
      },
      challenge: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });

  // Group by weekLabel
  const grouped: Record<string, { weekLabel: string; year1: any[]; year2: any[] }> = {};

  for (const w of winners) {
    if (!grouped[w.weekLabel]) {
      grouped[w.weekLabel] = {
        weekLabel: w.weekLabel,
        year1: [],
        year2: [],
      };
    }

    const payload = {
      id: w.id,
      rank: w.rank,
      title: w.title,
      adminNote: w.adminNote,
      createdAt: w.createdAt,
      challenge: w.challenge,
      user: {
        ...w.user,
        avatar: w.user.avatar ? safeJson(w.user.avatar.config, {}) : {},
      },
    };

    if (w.year === "1") {
      grouped[w.weekLabel].year1.push(payload);
    } else if (w.year === "2") {
      grouped[w.weekLabel].year2.push(payload);
    }
  }

  return ok({
    weeks: Object.values(grouped),
    allWinners: winners.map((w) => ({
      id: w.id,
      weekLabel: w.weekLabel,
      year: w.year,
      rank: w.rank,
      title: w.title,
      adminNote: w.adminNote,
      createdAt: w.createdAt,
      user: {
        ...w.user,
        avatar: w.user.avatar ? safeJson(w.user.avatar.config, {}) : {},
      },
    })),
  });
}
