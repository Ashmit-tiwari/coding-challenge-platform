import { db } from "@/lib/db";
import { ok } from "@/lib/api";

// GET /api/challenges/weekly — current weekly challenge + countdown
export async function GET() {
  const weekly = await db.challenge.findFirst({
    where: { isWeekly: true, status: "published" },
    orderBy: { weekStartsAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
  if (!weekly) return ok({ weekly: null });
  return ok({
    weekly: {
      id: weekly.id,
      slug: weekly.slug,
      title: weekly.title,
      difficulty: weekly.difficulty,
      category: weekly.category,
      xpReward: weekly.xpReward,
      weekLabel: weekly.weekLabel,
      weekStartsAt: weekly.weekStartsAt,
      weekEndsAt: weekly.weekEndsAt,
      description: weekly.description,
      participationCount: weekly._count.submissions,
    },
  });
}
