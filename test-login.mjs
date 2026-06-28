import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function test() {
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'Yahyaharoun.657@gmail.com',
    password: 'password'
  })
  if (authError) {
    console.log("Auth Error:", authError.message)
    const { data, error } = await supabase.from('shops').select('*');
    console.log("Shops select error:", error)
  } else {
    console.log("Logged in:", authData.user.id)
    const { data, error } = await supabase.from('shops').select('*').eq('owner_id', authData.user.id)
    console.log("Shops select error:", error)
    console.log("Shops select data:", data)
  }
}
test()
