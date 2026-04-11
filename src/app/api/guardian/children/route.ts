import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, error } = await requireAuth(["guardian"]);
  if (error) return error;

  const guardianChildren = await prisma.guardianChild.findMany({
    where: { guardianUserId: user.id },
    include: {
      child: {
        include: {
          school: { select: { id: true, name: true } },
          defaultMorningRoute: { select: { id: true, name: true } },
          defaultMorningStop: { select: { id: true, name: true } },
          defaultEveningRoute: { select: { id: true, name: true } },
          defaultEveningStop: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { child: { kana: "asc" } },
  });

  const children = guardianChildren.map((gc) => ({
    ...gc.child,
    relationship: gc.relationship,
  }));

  return NextResponse.json(children);
}
