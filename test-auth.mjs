import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://ytaljijlhijkcmczngdq.supabase.co', 'sb_publishable_FMCDT5FsRAOmVLWBy9JLgg_hD3w9o2e');
const res = await supabase.auth.signInWithPassword({ email: 'test@novakam.app', password: 'wrongpassword' });
console.log("Auth Result:", res.error ? res.error.message : "Success!");
