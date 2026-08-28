import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { ok, fail, unauthorized } from "@/lib/api";
import { generateVerificationId } from "@/lib/achievements";

// POST /api/admin/achievements/award
// Body: { userId: string, type: "badge" | "certificate", targetId: string, reason?: string }
// Manually awards a badge or certificate to a student
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const { userId, type, targetId, reason } = body || {};
  if (!userId || !type || !targetId) {
    return fail("userId, type ('badge' | 'certificate'), and targetId are required");
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return fail("User not found", 404);

  if (type === "badge") {
    const badge = await db.achievement.findUnique({ where: { id: targetId } });
    if (!badge) return fail("Badge not found", 404);

    const unlock = await db.userAchievement.upsert({
      where: { userId_achievementId: { userId: user.id, achievementId: badge.id } },
      update: {
        awardType: "manual",
        awardedById: admin.id,
        reason: reason || "Manually awarded by administrator",
      },
      create: {
        userId: user.id,
        achievementId: badge.id,
        awardType: "manual",
        awardedById: admin.id,
        reason: reason || "Manually awarded by administrator",
      },
    });

    if (badge.xpReward > 0) {
      await db.user.update({
        where: { id: user.id },
        data: { xp: user.xp + badge.xpReward },
      });
      await db.xpTransaction.create({
        data: {
          userId: user.id,
          amount: badge.xpReward,
          reason: "milestone",
          refId: "manual_award",
        },
      });
    }

    await db.notification.create({
      data: {
        userId: user.id,
        type: "achievement",
        title: `🏆 Special Badge Awarded: ${badge.name}!`,
        message: reason || `Congratulations, ${user.name}! An administrator has awarded you the "${badge.name}" badge.`,
        link: "/achievements",
      },
    });

    await writeAudit(admin.id, "badge_manually_awarded", unlock.id, {
      userId: user.id,
      studentName: user.name,
      badgeName: badge.name,
      reason,
    });

    return ok({ success: true, unlock, badge });
  }

  if (type === "certificate") {
    const template = await db.certificateTemplate.findUnique({ where: { id: targetId } });
    if (!template) return fail("Certificate template not found", 404);

    let verificationId = generateVerificationId();
    const existing = await db.issuedCertificate.findUnique({ where: { verificationId } });
    if (existing) verificationId = generateVerificationId();

    const cert = await db.issuedCertificate.upsert({
      where: { userId_templateId: { userId: user.id, templateId: template.id } },
      update: {
        status: "VALID",
        issuedById: admin.id,
        adminNote: reason || "Manually awarded by administrator",
        updatedAt: new Date(),
      },
      create: {
        verificationId,
        templateId: template.id,
        userId: user.id,
        title: template.name,
        description: template.description,
        recipientName: user.name,
        recipientUid: user.uid,
        recipientYear: user.year || "1",
        issuedById: admin.id,
        status: "VALID",
        adminNote: reason || "Manually awarded by administrator",
      },
    });

    await db.notification.create({
      data: {
        userId: user.id,
        type: "certificate",
        title: `🎓 Special Certificate Awarded: ${template.name}!`,
        message: reason || `Congratulations, ${user.name}! An administrator has issued you the "${template.name}" Certificate.`,
        link: "/achievements",
      },
    });

    await writeAudit(admin.id, "certificate_manually_awarded", cert.id, {
      userId: user.id,
      studentName: user.name,
      certificateName: template.name,
      verificationId: cert.verificationId,
      reason,
    });

    return ok({ success: true, certificate: cert });
  }

  return fail("Invalid type. Must be 'badge' or 'certificate'");
}
