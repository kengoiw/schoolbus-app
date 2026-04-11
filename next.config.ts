import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopackのルートをプロジェクトに固定
  turbopack: {
    root: __dirname,
  },
  // 本番ビルドでPrismaのバンドルを最適化
  // serverExternalPackages: ["@prisma/client", "bcryptjs"],


  // 日本語UI向けの設定
  i18n: undefined,

  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },
};

export default nextConfig;
