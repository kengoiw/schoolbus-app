import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { user, error } = await requireAuth(["guardian"]);
  if (error) return error;

  // 保護者に紐づく児童のIDを取得
  const guardianChildren = await prisma.guardianChild.findMany({
    where: { guardianUserId: user.id },
    select: { childId: true },
  });

  const childIds = guardianChildren.map((gc) => gc.childId);

  const contacts = await prisma.dailyContact.findMany({
    where: { childId: { in: childIds }, isActive: true },
    include: {
      child: { select: { id: true, name: true, grade: true, className: true } },
      operationDay: { select: { operationDate: true, status: true } },
    },
    orderBy: { operationDay: { operationDate: "desc" } },
    take: 30,
  });

  return NextResponse.json(contacts);
}
