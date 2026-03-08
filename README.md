# MONEMORY

**Money + Memory** — お金と思い出を記録する家計簿アプリ

支出の背景にある「思い出」を一緒に記録できる家計簿アプリです。単なる金額管理ではなく、「誰と・どこで・なぜ」使ったのかを記録し、1年後に見返すと人生の記録になります。

## 技術スタック

| カテゴリ       | 技術                                    |
| -------------- | --------------------------------------- |
| フレームワーク | Next.js 15 (App Router, Server Actions) |
| フロントエンド | React 19, TypeScript, Tailwind CSS v4   |
| データベース   | PostgreSQL (Supabase) + Prisma ORM      |
| 認証           | Clerk (Webhook によるユーザー同期)      |
| グラフ         | Recharts                                |
| テスト         | Vitest (統合テスト) + Playwright (E2E)  |
| CI/CD          | GitHub Actions                          |
| デプロイ       | Vercel                                  |

## アーキテクチャ

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx            # 新規記録作成 (Server Actions)
│   ├── entries/            # 記録一覧・詳細・編集
│   ├── dashboard/          # 統計ダッシュボード
│   ├── stats/monthly/      # 月別詳細
│   ├── admin/              # 管理者ページ
│   ├── api/
│   │   ├── entries/        # GET (フィルター・ソート付き一覧)
│   │   ├── entries/[id]/   # GET / PUT / DELETE
│   │   ├── categories/     # GET / POST
│   │   ├── categories/[id]/ # DELETE
│   │   ├── tags/           # GET / POST
│   │   ├── tags/[id]/      # DELETE
│   │   ├── stats/          # GET (月別・カテゴリ別統計)
│   │   └── public/webhook/ # Clerk Webhook (ユーザー作成・更新・削除)
│   ├── sign-in/            # Clerk 認証
│   └── sign-up/
├── components/             # 共通UIコンポーネント
│   ├── GlobalMenu.tsx      # サイドメニュー
│   ├── ConfirmModal.tsx    # 確認ダイアログ
│   └── stats/              # グラフ関連コンポーネント
├── lib/
│   ├── prisma.ts           # Prisma クライアント
│   ├── getCurrentUser.ts   # 認証済みユーザー取得
│   ├── errors.ts           # カスタムエラークラス (UnauthorizedError)
│   ├── entryHelpers.ts     # カテゴリ・タグ解決の共通ロジック
│   └── stats.ts            # 統計計算ロジック
└── middleware.ts           # Clerk認証 + Basic認証ミドルウェア

test/                       # Vitest 統合テスト
e2e/                        # Playwright E2E テスト
prisma/
└── schema.prisma           # データモデル定義
```

## API ドキュメント

API仕様は [OpenAPI 3.0](https://spec.openapis.org/oas/v3.0.3) で定義しています。

- **Swagger UI**: [/api-docs](/api-docs) — ブラウザでAPI仕様を確認・試行できます
- **OpenAPI定義ファイル**: [`public/api_reference/openapi.yaml`](public/api_reference/openapi.yaml)

新規記録の作成はフォーム送信のため Server Action (`createEntry`) で実装し、一覧・更新・削除はクライアントからの fetch が必要なため REST API で実装しています。

## ローカル開発

### 前提条件

- Node.js 20+
- Docker (Supabase 用)
- [Clerk](https://clerk.com) アカウント
- [ngrok](https://ngrok.com) (Webhook テスト用)

### 環境変数

[`.env.example`](.env.example) をコピーして `.env` を作成し、各値を設定してください。

```bash
cp .env.example .env
```

### 起動手順

```bash
# 1. Supabase を起動
supabase start

# 2. Next.js 開発サーバを起動
npm run dev

# 3. ngrok でローカルを公開 (Webhook テスト用)
ngrok http 3000
```

ClerkのWebhookをngrokのURLに変更し有効化
例: https://abcd-1234.ngrok-free.app/api/public/webhook
Enable Endpointにして、Subscribed eventsにuser.created, user.deleted, user.updatedを入れる

### 統合テスト (Vitest + PostgreSQL)

```bash
npm test
```

テスト用 Docker PostgreSQL の起動とスキーマ適用が自動で行われます。

### E2E テスト (Playwright)

```bash
# ヘッドレス実行
npm run test:e2e

# ブラウザ表示あり
npm run test:e2e:headed
```

### カバレッジ

```bash
npm run test:cov
```
