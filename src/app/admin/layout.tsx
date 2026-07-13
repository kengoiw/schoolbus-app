import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") redirect("/login");

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* サイドバー（デスクトップ） */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full">
        <div className="p-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 font-medium">小平町</p>
          <h1 className="text-base font-bold text-gray-900">スクールバス管理</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {[
            { href: "/admin", label: "ダッシュボード", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
            { href: "/admin/daily-contacts", label: "日次連絡一覧", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
            { href: "/admin/phone-entry", label: "電話代理入力", icon: "M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" },
            { href: "/admin/trips", label: "便管理", icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
            { href: "/admin/announcements", label: "お知らせ管理", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
            { href: "/admin/audit-logs", label: "監査ログ", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
            { href: "/admin/masters", label: "マスタ管理", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              {item.label}
            </Link>
          ))}
          <Link
            href="/observations"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <span className="w-4 h-4 flex items-center justify-center text-sm leading-none">🌱</span>
            定点観測
          </Link>
        </nav>
        <div className="p-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">{session.user?.name}</p>
          <p className="text-xs text-gray-400">管理者</p>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 md:ml-64">
        {/* モバイルヘッダー */}
        <header className="md:hidden bg-white border-b border-gray-200 px-4 h-14 flex items-center justify-between">
          <h1 className="text-base font-bold">スクールバス管理</h1>
          <span className="text-xs text-gray-500">{session.user?.name}</span>
        </header>

        <main className="p-4 md:p-6 max-w-7xl">
          {children}
        </main>
      </div>
    </div>
  );
}
