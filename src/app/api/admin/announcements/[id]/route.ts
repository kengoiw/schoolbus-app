import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// DELETE /api/admin/announcements/:id
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(["admin"]);
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  try {
    await prisma.announcement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "削除に失敗しました。" }, { status: 500 });
  }
}
