import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// POST /api/driver/trips/:id/start
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(["driver"]);
  if (error) return error;

  const { id: tripId } = await params;
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });

  if (!trip) return NextResponse.json({ error: "便が見つかりません。" }, { status: 404 });
  if (trip.driverUserId !== user.id) return NextResponse.json({ error: "担当ドライバーではありません。" }, { status: 403 });
  if (trip.status !== "confirmed" && trip.status !== "planned") {
    return NextResponse.json({ error: "出発できない状態の便です。" }, { status: 400 });
  }

  const before = { ...trip };
  const updated = await prisma.trip.update({
    where: { id: tripId },
    data: { status: "in_service", startedAt: new Date() },
  });
  await createAuditLog({ entityType: "trip", entityId: tripId, action: "UPDATE", beforeJson: before, afterJson: updated, actedByUserId: user.id });
  return NextResponse.json(updated);
}
