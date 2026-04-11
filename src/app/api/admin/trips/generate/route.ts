import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { dateToJstStart } from "@/lib/date";
import { z } from "zod";
import { createAuditLog } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

const generateSchema = z.object({
  schoolId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  regenerate: z.boolean().optional().default(false),
});

// POST /api/admin/trips/generate
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = await req.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります。", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { schoolId, date, regenerate } = parsed.data;
  const operationDate = dateToJstStart(date).toDate();

  // 1. operation_day を取得
  const operationDay = await prisma.operationDay.findUnique({
    where: {
      schoolId_operationDate: { schoolId, operationDate },
    },
  });
  if (!operationDay) {
    return NextResponse.json(
      { error: "指定日の運行日が見つかりません。先に運行日を設定してください。" },
      { status: 404 }
    );
  }

  if (operationDay.status === "holiday" || operationDay.status === "canceled") {
    return NextResponse.json(
      { error: "休校・運休日のため便を生成できません。" },
      { status: 400 }
    );
  }

  // 2. 対象学校の児童を取得（activeのみ）
  const children = await prisma.child.findMany({
    where: { schoolId, status: "active" },
    include: {
      defaultMorningRoute: true,
      defaultMorningStop: true,
      defaultEveningRoute: true,
      defaultEveningStop: true,
    },
  });

  // 3. 日次連絡を取得（この運行日分）
  const contacts = await prisma.dailyContact.findMany({
    where: {
      operationDayId: operationDay.id,
      isActive: true,
      childId: { in: children.map((c) => c.id) },
    },
  });

  const contactMap = new Map(contacts.map((c) => [c.childId, c]));

  // 4. effective_use を計算
  type ChildUse = {
    childId: string;
    morningUse: boolean;
    eveningUse: boolean;
    morningRouteId: string | null;
    morningStopId: string | null;
    eveningRouteId: string | null;
    eveningStopId: string | null;
  };

  const childUses: ChildUse[] = children.map((child) => {
    const contact = contactMap.get(child.id);

    const isAbsent = contact?.attendanceStatus === "absent";
    if (isAbsent) {
      return {
        childId: child.id,
        morningUse: false,
        eveningUse: false,
        morningRouteId: null,
        morningStopId: null,
        eveningRouteId: null,
        eveningStopId: null,
      };
    }

    const morningUseType = contact?.morningUseType ?? "default";
    const eveningUseType = contact?.eveningUseType ?? "default";

    const morningUse =
      morningUseType === "use"
        ? true
        : morningUseType === "not_use"
        ? false
        : child.defaultMorningUse;

    const eveningUse =
      eveningUseType === "use"
        ? true
        : eveningUseType === "not_use"
        ? false
        : child.defaultEveningUse;

    return {
      childId: child.id,
      morningUse,
      eveningUse,
      morningRouteId: child.defaultMorningRouteId,
      morningStopId: child.defaultMorningStopId,
      eveningRouteId: child.defaultEveningRouteId,
      eveningStopId: child.defaultEveningStopId,
    };
  });

  // 5. 路線ごとに分類
  type RoutePassengers = Map<string, { childId: string; stopId: string }[]>;
  const morningByRoute: RoutePassengers = new Map();
  const eveningByRoute: RoutePassengers = new Map();

  for (const cu of childUses) {
    if (cu.morningUse && cu.morningRouteId && cu.morningStopId) {
      if (!morningByRoute.has(cu.morningRouteId)) {
        morningByRoute.set(cu.morningRouteId, []);
      }
      morningByRoute.get(cu.morningRouteId)!.push({
        childId: cu.childId,
        stopId: cu.morningStopId,
      });
    }
    if (cu.eveningUse && cu.eveningRouteId && cu.eveningStopId) {
      if (!eveningByRoute.has(cu.eveningRouteId)) {
        eveningByRoute.set(cu.eveningRouteId, []);
      }
      eveningByRoute.get(cu.eveningRouteId)!.push({
        childId: cu.childId,
        stopId: cu.eveningStopId,
      });
    }
  }

  // 6. 既存の便チェック（regenerate=trueなら planned/confirmed を削除）
  const existingTrips = await prisma.trip.findMany({
    where: { operationDayId: operationDay.id },
  });

  if (existingTrips.length > 0 && !regenerate) {
    return NextResponse.json(
      {
        error: "TRIPS_EXIST",
        message: "この日の便がすでに生成されています。再生成する場合は regenerate: true を指定してください。",
        tripCount: existingTrips.length,
      },
      { status: 409 }
    );
  }

  const inProgressTrips = existingTrips.filter(
    (t) => t.status === "in_service" || t.status === "completed"
  );

  if (regenerate && inProgressTrips.length > 0) {
    return NextResponse.json(
      {
        error: "運行中または完了した便があるため再生成できません。",
        inProgressCount: inProgressTrips.length,
      },
      { status: 400 }
    );
  }

  // 再生成時は計画中・確認済みの便を削除
  if (regenerate) {
    const deletableTrips = existingTrips.filter(
      (t) => t.status === "planned" || t.status === "confirmed"
    );
    if (deletableTrips.length > 0) {
      const deletableIds = deletableTrips.map((t) => t.id);
      await prisma.tripPassenger.deleteMany({
        where: { tripId: { in: deletableIds } },
      });
      await prisma.trip.deleteMany({
        where: { id: { in: deletableIds } },
      });
    }
  }

  // 7. 便を作成
  const createdTrips: Prisma.TripGetPayload<{
    include: { passengers: true };
  }>[] = [];

  // 朝便
  for (const [routeId, passengers] of morningByRoute) {
    const trip = await prisma.trip.create({
      data: {
        operationDayId: operationDay.id,
        routeId,
        segment: "morning",
        status: "planned",
        passengers: {
          create: passengers.map((p) => ({
            childId: p.childId,
            stopId: p.stopId,
            expectedBoarding: true,
            boardingStatus: "expected",
          })),
        },
      },
      include: { passengers: true },
    });
    createdTrips.push(trip);

    await createAuditLog({
      entityType: "trips",
      entityId: trip.id,
      action: "CREATE",
      beforeJson: null,
      afterJson: { ...trip, passengerCount: passengers.length },
      actedByUserId: user.id,
    });
  }

  // 夕便
  for (const [routeId, passengers] of eveningByRoute) {
    const trip = await prisma.trip.create({
      data: {
        operationDayId: operationDay.id,
        routeId,
        segment: "evening",
        status: "planned",
        passengers: {
          create: passengers.map((p) => ({
            childId: p.childId,
            stopId: p.stopId,
            expectedBoarding: true,
            boardingStatus: "expected",
          })),
        },
      },
      include: { passengers: true },
    });
    createdTrips.push(trip);

    await createAuditLog({
      entityType: "trips",
      entityId: trip.id,
      action: "CREATE",
      beforeJson: null,
      afterJson: { ...trip, passengerCount: passengers.length },
      actedByUserId: user.id,
    });
  }

  return NextResponse.json({
    message: `便を${createdTrips.length}件生成しました。`,
    trips: createdTrips.map((t) => ({
      id: t.id,
      routeId: t.routeId,
      segment: t.segment,
      passengerCount: t.passengers.length,
    })),
  });
}
