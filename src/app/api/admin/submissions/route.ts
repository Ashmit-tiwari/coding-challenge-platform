import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { ok, unauthorized } from "@/lib/api";

// GET /api/admin/submissions?userId=&challengeId=&status=&language=&limit=50&groupBy=user_challenge
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const challengeId = url.searchParams.get("challengeId");
  const status = url.searchParams.get("status");
  const language = url.searchParams.get("language");
  const groupBy = url.searchParams.get("groupBy");
  const limit = Math.min(Number(url.searchParams.get("limit") || 50), 300);

  const where: any = {};
  if (userId) where.userId = userId;
  if (challengeId) where.challengeId = challengeId;
  if (status) where.status = status;
  if (language) where.language = language;

  // If groupBy=user_challenge is requested, fetch submissions and group by userId + challengeId
  if (groupBy === "user_challenge") {
    // Fetch a larger pool of submissions to accurately group attempts
    const fetchLimit = Math.max(limit * 4, 200);
    const subs = await db.submission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: fetchLimit,
      include: {
        user: { select: { id: true, uid: true, name: true, year: true, avatar: true } },
        challenge: { select: { id: true, title: true, slug: true, difficulty: true, category: true } },
      },
    });

    // Grouping map: key = `${userId}_${challengeId}`
    const groupMap = new Map<string, any>();

    for (const s of subs) {
      const groupKey = `${s.userId}_${s.challengeId}`;
      const attemptData = {
        id: s.id,
        attemptNumber: s.attemptNumber,
        language: s.language,
        status: s.status,
        passedAll: s.passedAll,
        passedCount: s.passedCount,
        totalTests: s.totalTests,
        execTimeMs: s.execTimeMs,
        xpAwarded: s.xpAwarded,
        isFinal: s.isFinal,
        fingerprint: s.fingerprint,
        tabSwitchesCount: s.tabSwitchesCount ?? 0,
        pasteCount: s.pasteCount ?? 0,
        totalPastedLines: s.totalPastedLines ?? 0,
        createdAt: s.createdAt,
      };

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          id: s.id, // latest submission id
          user: s.user,
          challenge: s.challenge,
          latestLanguage: s.language,
          latestStatus: s.status,
          passedAll: s.passedAll,
          latestPassedCount: s.passedCount,
          totalTests: s.totalTests,
          attemptCount: 1,
          totalTabSwitches: s.tabSwitchesCount ?? 0,
          totalPasteCount: s.pasteCount ?? 0,
          totalPastedLines: s.totalPastedLines ?? 0,
          latestCreatedAt: s.createdAt,
          firstCreatedAt: s.createdAt,
          xpAwarded: s.xpAwarded,
          hasAccepted: s.passedAll || s.status.toLowerCase() === "accepted",
          bestStatus: s.status,
          attempts: [attemptData],
        });
      } else {
        const existing = groupMap.get(groupKey);
        existing.attemptCount += 1;
        existing.totalTabSwitches += s.tabSwitchesCount ?? 0;
        existing.totalPasteCount += s.pasteCount ?? 0;
        existing.totalPastedLines += s.totalPastedLines ?? 0;
        if (s.xpAwarded > existing.xpAwarded) existing.xpAwarded = s.xpAwarded;
        if (s.passedAll || s.status.toLowerCase() === "accepted") {
          existing.hasAccepted = true;
          existing.bestStatus = "Accepted";
        }
        existing.firstCreatedAt = s.createdAt;
        existing.attempts.push(attemptData);
      }
    }

    const groupedEntries = Array.from(groupMap.values()).slice(0, limit);

    return ok({
      grouped: true,
      submissions: groupedEntries,
      rawCount: subs.length,
      groupCount: groupedEntries.length,
    });
  }

  // Default raw stream mode
  const subs = await db.submission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: { select: { uid: true, name: true, year: true, avatar: true } },
      challenge: { select: { id: true, title: true, slug: true, difficulty: true, category: true } },
    },
  });

  return ok({
    grouped: false,
    submissions: subs.map((s) => ({
      id: s.id,
      user: s.user,
      challenge: s.challenge,
      language: s.language,
      status: s.status,
      passedAll: s.passedAll,
      passedCount: s.passedCount,
      totalTests: s.totalTests,
      attemptNumber: s.attemptNumber,
      execTimeMs: s.execTimeMs,
      xpAwarded: s.xpAwarded,
      isFinal: s.isFinal,
      fingerprint: s.fingerprint,
      tabSwitchesCount: s.tabSwitchesCount ?? 0,
      pasteCount: s.pasteCount ?? 0,
      totalPastedLines: s.totalPastedLines ?? 0,
      createdAt: s.createdAt,
    })),
  });
}
