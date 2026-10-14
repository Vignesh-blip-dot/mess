import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);
async function run() {
  const email = 'testcoord_' + Date.now() + '@example.com';
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  const userId = authData.user.id;

  // Make them a coordinator
  await supabase.from('profiles').update({ role: 'coordinator' }).eq('id', userId);

  // Give them an active assignment
  await supabase.from('coordinator_assignments').insert({
    user_id: userId,
    duty_start_date: '2026-09-01',
    duty_end_date: '2026-09-30'
  });

  const jwt = authData.session.access_token;
  const userClient = createClient(
    'https://dribchwasdoxumbvhoaf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY',
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  const { data: ingData } = await userClient.from('ingredient_current_stock').select('*').limit(1);
  const ingId = ingData[0].ingredient_id;

  const txnPayload = {
    ingredient_id: ingId,
    txn_type: 'purchase',
    quantity: 2,
    total_cost: 40,
    usage_date: '2026-09-12',
    created_by: userId
  };
  
  const { error } = await userClient.from('stock_transactions').insert(txnPayload);
  console.log("Insert result:", error);
}
run();
