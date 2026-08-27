import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { ok, unauthorized, safeJson } from "@/lib/api";

const SETTING_KEYS = [
  "platform_name",
  "leaderboard_scope_default",
  "supported_languages",
  "categories",
  "difficulties",
  "similarity_threshold",
  "rate_limit_submissions_per_min",
  "announcements",
];

// GET /api/admin/settings
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const rows = await db.platformSetting.findMany();
  const settings: Record<string, any> = {};
  for (const r of rows) settings[r.key] = safeJson(r.value, null);
  return ok({ settings, keys: SETTING_KEYS });
}

// PUT /api/admin/settings — replace all settings (body: { [key]: value })
export async function PUT(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  let body: any;
  try { body = await req.json(); } catch { return ok({ ok: false }); }
  const updates: Record<string, any> = {};
  for (const k of SETTING_KEYS) {
    if (body[k] !== undefined) updates[k] = body[k];
  }
  for (const [k, v] of Object.entries(updates)) {
    await db.platformSetting.upsert({
      where: { key: k },
      update: { value: JSON.stringify(v) },
      create: { key: k, value: JSON.stringify(v) },
    });
  }
  await writeAudit(admin.id, "settings_update", null, { keys: Object.keys(updates) });
  return ok({ updated: Object.keys(updates) });
}
