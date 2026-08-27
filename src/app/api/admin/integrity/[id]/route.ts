import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { ok, unauthorized, notFound } from "@/lib/api";

// PATCH /api/admin/integrity/[id] — review a flag
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  const { id } = await ctx.params;
  let body: { status?: "reviewed" | "dismissed" | "confirmed"; adminNote?: string };
  try { body = await req.json(); } catch { return ok({ ok: false }); }
  const flag = await db.plagiarismFlag.findUnique({ where: { id } });
  if (!flag) return notFound("Flag not found");
  const data: any = {};
  if (body.status) {
    data.status = body.status;
    data.reviewedAt = new Date();
    data.reviewerId = admin.id;
  }
  if (body.adminNote !== undefined) data.adminNote = body.adminNote;
  const updated = await db.plagiarismFlag.update({ where: { id }, data });
  await writeAudit(admin.id, "flag_review", id, { status: body.status, note: body.adminNote });
  return ok({ flag: updated });
}

// GET /api/admin/integrity/[id]/compare?other=<submissionId>
// Returns both submissions' code for side-by-side comparison
