import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

// GET /api/observation-points/:id/observations/:obsId/image
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; obsId: string }> }
) {
  const { error } = await requireAuth();
  if (error) return error;

  const { id, obsId } = await params;
  const observation = await prisma.cropObservation.findUnique({
    where: { id: obsId },
    select: { observationPointId: true, imageData: true, imageMimeType: true },
  });

  if (!observation || observation.observationPointId !== id) {
    return NextResponse.json({ error: "写真が見つかりません。" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(observation.imageData), {
    headers: {
      "Content-Type": observation.imageMimeType,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
