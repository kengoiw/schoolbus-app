import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

// GET /api/admin/trips/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id },
    include: {
      route: {
        include: {
          routeStops: {
            include: { stop: true },
            orderBy: { stopOrder: "asc" },
          },
        },
      },
      operationDay: { include: { school: true } },
      driver: { select: { id: true, name: true, phone: true } },
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

  if (!trip) {
    return NextResponse.json({ error: "便が見つかりません。" }, { status: 404 });
  }

  return NextResponse.json(trip);
}

const updateTripSchema = z.object({
  driverUserId: z.string().uuid().nullable().optional(),
  status: z.enum(["planned", "confirmed", "in_service", "completed", "canceled"]).optional(),
  adminNote: z.string().max(500).optional(),
});

// PUT /api/admin/trips/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(["admin"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json();
  const parsed = updateTripSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります。", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.trip.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "便が見つかりません。" }, { status: 404 });
  }

  const beforeJson = { ...existing };
  const updated = await prisma.trip.update({
    where: { id },
    data: {
      ...(parsed.data.driverUserId !== undefined && { driverUserId: parsed.data.driverUserId }),
      ...(parsed.data.status && { status: parsed.data.status }),
      ...(parsed.data.adminNote !== undefined && { adminNote: parsed.data.adminNote }),
    },
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

// POST /api/admin/trips/:id/cancel
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(["admin"]);
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.trip.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "便が見つかりません。" }, { status: 404 });
  }

  if (existing.status === "in_service" || existing.status === "completed") {
    return NextResponse.json(
      { error: "運行中または完了した便はキャンセルできません。" },
      { status: 400 }
    );
  }

  const beforeJson = { ...existing };
  const updated = await prisma.trip.update({
    where: { id },
    data: { status: "canceled" },
  });

  await createAuditLog({
    entityType: "trips",
    entityId: id,
    action: "UPDATE",
    beforeJson,
    afterJson: updated,
    actedByUserId: user.id,
  });

  return NextResponse.json({ message: "便をキャンセルしました。" });
}
