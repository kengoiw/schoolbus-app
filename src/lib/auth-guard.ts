import { auth } from "@/auth";
import { NextResponse } from "next/server";
import type { Role } from "@prisma/client";

export type AuthedUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

/**
 * 認証チェック + ロール検証
 * 指定ロール以外はアクセス拒否
 */
export async function requireAuth(allowedRoles?: Role[]): Promise<
  | { user: AuthedUser; error: null }
  | { user: null; error: NextResponse }
> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "認証が必要です。ログインしてください。" },
        { status: 401 }
      ),
    };
  }

  const user: AuthedUser = {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: (session.user as { role?: string }).role as Role,
  };

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return {
      user: null,
      error: NextResponse.json(
        { error: "この操作を行う権限がありません。" },
        { status: 403 }
      ),
    };
  }

  return { user, error: null };
}

/**
 * APIエラーレスポンスを返す汎用関数
 */
export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
