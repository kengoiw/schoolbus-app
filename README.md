# 小平町スクールバス乗車連絡アプリ（MVP）

北海道小平町向けスクールバス乗車連絡デジタル化システム。

## 技術スタック

| カテゴリ | 採用技術 |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Backend | Next.js Route Handlers |
| DB | PostgreSQL |
| ORM | Prisma |
| 認証 | NextAuth.js v5 (Auth.js) |
| バリデーション | Zod |
| フォーム | React Hook Form |
| 日時 | dayjs (JST固定) |

## ディレクトリ構成

```
schoolbus-app/
├── prisma/
│   ├── schema.prisma          # DBスキーマ
│   └── seed.ts                # Seedデータ
├── public/
│   └── manifest.json          # PWAマニフェスト
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/  # NextAuth
│   │   │   ├── me/                  # ログインユーザー情報
│   │   │   ├── announcements/       # お知らせ
│   │   │   ├── guardian/            # 保護者API
│   │   │   ├── admin/               # 管理者API
│   │   │   └── driver/              # ドライバーAPI
│   │   ├── login/                   # ログイン画面
│   │   ├── guardian/                # 保護者画面
│   │   ├── admin/                   # 管理者画面
│   │   ├── driver/                  # ドライバー画面
│   │   ├── globals.css              # グローバルスタイル
│   │   └── layout.tsx               # ルートレイアウト
│   ├── auth.ts                      # NextAuth設定
│   ├── middleware.ts                 # ルートガード
│   └── lib/
│       ├── prisma.ts               # Prismaクライアント
│       ├── date.ts                 # JST日時ユーティリティ
│       ├── audit.ts                # 監査ログユーティリティ
│       └── auth-guard.ts           # 認証・RBAC ヘルパー
└── package.json
```

## ローカル起動手順

### 前提条件
- Node.js 18+
- PostgreSQL 14+
- npm

### セットアップ

```bash
# 1. パッケージインストール
npm install

# 2. .env を編集して DATABASE_URL を設定
# postgresql://postgres:password@localhost:5432/schoolbus_db

# 3. AUTH_SECRET を必ず変更（32文字以上のランダム値）

# 4. PostgreSQLでDBを作成
# psql -U postgres -c "CREATE DATABASE schoolbus_db;"

# 5. DBマイグレーション
npm run db:migrate

# 6. Seedデータ投入
npm run db:seed

# 7. 開発サーバー起動
npm run dev
```

http://localhost:3000 にアクセス

### テスト用ログイン情報（共通パスワード: `password123`）

| ロール | メールアドレス |
|---|---|
| 管理者 | admin@kodaira.lg.jp |
| ドライバー1 | driver1@kodaira.lg.jp |
| ドライバー2 | driver2@kodaira.lg.jp |
| 保護者1 | guardian1@example.com |
| 保護者2 | guardian2@example.com |

## テスト実行

```bash
npm run test
npm run test:watch
```

## DBコマンド

```bash
npm run db:studio    # Prisma Studio
npm run db:migrate   # マイグレーション
npm run db:seed      # Seedデータ投入
npm run db:reset     # DB完全リセット（注意）
```

## 業務ルール概要

- 保護者は締切前までアプリで連絡可能
- 締切後は「電話でご連絡ください」を明示
- 管理者は締切後も代理入力可能（source=phone）
- 欠席選択時は朝便・帰り便を自動で「利用しない」に設定
- 全更新操作に監査ログを記録

## 今後の拡張（MVPスコープ外）

- プッシュ通知（FCM連携）
- LINE通知連携
- PDF一括出力
- 自動配車最適化
- GPS停留所追跡
