import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// GET /api/admin/children - 全児童一覧（電話代理入力時の児童検索用）
export async function GET(request: Request) {
  const authResult = await requireAuth(["admin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const schoolId = searchParams.get("schoolId");

  const children = await prisma.child.findMany({
    where: {
      status: "active",
      ...(name && { name: { contains: name } }),
      ...(schoolId && { schoolId }),
    },
    include: {
      school: { select: { id: true, name: true } },
    },
    orderBy: [{ school: { name: "asc" } }, { grade: "asc" }, { kana: "asc" }],
  });

  return NextResponse.json(children);
}
