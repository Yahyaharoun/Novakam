import { createClient } from './src/lib/supabase/client';
const supabase = createClient();
async function test() {
  const { data: d1 } = await supabase.from('shops').select('*');
  d1![0].name; // Should be fine
  const { data: d2 } = await supabase.from('shops').select('*').eq('owner_id', 'test');
  d2![0].name; // Should be fine
  const { data: d3 } = await supabase.from('shops').select('*').eq('owner_id', 'test').order('created_at');
  d3![0].name; // Should be fine
}
