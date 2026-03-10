# Vercel + Supabase 移設計画（データ引継ぎ・pre は止めない）

**目標**: 現在 pre で動かしているアプリとデータを、Vercel（Next.js）＋ Supabase に移設する。  
**前提**: pre は原則止めない。止めるのは最終切り替え時の短時間のみ。データは pre の DB と画像から引き継ぐ。

---

## 1. 全体の流れ

| フェーズ | どこで | やること | pre の状態 |
|----------|--------|----------|------------|
| **0** | ブラウザ | Supabase・Vercel アカウント作成 | そのまま運用 |
| **1** | 手元 PC | pre の DB からダンプ取得・画像コピー（読み取りのみ） | そのまま運用 |
| **2** | Supabase ダッシュボード | スキーマ作成・データ投入・Storage に画像アップロード | そのまま運用 |
| **3** | doll_roulette/web | Next.js アプリ実装（Supabase 連携・認証ゲート） | そのまま運用 |
| **4** | Vercel | デプロイ・プレビュー URL で動作確認 | そのまま運用 |
| **5** | 最終日 | 必要なら最終ダンプで差分取り込み → 本番 URL に切り替え | 短時間だけ更新停止をお願い |

---

## 2. フェーズ 0: アカウント準備

- **Supabase**: [supabase.com](https://supabase.com) でサインアップ → 新規プロジェクト作成（リージョンは日本に近いものを選択）。Postgres と Storage が有効になる。
- **Vercel**: [vercel.com](https://vercel.com) でサインアップ（GitHub 連携推奨）。リポジトリを後で接続する。

---

## 3. フェーズ 1: pre から移行用データを取る（pre は止めない）

### 3.1 DB ダンプ（読み取りのみ）

pre のコンテナが動いている状態で、**リファクタ後スキーマ**のダンプが必要。  
pre の DB は**旧スキーマ**（`dolls.image_url` あり）なので、次のどちらかで「新スキーマ用データ」を用意する。

**方法 A（推奨）**: いったんルートで DB を起動し、pre のボリュームをマウントした状態でマイグレーション実行 → ダンプ取得。  
（pre を止めてルートで `docker compose up -d db` し、同じボリュームにマイグレーションを流してから `pg_dump`。取得後、pre を起動し直せば pre は旧スキーマのまま使えないので、**pre のデータを別ファイルに退避してから**ルートでマイグレーションし、ダンプ取得し、pre 用に `backup_before.sql` でリストアし直す、という流れになる。）

**方法 B**: pre のダンプ（`backup_before.sql` 相当）を取得し、**変換スクリプトで新スキーマ用の INSERT を生成**して Supabase に流す。  
（dolls.image_url → doll_images に 1 行挿入、outings.image_url → outing_images に 1 行挿入、その後 dolls / outings から image_url を除いた形で INSERT。）

運用を簡単にするため、**方法 B** を採用する: pre から **pg_dump でデータだけ取得**（スキーマは別ファイルで Supabase に新規作成）し、取得したデータを**変換用 SQL またはスクリプト**で新スキーマ向けに書き換えて Supabase に投入する。

**手順（方法 B）**:

1. pre が動いている状態でダンプを取る（データのみ、INSERT 形式）。
   ```bash
   docker exec doll_roulette_db pg_dump -U doll_roulette doll_roulette \
     --data-only --column-inserts \
     -t dolls -t doll_images -t histories -t outings -t outing_dolls -t outing_images \
     > backup_pre_data.sql
   ```
2. 画像は pre の backend コンテナの `/app/uploads` をホストにコピー。
   ```bash
   mkdir -p oracle_uploads
   docker cp doll_roulette_backend:/app/uploads/. oracle_uploads/
   ```
3. `backup_pre_data.sql` は旧スキーマ（dolls.image_url 等あり）なので、**Supabase 用のスキーマは新規作成**し、データは「dolls / outings の image_url を doll_images / outing_images に展開した形」で投入する。展開用の SQL または Node スクリプトを `web/scripts/` などに用意する（後述）。

※ pre は一度も止めず、読み取りだけで取得。

---

## 4. フェーズ 2: Supabase にスキーマとデータを用意

1. **スキーマ作成**  
   `docs/supabase_schema.sql`（または `web/supabase/schema.sql`）を Supabase の SQL エディタで実行。内容はリファクタ後（dolls に image_url なし、画像は doll_images / outing_images のみ）。

2. **データ投入**  
   - オプション A: ルートで一度マイグレーションしてから取った `backup_for_oracle.sql` のデータ部分を Supabase 用に整形して流す。  
   - オプション B: `backup_pre_data.sql` を読み、dolls.image_url を doll_images に、outings.image_url を outing_images に展開するスクリプトを実行し、生成した SQL を Supabase で実行。

3. **Storage**  
   - バケットを 1 つ作成し、名前を **`uploads`** にする（web の API はこの名前を参照）。  
   - バケットを **公開（Public）** にし、アップロードを許可するポリシーを設定（Supabase ダッシュボードの Storage → 対象バケット → Policies）。  
   - `oracle_uploads/` の中身を、パスを維持するか Supabase のパス規則（例: `dolls/{id}/xxx.jpg`）に合わせてアップロード。  
   - DB の `image_url` は Supabase Storage の公開 URL またはパスに合わせて更新（一括 UPDATE 用 SQL を用意してもよい）。

---

## 5. フェーズ 3: Next.js アプリ（web/）の実装

- **技術**: Next.js（App Router）、TypeScript、Tailwind。Supabase は `@supabase/supabase-js` で接続。
- **認証**: 入室用パスワード（`APP_PASSWORD`）を環境変数で持ち、Cookie で「入室済み」を管理。Supabase Auth は使わずに簡易ゲートのみ。
- **画面**: `/`（ルーレット）、`/dolls`（かぞく一覧）、`/outings`（お出かけ日記）。既存の `frontend` のコンポーネントを参考に移植。
- **API**: Route Handlers（`/api/dolls` など）で Supabase に問い合わせ。画像は Supabase Storage の URL を返す。

---

## 6. フェーズ 4: Vercel デプロイ

- GitHub に `web/` を含むリポジトリを push。  
- Vercel でプロジェクト作成 → リポジトリ接続。  
- 環境変数に `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`APP_PASSWORD` を設定。  
- デプロイ後、プレビュー URL で動作確認。

---

## 7. フェーズ 5: 最終切り替え（ここだけ pre に配慮）

- **短時間**（例: 10 分）、pre で「新規登録・編集をしない」ようにお願いする。  
- 必要なら pre の DB から再度ダンプを取り、差分を Supabase に反映（手動またはスクリプト）。  
- 本番 URL を Vercel の URL にし、家族に共有。  
- pre はバックアップ用に残すか、停止してよい。

---

## 8. 関連ファイル

- **Supabase スキーマ**: `web/supabase/schema.sql`  
- **データ変換**: `web/scripts/transform-pre-dump-to-new-schema.mjs` と `web/scripts/README.md`  
- **移行手順の詳細**: 各フェーズの具体的なコマンド・手順は、本ドキュメントを更新するか `docs/VercelSupabase_移設手順.md` に記載する。

---

## 9. Vercel デプロイ手順

1. **リポジトリ**: `web/` がルートでない場合は、Vercel の「Root Directory」に `web` を指定する。
2. **ビルド**: `npm run build`（Next.js のデフォルト）。環境変数がないとビルド時に Supabase を参照する箇所で失敗する可能性があるため、Vercel の環境変数は先に設定する。
3. **環境変数**（Vercel の Project → Settings → Environment Variables）:
   - `NEXT_PUBLIC_SUPABASE_URL`: Supabase プロジェクトの URL（Project Settings → API）
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase の anon public key
   - `APP_PASSWORD`: 入室用パスワード（任意の文字列）
4. **デプロイ**: Git に push するか、Vercel ダッシュボードから「Redeploy」で再デプロイ。
5. **本番 URL**: カスタムドメインを設定するか、`*.vercel.app` の URL を家族に共有する。

---

## 10. あとの作業チェックリスト

移設を進める際は、次の順で行う。

- [ ] **フェーズ 0**  Supabase・Vercel アカウント作成
- [ ] **フェーズ 1**  pre から DB ダンプ（`backup_pre_data.sql`）と画像（`oracle_uploads/`）を取得
- [ ] **フェーズ 2**  Supabase でスキーマ実行（`supabase/schema.sql`）→ 変換スクリプトでデータ投入（`scripts/`）→ Storage に `uploads` バケット作成・画像アップロード
- [ ] **フェーズ 3**  本リポジトリの `web/` を Vercel 用リポジトリ（例: `doll_roulette_for_vercel`）にコピー済みであること
- [ ] **フェーズ 4**  GitHub に push → Vercel でリポジトリ接続・環境変数設定 → デプロイ・動作確認
- [ ] **フェーズ 5**  最終切り替え日のみ pre を短時間停止 → 必要なら最終ダンプで差分反映 → 本番 URL を共有
