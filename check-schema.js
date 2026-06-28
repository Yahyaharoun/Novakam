require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const ws = require('ws');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// We can use REST API to inspect or just try to sign up with a new user and catch the error.
(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false }, transport: ws });
  
  // Try to sign up a dummy user to see the exact network response and if we can fetch from public
  const email = `test.trigger.${Date.now()}@example.com`;
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'password123',
    options: {
      data: { full_name: 'Test Trigger User' }
    }
  });
  
  console.log("SIGNUP ERROR:", error);
  if (data?.user) {
    console.log("USER ID:", data.user.id);
    // wait a second for trigger
    await new Promise(r => setTimeout(r, 2000));
    const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', data.user.id);
    console.log("PUBLIC USER DATA:", userData, userError);
    
    const { data: shopData, error: shopError } = await supabase.from('shops').select('*').eq('owner_id', data.user.id);
    console.log("PUBLIC SHOP DATA:", shopData, shopError);
  }
})();
