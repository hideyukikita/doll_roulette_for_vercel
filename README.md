# かぞくたちルーレット（Vercel + Supabase 版）

Next.js（App Router）で動く「かぞくたちルーレット」です。Vercel にデプロイし、DB・ストレージは Supabase を使用します。

## セットアップ

1. **依存関係**
   ```bash
   npm install
   ```

2. **環境変数**
   - `.env.local.example` をコピーして `.env.local` を作成
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`（Supabase の Project Settings → API）
   - `SUPABASE_SERVICE_ROLE_KEY`（Supabase の Project Settings → API の **service_role** キー。リセット機能で使用。RLS を有効にしている場合は必須）
   - `APP_PASSWORD`（入室用パスワード・任意）

3. **Supabase 側**
   - `supabase/schema.sql` を SQL エディタで実行してスキーマ作成
   - Storage でバケット `uploads` を作成し、公開＆アップロード許可を設定

4. **起動**
   ```bash
   npm run dev
   ```

## 移設・デプロイの流れ

**あとの作業**はすべて次のドキュメントに記載しています。

- **[docs/VercelSupabase_移設計画.md](docs/VercelSupabase_移設計画.md)** … フェーズ 0〜5 の手順と「あとの作業チェックリスト」

Vercel では、このリポジトリをそのままルートとして接続し、環境変数を設定してデプロイしてください（Root Directory の指定は不要です）。
>>>>>>> 9d8cc69 (Initial commit for Vercel + Supabasse app)
