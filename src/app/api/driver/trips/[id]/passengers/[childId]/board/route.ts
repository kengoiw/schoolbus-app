import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// POST /api/driver/trips/:id/passengers/:childId/board
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; childId: string }> }
) {
  const { user, error } = await requireAuth(["driver"]);
  if (error) return error;

  const { id: tripId, childId } = await params;

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return NextResponse.json({ error: "便が見つかりません。" }, { status: 404 });
  if (trip.driverUserId !== user.id) return NextResponse.json({ error: "担当ドライバーではありません。" }, { status: 403 });
  if (trip.status !== "in_service") return NextResponse.json({ error: "運行中の便ではありません。" }, { status: 400 });

  const passenger = await prisma.tripPassenger.findUnique({
    where: { tripId_childId: { tripId, childId } },
  });
  if (!passenger) return NextResponse.json({ error: "乗車予定に含まれていません。" }, { status: 404 });

  const before = { ...passenger };
  const updated = await prisma.tripPassenger.update({
    where: { id: passenger.id },
    data: { boardingStatus: "boarded", checkedAt: new Date(), checkedByUserId: user.id },
  });
  await createAuditLog({ entityType: "trip_passenger", entityId: passenger.id, action: "UPDATE", beforeJson: before, afterJson: updated, actedByUserId: user.id });
  return NextResponse.json(updated);
}
