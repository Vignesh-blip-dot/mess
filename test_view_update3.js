import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);
async function run() {
  const { data: ingData } = await supabase.from('ingredient_current_stock').select('*').limit(1);
  const ingId = ingData[0].ingredient_id;
  const oldStock = ingData[0].current_stock;
  console.log("Old stock:", oldStock);
  const txnPayload = {
    ingredient_id: ingId,
    txn_type: 'purchase',
    quantity: 5,
    total_cost: 100,
    usage_date: new Date().toISOString(),
    created_by: '3c4e02b2-2647-40d9-8489-b159acf8acbc' // Admin's UUID
  };
  const { error } = await supabase.from('stock_transactions').insert(txnPayload);
  console.log("Insert err:", error);
  const { data: newIngData } = await supabase.from('ingredient_current_stock').select('*').eq('ingredient_id', ingId);
  console.log("New stock:", newIngData[0].current_stock);
}
run();
