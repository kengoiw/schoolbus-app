import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "小平町スクールバス連絡システム",
  description: "北海道小平町 スクールバス乗車連絡アプリ",
  manifest: "/manifest.json",
  themeColor: "#1a56db",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  );
}
