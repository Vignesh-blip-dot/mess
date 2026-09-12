import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  'https://dribchwasdoxumbvhoaf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRyaWJjaHdhc2RveHVtYnZob2FmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMTM1MDMsImV4cCI6MjEwMjg4OTUwM30.gvh4SgeoRFZ6TaxuRziBNlKzuI87i1CEZoBebvIWrfY'
);
async function run() {
  const coordId = '7d3d3344-ce44-4cab-8ee2-cedb68dbda70';
  const { data: ingData } = await supabase.from('ingredient_current_stock').select('*').limit(1);
  const ingId = ingData[0].ingredient_id;

  const txnPayload = {
    ingredient_id: ingId,
    txn_type: 'purchase',
    quantity: 2,
    total_cost: 40,
    usage_date: '2026-09-12',
    created_by: coordId
  };
  
  const { error } = await supabase.from('stock_transactions').insert(txnPayload);
  console.log("Insert result as admin inserting FOR coordinator:", error);
}
run();
