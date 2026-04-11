import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

// ドライバーが自分の担当便かチェック
async function verifyDriverTrip(tripId: string, driverUserId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      route: { select: { id: true, name: true } },
      operationDay: { include: { school: { select: { name: true } } } },
      passengers: {
        include: {
          child: {
            select: {
              id: true,
              name: true,
              kana: true,
              grade: true,
              className: true,
            },
          },
          stop: { select: { id: true, name: true } },
        },
        orderBy: { child: { kana: "asc" } },
      },
    },
  });

  if (!trip) return { trip: null, error: "便が見つかりません。" };
  if (trip.driverUserId !== driverUserId) {
    return { trip: null, error: "この便の担当ドライバーではありません。" };
  }
  return { trip, error: null };
}

// GET /api/driver/trips/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(["driver"]);
  if (error) return error;

  const { id } = await params;
  const { trip, error: tripError } = await verifyDriverTrip(id, user.id);
  if (tripError) {
    return NextResponse.json({ error: tripError }, { status: tripError === "便が見つかりません。" ? 404 : 403 });
  }

  return NextResponse.json(trip);
}

// POST /api/driver/trips/:id/start
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(["driver"]);
  if (error) return error;

  const { id } = await params;

  // URLパスから action を取得
  const url = req.nextUrl.pathname;
  const action = url.split("/").pop();

  const trip = await prisma.trip.findUnique({ where: { id } });
  if (!trip) {
    return NextResponse.json({ error: "便が見つかりません。" }, { status: 404 });
  }
  if (trip.driverUserId !== user.id) {
    return NextResponse.json({ error: "この便の担当ドライバーではありません。" }, { status: 403 });
  }

  if (action === "start") {
    if (trip.status !== "confirmed" && trip.status !== "planned") {
      return NextResponse.json(
        { error: "出発できない状態の便です。" },
        { status: 400 }
      );
    }
    const beforeJson = { ...trip };
    const updated = await prisma.trip.update({
      where: { id },
      data: { status: "in_service", startedAt: new Date() },
    });
    await createAuditLog({
      entityType: "trips",
      entityId: id,
      action: "UPDATE",
      beforeJson,
      afterJson: updated,
      actedByUserId: user.id,
    });
    return NextResponse.json(updated);
  }

  if (action === "complete") {
    if (trip.status !== "in_service") {
      return NextResponse.json(
        { error: "運行中の便ではありません。" },
        { status: 400 }
      );
    }
    const beforeJson = { ...trip };
    const updated = await prisma.trip.update({
      where: { id },
      data: { status: "completed", completedAt: new Date() },
    });
    await createAuditLog({
      entityType: "trips",
      entityId: id,
      action: "UPDATE",
      beforeJson,
      afterJson: updated,
      actedByUserId: user.id,
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "不正な操作です。" }, { status: 400 });
}
