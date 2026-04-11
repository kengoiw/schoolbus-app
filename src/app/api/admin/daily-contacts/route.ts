import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// GET /api/admin/daily-contacts?date=YYYY-MM-DD&schoolId=&childName=&page=1
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const date = sp.get("date");
  const schoolId = sp.get("schoolId");
  const childName = sp.get("childName");
  const page = parseInt(sp.get("page") ?? "1");
  const pageSize = 50;

  interface WhereClause {
    isActive: boolean;
    operationDay?: { operationDate?: Date; schoolId?: string };
    child?: { name?: { contains: string; mode: "insensitive" | "default" } };
  }

  const where: WhereClause = { isActive: true };

  if (date || schoolId) {
    where.operationDay = {};
    if (date) {
      const d = new Date(date);
      where.operationDay.operationDate = d;
    }
    if (schoolId) {
      where.operationDay.schoolId = schoolId;
    }
  }

  if (childName) {
    where.child = {
      name: { contains: childName, mode: "insensitive" },
    };
  }

  const [contacts, total] = await Promise.all([
    prisma.dailyContact.findMany({
      where,
      include: {
        child: {
          select: {
            id: true,
            name: true,
            kana: true,
            grade: true,
            className: true,
            school: { select: { name: true } },
            defaultMorningStop: { select: { name: true } },
            defaultEveningStop: { select: { name: true } },
          },
        },
        operationDay: { select: { operationDate: true, status: true, morningDeadlineAt: true, eveningDeadlineAt: true } },
        submittedBy: { select: { name: true } },
        receivedBy: { select: { name: true } },
      },
      orderBy: [{ operationDay: { operationDate: "desc" } }, { child: { kana: "asc" } }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.dailyContact.count({ where }),
  ]);

  return NextResponse.json({
    contacts,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
