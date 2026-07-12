import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

// GET /api/observation-points
export async function GET() {
  const { error } = await requireAuth();
  if (error) return error;

  const points = await prisma.observationPoint.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      memo: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true } },
      observations: {
        orderBy: { takenAt: "desc" },
        take: 1,
        select: {
          id: true,
          takenAt: true,
          greenRatio: true,
          yellowBrownRatio: true,
          avgBrightness: true,
        },
      },
      _count: { select: { observations: true } },
    },
  });

  return NextResponse.json(
    points.map((p) => ({
      id: p.id,
      name: p.name,
      memo: p.memo,
      createdAt: p.createdAt,
      createdBy: p.createdBy,
      observationCount: p._count.observations,
      latestObservation: p.observations[0] ?? null,
    }))
  );
}

const createPointSchema = z.object({
  name: z.string().min(1, "地点名を入力してください。").max(100),
  memo: z.string().max(500).optional(),
});

// POST /api/observation-points
export async function POST(req: NextRequest) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = createPointSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力内容に誤りがあります。", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const created = await prisma.observationPoint.create({
    data: {
      name: parsed.data.name,
      memo: parsed.data.memo,
      createdByUserId: user.id,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
