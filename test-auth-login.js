require('dotenv').config({ path: '.env.local' });
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

(async () => {
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email: 'yahyaharoun.657@gmail.com', password: 'password' }) // Or an incorrect one just to see if it even gets here? Wait, the user successfully logged in, else they'd get "Email ou mot de passe incorrect".
  });
  const authData = await authRes.json();
  console.log(authData);
})();
