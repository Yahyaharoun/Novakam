GRANT ALL ON public.shops TO authenticated;
GRANT ALL ON public.shops TO anon;
NOTIFY pgrst, 'reload schema';
