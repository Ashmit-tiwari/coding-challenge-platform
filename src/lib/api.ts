import { NextResponse } from "next/server";

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function fail(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function serverError(message = "Internal server error") {
  return NextResponse.json({ error: message }, { status: 500 });
}

// safe JSON parse helper for DB-stored JSON text columns
export function safeJson<T = any>(s: string | null | undefined, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

export function publicUser(u: any) {
  if (!u) return null;
  return {
    id: u.id,
    uid: u.uid,
    name: u.name,
    year: u.year,
    batch: u.batch,
    username: u.username,
    bio: u.bio,
    xp: u.xp,
    level: u.level,
    levelName: u.levelName,
    currentStreak: u.currentStreak,
    longestStreak: u.longestStreak,
    titles: safeJson<string[]>(u.titles, []),
    featuredBadges: safeJson<string[]>(u.featuredBadges, []),
    avatar: u.avatar ? safeJson(u.avatar.config, {}) : {},
    createdAt: u.createdAt,
    isBanned: u.isBanned,
  };
}

export function publicChallenge(c: any) {
  if (!c) return null;
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    statement: c.statement,
    difficulty: c.difficulty,
    category: c.category,
    topic: c.topic,
    xpReward: c.xpReward,
    targetYear: c.targetYear,
    status: c.status,
    isWeekly: c.isWeekly,
    weekLabel: c.weekLabel,
    weekStartsAt: c.weekStartsAt,
    weekEndsAt: c.weekEndsAt,
    timeLimitMs: c.timeLimitMs,
    memoryLimitMb: c.memoryLimitMb,
    languages: safeJson<string[]>(c.languages, []),
    constraints: c.constraints,
    examples: safeJson<any[]>(c.examples, []),
    inputFormat: c.inputFormat,
    outputFormat: c.outputFormat,
    starterCode: safeJson<Record<string, string>>(c.starterCode, {}),
    version: c.version,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    _count: c._count,
  };
}
