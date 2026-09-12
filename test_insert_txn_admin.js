import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);

async function check() {
  const email = 'testuser_admin' + Date.now() + '@example.com';
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  if (authErr) { console.log(authErr); return; }

  // make them admin
  await supabase.from('profiles').update({ role: 'admin' }).eq('id', authData.user.id);

  const jwt = authData.session.access_token;
  const userClient = createClient(
    'https://dribchwasdoxumbvhoaf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY',
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  const { data: ingData } = await userClient.from('ingredients').select('id').limit(1);
  if (!ingData || !ingData.length) { console.log("No ingredients"); return; }
  
  const txnPayload = {
    ingredient_id: ingData[0].id,
    txn_type: 'adjustment',
    quantity: 0,
    total_cost: 0,
    reason: `test_admin`,
    created_by: authData.user.id
  };
  
  const { error } = await userClient.from('stock_transactions').insert(txnPayload);
  console.log("Insert result (Admin):", error);
}
check();
