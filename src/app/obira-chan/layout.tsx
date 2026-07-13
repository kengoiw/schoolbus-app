import Link from "next/link";

export default function ObiraChanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-sky-50">
      <header className="bg-sky-700 text-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/obira-chan" className="text-base font-bold text-white">
            🐟 おびらちゃん
          </Link>
          <span className="text-[11px] text-sky-200">小平町 非公式</span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">{children}</main>
    </div>
  );
}
