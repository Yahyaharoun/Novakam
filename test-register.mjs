import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ycuvtoewakqiguvhtnck.supabase.co', 'sb_publishable_s1Veqeuxb2N37lQFhoc5tg_d-BzaaTK');
async function test() {
  const { data, error } = await supabase.auth.signUp({
    email: 'test' + Date.now() + '@novakam.app',
    password: 'password123',
    options: {
      data: { full_name: 'Test Trigger', shop_name: 'Shop Trigger' }
    }
  });
  console.log(error || data);
}
test();
