import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, fail, unauthorized } from "@/lib/api";

export const AVATAR_CATALOG = {
  gender: ["masculine", "feminine", "neutral"],
  skin: ["skin1", "skin2", "skin3", "skin4", "skin5", "skin6"],
  hair: [
    "boy_turban",
    "boy_fade",
    "boy_pompadour",
    "boy_spiky_quiff",
    "boy_buzz",
    "boy_manbun",
    "girl_waves",
    "girl_bob",
    "girl_ponytail",
    "girl_bangs",
    "girl_spacebuns",
    "hair1", "hair2", "hair3", "hair4", "hair5",
    "hair6", "hair7", "hair8", "hair9", "hair10", "hair11", "hair12",
    "boy_curly", "girl_hijab"
  ],
  hairColor: [
    "color_black",
    "color_espresso",
    "color_brown",
    "color_auburn",
    "color_blonde",
    "color_platinum",
    "color_crimson",
    "color_purple",
    "color_blue",
    "color_silver",
    "color_rose",
    "color_teal",
  ],
  face: ["face1", "face2", "face3", "face4", "face5"],
  eyes: ["eyes1", "eyes2", "eyes3", "eyes4", "eyes5", "eyes6"],
  eyebrows: ["brows1", "brows2", "brows3", "brows4", "brows5"],
  glasses: ["none", "glasses1", "glasses2", "glasses3", "glasses4"],
  facial: ["none", "beard1", "beard2", "mustache1", "stubble1"],
  outfit: [
    "outfit_hoodie",
    "outfit_varsity",
    "outfit_blazer",
    "outfit_crewneck",
    "outfit_tshirt",
    "outfit_denim",
    "outfit_jersey",
    "outfit_turtleneck",
    "outfit1", "outfit2", "outfit3", "outfit4", "outfit5", "outfit6", "outfit7", "outfit8"
  ],
  outfitVibe: [
    "tech",
    "casual",
    "sporty",
    "formal",
    "street",
    "retro",
    "cyber",
    "midnight",
    "sunset",
    "rose"
  ],
  sticker: ["none", "crown1", "star1", "code1", "fire1", "bolt1", "rocket1", "heart1"],
  expression: ["smile", "cool", "wink", "happy", "focus", "surprise", "laugh"],
};

export type AvatarConfig = Record<string, string>;

function sanitizeConfig(input: any): AvatarConfig {
  const out: AvatarConfig = {};
  for (const [k, allowed] of Object.entries(AVATAR_CATALOG) as [string, string[]][]) {
    if (typeof input?.[k] === "string" && allowed.includes(input[k])) {
      out[k] = input[k];
    }
  }
  return out;
}

// GET /api/profile/avatar — current user's avatar + catalog
export async function GET() {
  const session = await getStudentSession();
  if (!session) return unauthorized("Not logged in");
  const avatar = await db.avatar.findUnique({ where: { userId: session.userId } });
  const config = avatar ? JSON.parse(avatar.config) as AvatarConfig : {};
  return ok({ avatar: config, catalog: AVATAR_CATALOG });
}

// PUT /api/profile/avatar — update avatar config
export async function PUT(req: NextRequest) {
  const session = await getStudentSession();
  if (!session) return unauthorized("Not logged in");
  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON");
  }
  const cleaned = sanitizeConfig(body?.config || body);
  const avatar = await db.avatar.upsert({
    where: { userId: session.userId },
    update: { config: JSON.stringify(cleaned) },
    create: { userId: session.userId, config: JSON.stringify(cleaned) },
  });
  return ok({ avatar: cleaned });
}

export { AVATAR_CATALOG as CATALOG };
