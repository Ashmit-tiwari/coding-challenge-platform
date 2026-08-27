import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { parseUid } from "@/lib/uid";
import { hashPassword, verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { ok, fail, publicUser } from "@/lib/api";

// POST /api/auth/register
// Body: { uid, name, password, username? }
export async function POST(req: NextRequest) {
  let body: { uid?: string; name?: string; password?: string; username?: string };
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }
  const { uid, name, password, username } = body;
  if (!uid || !name || !password) {
    return fail("uid, name and password are required");
  }
  if (password.length < 4) {
    return fail("Password must be at least 4 characters.");
  }
  const parsed = parseUid(uid);
  if (!parsed.valid) {
    return fail(parsed.error || "Invalid UID");
  }
  const existing = await db.user.findUnique({ where: { uid: parsed.uid } });
  if (existing) {
    return fail("This UID is already registered. Please log in instead.", 409);
  }
  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      uid: parsed.uid,
      name: name.trim(),
      year: parsed.year!,
      batch: parsed.batch!,
      username: username?.trim() || null,
      passwordHash,
      levelName: "Beginner",
      avatar: {
        create: {
          config: JSON.stringify({
            gender: "neutral",
            skin: "skin1",
            face: "face1",
            hair: "hair1",
            eyes: "eyes1",
            eyebrows: "brows1",
            glasses: "none",
            facial: "none",
            outfit: "outfit1",
            outfitVibe: "casual",
            sticker: "none",
            expression: "smile",
          }),
        },
      },
    },
    include: { avatar: true },
  });
  await db.notification.create({
    data: {
      userId: user.id,
      type: "announcement",
      title: `Welcome, ${user.name}!`,
      message: "Your coding journey starts now. Try the weekly challenge to earn your first XP.",
      link: "/challenges",
    },
  });
  await setSessionCookie({ userId: user.id, role: "student", uid: user.uid, name: user.name });
  return ok({ user: publicUser(user) });
}
