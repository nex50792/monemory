# MONEMORY

**Money + Memory** — お金と思い出を記録する家計簿アプリ

支出の背景にある「思い出」を一緒に記録できる家計簿アプリです。単なる金額管理ではなく、「誰と・どこで・なぜ」使ったのかを記録し、1年後に見返すと人生の記録になります。

## 技術スタック

| カテゴリ       | 技術                                             |
| -------------- | ------------------------------------------------ |
| フレームワーク | Next.js 15 (App Router, Server Actions)          |
| フロントエンド | React 19, TypeScript, Tailwind CSS v4            |
| データベース   | PostgreSQL (Supabase) + Prisma ORM + pgvector    |
| 認証           | Clerk (Webhook によるユーザー同期)               |
| AI             | Google Gemini (gemini-2.5-flash, gemini-embedding-001, multimodal audio) |
| グラフ         | Recharts                                         |
| テスト         | Vitest (統合テスト) + Playwright (E2E)           |
| CI/CD          | GitHub Actions                                   |
| デプロイ       | Vercel                                           |

## セキュリティ

- 認証: Clerk (JWT / Bearer)
- 認可: Executor closure に `userId` を束縛、全 Prisma クエリで `userId` filter を強制
- Rate limit: Postgres スライディングウィンドウ (chat 20 req/分, voice 10 req/分)、429 + `Retry-After` を返却
- 構造化エラー: `{ code, message }` 形式で情報漏洩を防止
- Gemini リトライ: 503 / 429 に指数バックオフ(1s→2s→4s, 最大3回)
- CSP / セキュリティヘッダー: `next.config.ts` で `Content-Security-Policy`, `X-Frame-Options: DENY`, `HSTS` 等を付与
- プロンプトインジェクション: tools は最小権限 (2 種のみ)、system prompt で家計以外の質問を拒否

詳細は [SECURITY.md](./SECURITY.md) を参照。

## AI 家計コンパニオン (RAG + 音声入力 + 履歴永続化)

過去の記録に対して質問できるチャット機能。音声で質問を入力することも可能。会話履歴は永続化され、次回訪問時に継続できる。

### 責務分離

- **記録作成**: フォーム入力のみ (誤認識で家計データを汚染しない)
- **AI Chat**: 質問応答専用 (RAG で過去記録を参照)
- **音声入力**: 質問の文字起こしのみ (transcript を入力欄にセット、送信はユーザー手動)

### 技術判断

- **AIプロバイダ**: Google Gemini API — 永続的な無料枠がある個人ポートフォリオ向け選定 (`gemini-2.5-flash`, `gemini-embedding-001`)
- **Embedding**: `gemini-embedding-001` (`outputDimensionality: 1536`) — pgvector `vector(1536)` と一致
- **Vector DB**: Supabase pgvector — 認証/RLSと統合済み、追加ストレージ不要
- **Retrieval + Function Calling ハイブリッド**:
  - **Metadata summary** を毎回 system prompt に注入(総件数/カテゴリ一覧/期間) — 概要質問に即答
  - **Tools 2つ**を LLM に提供 — 質問タイプに応じて自動選択
    - `search_entries(query, limit)` — pgvector 意味検索(dense、cosine `<=>`、上限20)
    - `get_expense_stats(startDate?, endDate?, groupBy?)` — SQL 直接集計(合計/件数/カテゴリ別/月別)
  - LLM が routing(類似検索 vs 集計)を決定 → RAG の集計弱点を補う production RAG パターン
- **Hallucination対策**: system prompt で「tool 結果外は "記録にありません" と返す」を強制、家計以外の質問は拒否
- **音声文字起こし**: Gemini multimodal + `responseSchema` で `{transcript}` のみ抽出。独立 STT サービス不要
- **Streaming**: chat 応答は SSE で逐次送信(WebSocket 不要ユースケース)。tool 実行後の最終応答を streaming
- **履歴永続化**: `ChatMessage` テーブル、ユーザー単位単一チャット、sliding window 直近10件を LLM context に投入
- **Fail-safe**:
  - embedding 生成失敗は Entry 作成をブロックしない (catch + log)
  - Gemini 503/429 は指数バックオフで自動リトライ(1s→2s→4s、最大3回)、失敗時は `GeminiOverloadedError` で 503 返却

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
│   │   ├── chat/           # POST (RAG chat, SSE streaming, 履歴永続化)
│   │   ├── chat/history/   # GET (履歴取得) / DELETE (履歴削除)
│   │   ├── voice/          # POST (音声 → Gemini transcribe → transcript)
│   │   └── public/webhook/ # Clerk Webhook (ユーザー作成・更新・削除)
│   ├── chat/               # AI家計コンパニオンページ
│   ├── sign-in/            # Clerk 認証
│   └── sign-up/
├── components/             # 共通UIコンポーネント
│   ├── GlobalMenu.tsx      # サイドメニュー
│   ├── ConfirmModal.tsx    # 確認ダイアログ
│   ├── VoiceRecorder.tsx   # 音声入力 (MediaRecorder + /api/voice → transcript)
│   └── stats/              # グラフ関連コンポーネント
├── lib/
│   ├── prisma.ts           # Prisma クライアント
│   ├── getCurrentUser.ts   # 認証済みユーザー取得
│   ├── errors.ts           # カスタムエラークラス (UnauthorizedError)
│   ├── entryHelpers.ts     # カテゴリ・タグ解決の共通ロジック
│   ├── stats.ts            # 統計計算ロジック
│   ├── gemini.ts           # Gemini SDK ラッパー (embedding, chat, chatWithTools, 音声 transcribe, retry)
│   ├── entryEmbedding.ts   # Entry → embedding 生成 + pgvector 保存
│   ├── chatRetrieval.ts    # pgvector 意味検索 + metadata summary + system prompt 構築
│   └── chatTools.ts        # Function calling 用 tool declarations + executor
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
