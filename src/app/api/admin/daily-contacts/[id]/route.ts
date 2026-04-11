import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const updateSchema = z.object({
  attendanceStatus: z.enum(["attend", "absent"]).optional(),
  morningUseType: z.enum(["default", "use", "not_use"]).optional(),
  eveningUseType: z.enum(["default", "use", "not_use"]).optional(),
  note: z.string().max(500).optional(),
  version: z.number().int(),
});

// PUT /api/admin/daily-contacts/:id
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth(["admin"]);
  if (error) return error;

  const { id } = await params;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります。", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.dailyContact.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "連絡レコードが見つかりません。" }, { status: 404 });
  }

  // 楽観ロック
  if (existing.version !== parsed.data.version) {
    return NextResponse.json(
      { error: "他の端末で更新されています。画面を再読み込みしてください。" },
      { status: 409 }
    );
  }

  const beforeJson = { ...existing };
  const updated = await prisma.dailyContact.update({
    where: { id },
    data: {
      ...(parsed.data.attendanceStatus && { attendanceStatus: parsed.data.attendanceStatus }),
      ...(parsed.data.morningUseType && { morningUseType: parsed.data.morningUseType }),
      ...(parsed.data.eveningUseType && { eveningUseType: parsed.data.eveningUseType }),
      ...(parsed.data.note !== undefined && { note: parsed.data.note }),
      source: "admin",
      submittedByUserId: user.id,
      submittedAt: new Date(),
      version: { increment: 1 },
    },
  });

  await createAuditLog({
    entityType: "daily_contacts",
    entityId: id,
    action: "UPDATE",
    beforeJson,
    afterJson: updated,
    actedByUserId: user.id,
  });

  return NextResponse.json(updated);
}
