import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { nowJst } from "@/lib/date";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const now = nowJst().toDate();

  // ロール + 学校 + 路線でフィルタリング
  const announcements = await prisma.announcement.findMany({
    where: {
      AND: [
        { publishFrom: { lte: now } },
        {
          OR: [
            { publishTo: null },
            { publishTo: { gte: now } },
          ],
        },
        {
          OR: [
            { targetRole: "all" },
            { targetRole: user.role as "guardian" | "driver" | "all" },
          ],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      targetRole: true,
      publishFrom: true,
      publishTo: true,
      createdAt: true,
    },
  });

  return NextResponse.json(announcements);
}
