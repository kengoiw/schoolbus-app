import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // 認証不要なパス（おびらちゃん・岩倉農場AI案内所はスタンドアロン公開ページ）
  const publicPaths = [
    "/login",
    "/api/auth",
    "/obira-chan",
    "/api/obira-chan",
    "/iwakura-farm",
    "/api/iwakura-farm",
  ];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = req.auth;
  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const role = (session.user as any).role as string | undefined;

  // ロール別アクセス制御
  if (pathname.startsWith("/guardian") && role !== "guardian") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname.startsWith("/driver") && role !== "driver") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // APIのロール制御
  if (pathname.startsWith("/api/guardian") && role !== "guardian") {
    return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
  }
  if (pathname.startsWith("/api/admin") && role !== "admin") {
    return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
  }
  if (pathname.startsWith("/api/driver") && role !== "driver") {
    return NextResponse.json({ error: "権限がありません。" }, { status: 403 });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icon-192.png|icon-512.png).*)",
  ],
};
