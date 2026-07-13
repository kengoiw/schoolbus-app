import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "driver") redirect("/login");

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <header className="bg-green-700 text-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-base font-bold">🚌 ドライバー管理</h1>
          <span className="text-xs text-green-200">{session.user?.name}</span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4 pb-20">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-10">
        <div className="max-w-lg mx-auto flex justify-around">
          <Link href="/driver" className="nav-item">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs">今日の便</span>
          </Link>
          <Link href="/driver/announcements" className="nav-item">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-xs">お知らせ</span>
          </Link>
          <Link href="/observations" className="nav-item">
            <span className="w-5 h-5 flex items-center justify-center text-base leading-none">🌱</span>
            <span className="text-xs">定点観測</span>
          </Link>
          <Link href="/obira-chan" className="nav-item">
            <span className="w-5 h-5 flex items-center justify-center text-base leading-none">🐟</span>
            <span className="text-xs">おびらちゃん</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
