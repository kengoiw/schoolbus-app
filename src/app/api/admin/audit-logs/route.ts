import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// GET /api/admin/audit-logs?entityType=&entityId=&page=1
export async function GET(req: NextRequest) {
  const { error } = await requireAuth(["admin"]);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const entityType = sp.get("entityType");
  const entityId = sp.get("entityId");
  const page = parseInt(sp.get("page") ?? "1");
  const pageSize = 50;

  interface AuditWhere {
    entityType?: string;
    entityId?: string;
  }

  const where: AuditWhere = {};
  if (entityType) where.entityType = entityType;
  if (entityId) where.entityId = entityId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        actedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { actedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
