-- かぞくたちルーレット用 RLS ポリシー（anon 用・全操作許可）
-- Supabase ダッシュボードの SQL エディタで実行してください。
-- 各テーブルで RLS を有効にしたあと、この SQL を流すとアプリで必要な権限が付きます。

-- 既存ポリシーを削除（エラーになる場合はスキップでOK）
DROP POLICY IF EXISTS "anon_select_dolls" ON public.dolls;
DROP POLICY IF EXISTS "anon_insert_dolls" ON public.dolls;
DROP POLICY IF EXISTS "anon_update_dolls" ON public.dolls;
DROP POLICY IF EXISTS "anon_delete_dolls" ON public.dolls;

DROP POLICY IF EXISTS "anon_select_doll_images" ON public.doll_images;
DROP POLICY IF EXISTS "anon_insert_doll_images" ON public.doll_images;
DROP POLICY IF EXISTS "anon_update_doll_images" ON public.doll_images;
DROP POLICY IF EXISTS "anon_delete_doll_images" ON public.doll_images;

DROP POLICY IF EXISTS "anon_select_histories" ON public.histories;
DROP POLICY IF EXISTS "anon_insert_histories" ON public.histories;
DROP POLICY IF EXISTS "anon_delete_histories" ON public.histories;

DROP POLICY IF EXISTS "anon_select_outings" ON public.outings;
DROP POLICY IF EXISTS "anon_insert_outings" ON public.outings;
DROP POLICY IF EXISTS "anon_update_outings" ON public.outings;
DROP POLICY IF EXISTS "anon_delete_outings" ON public.outings;

DROP POLICY IF EXISTS "anon_select_outing_dolls" ON public.outing_dolls;
DROP POLICY IF EXISTS "anon_insert_outing_dolls" ON public.outing_dolls;
DROP POLICY IF EXISTS "anon_delete_outing_dolls" ON public.outing_dolls;

DROP POLICY IF EXISTS "anon_select_outing_images" ON public.outing_images;
DROP POLICY IF EXISTS "anon_insert_outing_images" ON public.outing_images;
DROP POLICY IF EXISTS "anon_delete_outing_images" ON public.outing_images;

-- RLS 有効化
ALTER TABLE public.dolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doll_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.histories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outing_dolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outing_images ENABLE ROW LEVEL SECURITY;

-- dolls
CREATE POLICY "anon_select_dolls" ON public.dolls FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_dolls" ON public.dolls FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_dolls" ON public.dolls FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_dolls" ON public.dolls FOR DELETE TO anon USING (true);

-- doll_images
CREATE POLICY "anon_select_doll_images" ON public.doll_images FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_doll_images" ON public.doll_images FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_doll_images" ON public.doll_images FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_doll_images" ON public.doll_images FOR DELETE TO anon USING (true);

-- histories
CREATE POLICY "anon_select_histories" ON public.histories FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_histories" ON public.histories FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_delete_histories" ON public.histories FOR DELETE TO anon USING (true);

-- outings
CREATE POLICY "anon_select_outings" ON public.outings FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_outings" ON public.outings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_outings" ON public.outings FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_outings" ON public.outings FOR DELETE TO anon USING (true);

-- outing_dolls
CREATE POLICY "anon_select_outing_dolls" ON public.outing_dolls FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_outing_dolls" ON public.outing_dolls FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_delete_outing_dolls" ON public.outing_dolls FOR DELETE TO anon USING (true);

-- outing_images
CREATE POLICY "anon_select_outing_images" ON public.outing_images FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_outing_images" ON public.outing_images FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_delete_outing_images" ON public.outing_images FOR DELETE TO anon USING (true);
