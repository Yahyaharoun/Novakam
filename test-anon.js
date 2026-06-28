require('dotenv').config({ path: '.env.local' });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

(async () => {
  const selectRes = await fetch(`${SUPABASE_URL}/rest/v1/shops?select=*`, {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}` // Anon request
    }
  });
  
  const errText = await selectRes.text();
  console.log('ANON SELECT:', selectRes.status, selectRes.statusText, errText);
})();
