import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { nowJst } from "@/lib/date";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const now = nowJst().toDate();

  const announcement = await prisma.announcement.findFirst({
    where: {
      id,
      publishFrom: { lte: now },
      OR: [
        { publishTo: null },
        { publishTo: { gte: now } },
      ],
    },
    include: {
      createdBy: { select: { name: true } },
    },
  });

  if (!announcement) {
    return NextResponse.json(
      { error: "お知らせが見つかりません。" },
      { status: 404 }
    );
  }

  // ロールチェック
  if (
    announcement.targetRole !== "all" &&
    announcement.targetRole !== user.role
  ) {
    return NextResponse.json(
      { error: "このお知らせを閲覧する権限がありません。" },
      { status: 403 }
    );
  }

  return NextResponse.json(announcement);
}
