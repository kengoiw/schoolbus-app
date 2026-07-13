import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

const roleHome: Record<string, string> = {
  admin: "/admin",
  driver: "/driver",
  guardian: "/guardian",
};

export default async function ObiraChanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "";

  return (
    <div className="min-h-screen flex flex-col bg-sky-50">
      <header className="bg-sky-700 text-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/obira-chan" className="text-base font-bold">
            🐟 おびらちゃん
          </Link>
          <Link href={roleHome[role] ?? "/"} className="text-xs text-sky-100 underline">
            ホームへ戻る
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">{children}</main>
    </div>
  );
}
