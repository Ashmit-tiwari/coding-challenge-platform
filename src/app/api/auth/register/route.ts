import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { parseUid } from "@/lib/uid";
import { hashPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session";
import { ok, fail, publicUser } from "@/lib/api";

// POST /api/auth/register
// Body: { uid, name, password, username? }
export async function POST(req: NextRequest) {
  try {
    let body: { uid?: string; name?: string; password?: string; username?: string };
    try {
      body = await req.json();
    } catch {
      return fail("Invalid JSON body", 400);
    }
    const { uid, name, password, username } = body;
    if (!uid || !name || !password) {
      return fail("UID, name and password are required", 400);
    }
    if (password.length < 4) {
      return fail("Password must be at least 4 characters.", 400);
    }
    const parsed = parseUid(uid);
    if (!parsed.valid) {
      return fail(parsed.error || "Invalid UID format", 400);
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
              hair: "boy_fade",
              hairColor: "color_espresso",
              outfit: "outfit_hoodie",
              outfitVibe: "tech",
              sticker: "none",
              expression: "smile",
            }),
          },
        },
      },
      include: { avatar: true },
    });
    try {
      await db.notification.create({
        data: {
          userId: user.id,
          type: "announcement",
          title: `Welcome, ${user.name}!`,
          message: "Your coding journey starts now. Try the weekly challenge to earn your first XP.",
          link: "/challenges",
        },
      });
    } catch {}
    await setSessionCookie({ userId: user.id, role: "student", uid: user.uid, name: user.name });
    return ok({ user: publicUser(user) });
  } catch (err: any) {
    console.error("Register Server Error:", err);
    return fail(err?.message || "Internal database connection error. Verify Vercel environment variables.", 500);
  }
}
