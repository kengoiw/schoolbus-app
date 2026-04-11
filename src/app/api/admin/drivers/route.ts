import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// GET /api/admin/drivers - ドライバー一覧（便割当用）
export async function GET() {
  const authResult = await requireAuth(["admin"]);
  if (authResult instanceof NextResponse) return authResult;

  const drivers = await prisma.user.findMany({
    where: { role: "driver", status: "active" },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(drivers);
}
