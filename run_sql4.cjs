require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await client.from('ingredients').update({ category: 'vegetable' }).eq('name', 'Vegetables');
  console.log(error, data);
}
run();
