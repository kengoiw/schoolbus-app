import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const boardingSchema = z.object({
  boardingStatus: z.enum(["boarded", "no_show", "excused"]),
});

// POST /api/driver/trips/:id/passengers/:childId/board
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; childId: string }> }
) {
  const { user, error } = await requireAuth(["driver"]);
  if (error) return error;

  const { id: tripId, childId } = await params;

  // 便チェック
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) {
    return NextResponse.json({ error: "便が見つかりません。" }, { status: 404 });
  }
  if (trip.driverUserId !== user.id) {
    return NextResponse.json({ error: "この便の担当ドライバーではありません。" }, { status: 403 });
  }
  if (trip.status !== "in_service") {
    return NextResponse.json({ error: "運行中の便ではありません。" }, { status: 400 });
  }

  // 乗客レコード確認
  const passenger = await prisma.tripPassenger.findUnique({
    where: { tripId_childId: { tripId, childId } },
  });
  if (!passenger) {
    return NextResponse.json(
      { error: "この児童はこの便の乗車予定に含まれていません。" },
      { status: 404 }
    );
  }

  // URLパスから action を取得
  const url = req.nextUrl.pathname;
  const action = url.split("/").pop(); // "board" or "no-show"

  let newStatus: "boarded" | "no_show" | "excused";
  if (action === "board") {
    newStatus = "boarded";
  } else if (action === "no-show") {
    newStatus = "no_show";
  } else {
    const body = await req.json();
    const parsed = boardingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "boarding_status が不正です。" },
        { status: 400 }
      );
    }
    newStatus = parsed.data.boardingStatus;
  }

  const beforeJson = { ...passenger };
  const updated = await prisma.tripPassenger.update({
    where: { id: passenger.id },
    data: {
      boardingStatus: newStatus,
      checkedAt: new Date(),
      checkedByUserId: user.id,
    },
  });

  await createAuditLog({
    entityType: "trip_passengers",
    entityId: passenger.id,
    action: "UPDATE",
    beforeJson,
    afterJson: updated,
    actedByUserId: user.id,
  });

  return NextResponse.json(updated);
}
