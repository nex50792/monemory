# Security Model

このドキュメントはmonemoryのセキュリティ設計を集約する。設計判断の背景と、意図的にとらなかった対策の理由を明記する。

## 3層防御の全体像

```
[Client] → [CSP + Clerk auth] → [Rate limit + Auth] → [Executor closure + Prisma userId filter] → [DB]
```

| 層 | 役割 | 実装 |
|---|---|---|
| Edge / Header | XSS・clickjacking・MITM対策 | CSP + Frame-Options + HSTS など([next.config.ts](./next.config.ts)) |
| API Gateway | 認証・レート制御・入力検証 | [Clerk middleware](./src/middleware.ts) + [rateLimit.ts](./src/lib/rateLimit.ts) + [apiError.ts](./src/lib/apiError.ts) |
| Data Access | ユーザー境界の強制 | Executor closure + 全 Prisma クエリで `userId` filter |

## 認証と認可

- **認証**: Clerk。JWTトークンは `getCurrentUser()` で検証、`clerkUserId` から内部 `User.id` を解決する。
- **認可**: LLM tools は `createChatToolExecutor(user.id)` で `userId` をクロージャに束縛する。LLM がどんな args を送ってもuserIdは変更不可能。
- 全 Prisma クエリ (`entry`, `category`, `tag`, `chatMessage`) で `where: { userId }` を強制。

## Rate limiting

- Postgres の `RateLimitRecord` を使ったスライディングウィンドウ実装([rateLimit.ts](./src/lib/rateLimit.ts))。
- `chat`: 20 req / 分 / ユーザー、`voice`: 10 req / 分 / ユーザー。
- 制限超過時は `429 RATE_LIMITED` + `Retry-After` ヘッダー。
- 目的:
  - Gemini API 無料枠(15 RPM)の保護
  - DoS / prompt loop 攻撃の抑制

将来的にVercel + Upstash Redis へ切り替え可能。現状は追加インフラなしで即利用可能な構成を採用。

## エラー応答の構造化

- 全エラーは `{ code, message, details? }` 形式で返す([apiError.ts](./src/lib/apiError.ts))。
- 情報漏洩を避けるため、内部スタックトレース・SQL・生 exception メッセージは返さない。
- クライアントは `code` で分岐(`RATE_LIMITED`, `GEMINI_OVERLOADED` など)。

## Gemini リトライと過負荷制御

- 503 / 429 は指数バックオフ(1s → 2s → 4s, 最大3回)で自動リトライ([gemini.ts](./src/lib/gemini.ts))。
- 消耗後は `GeminiOverloadedError` を投げ、`503 GEMINI_OVERLOADED` として応答する。

## Content Security Policy

`next.config.ts` で以下のヘッダーを付与する:

- `Content-Security-Policy` (default self、Clerk ドメインを allowlist)
- `X-Frame-Options: DENY` (clickjacking防止)
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: microphone=(self), camera=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`

## プロンプトインジェクション対策

LLM がユーザー指示に従って動作する仕組み上、以下の設計で被害を最小化する:

- **tools は最小権限**: `search_entries` と `get_expense_stats` の 2 つのみ。生 SQL や file system アクセスは提供しない。
- **tools 内で userId 強制**: closure 束縛のため、LLM がどんな args を送っても書き換え不可。
- **system prompt で家計限定**: 家計以外の質問は「家計簿の質問にのみお答えできます」と拒否させる。
- **system prompt に含む情報は user 自身のもの**: metadata summary は認証ユーザーの categories/count/period のみ。他人の情報は一切含まない。

想定攻撃と防御の対応表は README または面接文書に集約。

## 意図的に採用しなかった対策と理由

### Supabase Row Level Security (RLS)

**理由**: Prisma は `DATABASE_URL` で service role 相当の接続を張り、RLS を bypass するため、policy を追加しても効果を持たない。RLS を有効に機能させる選択肢と評価は以下:

| 選択肢 | 評価 |
|---|---|
| Prisma service role のまま RLS を書く | **cargo cult**。policy は書けても bypass される。誤解を招くので不採用 |
| Prisma を per-request で `SET LOCAL request.jwt.claim.sub` するミドルウェア導入 | ○ 効果あり。ただし全クエリを transaction にラップする必要があり、複雑度と保守性のコストが高い |
| Supabase JS SDK に user-facing クエリを移行 (anon key + RLS) | ◎ 業界標準。ただし Prisma → Supabase SDK への大規模リファクタが必要 |

現状は **app-layer の userId 強制**(closure + Prisma filter)を primary defense に採用し、二重防御としての RLS はスコープ外とする。将来 Supabase JS SDK へ移行する場合の RLS policy 案は [`prisma/rls_policies.sql`](./prisma/rls_policies.sql) 等に切り出す想定。

### CSRF token

- API は POST JSON / multipart FormData のみで、Cookie ベースの状態変化を伴わない Clerk セッショントークン(Bearer)で認証する。
- 主要ブラウザの SameSite=Lax デフォルトと同 origin CORS 制約により、classical CSRF リスクは低い。

### API Key rotation の自動化

- `GEMINI_API_KEY` / `CLERK_SECRET_KEY` などは Vercel Environment Variables で管理する。ローテーション自動化は個人ポートフォリオの規模と用途に対して overkill と判断。

## サポートする脅威モデル

| 脅威 | 対策 |
|---|---|
| クロスユーザーデータ漏洩 | 認証層 + closure 束縛 + Prisma filter の 3 段 |
| プロンプトインジェクション | tool 最小権限 + userId 強制 + system prompt 家計限定 |
| DoS / prompt loop | Rate limit + Gemini retry backoff |
| XSS / clickjacking | CSP + X-Frame-Options + nosniff |
| MITM | HSTS + HTTPS-only(Vercel) |
| SQL injection | Prisma パラメータ化 + tool args は type-safe |

## サポートしない脅威モデル

- 悪意ある挙動を持つ Clerk トークン所有者による自分のデータの変更・削除(それは意図した操作)
- サービスプロバイダ(Clerk, Google, Supabase, Vercel)の内部脅威
- Gemini モデル内部の hallucination(system prompt で緩和するが根絶不可)

## セキュリティ関連の実装ファイル

- [next.config.ts](./next.config.ts) — CSP + Security headers
- [src/middleware.ts](./src/middleware.ts) — Clerk auth
- [src/lib/getCurrentUser.ts](./src/lib/getCurrentUser.ts) — 認証済みユーザー取得
- [src/lib/rateLimit.ts](./src/lib/rateLimit.ts) — Sliding window rate limit
- [src/lib/apiError.ts](./src/lib/apiError.ts) — 構造化エラー
- [src/lib/gemini.ts](./src/lib/gemini.ts) — Retry backoff + GeminiOverloadedError
- [src/lib/chatTools.ts](./src/lib/chatTools.ts) — Executor closure で userId 強制
- [src/lib/chatRetrieval.ts](./src/lib/chatRetrieval.ts) — pgvector 検索も userId 強制
- [prisma/schema.prisma](./prisma/schema.prisma) — スキーマ
- [test/lib/rateLimit.test.ts](./test/lib/rateLimit.test.ts) — Rate limit テスト
- [test/lib/apiError.test.ts](./test/lib/apiError.test.ts) — 構造化エラーテスト
- [test/lib/securityHeaders.test.ts](./test/lib/securityHeaders.test.ts) — CSPテスト
- [test/lib/chatTools.test.ts](./test/lib/chatTools.test.ts) — Tool executor テスト
