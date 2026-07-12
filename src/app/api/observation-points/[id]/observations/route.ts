import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { analyzeCropImage, prepareStorageImage } from "@/lib/crop-analysis";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

// POST /api/observation-points/:id/observations
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, error } = await requireAuth();
  if (error) return error;

  const { id } = await params;
  const point = await prisma.observationPoint.findUnique({ where: { id } });
  if (!point || !point.isActive) {
    return NextResponse.json({ error: "観測地点が見つかりません。" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("photo");
  const note = formData.get("note");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "写真ファイルを選択してください。" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "画像ファイルを選択してください。" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "画像サイズが大きすぎます（10MBまで）。" },
      { status: 413 }
    );
  }
  if (typeof note === "string" && note.length > 1000) {
    return NextResponse.json({ error: "メモは1000文字以内で入力してください。" }, { status: 400 });
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let analysis;
  let storageImage;
  try {
    [analysis, storageImage] = await Promise.all([
      analyzeCropImage(inputBuffer),
      prepareStorageImage(inputBuffer),
    ]);
  } catch {
    return NextResponse.json(
      { error: "画像を読み込めませんでした。別のファイルをお試しください。" },
      { status: 400 }
    );
  }

  const created = await prisma.cropObservation.create({
    data: {
      observationPointId: id,
      userId: user.id,
      imageData: new Uint8Array(storageImage.data),
      imageMimeType: storageImage.mimeType,
      note: typeof note === "string" && note.trim() !== "" ? note.trim() : null,
      greenRatio: analysis.greenRatio,
      yellowBrownRatio: analysis.yellowBrownRatio,
      otherRatio: analysis.otherRatio,
      avgBrightness: analysis.avgBrightness,
      takenAt: new Date(),
    },
    select: {
      id: true,
      note: true,
      greenRatio: true,
      yellowBrownRatio: true,
      otherRatio: true,
      avgBrightness: true,
      takenAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
