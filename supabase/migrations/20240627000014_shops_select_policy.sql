-- Fix missing SELECT policy on shops and ensure grants

GRANT ALL ON public.shops TO authenticated;
GRANT ALL ON public.shops TO anon;

DROP POLICY IF EXISTS "shops_select" ON public.shops;
CREATE POLICY "shops_select" ON public.shops
FOR SELECT USING (
    owner_id = auth.uid() OR id = ANY(get_my_shops())
);
