import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getStudentSession } from "@/lib/session";
import { ok, fail, unauthorized, notFound } from "@/lib/api";
import { evaluateCertificates } from "@/lib/achievements";

// GET /api/certificates?uid=... — list of certificates for a user
export async function GET(req: NextRequest) {
  const session = await getStudentSession();
  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  const targetUid = uid || session?.uid;
  if (!targetUid) return unauthorized("Not logged in");
  const user = await db.user.findUnique({ where: { uid: targetUid } });
  if (!user) return notFound("User not found");
  const certs = await db.certificate.findMany({ where: { userId: user.id }, orderBy: { issuedAt: "desc" } });
  return ok({ certificates: certs });
}

// POST /api/certificates — try to issue a certificate for a tier (backend validates eligibility)
// Body: { level: "Beginner" | "Intermediate" | "Advanced" | "Pro" }
export async function POST(req: NextRequest) {
  const session = await getStudentSession();
  if (!session) return unauthorized("Not logged in");
  let body: { level?: string };
  try { body = await req.json(); } catch { return fail("Invalid JSON"); }
  const level = body.level;
  if (!["Beginner", "Intermediate", "Advanced", "Pro"].includes(level || "")) {
    return fail("Invalid level");
  }
  // evaluateCertificates enforces eligibility — no manual unlocking possible.
  const issued = await evaluateCertificates(session.userId);
  const found = issued?.find((c) => c.level === level);
  if (!found) {
    // maybe already has it
    const existing = await db.certificate.findUnique({
      where: { userId_level: { userId: session.userId, level: level! } },
    });
    if (!existing) {
      return fail(`You have not completed the requirements for the ${level} certificate yet.`, 422);
    }
    return ok({ certificate: existing, newlyIssued: false });
  }
  return ok({ certificate: found, newlyIssued: true });
}
