DROP POLICY IF EXISTS "shops_insert" ON public.shops;
CREATE POLICY "shops_insert" ON public.shops
FOR INSERT WITH CHECK (
    owner_id = auth.uid()
);
