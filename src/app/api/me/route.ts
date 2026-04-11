export const runtime = "nodejs";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";

export async function GET() {
  const { user, error } = await requireAuth();
  if (error) return error;

  return NextResponse.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}
