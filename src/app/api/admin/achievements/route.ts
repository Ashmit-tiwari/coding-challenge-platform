import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, writeAudit } from "@/lib/admin";
import { ok, fail, unauthorized, forbidden } from "@/lib/api";

// GET /api/admin/achievements
// Returns overview stats, all badges (Achievement), all certificate templates (CertificateTemplate), and issued certificates list
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");

  // 1. Fetch Badges
  const badges = await db.achievement.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: { unlocks: true },
      },
    },
  });

  // 2. Fetch Certificate Templates
  const certificateTemplates = await db.certificateTemplate.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { issuedCerts: true },
      },
    },
  });

  // 3. Fetch Issued Certificates (Audit Log)
  const issuedCertificates = await db.issuedCertificate.findMany({
    orderBy: { issueDate: "desc" },
    take: 100,
    include: {
      user: {
        select: { id: true, name: true, uid: true, year: true },
      },
      template: {
        select: { id: true, name: true, category: true },
      },
    },
  });

  // 4. Fetch Recent Unlocks
  const recentUnlocks = await db.userAchievement.findMany({
    orderBy: { unlockedAt: "desc" },
    take: 20,
    include: {
      user: {
        select: { id: true, name: true, uid: true, year: true },
      },
      achievement: {
        select: { id: true, name: true, icon: true, rarity: true, category: true },
      },
    },
  });

  // 5. Compute Overview Stats
  const totalBadges = badges.length;
  const totalCertificateTemplates = certificateTemplates.length;
  const activeBadges = badges.filter((b) => b.isActive).length;
  const activeTemplates = certificateTemplates.filter((t) => t.isActive).length;
  const totalIssuedCerts = await db.issuedCertificate.count();

  // Find most unlocked badge
  let mostUnlockedBadge: any = null;
  if (badges.length > 0) {
    const sorted = [...badges].sort((a, b) => b._count.unlocks - a._count.unlocks);
    if (sorted[0]._count.unlocks > 0) {
      mostUnlockedBadge = {
        name: sorted[0].name,
        icon: sorted[0].icon,
        unlockCount: sorted[0]._count.unlocks,
      };
    }
  }

  // Participants list for manual award dropdown
  const participants = await db.user.findMany({
    where: { isAdmin: false },
    select: { id: true, name: true, uid: true, year: true, xp: true },
    orderBy: { name: "asc" },
  });

  return ok({
    stats: {
      totalBadges,
      totalCertificateTemplates,
      activeAchievements: activeBadges + activeTemplates,
      totalIssuedCerts,
      mostUnlockedBadge,
    },
    badges: badges.map((b) => ({
      ...b,
      unlockCount: b._count.unlocks,
    })),
    certificateTemplates: certificateTemplates.map((t) => ({
      ...t,
      issuedCount: t._count.issuedCerts,
    })),
    issuedCertificates,
    recentUnlocks,
    participants,
  });
}

