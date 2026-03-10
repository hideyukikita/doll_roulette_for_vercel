# データ移行スクリプト

pre の PostgreSQL から取得した**旧スキーマ**のダンプを、Supabase 用**新スキーマ**の INSERT に変換します。

## 前提

- pre の DB は旧スキーマ（`dolls.image_url`, `outings.image_url` あり）
- Supabase には `web/supabase/schema.sql` で新スキーマを先に作成済み

## 手順

1. **pre からデータのみダンプ**（pre は止めない・読み取りのみ）

   ```bash
   docker exec <preのDBコンテナ名> pg_dump -U <user> <dbname> \
     --data-only --column-inserts \
     -t dolls -t doll_images -t histories -t outings -t outing_dolls -t outing_images \
     > backup_pre_data.sql
   ```

2. **変換スクリプトを実行**

   ```bash
   cd web/scripts
   node transform-pre-dump-to-new-schema.mjs < ../backup_pre_data.sql > supabase_data.sql
   ```

3. **Supabase の SQL エディタで実行**

   - 先に `web/supabase/schema.sql` を実行してスキーマを作成済みであること
   - `supabase_data.sql` の内容をコピーして実行

4. **画像の移行**

   - pre の `uploads`（または `oracle_uploads`）を Supabase Storage のバケット（例: `uploads`）にアップロード
   - DB の `image_url` が相対パスやローカルパスの場合は、Supabase Storage の公開 URL に合わせて一括 UPDATE するか、アップロード時のパスを DB の値と一致させる

## 変換の内容

- **dolls**: 列 `image_url` を除去。値が NULL でない行については `doll_images` に 1 行挿入（sort_order=0）
- **outings**: 列 `image_url` を除去。値が NULL でない行については `outing_images` に 1 行挿入（sort_order=0）
- **doll_images, histories, outing_dolls, outing_images**: そのまま出力（列が新スキーマと一致している前提）
