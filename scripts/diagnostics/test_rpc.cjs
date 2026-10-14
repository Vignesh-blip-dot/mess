require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const client = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await client.from('ingredients').insert([
    { name: 'Fresh Tomatoes', category: 'vegetable', unit: 'kg', active: true, tracks_usage: true, current_stock: 0, current_price: 0 },
    { name: 'Nasik Red Onions', category: 'vegetable', unit: 'kg', active: true, tracks_usage: true, current_stock: 0, current_price: 0 }
  ]);
  console.log('insert result:', data, error);
}
run();
