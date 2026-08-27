import { db } from "@/lib/db";
import { getStudentSession, clearSessionCookie } from "@/lib/session";
import { ok, unauthorized, publicUser } from "@/lib/api";
import { computeLevelInfo, recomputeStreak } from "@/lib/progression";

// GET /api/auth/me — full current student profile + level info + streak
// If the session cookie is invalid/expired, clear it so the browser stops
// sending a stale token on every subsequent request (prevents auth loops).
export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    await clearSessionCookie("student");
    return unauthorized("Not logged in");
  }
  const user = await db.user.findUnique({
    where: { id: session.userId },
    include: { avatar: true },
  });
  if (!user) {
    await clearSessionCookie("student");
    return unauthorized("User not found");
  }
  if (user.isBanned) {
    await clearSessionCookie("student");
    return unauthorized("Account suspended");
  }

  // keep streak fresh
  const streak = await recomputeStreak(user.id);
  if (
    streak.currentStreak !== user.currentStreak ||
    streak.longestStreak !== user.longestStreak
  ) {
    await db.user.update({
      where: { id: user.id },
      data: {
        currentStreak: streak.currentStreak,
        longestStreak: Math.max(streak.longestStreak, user.longestStreak),
        lastActiveDate: streak.lastActiveDate || null,
      },
    });
    user.currentStreak = streak.currentStreak;
    user.longestStreak = Math.max(streak.longestStreak, user.longestStreak);
  }

  const levelInfo = computeLevelInfo(user.xp);
  // sync stored level/tier
  if (user.level !== levelInfo.level || user.levelName !== levelInfo.tier) {
    await db.user.update({
      where: { id: user.id },
      data: { level: levelInfo.level, levelName: levelInfo.tier },
    });
    user.level = levelInfo.level;
    user.levelName = levelInfo.tier;
  }

  return ok({ user: publicUser(user), levelInfo });
}
