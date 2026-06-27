import { createClient } from './src/lib/supabase/client';
const supabase = createClient();
async function test() {
  const { data: shops } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', 'test')
    .order('created_at', { ascending: false });
  const userShop = shops![0] as any;
  console.log(userShop.name);
}
