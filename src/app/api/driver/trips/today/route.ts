import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { todayJst, dateToJstStart } from "@/lib/date";

// GET /api/driver/trips/today
export async function GET() {
  const { user, error } = await requireAuth(["driver"]);
  if (error) return error;

  const today = todayJst();
  const todayDate = dateToJstStart(today).toDate();

  const trips = await prisma.trip.findMany({
    where: {
      driverUserId: user.id,
      status: { notIn: ["canceled"] },
      operationDay: {
        operationDate: todayDate,
      },
    },
    include: {
      route: { select: { id: true, name: true } },
      operationDay: {
        include: { school: { select: { name: true } } },
      },
      passengers: {
        include: {
          child: {
            select: {
              id: true,
              name: true,
              kana: true,
              grade: true,
              className: true,
            },
          },
          stop: { select: { id: true, name: true } },
        },
        orderBy: { child: { kana: "asc" } },
      },
    },
    orderBy: { segment: "asc" },
  });

  return NextResponse.json(trips);
}