// POST /api/admin/achievements
// Body: { itemType: "badge" | "certificate", ...fields }
// Creates a new badge (Achievement) or certificate template (CertificateTemplate)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const { itemType } = body;

  if (itemType === "badge") {
    const { name, key, description, category, rarity, icon, requirementType, requirementValue, specificChallengeId, xpReward, isActive } = body;
    if (!name || !description) return fail("Badge name and description are required");

    const badgeKey = (key || name).toLowerCase().replace(/[^a-z0-9-]/g, "-");

    const existing = await db.achievement.findUnique({ where: { key: badgeKey } });
    if (existing) return fail("A badge with this key/name already exists");

    const badge = await db.achievement.create({
      data: {
        key: badgeKey,
        name,
        description,
        category: category || "XP Milestone",
        type: "badge",
        rarity: rarity || "common",
        icon: icon || "Award",
        requirementType: requirementType || "xp_threshold",
        requirementValue: Number(requirementValue) || 0,
        specificChallengeId: specificChallengeId || null,
        xpReward: Number(xpReward) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    await writeAudit(admin.id, "badge_created", badge.id, { name, key: badgeKey, requirementType, requirementValue });
    return ok({ badge });
  }

  if (itemType === "certificate") {
    const { name, description, category, requirementType, requirementValue, isAutomatic, isActive, issuerName, badgeColor } = body;
    if (!name || !description) return fail("Certificate name and description are required");

    const certTemplate = await db.certificateTemplate.create({
      data: {
        name,
        description,
        category: category || "Milestone",
        requirementType: requirementType || "xp_threshold",
        requirementValue: Number(requirementValue) || 0,
        isAutomatic: isAutomatic !== undefined ? Boolean(isAutomatic) : true,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        issuerName: issuerName || "A-I-M-L Club",
        badgeColor: badgeColor || "#eab308",
      },
    });

    await writeAudit(admin.id, "certificate_template_created", certTemplate.id, { name, requirementType, requirementValue });
    return ok({ certificateTemplate: certTemplate });
  }

  return fail("Invalid itemType. Must be 'badge' or 'certificate'");
}

// PATCH /api/admin/achievements
// Body: { itemType: "badge" | "certificate", id: string, ...fields }
// Updates an existing badge or certificate template
export async function PATCH(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail("Invalid JSON body");
  }

  const { itemType, id } = body;
  if (!id) return fail("id is required");

  if (itemType === "badge") {
    const { name, description, category, rarity, icon, requirementType, requirementValue, specificChallengeId, xpReward, isActive } = body;

    const data: any = { updatedAt: new Date() };
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (rarity !== undefined) data.rarity = rarity;
    if (icon !== undefined) data.icon = icon;
    if (requirementType !== undefined) data.requirementType = requirementType;
    if (requirementValue !== undefined) data.requirementValue = Number(requirementValue);
    if (specificChallengeId !== undefined) data.specificChallengeId = specificChallengeId || null;
    if (xpReward !== undefined) data.xpReward = Number(xpReward);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updated = await db.achievement.update({
      where: { id },
      data,
    });

    await writeAudit(admin.id, "badge_updated", id, { name: updated.name });
    return ok({ badge: updated });
  }

  if (itemType === "certificate") {
    const { name, description, category, requirementType, requirementValue, isAutomatic, isActive, issuerName, badgeColor } = body;

    const data: any = { updatedAt: new Date() };
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (requirementType !== undefined) data.requirementType = requirementType;
    if (requirementValue !== undefined) data.requirementValue = Number(requirementValue);
    if (isAutomatic !== undefined) data.isAutomatic = Boolean(isAutomatic);
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (issuerName !== undefined) data.issuerName = issuerName;
    if (badgeColor !== undefined) data.badgeColor = badgeColor;

    const updated = await db.certificateTemplate.update({
      where: { id },
      data,
    });

    await writeAudit(admin.id, "certificate_template_updated", id, { name: updated.name });
    return ok({ certificateTemplate: updated });
  }

  return fail("Invalid itemType. Must be 'badge' or 'certificate'");
}

// DELETE /api/admin/achievements?itemType=badge|certificate&id=...
export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return unauthorized("Admin only");

  const url = new URL(req.url);
  const itemType = url.searchParams.get("itemType");
  const id = url.searchParams.get("id");
  if (!id || !itemType) return fail("itemType and id are required");

  if (itemType === "badge") {
    await db.achievement.delete({ where: { id } });
    await writeAudit(admin.id, "badge_deleted", id);
    return ok({ success: true, message: "Badge deleted" });
  }

  if (itemType === "certificate") {
    await db.certificateTemplate.delete({ where: { id } });
    await writeAudit(admin.id, "certificate_template_deleted", id);
    return ok({ success: true, message: "Certificate template deleted" });
  }

  return fail("Invalid itemType. Must be 'badge' or 'certificate'");
}
