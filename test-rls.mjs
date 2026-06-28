import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ytaljijlhijkcmczngdq.supabase.co', 'sb_publishable_FMCDT5FsRAOmVLWBy9JLgg_hD3w9o2e');
async function test() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'pro@novakam.app', // wait, do I have the user's password? No.
    password: 'wrongpassword'
  });
  console.log(authError);
}
test();
