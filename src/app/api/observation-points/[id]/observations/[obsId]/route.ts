import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// DELETE /api/observation-points/:id/observations/:obsId
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; obsId: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id, obsId } = await params;
  const observation = await prisma.cropObservation.findUnique({
    where: { id: obsId },
    select: { observationPointId: true, userId: true },
  });

  if (!observation || observation.observationPointId !== id) {
    return NextResponse.json({ error: "観測記録が見つかりません。" }, { status: 404 });
  }

  if (observation.userId !== user.id && user.role !== "admin") {
    return NextResponse.json({ error: "この操作を行う権限がありません。" }, { status: 403 });
  }

  await prisma.cropObservation.delete({ where: { id: obsId } });

  return NextResponse.json({ message: "観測記録を削除しました。" });
}
