import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  targetRole: z.enum(["all", "guardian", "driver"]).default("all"),
  targetSchoolId: z.string().uuid().nullable().optional(),
  targetRouteId: z.string().uuid().nullable().optional(),
  publishFrom: z.string().datetime(),
  publishTo: z.string().datetime().nullable().optional(),
});

// POST /api/admin/announcements
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth(["admin"]);
  if (error) return error;

  const body = await req.json();
  const parsed = announcementSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります。", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const created = await prisma.announcement.create({
    data: {
      ...parsed.data,
      publishFrom: new Date(parsed.data.publishFrom),
      publishTo: parsed.data.publishTo ? new Date(parsed.data.publishTo) : null,
      createdByUserId: user.id,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
