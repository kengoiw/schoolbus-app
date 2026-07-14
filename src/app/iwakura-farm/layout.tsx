import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "岩倉農場AI案内所｜北海道小平町",
  description:
    "北海道小平町の岩倉農場について、栽培している米・小麦・花・アイボリーメロンなどを案内するAIチャットです。",
  robots: {
    index: false,
    follow: false,
  },
};

export default function IwakuraFarmLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-green-50">
      <header className="bg-green-800 text-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/iwakura-farm" className="text-base font-bold text-white">
            🌾 岩倉農場AI案内所
          </Link>
          <span className="text-[11px] text-green-200">北海道小平町 非公式</span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-4">{children}</main>
    </div>
  );
}
