import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { ok, fail, unauthorized, forbidden, safeJson } from "@/lib/api";
import { evaluateAchievements, evaluateCertificates } from "@/lib/achievements";

// GET /api/admin/winners?weekLabel=...&year=...
// Returns declared winners, weekly challenges, and eligible submissions for winner evaluation.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");

  const url = new URL(req.url);
  const weekLabel = url.searchParams.get("weekLabel");
  const year = url.searchParams.get("year"); // "1" | "2" | null

  // 1. All weekly challenges
  const weeklyChallenges = await db.challenge.findMany({
    where: { isWeekly: true, status: "published" },
    orderBy: { createdAt: "desc" },
    select: { id: true, title: true, slug: true, weekLabel: true, xpReward: true, targetYear: true },
  });

  // 2. Declared winners
  const winnerWhere: any = {};
  if (weekLabel) winnerWhere.weekLabel = weekLabel;
  if (year) winnerWhere.year = year;

  const declaredWinners = await db.weeklyWinner.findMany({
    where: winnerWhere,
    orderBy: [{ weekLabel: "desc" }, { year: "asc" }, { rank: "asc" }],
    include: {
      user: {
        select: {
          id: true,
          uid: true,
          name: true,
          year: true,
          batch: true,
          avatar: true,
        },
      },
      submission: {
        select: {
          id: true,
          language: true,
          code: true,
          status: true,
          passedCount: true,
          totalTests: true,
          execTimeMs: true,
          createdAt: true,
        },
      },
      declaredBy: {
        select: {
          username: true,
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

  // 3. Eligible candidate submissions for the selected challenge / week
  let candidateSubmissions: any[] = [];
  if (weekLabel) {
    const matchedChallenge = weeklyChallenges.find((c) => c.weekLabel === weekLabel);
    const challengeIds = matchedChallenge ? [matchedChallenge.id] : [];

    const subWhere: any = {};
    if (challengeIds.length > 0) {
      subWhere.challengeId = { in: challengeIds };
    }
    if (year) {
      subWhere.user = { year };
    }

    const subs = await db.submission.findMany({
      where: subWhere,
      orderBy: [{ passedAll: "desc" }, { passedCount: "desc" }, { execTimeMs: "asc" }, { createdAt: "asc" }],
      take: 100,
      include: {
        user: {
          select: {
            id: true,
            uid: true,
            name: true,
            year: true,
            batch: true,
            avatar: true,
          },
        },
        challenge: {
          select: {
            id: true,
            title: true,
            slug: true,
            weekLabel: true,
          },
        },
      },
    });

    candidateSubmissions = subs.map((s) => ({
      id: s.id,
      userId: s.userId,
      user: {
        ...s.user,
        avatar: s.user.avatar ? safeJson(s.user.avatar.config, {}) : {},
      },
      challenge: s.challenge,
      language: s.language,
      code: s.code,
      status: s.status,
      passedAll: s.passedAll,
      passedCount: s.passedCount,
      totalTests: s.totalTests,
      execTimeMs: s.execTimeMs,
      createdAt: s.createdAt,
    }));
  }

  return ok({
    weeklyChallenges,
    declaredWinners: declaredWinners.map((w) => ({
      ...w,
      user: {
        ...w.user,
        avatar: w.user.avatar ? safeJson(w.user.avatar.config, {}) : {},
      },
    })),
    candidateSubmissions,
  });
}

// POST /api/admin/winners
// Body: { weekLabel, challengeId?, year, rank, userId, submissionId?, adminNote? }
// Manually declares a Year 1 or Year 2 Weekly Winner / Runner Up
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const { weekLabel, challengeId, year, rank, userId, submissionId, adminNote } = body || {};
  if (!weekLabel || !year || !rank || !userId) {
    return fail("weekLabel, year, rank, and userId are required");
  }

  const cleanYear = String(year);
  if (!["1", "2"].includes(cleanYear)) {
    return fail("Year must be '1' or '2'");
  }

  const rankNum = Number(rank);
  if (![1, 2, 3].includes(rankNum)) {
    return fail("Rank must be 1 (Winner), 2 (1st Runner Up), or 3 (2nd Runner Up)");
  }

  const rankTitle = rankNum === 1 ? "Winner" : rankNum === 2 ? "1st Runner Up" : "2nd Runner Up";

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return fail("User not found", 404);

  const winner = await db.weeklyWinner.upsert({
    where: {
      weekLabel_year_rank: {
        weekLabel,
        year: cleanYear,
        rank: rankNum,
      },
    },
    update: {
      userId: user.id,
      challengeId: challengeId || null,
      submissionId: submissionId || null,
      title: rankTitle,
      declaredById: admin.id,
      adminNote: adminNote || null,
      updatedAt: new Date(),
    },
    create: {
      weekLabel,
      challengeId: challengeId || null,
      year: cleanYear,
      rank: rankNum,
      title: rankTitle,
      userId: user.id,
      submissionId: submissionId || null,
      declaredById: admin.id,
      adminNote: adminNote || null,
    },
    include: {
      user: true,
    },
  });

  await writeAudit(admin.id, "winner_declared", winner.id, {
    weekLabel,
    year: cleanYear,
    rank: rankNum,
    title: rankTitle,
    studentName: user.name,
    studentUid: user.uid,
  });

  // Create in-app celebration notification for student
  try {
    await db.notification.create({
      data: {
        userId: user.id,
        type: "announcement",
        title: `🏆 ${weekLabel} ${rankTitle}!`,
        message: `Congratulations, ${user.name}! The admin team has declared you the Year ${cleanYear} ${rankTitle} for ${weekLabel}.`,
        link: "/leaderboard",
      },
    });

    // Auto-evaluate winner-related badges and certificates
    await evaluateAchievements(user.id);
    await evaluateCertificates(user.id);
  } catch {}

  return ok({ winner });
}

// DELETE /api/admin/winners?id=...
// Revokes a declared winner
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return fail("id parameter is required");

  const existing = await db.weeklyWinner.findUnique({ where: { id } });
  if (!existing) return fail("Winner record not found", 404);

  await db.weeklyWinner.delete({ where: { id } });
  await writeAudit(admin.id, "winner_revoked", id, {
    weekLabel: existing.weekLabel,
    year: existing.year,
    rank: existing.rank,
    userId: existing.userId,
  });

  return ok({ success: true, message: "Winner declaration revoked" });
}
