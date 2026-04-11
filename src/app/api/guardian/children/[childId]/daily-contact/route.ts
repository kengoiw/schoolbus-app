import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { dateToJstStart, isAfterDeadline } from "@/lib/date";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";

// 保護者が自分の児童かチェック
async function verifyChildOwnership(
  guardianUserId: string,
  childId: string
): Promise<boolean> {
  const link = await prisma.guardianChild.findUnique({
    where: {
      guardianUserId_childId: { guardianUserId, childId },
    },
  });
  return !!link;
}

// GET /api/guardian/children/:childId/daily-contact?date=YYYY-MM-DD
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { user, error } = await requireAuth(["guardian"]);
  if (error) return error;

  const { childId } = await params;

  // 保護者チェック
  const isOwner = await verifyChildOwnership(user.id, childId);
  if (!isOwner) {
    return NextResponse.json(
      { error: "この児童の情報にアクセスする権限がありません。" },
      { status: 403 }
    );
  }

  const dateStr = req.nextUrl.searchParams.get("date");
  if (!dateStr) {
    return NextResponse.json(
      { error: "date パラメータが必要です（YYYY-MM-DD形式）。" },
      { status: 400 }
    );
  }

  const operationDate = dateToJstStart(dateStr).toDate();

  // 児童の学校を取得
  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { schoolId: true, defaultMorningUse: true, defaultEveningUse: true },
  });
  if (!child) {
    return NextResponse.json({ error: "児童が見つかりません。" }, { status: 404 });
  }

  // 運行日取得
  const operationDay = await prisma.operationDay.findUnique({
    where: {
      schoolId_operationDate: {
        schoolId: child.schoolId,
        operationDate: operationDate,
      },
    },
  });

  // 日次連絡取得
  const contact = operationDay
    ? await prisma.dailyContact.findUnique({
        where: {
          childId_operationDayId: {
            childId,
            operationDayId: operationDay.id,
          },
        },
      })
    : null;

  return NextResponse.json({
    operationDay,
    contact,
    meta: {
      morningDeadlinePassed: isAfterDeadline(operationDay?.morningDeadlineAt ?? null),
      eveningDeadlinePassed: isAfterDeadline(operationDay?.eveningDeadlineAt ?? null),
    },
  });
}

// バリデーションスキーマ
const dailyContactSchema = z.object({
  childId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  attendanceStatus: z.enum(["attend", "absent"]),
  morningUseType: z.enum(["default", "use", "not_use"]),
  eveningUseType: z.enum(["default", "use", "not_use"]),
  note: z.string().max(500).optional(),
  version: z.number().int().optional(),
});

// PUT /api/guardian/children/:childId/daily-contact
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  const { user, error } = await requireAuth(["guardian"]);
  if (error) return error;

  const { childId } = await params;

  // 保護者チェック
  const isOwner = await verifyChildOwnership(user.id, childId);
  if (!isOwner) {
    return NextResponse.json(
      { error: "この児童の情報を更新する権限がありません。" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const parsed = dailyContactSchema.safeParse({ ...body, childId });
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
        {
          error:
            "欠席の場合、朝便・帰り便はどちらも「利用しない」に設定してください。",
        },
        { status: 400 }
      );
    }
  }

  const operationDate = dateToJstStart(data.date).toDate();

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { schoolId: true },
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
      { error: "この日の運行日が設定されていません。学校にご連絡ください。" },
      { status: 404 }
    );
  }

  if (operationDay.status === "holiday" || operationDay.status === "canceled") {
    return NextResponse.json(
      { error: "この日は休校・運休日のため連絡は不要です。" },
      { status: 400 }
    );
  }

  // 締切チェック（両方の締切が過ぎていたら更新不可）
  const morningPassed = isAfterDeadline(operationDay.morningDeadlineAt ?? null);
  const eveningPassed = isAfterDeadline(operationDay.eveningDeadlineAt ?? null);
  const fullyPassed = morningPassed && eveningPassed;

  if (fullyPassed) {
    return NextResponse.json(
      {
        error:
          "連絡締切時刻を過ぎています。変更が必要な場合はお電話でご連絡ください。",
      },
      { status: 422 }
    );
  }

  // 既存レコード確認（楽観ロック）
  const existing = await prisma.dailyContact.findUnique({
    where: {
      childId_operationDayId: {
        childId,
        operationDayId: operationDay.id,
      },
    },
  });

  if (existing && data.version && existing.version !== data.version) {
    return NextResponse.json(
      { error: "他の端末で更新されています。画面を再読み込みしてください。" },
      { status: 409 }
    );
  }

  const afterDeadlineFlag = morningPassed || eveningPassed;

  if (existing) {
    // UPDATE
    const beforeJson = { ...existing };
    const updated = await prisma.dailyContact.update({
      where: { id: existing.id },
      data: {
        attendanceStatus: data.attendanceStatus,
        morningUseType: data.morningUseType,
        eveningUseType: data.eveningUseType,
        note: data.note,
        source: "app",
        submittedByUserId: user.id,
        submittedAt: new Date(),
        afterDeadlineFlag,
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
    // CREATE
    const created = await prisma.dailyContact.create({
      data: {
        childId,
        operationDayId: operationDay.id,
        attendanceStatus: data.attendanceStatus,
        morningUseType: data.morningUseType,
        eveningUseType: data.eveningUseType,
        note: data.note,
        source: "app",
        submittedByUserId: user.id,
        submittedAt: new Date(),
        afterDeadlineFlag,
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
