## ローカル開発 — 起動手順

手順（3つのターミナルでそれぞれ実行するのが簡単です）

1. Supabase を起動
```bash
supabase start
```

2. Next.js 開発サーバを起動
```bash
npm run dev
```

3. ngrok でローカルを公開
```bash
ngrok http 3000
```

4. ClerkのWebhookをngrokのURLに変更し有効化
例: https://abcd-1234.ngrok-free.app/api/public/webhook
Enable Endpointにして、Subscribed eventsにuser.created, user.deleted, user.updatedを入れる
