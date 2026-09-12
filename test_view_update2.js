import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);
async function run() {
  const email = 'testcoord4' + Date.now() + '@example.com';
  const { data: authData, error: authErr } = await supabase.auth.signUp({
    email,
    password: 'password123'
  });
  const jwt = authData.session.access_token;
  const userClient = createClient(
    'https://dribchwasdoxumbvhoaf.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY',
    { global: { headers: { Authorization: `Bearer ${jwt}` } } }
  );

  const { data: ingData } = await userClient.from('ingredient_current_stock').select('*').limit(1);
  const ingId = ingData[0].ingredient_id;
  const oldStock = ingData[0].current_stock;

  console.log("Old stock:", oldStock);

  // insert a purchase of 5 kg
  const txnPayload = {
    ingredient_id: ingId,
    txn_type: 'purchase',
    quantity: 5,
    total_cost: 100,
    usage_date: new Date().toISOString(),
    created_by: authData.user.id
  };
  const { error } = await userClient.from('stock_transactions').insert(txnPayload);
  console.log("Insert err:", error);

  // check view again
  const { data: newIngData } = await userClient.from('ingredient_current_stock').select('*').eq('ingredient_id', ingId);
  console.log("New stock:", newIngData[0].current_stock);
}
run();
