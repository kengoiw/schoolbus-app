# 小平町スクールバス乗車連絡アプリ（MVP）デプロイ手順

このドキュメントでは、本番環境（Vercel）にデプロイし、運用を開始するための手順を説明します。MVPの運用では高速で安定したNext.jsネイティブのホスティングである Vercel と、PostgreSQLデータベース（Vercel Postgres または Supabase を推奨）を使用します。

## 1. 必要な環境変数の一覧

Vercelのプロジェクト設定画面（Settings > Environment Variables）にて、以下の変数を登録してください。

| 変数名 | 説明 | サンプル / 推奨値 |
|:---|:---|:---|
| `DATABASE_URL` | PostgreSQLへの接続URL (コネクションプーリング対応のものを推奨) | `postgresql://user:password@host:port/mydb?pgbouncer=true` |
| `DIRECT_URL` | PostgreSQLへの直接接続URL (Prismaマイグレーション用・設定がある場合のみ) | `postgresql://user:password@host:port/mydb` |
| `AUTH_SECRET` | セッション暗号化用のランダム文字列 (NextAuth用) | `openssl rand -base64 32` の実行結果 |
| `TZ` | タイムゾーン設定 (JST固定のため必須) | `Asia/Tokyo` |

## 2. データベースの準備（Supabase または Vercel Postgres）

1. プロジェクトを作成し、PostgreSQLデータベースの `DATABASE_URL` を取得します。
2. そのURLをローカルの `.env` と Vercelの環境変数に設定します。
3. ローカル環境からDBのスキーマをプッシュ・マイグレーションします。

```bash
# マイグレーション履歴とスキーマを適用
npx prisma migrate deploy

# 初期マスタデータ（管理者ユーザー、路線、停留所などのテストデータ）を投入
npm run db:seed
```

※ 本番環境でもシードデータの初期管理者を元に運用を開始します。安全のため、初回ログイン後に初期管理者のパスワードを変更するか、新しい管理者ユーザーを作成して初期ユーザーを削除してください。

## 3. Vercelへのデプロイ

1. Vercelコンソールで **Add New... > Project** を選択。
2. ご利用のGitリポジトリ（GitHub等）と連携し、リポジトリをインポート。
3. **Framework Preset** が `Next.js` に自動設定されていることを確認。
4. **Environment Variables** に上記の環境変数をすべて入力。
5. **Deploy** をクリック。

### 自動ビルドコマンドについて
Vercelは自動的に `npm run build` を実行しますが、その際に Prisma Client の生成が必要です。`package.json` に設定されているため自動実行されますが、明示したい場合はビルドコマンドを以下にすることも可能です。
`npx prisma generate && next build`

## 4. 運用開始時の注意点（監査ログとバックアップ）
- **監査ログのモニタリング**: 仕様通り、管理者の「電話代理入力」を含むすべての更新系操作は `audit_logs` テーブルに記録されます。管理画面の監査ログページから定期的に不正な上書きがないか確認してください。
- **DBバックアップ**: DBホスティングサービスの自動バックアップ機能（Point-in-Time Recoveryなど）を必ず有効にしておいてください。
