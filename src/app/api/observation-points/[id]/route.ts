import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// GET /api/observation-points/:id
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const point = await prisma.observationPoint.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      memo: true,
      isActive: true,
      createdAt: true,
      createdByUserId: true,
      createdBy: { select: { id: true, name: true } },
      observations: {
        orderBy: { takenAt: "desc" },
        select: {
          id: true,
          note: true,
          greenRatio: true,
          yellowBrownRatio: true,
          otherRatio: true,
          avgBrightness: true,
          takenAt: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!point || !point.isActive) {
    return NextResponse.json({ error: "観測地点が見つかりません。" }, { status: 404 });
  }

  return NextResponse.json(point);
}

// DELETE /api/observation-points/:id
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const existing = await prisma.observationPoint.findUnique({ where: { id } });
  if (!existing || !existing.isActive) {
    return NextResponse.json({ error: "観測地点が見つかりません。" }, { status: 404 });
  }

  if (existing.createdByUserId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "この操作を行う権限がありません。" }, { status: 403 });
  }

  await prisma.observationPoint.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ message: "観測地点を削除しました。" });
}
