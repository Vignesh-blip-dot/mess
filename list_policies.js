import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);

async function run() {
  const { data: qData, error: qErr } = await supabase.rpc('get_policies'); // this failed earlier
  
  // Try querying pg_policies through REST? Not allowed.
  // Instead, let's try updating an ingredient as a coordinator
  const email = 'testcoord2' + Date.now() + '@example.com';
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  if (authErr) { console.log(authErr); return; }

  const jwt = authData.session.access_token;
  const userClient = createClient(
    'https://dribchwasdoxumbvhoaf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY',
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  const { data: ingData } = await userClient.from('ingredients').select('id, current_stock').limit(1);
  if (!ingData || !ingData.length) { console.log("No ingredients"); return; }
  const ingId = ingData[0].id;
  const oldStock = ingData[0].current_stock;
  
  const { error: updErr } = await userClient.from('ingredients').update({ current_stock: oldStock + 1 }).eq('id', ingId);
  console.log("Update ingredient error:", updErr);
}
run();
