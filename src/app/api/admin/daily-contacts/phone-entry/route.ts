import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { dateToJstStart } from "@/lib/date";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

const phoneEntrySchema = z.object({
  childId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  attendanceStatus: z.enum(["attend", "absent"]),
  morningUseType: z.enum(["default", "use", "not_use"]),
  eveningUseType: z.enum(["default", "use", "not_use"]),
  note: z.string().max(500).optional(),
  forceOverwrite: z.boolean().optional().default(false),
});

// POST /api/admin/daily-contacts/phone-entry
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = await req.json();
  const parsed = phoneEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります。", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;

  // 欠席時の整合性チェック
  if (data.attendanceStatus === "absent") {
    if (data.morningUseType !== "not_use" || data.eveningUseType !== "not_use") {
      return NextResponse.json(
        { error: "欠席の場合、朝便・帰り便はどちらも「利用しない」に設定してください。" },
        { status: 400 }
      );
    }
  }

  const operationDate = dateToJstStart(data.date).toDate();

  const child = await prisma.child.findUnique({
    where: { id: data.childId },
    select: { schoolId: true, name: true, grade: true, className: true, school: { select: { name: true } } },
  });
  if (!child) {
    return NextResponse.json({ error: "児童が見つかりません。" }, { status: 404 });
  }

  const operationDay = await prisma.operationDay.findUnique({
    where: {
      schoolId_operationDate: {
        schoolId: child.schoolId,
        operationDate: operationDate,
      },
    },
  });
  if (!operationDay) {
    return NextResponse.json(
      { error: "この日の運行日が設定されていません。" },
      { status: 404 }
    );
  }

  const existing = await prisma.dailyContact.findUnique({
    where: {
      childId_operationDayId: {
        childId: data.childId,
        operationDayId: operationDay.id,
      },
    },
  });

  // アプリ入力済みの場合は確認メッセージ（forceOverwrite=falseのとき）
  if (existing && existing.source === "app" && !data.forceOverwrite) {
    return NextResponse.json(
      {
        error: "APP_ENTRY_EXISTS",
        message: `${child.name}（${child.grade}年${child.className}組）はすでにアプリから連絡済みです。上書きしてよろしいですか？`,
        existing: {
          attendanceStatus: existing.attendanceStatus,
          morningUseType: existing.morningUseType,
          eveningUseType: existing.eveningUseType,
          submittedAt: existing.submittedAt,
        },
      },
      { status: 409 }
    );
  }

  if (existing) {
    const beforeJson = { ...existing };
    const updated = await prisma.dailyContact.update({
      where: { id: existing.id },
      data: {
        attendanceStatus: data.attendanceStatus,
        morningUseType: data.morningUseType,
        eveningUseType: data.eveningUseType,
        note: data.note,
        source: "phone",
        submittedByUserId: user.id,
        receivedByUserId: user.id,
        submittedAt: new Date(),
        afterDeadlineFlag: true,
        version: { increment: 1 },
      },
    });

    await createAuditLog({
      entityType: "daily_contacts",
      entityId: existing.id,
      action: "UPDATE",
      beforeJson,
      afterJson: updated,
      actedByUserId: user.id,
    });

    return NextResponse.json(updated);
  } else {
    const created = await prisma.dailyContact.create({
      data: {
        childId: data.childId,
        operationDayId: operationDay.id,
        attendanceStatus: data.attendanceStatus,
        morningUseType: data.morningUseType,
        eveningUseType: data.eveningUseType,
        note: data.note,
        source: "phone",
        submittedByUserId: user.id,
        receivedByUserId: user.id,
        submittedAt: new Date(),
        afterDeadlineFlag: true,
      },
    });

    await createAuditLog({
      entityType: "daily_contacts",
      entityId: created.id,
      action: "CREATE",
      beforeJson: null,
      afterJson: created,
      actedByUserId: user.id,
    });

    return NextResponse.json(created, { status: 201 });
  }
}
