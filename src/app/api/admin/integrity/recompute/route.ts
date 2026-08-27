import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { ok, unauthorized } from "@/lib/api";
import { compareCode, fingerprint, SIMILARITY_THRESHOLD } from "@/lib/similarity";

// POST /api/admin/integrity/recompute — re-run similarity across all submissions for a challenge
// Body: { challengeId }
// Iterates all submissions for the challenge and flags pairs above threshold.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");
  let body: { challengeId?: string };
  try { body = await req.json(); } catch { return ok({ ok: false }); }
  if (!body.challengeId) return ok({ error: "challengeId required" }, 400);
  const subs = await db.submission.findMany({
    where: { challengeId: body.challengeId },
    select: { id: true, userId: true, code: true, fingerprint: true, createdAt: true },
  });
  // store fresh fingerprints
  for (const s of subs) {
    const fp = fingerprint(s.code);
    if (fp !== s.fingerprint) {
      await db.submission.update({ where: { id: s.id }, data: { fingerprint: fp } });
    }
  }
  let created = 0;
  for (let i = 0; i < subs.length; i++) {
    for (let j = i + 1; j < subs.length; j++) {
      const a = subs[i];
      const b = subs[j];
      if (a.userId === b.userId) continue;
      const cmp = compareCode(a.code, b.code);
      if (cmp.score >= SIMILARITY_THRESHOLD) {
        const existing = await db.plagiarismFlag.findFirst({
          where: {
            OR: [
              { submissionAId: a.id, submissionBId: b.id },
              { submissionAId: b.id, submissionBId: a.id },
            ],
          },
        });
        if (!existing) {
          await db.plagiarismFlag.create({
            data: {
              submissionAId: a.id,
              submissionBId: b.id,
              similarity: cmp.score,
              method: cmp.method,
              reason: cmp.reason,
            },
          });
          created++;
        }
      }
    }
  }
  await writeAudit(admin.id, "integrity_recompute", body.challengeId, { submissionsScanned: subs.length, flagsCreated: created });
  return ok({ submissionsScanned: subs.length, flagsCreated: created });
}
