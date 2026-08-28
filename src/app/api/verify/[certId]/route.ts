import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail } from "@/lib/api";

// GET /api/verify/[certId]
// Public certificate verification endpoint by unique verificationId
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ certId: string }> }
) {
  const { certId } = await params;
  if (!certId) return fail("Certificate ID is required", 400);

  const cleanId = decodeURIComponent(certId).trim().toUpperCase();

  const cert = await db.issuedCertificate.findUnique({
    where: { verificationId: cleanId },
    include: {
      template: {
        select: { issuerName: true, category: true, badgeColor: true },
      },
    },
  });

  if (!cert) {
    return fail("Certificate not found or verification ID is invalid", 404);
  }

  return ok({
    isValid: cert.status === "VALID",
    status: cert.status,
    certificate: {
      verificationId: cert.verificationId,
      recipientName: cert.recipientName,
      recipientYear: cert.recipientYear,
      title: cert.title,
      description: cert.description,
      issueDate: cert.issueDate.toISOString(),
      issuerName: cert.template?.issuerName || "A-I-M-L Club",
      category: cert.template?.category || "Milestone",
      badgeColor: cert.template?.badgeColor || "#eab308",
    },
  });
}
