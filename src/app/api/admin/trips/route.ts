import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// GET /api/admin/trips?date=YYYY-MM-DD&schoolId=
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const date = sp.get("date");
  const schoolId = sp.get("schoolId");

  interface TripWhereClause {
    operationDay?: {
      operationDate?: Date;
      schoolId?: string;
    };
  }

  const where: TripWhereClause = {};
  if (date || schoolId) {
    where.operationDay = {};
    if (date) where.operationDay.operationDate = new Date(date);
    if (schoolId) where.operationDay.schoolId = schoolId;
  }

  const trips = await prisma.trip.findMany({
    where,
    include: {
      route: { select: { id: true, name: true } },
      operationDay: { select: { operationDate: true } },
      driver: { select: { id: true, name: true } },
      passengers: {
        include: {
          child: { select: { id: true, name: true, grade: true, className: true } },
          stop: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: [{ operationDay: { operationDate: "desc" } }, { segment: "asc" }],
  });

  return NextResponse.json(trips);
}
